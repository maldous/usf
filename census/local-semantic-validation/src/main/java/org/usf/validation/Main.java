package org.usf.validation;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class Main {
    private static final long MAX_STORE_BYTES = 256L * 1024 * 1024;

    private Main() {
    }

    public static void main(String[] args) {
        CliOptions options = null;
        try {
            options = CliOptions.parse(args);
            try (RunLock ignored = RunLock.acquire(options.repositoryRoot())) {
                GraphManifest manifest = GraphManifest.read(options.repositoryRoot());
                Map<String, Object> details = dispatch(options, manifest);
                BoundedResult.emit(options.command(), "pass", details, options.output());
            }
        } catch (Exception exception) {
            String command = options == null ? (args.length == 0 ? "unknown" : args[0]) : options.command();
            Path output = options == null ? null : options.output();
            try {
                BoundedResult.emit(command, "fail", Map.of(
                        "errorCode", Failures.code(exception),
                        "errorType", exception.getClass().getName(),
                        "message", safeMessage(exception)), output);
            } catch (Exception encodingException) {
                System.out.println("{\"schemaVersion\":1,\"command\":\"unknown\",\"status\":\"fail\",\"details\":{\"message\":\"result encoding failed\"}}");
            }
            System.err.println("USF local semantic validation failed: " + safeMessage(exception));
            System.exit(1);
        }
    }

    private static Map<String, Object> dispatch(CliOptions options, GraphManifest manifest) throws Exception {
        if (!Set.of("check", "clean").contains(options.command())) {
            Preflight.check(options.repositoryRoot(), manifest, options.chrootRoot(), options.authoritySnapshot());
        }
        return switch (options.command()) {
            case "check" -> Preflight.check(options.repositoryRoot(), manifest, options.chrootRoot(),
                    options.authoritySnapshot()).checks();
            case "load" -> load(options, manifest);
            case "derive" -> derive(options, manifest);
            case "validate" -> validate(options, manifest);
            case "validate-incremental" -> validateIncremental(options, manifest);
            case "integrity" -> integrity(options, manifest);
            case "compare" -> compare(options, manifest);
            case "prove" -> proof(options, manifest);
            case "benchmark" -> ProofRunner.benchmark(options.repositoryRoot(), manifest, options.profile(),
                    options.chrootRoot(), options.authoritySnapshot());
            case "clean" -> clean(options);
            default -> throw new IllegalArgumentException("Unknown command: " + options.command());
        };
    }

    private static Map<String, Object> load(CliOptions options, GraphManifest manifest) throws Exception {
        try (ManagedWorkspace workspace = ManagedWorkspace.create(options.repositoryRoot(), options.workDirectory(), false)) {
            String manifestDigest = Digests.sha256(options.repositoryRoot().resolve("graph/manifest.yaml"));
            long count;
            String inputDigest;
            long elapsed;
            if ("rdf4j".equals(options.engine())) {
                try (Rdf4jEngine engine = new Rdf4jEngine(options.repositoryRoot(), manifest, workspace.rdf4jDirectory())) {
                    Rdf4jEngine.LoadResult result = engine.load();
                    count = result.statementCount();
                    inputDigest = result.inputSha256();
                    elapsed = result.elapsedMillis();
                }
            } else {
                try (JenaEngine engine = new JenaEngine(options.repositoryRoot(), manifest, workspace.jenaDirectory())) {
                    JenaEngine.LoadResult result = engine.load();
                    count = result.statementCount();
                    inputDigest = result.inputSha256();
                    elapsed = result.elapsedMillis();
                }
            }
            workspace.writeMetadata(new ManagedWorkspace.StoreMetadata(options.engine(), options.repositoryRoot(),
                    manifestDigest, inputDigest, count, Map.of()));
            long bytes = workspace.byteSize();
            require(bytes <= MAX_STORE_BYTES, "Temporary persistent storage exceeds 256 MiB: " + bytes);
            workspace.retain();
            return Map.of("engine", options.engine(), "workDirectory", workspace.root().toString(),
                    "statementCount", count, "inputSha256", inputDigest, "elapsedMillis", elapsed, "storeBytes", bytes);
        }
    }

    private static Map<String, Object> derive(CliOptions options, GraphManifest manifest) throws Exception {
        ManagedWorkspace workspace = ManagedWorkspace.open(options.repositoryRoot(), options.workDirectory(), true);
        ManagedWorkspace.StoreMetadata metadata = verifyMetadata(workspace, options, false);
        Map<String, Digests.GraphDigest> graphs;
        java.util.List<DerivationStep> steps;
        long elapsed;
        long count;
        if ("rdf4j".equals(options.engine())) {
            try (Rdf4jEngine engine = new Rdf4jEngine(options.repositoryRoot(), manifest, workspace.rdf4jDirectory())) {
                Rdf4jEngine.DeriveResult result = engine.derive();
                graphs = result.graphDigests();
                steps = result.steps();
                elapsed = result.elapsedMillis();
                count = engine.statementCount();
            }
        } else {
            try (JenaEngine engine = new JenaEngine(options.repositoryRoot(), manifest, workspace.jenaDirectory())) {
                JenaEngine.DeriveResult result = engine.derive();
                graphs = result.graphDigests();
                steps = result.steps();
                elapsed = result.elapsedMillis();
                count = engine.statementCount();
            }
        }
        metadata.statementCount = count;
        metadata.derivedGraphs = graphs;
        workspace.writeMetadata(metadata);
        long bytes = workspace.byteSize();
        require(bytes <= MAX_STORE_BYTES, "Temporary persistent storage exceeds 256 MiB: " + bytes);
        return Map.of("engine", options.engine(), "derivedGraphs", graphs,
                "derivationSteps", steps,
                "elapsedMillis", elapsed, "storeBytes", bytes);
    }

    private static Map<String, Object> validate(CliOptions options, GraphManifest manifest) throws Exception {
        ManagedWorkspace workspace = ManagedWorkspace.open(options.repositoryRoot(), options.workDirectory(), true);
        verifyMetadata(workspace, options, true);
        if ("rdf4j".equals(options.engine())) {
            try (Rdf4jEngine engine = new Rdf4jEngine(options.repositoryRoot(), manifest, workspace.rdf4jDirectory())) {
                Rdf4jEngine.ShaclResult result = engine.validateStandalone();
                require(result.conforms(), "RDF4J standalone SHACL did not conform; results=" + result.resultCount());
                return Map.of("engine", "rdf4j", "conforms", true, "resultCount", result.resultCount(),
                        "truncated", result.truncated(), "elapsedMillis", result.elapsedMillis());
            }
        }
        try (JenaEngine engine = new JenaEngine(options.repositoryRoot(), manifest, workspace.jenaDirectory())) {
            JenaEngine.ShaclResult result = engine.validateShacl();
            require(result.conforms(), "Jena SHACL did not conform; results=" + result.resultCount());
            return Map.of("engine", "jena", "conforms", true, "resultCount", result.resultCount(),
                    "elapsedMillis", result.elapsedMillis());
        }
    }

    private static Map<String, Object> validateIncremental(CliOptions options, GraphManifest manifest) throws Exception {
        Path workspacePath;
        Rdf4jEngine.IncrementalResult result;
        try (ManagedWorkspace workspace = ManagedWorkspace.create(options.repositoryRoot(), options.workDirectory(), options.keepWork())) {
            workspacePath = workspace.root();
            result = Rdf4jEngine.validateIncremental(options.repositoryRoot(), manifest,
                    Files.createDirectories(workspace.root().resolve("rdf4j-incremental")));
            require(result.conforms(), "Incremental ShaclSail transaction fixture did not conform: " + result);
        }
        LinkedHashMap<String, Object> details = new LinkedHashMap<>();
        details.put("engine", "rdf4j-shaclsail");
        details.put("conforms", true);
        details.put("conformingCommitted", result.conformingCommitted());
        details.put("defectRejected", result.defectRejected());
        details.put("shapeChangeCommitted", result.shapeChangeCommitted());
        details.put("boundedDataCommitted", result.boundedDataCommitted());
        details.put("affectedShapeFamily", result.affectedShapeFamily());
        details.put("isolationLevel", result.isolationLevel());
        details.put("cacheSelectNodes", result.cacheSelectNodes());
        details.put("parallelValidation", result.parallelValidation());
        details.put("rollbackClean", result.rollbackClean());
        details.put("cleaned", !Files.exists(workspacePath));
        return details;
    }

    private static Map<String, Object> integrity(CliOptions options, GraphManifest manifest) throws Exception {
        ManagedWorkspace workspace = ManagedWorkspace.open(options.repositoryRoot(), options.workDirectory(), true);
        verifyMetadata(workspace, options, true);
        if ("rdf4j".equals(options.engine())) {
            try (Rdf4jEngine engine = new Rdf4jEngine(options.repositoryRoot(), manifest, workspace.rdf4jDirectory())) {
                Rdf4jEngine.IntegrityResult result = engine.integrity();
                require(result.conforms(), "RDF4J integrity violations: " + result.sample());
                return Map.of("engine", "rdf4j", "conforms", true, "violationCounts", result.violationCounts(),
                        "timingsMillis", result.timingsMillis());
            }
        }
        try (JenaEngine engine = new JenaEngine(options.repositoryRoot(), manifest, workspace.jenaDirectory())) {
            JenaEngine.IntegrityResult result = engine.integrity();
            require(result.conforms(), "Jena integrity violations: " + result.sample());
            return Map.of("engine", "jena", "conforms", true, "violationCounts", result.violationCounts(),
                    "timingsMillis", result.timingsMillis());
        }
    }

    private static Map<String, Object> proof(CliOptions options, GraphManifest manifest) throws Exception {
        ProofRunner.ProofResult result = ProofRunner.run(options.repositoryRoot(), manifest, options.profile(),
                options.chrootRoot(), options.authoritySnapshot());
        if (options.envelopeOutput() != null) {
            Map<String, Object> envelope = new LinkedHashMap<>();
            envelope.put("schemaVersion", 1);
            envelope.put("evidenceDigest", result.evidence().get("evidenceDigest"));
            envelope.put("java", Runtime.version().toString());
            envelope.put("os", System.getProperty("os.name") + " " + System.getProperty("os.version") + " " + System.getProperty("os.arch"));
            envelope.put("providerMode", "hermetic-mock");
            envelope.put("environment", "localdev");
            BoundedResult.write(options.envelopeOutput(), BoundedResult.encode("execution-envelope", "pass", envelope));
        }
        return result.evidence();
    }

    private static Map<String, Object> compare(CliOptions options, GraphManifest manifest) throws Exception {
        return ProofRunner.compare(options.repositoryRoot(), manifest, options.chrootRoot(),
                options.authoritySnapshot()).evidence();
    }

    private static Map<String, Object> clean(CliOptions options) throws Exception {
        ManagedWorkspace workspace = ManagedWorkspace.open(options.repositoryRoot(), options.workDirectory(), true);
        String root = workspace.root().toString();
        workspace.clean();
        return Map.of("workDirectory", root, "cleaned", true);
    }

    static ManagedWorkspace.StoreMetadata verifyMetadata(ManagedWorkspace workspace, CliOptions options,
                                                          boolean requireDerived) throws IOException {
        ManagedWorkspace.StoreMetadata metadata = workspace.readMetadata();
        require(metadata.schemaVersion == 1, "Store metadata schema is unsupported");
        require(options.engine().equals(metadata.engine), "Store engine differs from --engine");
        require(options.repositoryRoot().toString().equals(metadata.repositoryRoot), "Store repository root differs from current repository");
        require(Digests.sha256(options.repositoryRoot().resolve("graph/manifest.yaml")).equals(metadata.manifestSha256),
                "Store manifest digest is stale");
        if (requireDerived) {
            require(metadata.derivedGraphs != null && metadata.derivedGraphs.size() == 7,
                    "All seven derivation families must be materialised first");
        }
        return metadata;
    }

    private static String safeMessage(Throwable exception) {
        String value = exception.getMessage();
        if (value == null || value.isBlank()) {
            value = exception.getClass().getSimpleName();
        }
        return value.length() > 1200 ? value.substring(0, 1200) : value;
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }
}
