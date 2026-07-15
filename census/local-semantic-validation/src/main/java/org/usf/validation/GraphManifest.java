package org.usf.validation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@JsonIgnoreProperties(ignoreUnknown = false)
public final class GraphManifest {
    public int version;
    public String database;
    public String baseIri;
    public List<GraphEntry> definitionGraphs = List.of();
    public List<GraphEntry> authoredGraphs = List.of();
    public List<GraphEntry> observedGraphs = List.of();
    public List<GraphEntry> shapeGraphs = List.of();
    public List<RuleEntry> rules = List.of();
    public List<GraphEntry> derivedGraphs = List.of();
    public FixtureEntry fixtures;

    private static final List<String> DERIVATION_OUTPUTS = List.of(
            "urn:usf:graph:derived:repositorystructure",
            "urn:usf:graph:derived:sourcedispositions",
            "urn:usf:graph:derived:obligations",
            "urn:usf:graph:derived:evidence",
            "urn:usf:graph:derived:surfaces",
            "urn:usf:graph:derived:coverage",
            "urn:usf:graph:derived:readiness"
    );

    public static GraphManifest read(Path repositoryRoot) throws IOException {
        Path manifestPath = repositoryRoot.resolve("graph/manifest.yaml").normalize();
        YAMLFactory yamlFactory = YAMLFactory.builder()
                .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                .build();
        ObjectMapper mapper = new ObjectMapper(yamlFactory)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        GraphManifest manifest = mapper.readValue(manifestPath.toFile(), GraphManifest.class);
        manifest.validate(repositoryRoot);
        return manifest;
    }

    public List<GraphEntry> dataGraphs() {
        ArrayList<GraphEntry> entries = new ArrayList<>();
        entries.addAll(definitionGraphs);
        entries.addAll(authoredGraphs);
        entries.addAll(observedGraphs);
        entries.sort(Comparator.comparingInt(entry -> entry.loadOrder));
        return List.copyOf(entries);
    }

    public List<RuleEntry> derivationRules() {
        return rules.stream().filter(rule -> "derivation".equals(rule.kind)).toList();
    }

    public List<RuleEntry> integrityRules() {
        return rules.stream().filter(rule -> "integrity".equals(rule.kind)).toList();
    }

    public Set<String> dataGraphIris() {
        return dataGraphs().stream().map(entry -> entry.graph).collect(Collectors.toUnmodifiableSet());
    }

    public Set<String> derivedGraphIris() {
        return derivedGraphs.stream().map(entry -> entry.graph).collect(Collectors.toUnmodifiableSet());
    }

    public Set<String> allRuntimeGraphIris() {
        LinkedHashSet<String> graphs = new LinkedHashSet<>(dataGraphIris());
        graphs.addAll(derivedGraphIris());
        return Set.copyOf(graphs);
    }

    public Set<String> integrityGraphIris() {
        LinkedHashSet<String> graphs = new LinkedHashSet<>(allRuntimeGraphIris());
        graphs.add("urn:usf:graph:shapes");
        return Set.copyOf(graphs);
    }

