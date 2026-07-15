package org.usf.validation;

import org.apache.jena.graph.Graph;
import org.apache.jena.graph.Node;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.graph.Triple;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.DatasetFactory;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.riot.RDFLanguages;
import org.apache.jena.shacl.ShaclValidator;
import org.apache.jena.shacl.Shapes;
import org.apache.jena.shacl.ValidationReport;
import org.apache.jena.sparql.core.Quad;
import org.apache.jena.system.Txn;
import org.apache.jena.tdb2.DatabaseMgr;
import org.apache.jena.tdb2.TDB2;
import org.apache.jena.tdb2.params.StoreParams;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public final class JenaEngine implements AutoCloseable {
    public static final String VERSION = "6.1.0";
    private static final long QUERY_TIMEOUT_SECONDS = 180;
    private final Dataset dataset;
    private final Path repositoryRoot;
    private final GraphManifest manifest;

    public JenaEngine(Path repositoryRoot, GraphManifest manifest, Path storeDirectory) {
        this.repositoryRoot = repositoryRoot;
        this.manifest = manifest;
        StoreParams parameters = StoreParams.builder("USFParity", StoreParams.getDftStoreParams())
                .tripleIndexes(new String[]{"SPO", "POS"})
                .quadIndexes(new String[]{"GSPO", "GPOS", "GOSP", "POSG", "OSPG", "SPOG"})
                .build();
        this.dataset = DatasetFactory.wrap(DatabaseMgr.connectDatasetGraph(storeDirectory.toString(), parameters));
        this.dataset.getContext().set(TDB2.symUnionDefaultGraph, true);
    }

    public LoadResult load() throws IOException {
        Instant started = Instant.now();
        Txn.executeWrite(dataset, () -> dataset.asDatasetGraph().clear());
        for (GraphManifest.GraphEntry entry : manifest.dataGraphs()) {
            Path file = repositoryRoot.resolve("graph").resolve(entry.file);
            Lang language = language(file);
            Txn.executeWrite(dataset, () -> {
                if (RDFLanguages.TURTLE.equals(language)) {
                    RDFDataMgr.read(dataset.getNamedModel(entry.graph), file.toUri().toString(), language);
                } else {
                    RDFDataMgr.read(dataset, file.toUri().toString(), language);
                }
            });
        }
        verifyRuntimeGraphs(manifest.dataGraphIris());
        long count = countStatements();
        return new LoadResult(count, inputDigest(repositoryRoot, manifest),
                Duration.between(started, Instant.now()).toMillis());
    }

    public DeriveResult derive() throws IOException {
        Instant allStarted = Instant.now();
        LinkedHashMap<String, Digests.GraphDigest> outputs = new LinkedHashMap<>();
        LinkedHashMap<String, Long> timings = new LinkedHashMap<>();
        ArrayList<DerivationStep> steps = new ArrayList<>();
        String inputState = inputDigest(repositoryRoot, manifest);
        long canonicalizationNanos = 0L;
        for (GraphManifest.RuleEntry rule : manifest.derivationRules()) {
            Instant started = Instant.now();
            Node output = NodeFactory.createURI(rule.output);
            Txn.executeWrite(dataset, () -> dataset.asDatasetGraph().removeGraph(output));
            String source = Files.readString(repositoryRoot.resolve("graph").resolve(rule.file), StandardCharsets.UTF_8);
            LinkedHashSet<Quad> priorBlocks = new LinkedHashSet<>();
            List<String> queryBlocks = splitQueries(source);
            for (int blockIndex = 0; blockIndex < queryBlocks.size(); blockIndex++) {
                int blockNumber = blockIndex + 1;
                Instant blockStarted = Instant.now();
                String queryText = queryBlocks.get(blockIndex);
                Query query = QueryFactory.create(queryText);
                if (!query.isConstructType()) {
                    throw new IllegalArgumentException("Derivation rule is not CONSTRUCT: " + rule.file);
                }
                Set<Quad> generated = Txn.calculateRead(dataset, () -> {
                    LinkedHashSet<Quad> values = new LinkedHashSet<>();
                    try (QueryExecution execution = QueryExecution.dataset(dataset)
                            .query(query)
                            .overallTimeout(QUERY_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                            .build()) {
                        execution.execConstructQuads().forEachRemaining(quad -> {
                            Node graph = quad.getGraph();
                            if (!Quad.isDefaultGraph(graph) && !output.equals(graph)) {
                                throw new IllegalStateException("Rule emitted a statement into an unregistered graph: " + graph);
                            }
                            Quad normalized = new Quad(output, quad.asTriple());
                            if (priorBlocks.contains(normalized)) {
                                throw new IllegalStateException("Cross-block duplicate derivation output: "
                                        + rule.file + " block " + blockNumber);
                            }
                            values.add(normalized);
                        });
                    }
                    return values;
                });
                Txn.executeWrite(dataset, () -> generated.forEach(dataset.asDatasetGraph()::add));
                priorBlocks.addAll(generated);
                long canonicalizationStarted = System.nanoTime();
                Digests.GraphDigest blockDigest = graphDigest(output);
                canonicalizationNanos += System.nanoTime() - canonicalizationStarted;
                DerivationStep step = new DerivationStep(rule.file + "#block-" + blockNumber,
                        Digests.sha256(queryText), inputState, rule.output,
                        blockDigest.statementCount(), blockDigest.sha256(),
                        Duration.between(blockStarted, Instant.now()).toMillis());
                steps.add(step);
                inputState = step.nextInputStateSha256();
            }
            long finalCanonicalizationStarted = System.nanoTime();
            outputs.put(rule.output, graphDigest(output));
            canonicalizationNanos += System.nanoTime() - finalCanonicalizationStarted;
            timings.put(rule.output, Duration.between(started, Instant.now()).toMillis());
        }
        verifyRuntimeGraphs(manifest.allRuntimeGraphIris());
        return new DeriveResult(outputs, timings, List.copyOf(steps),
                Duration.ofNanos(canonicalizationNanos).toMillis(),
                Duration.between(allStarted, Instant.now()).toMillis());
    }

    public IntegrityResult integrity() throws IOException {
        LinkedHashMap<String, Long> timings = new LinkedHashMap<>();
        LinkedHashMap<String, Integer> violationCounts = new LinkedHashMap<>();
        ArrayList<String> sample = new ArrayList<>();
        String shapeGraph = "urn:usf:graph:shapes";
        Txn.executeWrite(dataset, () -> {
            Model model = dataset.getNamedModel(shapeGraph);
            for (GraphManifest.GraphEntry entry : manifest.shapeGraphs) {
                Path file = repositoryRoot.resolve("graph").resolve(entry.file);
                RDFDataMgr.read(model, file.toUri().toString(), language(file));
            }
        });
        try {
            verifyRuntimeGraphs(manifest.integrityGraphIris());
            for (GraphManifest.RuleEntry rule : manifest.integrityRules()) {
                Instant started = Instant.now();
                String queryText = Files.readString(repositoryRoot.resolve("graph").resolve(rule.file), StandardCharsets.UTF_8);
                Query query = QueryFactory.create(queryText);
                QueryRows rows = Txn.calculateRead(dataset, () -> {
                    int count = 0;
                    ArrayList<String> localSample = new ArrayList<>();
                    try (QueryExecution execution = QueryExecution.dataset(dataset)
                            .query(query)
                            .overallTimeout(QUERY_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                            .build()) {
                        ResultSet result = execution.execSelect();
                        while (result.hasNext()) {
                            var row = result.next();
                            count++;
                            if (localSample.size() < 20) {
                                localSample.add(rule.file + ':' + row.get("violation") + ':' + row.get("subject"));
                            }
                        }
                    }
                    return new QueryRows(count, localSample);
                });
                violationCounts.put(rule.file, rows.count());
                for (String value : rows.sample()) {
                    if (sample.size() < 20) {
                        sample.add(value);
                    }
                }
                timings.put(rule.file, Duration.between(started, Instant.now()).toMillis());
            }
        } finally {
            Txn.executeWrite(dataset, () -> dataset.removeNamedModel(shapeGraph));
        }
        int total = violationCounts.values().stream().mapToInt(Integer::intValue).sum();
        return new IntegrityResult(total == 0, violationCounts, sample, timings);
    }

    public ShaclResult validateShacl() throws IOException {
        Model shapeModel = ModelFactory.createDefaultModel();
        for (GraphManifest.GraphEntry entry : manifest.shapeGraphs) {
            Path file = repositoryRoot.resolve("graph").resolve(entry.file);
            RDFDataMgr.read(shapeModel, file.toUri().toString(), language(file));
        }
        Shapes shapes = Shapes.parse(shapeModel.getGraph());
        Instant started = Instant.now();
        ValidationReport report = Txn.calculateRead(dataset,
                () -> ShaclValidator.get().validate(shapes, dataset.getUnionModel().getGraph()));
        return new ShaclResult(report.conforms(), report.getEntries().size(),
                ShaclReports.fromJena(report.getModel()),
                Duration.between(started, Instant.now()).toMillis());
    }

    public Map<String, Digests.GraphDigest> derivedDigests() {
        LinkedHashMap<String, Digests.GraphDigest> result = new LinkedHashMap<>();
        for (GraphManifest.GraphEntry entry : manifest.derivedGraphs) {
            result.put(entry.graph, graphDigest(NodeFactory.createURI(entry.graph)));
        }
        return result;
    }

    public long statementCount() {
        return countStatements();
    }

    Set<String> runtimeGraphIris() {
        return Txn.calculateRead(dataset, () -> {
            LinkedHashSet<String> values = new LinkedHashSet<>();
            dataset.listNames().forEachRemaining(values::add);
            return Set.copyOf(values);
        });
    }

    @Override
    public void close() {
        dataset.close();
    }

    private Digests.GraphDigest graphDigest(Node graph) {
        return Txn.calculateRead(dataset, () ->
                Digests.JENA_CANONICALIZER.digest(dataset.asDatasetGraph().find(graph, Node.ANY, Node.ANY, Node.ANY)));
    }

    private long countStatements() {
        return Txn.calculateRead(dataset, () -> {
            long[] count = {0L};
            dataset.asDatasetGraph().find().forEachRemaining(quad -> count[0]++);
            return count[0];
        });
    }

    private void verifyRuntimeGraphs(Set<String> expected) {
        Txn.executeRead(dataset, () -> {
            if (!dataset.getDefaultModel().isEmpty()) {
                throw new IllegalStateException("Default graph contamination detected");
            }
            LinkedHashSet<String> actual = new LinkedHashSet<>();
            dataset.listNames().forEachRemaining(actual::add);
            if (!expected.containsAll(actual)) {
                LinkedHashSet<String> unexpected = new LinkedHashSet<>(actual);
                unexpected.removeAll(expected);
                throw new IllegalStateException("Unregistered named graph contamination detected: " + unexpected);
            }
            if (!actual.containsAll(expected)) {
                LinkedHashSet<String> missing = new LinkedHashSet<>(expected);
                missing.removeAll(actual);
                throw new IllegalStateException("Registered runtime graph is absent: " + missing);
            }
        });
    }

    private static Lang language(Path path) {
        Lang language = RDFLanguages.filenameToLang(path.getFileName().toString());
        if (language == null || !(RDFLanguages.TURTLE.equals(language)
                || RDFLanguages.TRIG.equals(language)
                || RDFLanguages.NQUADS.equals(language))) {
            throw new IllegalArgumentException("Unsupported RDF file format: " + path);
        }
        return language;
    }

    private static List<String> splitQueries(String source) {
        return java.util.Arrays.stream(source.split("(?m)^\\s*#---NEXT---#\\s*$"))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private static String inputDigest(Path repositoryRoot, GraphManifest manifest) throws IOException {
        StringBuilder inventory = new StringBuilder();
        for (GraphManifest.GraphEntry entry : manifest.dataGraphs()) {
            Path file = repositoryRoot.resolve("graph").resolve(entry.file);
            inventory.append(entry.loadOrder).append('\0').append(entry.file).append('\0')
                    .append(entry.graph).append('\0').append(Digests.sha256(file)).append('\n');
        }
        return Digests.sha256(inventory.toString());
    }

    private record QueryRows(int count, List<String> sample) {
    }

    public record LoadResult(long statementCount, String inputSha256, long elapsedMillis) {
    }

    public record DeriveResult(Map<String, Digests.GraphDigest> graphDigests, Map<String, Long> timingsMillis,
                               List<DerivationStep> steps, long canonicalizationMillis, long elapsedMillis) {
    }

    public record IntegrityResult(boolean conforms, Map<String, Integer> violationCounts, List<String> sample,
                                  Map<String, Long> timingsMillis) {
    }

    public record ShaclResult(boolean conforms, int resultCount, List<ShaclFinding> findings,
                              long elapsedMillis) {
    }
}
