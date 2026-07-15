package org.usf.validation;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.DynamicModelFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.Values;
import org.eclipse.rdf4j.model.vocabulary.RDF4J;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.Query;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryResult;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.Sail;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.eclipse.rdf4j.sail.nativerdf.NativeStore;
import org.eclipse.rdf4j.sail.shacl.ShaclSail;
import org.eclipse.rdf4j.sail.shacl.ShaclSailValidationException;
import org.eclipse.rdf4j.sail.shacl.ShaclValidator;
import org.eclipse.rdf4j.sail.shacl.results.ValidationReport;
import org.eclipse.rdf4j.common.transaction.IsolationLevels;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Rdf4jEngine implements AutoCloseable {
    public static final String VERSION = "6.0.0";
    public static final String INDEXES = "spoc,posc,cosp,ospc,psoc";
    private static final int QUERY_TIMEOUT_SECONDS = 180;
    private final NativeStore store;
    private final SailRepository repository;
    private final Path repositoryRoot;
    private final GraphManifest manifest;

    public Rdf4jEngine(Path repositoryRoot, GraphManifest manifest, Path storeDirectory) {
        this.repositoryRoot = repositoryRoot;
        this.manifest = manifest;
        this.store = new NativeStore(storeDirectory.toFile(), INDEXES);
        this.repository = new SailRepository(store);
        repository.init();
    }

    public LoadResult load() throws IOException {
        Instant started = Instant.now();
        try (RepositoryConnection connection = repository.getConnection()) {
            connection.clear();
            for (GraphManifest.GraphEntry entry : manifest.dataGraphs()) {
                Path file = repositoryRoot.resolve("graph").resolve(entry.file);
                RDFFormat format = format(file);
                connection.begin();
                if (RDFFormat.TURTLE.equals(format)) {
                    connection.add(file.toFile(), manifest.baseIri, format, Values.iri(entry.graph));
                } else {
                    connection.add(file.toFile(), manifest.baseIri, format);
                }
                connection.commit();
            }
            verifyRuntimeGraphs(connection, manifest.dataGraphIris(), false);
            long count = connection.size();
            return new LoadResult(count, inputDigest(repositoryRoot, manifest),
                    Duration.between(started, Instant.now()).toMillis());
        }
    }

    public DeriveResult derive() throws IOException {
        Instant allStarted = Instant.now();
        LinkedHashMap<String, Digests.GraphDigest> outputs = new LinkedHashMap<>();
        LinkedHashMap<String, Long> timings = new LinkedHashMap<>();
        ArrayList<DerivationStep> steps = new ArrayList<>();
        String inputState = inputDigest(repositoryRoot, manifest);
        long canonicalizationNanos = 0L;
        try (RepositoryConnection connection = repository.getConnection()) {
            verifyRuntimeGraphs(connection, manifest.dataGraphIris(), false);
            for (GraphManifest.RuleEntry rule : manifest.derivationRules()) {
                Instant started = Instant.now();
                IRI output = Values.iri(rule.output);
                connection.clear(output);
                String source = Files.readString(repositoryRoot.resolve("graph").resolve(rule.file), StandardCharsets.UTF_8);
                LinkedHashSet<Statement> priorBlocks = new LinkedHashSet<>();
                List<String> queryBlocks = splitQueries(source);
                for (int blockIndex = 0; blockIndex < queryBlocks.size(); blockIndex++) {
                    Instant blockStarted = Instant.now();
                    String queryText = queryBlocks.get(blockIndex);
                    Query prepared = connection.prepareQuery(queryText);
                    if (!(prepared instanceof GraphQuery query)) {
                        throw new IllegalArgumentException("Derivation rule is not CONSTRUCT/DESCRIBE: " + rule.file);
                    }
                    query.setMaxExecutionTime(QUERY_TIMEOUT_SECONDS);
                    LinkedHashSet<Statement> generated = new LinkedHashSet<>();
                    try (GraphQueryResult result = query.evaluate()) {
                        while (result.hasNext()) {
                            Statement statement = result.next();
                            if (statement.getContext() != null && !output.equals(statement.getContext())) {
                                throw new IllegalStateException("Rule emitted a statement into an unregistered graph: " + statement.getContext());
                            }
                            Statement normalized = SimpleValueFactory.getInstance().createStatement(
                                    statement.getSubject(), statement.getPredicate(), statement.getObject(), output);
                            if (priorBlocks.contains(normalized)) {
                                throw new IllegalStateException("Cross-block duplicate derivation output: "
                                        + rule.file + " block " + (blockIndex + 1));
                            }
                            generated.add(normalized);
                        }
                    }
                    connection.begin();
                    connection.add(generated, output);
                    connection.commit();
                    priorBlocks.addAll(generated);
                    Digests.GraphDigest blockDigest;
                    long canonicalizationStarted = System.nanoTime();
                    try (RepositoryResult<Statement> statements = connection.getStatements(null, null, null, false, output)) {
                        blockDigest = Digests.RDF4J_CANONICALIZER.digest(statements);
                    }
                    canonicalizationNanos += System.nanoTime() - canonicalizationStarted;
                    DerivationStep step = new DerivationStep(rule.file + "#block-" + (blockIndex + 1),
                            Digests.sha256(queryText), inputState, rule.output,
                            blockDigest.statementCount(), blockDigest.sha256(),
                            Duration.between(blockStarted, Instant.now()).toMillis());
                    steps.add(step);
                    inputState = step.nextInputStateSha256();
                }
                long finalCanonicalizationStarted = System.nanoTime();
                try (RepositoryResult<Statement> statements = connection.getStatements(null, null, null, false, output)) {
                    outputs.put(rule.output, Digests.RDF4J_CANONICALIZER.digest(statements));
                }
                canonicalizationNanos += System.nanoTime() - finalCanonicalizationStarted;
                timings.put(rule.output, Duration.between(started, Instant.now()).toMillis());
            }
            verifyRuntimeGraphs(connection, manifest.allRuntimeGraphIris(), false);
        }
        return new DeriveResult(outputs, timings, List.copyOf(steps),
                Duration.ofNanos(canonicalizationNanos).toMillis(),
                Duration.between(allStarted, Instant.now()).toMillis());
    }

    public IntegrityResult integrity() throws IOException {
        return integrity(true);
    }

    public IntegrityResult integrity(boolean includeGlobal) throws IOException {
        LinkedHashMap<String, Long> timings = new LinkedHashMap<>();
        LinkedHashMap<String, Integer> violationCounts = new LinkedHashMap<>();
        ArrayList<String> sample = new ArrayList<>();
        int contamination = 0;
        try (RepositoryConnection connection = repository.getConnection()) {
            IRI shapeGraph = Values.iri("urn:usf:graph:shapes");
            connection.begin();
            for (GraphManifest.GraphEntry entry : manifest.shapeGraphs) {
                Path file = repositoryRoot.resolve("graph").resolve(entry.file);
                connection.add(file.toFile(), manifest.baseIri, format(file), shapeGraph);
            }
            connection.commit();
            try {
                contamination = contaminationCount(connection, manifest.integrityGraphIris());
                violationCounts.put("boundary:contamination", contamination);
                verifyRequiredRuntimeGraphs(connection, manifest.integrityGraphIris());
                List<GraphManifest.RuleEntry> selectedRules = includeGlobal
                        ? manifest.integrityRules()
                        : manifest.integrityRules().stream()
                        .filter(rule -> "rules/lifecycle.rq".equals(rule.file)).toList();
                for (GraphManifest.RuleEntry rule : selectedRules) {
                    Instant started = Instant.now();
                    String queryText = Files.readString(repositoryRoot.resolve("graph").resolve(rule.file), StandardCharsets.UTF_8);
                    QueryRows rows = evaluateIntegrityQuery(connection, queryText, rule.file);
                    int count = rows.count();
                    for (String value : rows.sample()) {
                        if (sample.size() < 20) {
                            sample.add(value);
                        }
                    }
                    violationCounts.put(rule.file, count);
                    timings.put(rule.file, Duration.between(started, Instant.now()).toMillis());
                }
            } finally {
                connection.clear(shapeGraph);
            }
        }
        int total = violationCounts.values().stream().mapToInt(Integer::intValue).sum();
        return new IntegrityResult(total == 0 && contamination == 0, violationCounts, sample, timings,
                contamination);
    }

    public ShaclResult validateStandalone() throws IOException {
        MemoryStore shapeStore = new MemoryStore();
        shapeStore.init();
        Instant started = Instant.now();
        try {
            SailRepository shapeRepository = new SailRepository(shapeStore);
            shapeRepository.init();
            try (RepositoryConnection connection = shapeRepository.getConnection()) {
                IRI shapeGraph = Values.iri("urn:usf:graph:shapes");
                connection.begin();
                for (GraphManifest.GraphEntry entry : manifest.shapeGraphs) {
                    Path file = repositoryRoot.resolve("graph").resolve(entry.file);
                    connection.add(file.toFile(), manifest.baseIri, format(file), shapeGraph);
                }
                connection.commit();
            }
            ValidationReport report = ShaclValidator.builder()
                    .withShapes(shapeStore)
                    .shapeContexts(Values.iri("urn:usf:graph:shapes"))
                    .setEclipseRdf4jShaclExtensions(false)
                    .setDashDataShapes(false)
                    .setParallelValidation(false)
                    .setCacheSelectNodes(true)
                    .setValidationResultsLimitTotal(1000)
                    .setValidationResultsLimitPerConstraint(100)
                    .setValidationTimeoutMillis(180_000)
                    .build()
                    .validate(store);
            return new ShaclResult(report.conforms(), report.getValidationResult().size(), report.isTruncated(),
                    ShaclReports.fromRdf4j(report.asModel()),
                    Duration.between(started, Instant.now()).toMillis());
        } finally {
            shapeStore.shutDown();
        }
    }

    public static IncrementalResult validateIncremental(Path repositoryRoot, GraphManifest manifest, Path directory) throws IOException {
        Instant started = Instant.now();
        NativeStore nativeStore = new NativeStore(directory.toFile(), INDEXES);
        ShaclSail shaclSail = new ShaclSail(nativeStore);
        IRI shapeGraph = RDF4J.SHACL_SHAPE_GRAPH;
        shaclSail.setParallelValidation(false);
        shaclSail.setCacheSelectNodes(true);
        shaclSail.setSerializableValidation(true);
        shaclSail.setValidationResultsLimitTotal(100);
        shaclSail.setValidationResultsLimitPerConstraint(20);
        SailRepository repository = new SailRepository(shaclSail);
        repository.init();
        boolean conformingCommitted = false;
        boolean defectRejected = false;
        boolean rollbackClean = false;
        boolean shapeChangeCommitted = false;
        boolean boundedDataCommitted = false;
        try (RepositoryConnection connection = repository.getConnection()) {
            connection.begin(IsolationLevels.SERIALIZABLE);
            for (GraphManifest.GraphEntry entry : manifest.shapeGraphs.stream()
                    .filter(value -> "shapes/repository-structure.ttl".equals(value.file)).toList()) {
                Path file = repositoryRoot.resolve("graph").resolve(entry.file);
                connection.add(file.toFile(), manifest.baseIri, format(file), shapeGraph);
            }
            connection.commit();
        }
        try (RepositoryConnection connection = repository.getConnection()) {
            Path conforming = repositoryRoot.resolve("graph/fixtures/conforming/nonnegative-quantities.ttl");
            connection.begin(IsolationLevels.SERIALIZABLE);
            connection.add(conforming.toFile(), manifest.baseIri, format(conforming), Values.iri("urn:usf:graph:fixture:incremental"));
            try {
                connection.commit();
            } catch (Exception exception) {
                ShaclSailValidationException validation = validationException(exception);
                if (validation != null) {
                    throw new IllegalStateException("Registered conforming incremental fixture failed SHACL: "
                            + validation.getValidationReport(), exception);
                }
                throw exception;
            }
            conformingCommitted = true;

            var factory = SimpleValueFactory.getInstance();
            IRI nodeShape = factory.createIRI("urn:usf:shape:incremental-bounded-probe");
            IRI probeClass = factory.createIRI("urn:usf:class:IncrementalBoundedProbe");
            IRI probePath = factory.createIRI("urn:usf:predicate:incrementalProbeValue");
            var propertyShape = factory.createBNode();
            connection.begin(IsolationLevels.SERIALIZABLE);
            connection.add(nodeShape, RDF.TYPE, SHACL.NODE_SHAPE, shapeGraph);
            connection.add(nodeShape, SHACL.TARGET_CLASS, probeClass, shapeGraph);
            connection.add(nodeShape, SHACL.PROPERTY, propertyShape, shapeGraph);
            connection.add(propertyShape, SHACL.PATH, probePath, shapeGraph);
            connection.add(propertyShape, SHACL.MIN_COUNT, factory.createLiteral(1), shapeGraph);
            connection.commit();
            shapeChangeCommitted = true;

            IRI probe = factory.createIRI("urn:usf:fixture:incremental-bounded-probe");
            connection.begin(IsolationLevels.SERIALIZABLE);
            connection.add(probe, RDF.TYPE, probeClass, Values.iri("urn:usf:graph:fixture:incremental"));
            connection.add(probe, probePath, factory.createLiteral("conforming"),
                    Values.iri("urn:usf:graph:fixture:incremental"));
            connection.commit();
            boundedDataCommitted = true;
            long before = connection.size();

            Path defect = repositoryRoot.resolve("graph/fixtures/defects/nonnegative-quantity-negative.ttl");
            connection.begin(IsolationLevels.SERIALIZABLE);
            connection.add(defect.toFile(), manifest.baseIri, format(defect), Values.iri("urn:usf:graph:fixture:incremental"));
            try {
                connection.commit();
            } catch (Exception exception) {
                if (hasValidationException(exception)) {
                    defectRejected = true;
                    if (connection.isActive()) {
                        connection.rollback();
                    }
                } else {
                    throw exception;
                }
            }
            rollbackClean = connection.size() == before;
        } finally {
            repository.shutDown();
        }
        return new IncrementalResult(conformingCommitted, defectRejected, shapeChangeCommitted,
                boundedDataCommitted, rollbackClean, "repository-structure+incremental-bounded-probe",
                "SERIALIZABLE", true, false, Duration.between(started, Instant.now()).toMillis());
    }

    public Map<String, Digests.GraphDigest> derivedDigests() {
        LinkedHashMap<String, Digests.GraphDigest> result = new LinkedHashMap<>();
        try (RepositoryConnection connection = repository.getConnection()) {
            for (GraphManifest.GraphEntry entry : manifest.derivedGraphs) {
                IRI graph = Values.iri(entry.graph);
                try (RepositoryResult<Statement> statements = connection.getStatements(null, null, null, false, graph)) {
                    result.put(entry.graph, Digests.RDF4J_CANONICALIZER.digest(statements));
                }
            }
        }
        return result;
    }

    public long statementCount() {
        try (RepositoryConnection connection = repository.getConnection()) {
            return connection.size();
        }
    }

    Set<String> runtimeGraphIris() {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        try (RepositoryConnection connection = repository.getConnection();
             RepositoryResult<Resource> contexts = connection.getContextIDs()) {
            while (contexts.hasNext()) {
                values.add(contexts.next().stringValue());
            }
        }
        return Set.copyOf(values);
    }

    static int queryTimeoutSeconds() {
        return QUERY_TIMEOUT_SECONDS;
    }

    static QueryRows evaluateIntegrityQuery(RepositoryConnection connection, String queryText, String identity) {
        TupleQuery query = connection.prepareTupleQuery(queryText);
        query.setMaxExecutionTime(QUERY_TIMEOUT_SECONDS);
        int count = 0;
        ArrayList<String> sample = new ArrayList<>();
        try (TupleQueryResult result = query.evaluate()) {
            while (result.hasNext()) {
                BindingSet row = result.next();
                count++;
                if (sample.size() < 20) {
                    sample.add(identity + ':' + row.getValue("violation") + ':' + row.getValue("subject"));
                }
            }
        }
        return new QueryRows(count, List.copyOf(sample));
    }

    @Override
    public void close() {
        repository.shutDown();
    }

    private static boolean hasValidationException(Throwable exception) {
        return validationException(exception) != null;
    }

    private static ShaclSailValidationException validationException(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof ShaclSailValidationException validation) {
                return validation;
            }
            current = current.getCause();
        }
        return null;
    }

    private static RDFFormat format(Path path) {
        return Rio.getParserFormatForFileName(path.getFileName().toString())
                .orElseThrow(() -> new IllegalArgumentException("Unsupported RDF file format: " + path));
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

    static void verifyRuntimeGraphs(RepositoryConnection connection, Set<String> expected, boolean requireDerived) {
        LinkedHashSet<String> actual = new LinkedHashSet<>();
        try (RepositoryResult<Resource> contexts = connection.getContextIDs()) {
            while (contexts.hasNext()) {
                actual.add(contexts.next().stringValue());
            }
        }
        if (connection.size((Resource) null) != 0) {
            throw new IllegalStateException("Default graph contamination detected");
        }
        if (!expected.containsAll(actual)) {
            LinkedHashSet<String> unexpected = new LinkedHashSet<>(actual);
            unexpected.removeAll(expected);
            throw new IllegalStateException("Unregistered named graph contamination detected: " + unexpected);
        }
        if (!actual.containsAll(manifestRequired(expected, requireDerived))) {
            LinkedHashSet<String> missing = new LinkedHashSet<>(manifestRequired(expected, requireDerived));
            missing.removeAll(actual);
            throw new IllegalStateException("Registered runtime graph is absent: " + missing);
        }
    }

    private static void verifyRequiredRuntimeGraphs(RepositoryConnection connection, Set<String> expected) {
        LinkedHashSet<String> actual = new LinkedHashSet<>();
        try (RepositoryResult<Resource> contexts = connection.getContextIDs()) {
            while (contexts.hasNext()) {
                actual.add(contexts.next().stringValue());
            }
        }
        if (!actual.containsAll(expected)) {
            LinkedHashSet<String> missing = new LinkedHashSet<>(expected);
            missing.removeAll(actual);
            throw new IllegalStateException("Registered runtime graph is absent: " + missing);
        }
    }

    static int contaminationCount(RepositoryConnection connection, Set<String> expected) {
        long count = connection.size((Resource) null);
        try (RepositoryResult<Resource> contexts = connection.getContextIDs()) {
            while (contexts.hasNext()) {
                Resource context = contexts.next();
                if (!expected.contains(context.stringValue())) {
                    count += connection.size(context);
                }
            }
        }
        if (count > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        return (int) count;
    }

    private static Set<String> manifestRequired(Set<String> expected, boolean includeEmptyDerived) {
        if (includeEmptyDerived) {
            return expected;
        }
        return expected;
    }

    public record LoadResult(long statementCount, String inputSha256, long elapsedMillis) {
    }

    public record DeriveResult(Map<String, Digests.GraphDigest> graphDigests, Map<String, Long> timingsMillis,
                               List<DerivationStep> steps, long canonicalizationMillis, long elapsedMillis) {
    }

    public record IntegrityResult(boolean conforms, Map<String, Integer> violationCounts, List<String> sample,
                                  Map<String, Long> timingsMillis, int contaminationCount) {
    }

    public record ShaclResult(boolean conforms, int resultCount, boolean truncated,
                              List<ShaclFinding> findings, long elapsedMillis) {
    }

    public record IncrementalResult(boolean conformingCommitted, boolean defectRejected,
                                    boolean shapeChangeCommitted, boolean boundedDataCommitted,
                                    boolean rollbackClean, String affectedShapeFamily,
                                    String isolationLevel, boolean cacheSelectNodes,
                                    boolean parallelValidation, long elapsedMillis) {
        public boolean conforms() {
            return conformingCommitted && defectRejected && shapeChangeCommitted
                    && boundedDataCommitted && rollbackClean;
        }
    }

    record QueryRows(int count, List<String> sample) {
    }
}