    private void validate(Path repositoryRoot) throws IOException {
        if (version != 1 || !"USF".equals(database) || !"urn:usf:".equals(baseIri)) {
            throw new IllegalArgumentException("Unsupported graph manifest identity");
        }
        if (fixtures == null || fixtures.loadAsAuthority || fixtures.conforming == null || fixtures.defects == null) {
            throw new IllegalArgumentException("Fixtures must be registered and excluded from authority loading");
        }

        List<GraphEntry> data = dataGraphs();
        if (data.isEmpty() || shapeGraphs.isEmpty() || derivedGraphs.size() != 7) {
            throw new IllegalArgumentException("Manifest graph families are incomplete");
        }
        requireUnique(data.stream().map(entry -> entry.file).toList(), "data file");
        requireUnique(data.stream().map(entry -> entry.graph).toList(), "data graph IRI");
        requireUnique(data.stream().map(entry -> entry.loadOrder).toList(), "data load order");
        requireUnique(derivedGraphs.stream().map(entry -> entry.file).toList(), "derived file");
        requireUnique(derivedGraphs.stream().map(entry -> entry.graph).toList(), "derived graph IRI");

        List<String> actualOutputs = derivationRules().stream().map(rule -> rule.output).toList();
        if (!DERIVATION_OUTPUTS.equals(actualOutputs)) {
            throw new IllegalArgumentException("Derivation family order or output graph differs from the live contract");
        }
        List<String> registeredDerived = derivedGraphs.stream().map(entry -> entry.graph).toList();
        if (!DERIVATION_OUTPUTS.equals(registeredDerived)) {
            throw new IllegalArgumentException("Derived graph registration order differs from the live contract");
        }
        if (integrityRules().size() != 2
                || !integrityRules().stream().map(rule -> rule.file).toList()
                .equals(List.of("rules/integrity.rq", "rules/lifecycle.rq"))) {
            throw new IllegalArgumentException("Integrity and lifecycle rules must be registered in canonical order");
        }
        if (shapeGraphs.stream().anyMatch(entry -> !"urn:usf:graph:shapes".equals(entry.graph))) {
            throw new IllegalArgumentException("All shape fragments must map to the canonical shapes graph");
        }

        Path graphRoot = repositoryRoot.resolve("graph").toRealPath();
        ArrayList<String> registeredRdf = new ArrayList<>();
        Stream.of(data, shapeGraphs, derivedGraphs).flatMap(List::stream).forEach(entry -> {
            validateRelativeFile(graphRoot, entry.file, Set.of(".ttl", ".trig", ".nq"));
            registeredRdf.add(entry.file);
        });
        for (RuleEntry rule : rules) {
            validateRelativeFile(graphRoot, rule.file, Set.of(".rq"));
            if (!Set.of("derivation", "integrity").contains(rule.kind)) {
                throw new IllegalArgumentException("Unknown rule kind: " + rule.kind);
            }
        }

        Set<String> registeredAuthorityRdf = new HashSet<>(registeredRdf);
        registeredAuthorityRdf.removeAll(derivedGraphs.stream().map(entry -> entry.file).toList());
        Set<String> physicalAuthorityRdf;
        try (Stream<Path> paths = Files.walk(graphRoot)) {
            physicalAuthorityRdf = paths
                    .filter(Files::isRegularFile)
                    .map(graphRoot::relativize)
                    .map(Path::toString)
                    .map(value -> value.replace('\\', '/'))
                    .filter(GraphManifest::isRdfFile)
                    .filter(value -> !value.startsWith("fixtures/") && !value.startsWith("derived/"))
                    .collect(Collectors.toSet());
        }
        if (!registeredAuthorityRdf.equals(physicalAuthorityRdf)) {
            Set<String> unregistered = new HashSet<>(physicalAuthorityRdf);
            unregistered.removeAll(registeredAuthorityRdf);
            Set<String> missing = new HashSet<>(registeredAuthorityRdf);
            missing.removeAll(physicalAuthorityRdf);
            throw new IllegalArgumentException("Manifest registration mismatch; unregistered=" + unregistered + ", missing=" + missing);
        }
    }

    private static boolean isRdfFile(String value) {
        return value.endsWith(".ttl") || value.endsWith(".trig") || value.endsWith(".nq");
    }

    private static void validateRelativeFile(Path graphRoot, String relative, Set<String> suffixes) {
        if (relative == null || relative.isBlank()) {
            throw new IllegalArgumentException("Manifest file path is empty");
        }
        Path relativePath = Path.of(relative);
        if (relativePath.isAbsolute() || relativePath.normalize().startsWith("..")) {
            throw new IllegalArgumentException("Manifest file escapes graph root: " + relative);
        }
        Path resolved = graphRoot.resolve(relativePath).normalize();
        if (!resolved.startsWith(graphRoot) || !Files.isRegularFile(resolved) || Files.isSymbolicLink(resolved)) {
            throw new IllegalArgumentException("Manifest file is missing, non-regular, or symbolic: " + relative);
        }
        if (suffixes.stream().noneMatch(relative::endsWith)) {
            throw new IllegalArgumentException("Manifest file has unsupported format: " + relative);
        }
    }

    private static <T> void requireUnique(List<T> values, String label) {
        if (new HashSet<>(values).size() != values.size()) {
            throw new IllegalArgumentException("Duplicate " + label + " registration");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    public static final class GraphEntry {
        public String file;
        public String graph;
        public String collector;
        public int loadOrder;
        public int validationOrder;
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    public static final class RuleEntry {
        public String file;
        public String output;
        public String kind;
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    public static final class FixtureEntry {
        public String conforming;
        public String defects;
        public boolean loadAsAuthority;
    }
}
