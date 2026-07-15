package org.usf.validation;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

public final class ProofRunner {
    private static final long MAX_STORE_BYTES = 256L * 1024 * 1024;
    private static final long MAX_RSS_BYTES = 2304L * 1024 * 1024;
    private static final long MAX_PROOF_MILLIS = 600_000L;

    private ProofRunner() {
    }

    public static ProofResult run(Path repositoryRoot, GraphManifest manifest, String profile,
                                  Path chrootRoot, Path authoritySnapshot) throws Exception {
        return runInternal(repositoryRoot, manifest, profile, chrootRoot, authoritySnapshot, false);
    }

    private static ProofResult runInternal(Path repositoryRoot, GraphManifest manifest, String profile,
                                           Path chrootRoot, Path authoritySnapshot,
                                           boolean includeBenchmarkMeasurements) throws Exception {
        Instant started = Instant.now();
        String authorityAtStart = AuthoritySnapshot.requireCurrent(authoritySnapshot);
        Preflight.check(repositoryRoot, manifest, chrootRoot, authoritySnapshot);
        ProofResult result = "proof".equals(profile)
                ? runProof(repositoryRoot, manifest, started, authorityAtStart, includeBenchmarkMeasurements)
                : runFast(repositoryRoot, manifest, started, authorityAtStart, includeBenchmarkMeasurements);
        String authorityAtEnd = AuthoritySnapshot.requireCurrent(authoritySnapshot);
        Failures.require(authorityAtStart.equals(authorityAtEnd), "AUTHORITY_DIGEST_CHANGED",
                "Authority digest changed during validation execution");
        return result;
    }

    public static ProofResult compare(Path repositoryRoot, GraphManifest manifest, Path chrootRoot,
                                      Path authoritySnapshot) throws Exception {
        Instant started = Instant.now();
        String authorityAtStart = AuthoritySnapshot.requireCurrent(authoritySnapshot);
        Preflight.check(repositoryRoot, manifest, chrootRoot, authoritySnapshot);
        EngineRun rdf4j = runRdf4j(repositoryRoot, manifest, RdfMode.FAST);
        EngineRun jena = runJena(repositoryRoot, manifest);
        GraphComparison.Result graphs = GraphComparison.compare(rdf4j.graphDigests, jena.graphDigests);
        boolean traces = deterministicSteps(rdf4j.derivationSteps).equals(deterministicSteps(jena.derivationSteps));
        ShaclReports.Comparison shacl = ShaclReports.compare(rdf4j.shaclFindings, jena.shaclFindings);
        Failures.require(graphs.exact() && traces, "ENGINE_GRAPH_DISAGREEMENT",
                "Engine comparison found a graph or derivation-trace difference: " + graphs);
        Failures.require(rdf4j.shaclConforms && jena.shaclConforms && shacl.exact(),
                "ENGINE_SHACL_DISAGREEMENT", "Engine comparison found a normalized SHACL difference: " + shacl);
        Failures.require(rdf4j.cleaned && jena.cleaned, "CLEANUP_FAILURE",
                "An engine-comparison workspace was not cleaned");
        long maxStoreBytes = Math.max(rdf4j.storeBytes, jena.storeBytes);
        long elapsedMillis = Duration.between(started, Instant.now()).toMillis();
        long peakRssBytes = peakRssBytes();
        requireEngineResourceBounds(maxStoreBytes, peakRssBytes, elapsedMillis);
        LinkedHashMap<String, Object> stable = commonStableEvidence(repositoryRoot, manifest, authorityAtStart,
                rdf4j, "comparison", false);
        stable.put("independentProof", false);
        stable.put("comparison", Map.of("graphs", graphs, "derivationTraceParity", traces,
                "normalizedShaclParity", shacl.exact()));
        stable.put("exactJenaParity", true);
        stable.put("deterministicRdf4j", "not-evaluated");
        String authorityAtEnd = AuthoritySnapshot.requireCurrent(authoritySnapshot);
        Failures.require(authorityAtStart.equals(authorityAtEnd), "AUTHORITY_DIGEST_CHANGED",
                "Authority digest changed during engine comparison");
        return finishEvidence(stable, started, elapsedMillis, peakRssBytes, maxStoreBytes,
                List.of("Comparison runs both engines once and does not claim complete proof."));
    }

    static ProfilePlan profilePlan(String profile) {
        return "proof".equals(profile)
                ? new ProfilePlan(2, 1, true, true, true)
                : new ProfilePlan(1, 0, false, false, false);
    }

    public static Map<String, Object> benchmark(Path repositoryRoot, GraphManifest manifest, String profile,
                                                Path chrootRoot, Path authoritySnapshot) throws Exception {
        ProofResult result = runInternal(repositoryRoot, manifest, profile, chrootRoot, authoritySnapshot, true);
        LinkedHashMap<String, Object> benchmark = new LinkedHashMap<>();
        benchmark.put("schemaVersion", 1);
        benchmark.put("evidenceKind", "benchmark-evidence");
        benchmark.put("profile", profile);
        benchmark.put("acceptanceUnchanged", true);
        benchmark.put("stableEvidenceDigest", result.evidence.get("stableEvidenceDigest"));
        benchmark.put("engines", result.evidence.get("engines"));
        benchmark.put("resources", result.evidence.get("resources"));
        benchmark.put("derivedGraphs", result.evidence.get("derivedGraphs"));
        benchmark.put("cleanupVerified", result.evidence.get("cleanupVerified"));
        return Map.copyOf(benchmark);
    }

    private static ProofResult runFast(Path repositoryRoot, GraphManifest manifest, Instant started,
                                       String authorityDigest, boolean includeBenchmarkMeasurements) throws Exception {
        EngineRun rdf4j = runRdf4j(repositoryRoot, manifest, RdfMode.FAST);
        long elapsedMillis = Duration.between(started, Instant.now()).toMillis();
        long peakRssBytes = peakRssBytes();
        requireEngineResourceBounds(rdf4j.storeBytes, peakRssBytes, elapsedMillis);
        Failures.require(rdf4j.shaclConforms, "RDF4J_SHACL_NONCONFORMANCE",
                "RDF4J standalone SHACL validation did not conform");
        Failures.require(rdf4j.integrityConforms, "LIFECYCLE_INTEGRITY_FAILURE",
                "Lifecycle integrity or contamination validation did not conform");
        Failures.require(rdf4j.cleaned, "CLEANUP_FAILURE", "Fast-profile workspace was not cleaned");

        LinkedHashMap<String, Object> stable = commonStableEvidence(repositoryRoot, manifest, authorityDigest,
                rdf4j, "fast", false);
        stable.put("deterministicRdf4j", "not-evaluated");
        stable.put("exactJenaParity", "not-evaluated");
        stable.put("independentProof", false);
        stable.put("validation", Map.of(
                "rdf4jShaclConforms", true,
                "lifecycleIntegrityConforms", true,
                "integrityViolationCounts", rdf4j.integrityViolationCounts,
                "contaminationCount", rdf4j.contaminationCount));
        if (includeBenchmarkMeasurements) {
            stable.put("engines", Map.of("rdf4j", rdf4j.evidenceView()));
        }
        return finishEvidence(stable, started, elapsedMillis, peakRssBytes, rdf4j.storeBytes,
                List.of("Fast profile is primary-engine development feedback and is not independent proof."));
    }

    private static ProofResult runProof(Path repositoryRoot, GraphManifest manifest, Instant started,
                                        String authorityDigest, boolean includeBenchmarkMeasurements) throws Exception {
        requireCommittedPackage(repositoryRoot);
        EngineRun first = runRdf4j(repositoryRoot, manifest, RdfMode.PROOF_PRIMARY);
        EngineRun second = runRdf4j(repositoryRoot, manifest, RdfMode.DETERMINISM_ONLY);
        EngineRun jena = runJena(repositoryRoot, manifest);

        GraphComparison.Result repeated = GraphComparison.compare(first.graphDigests, second.graphDigests);
        GraphComparison.Result parity = GraphComparison.compare(first.graphDigests, jena.graphDigests);
        boolean deterministicSteps = deterministicSteps(first.derivationSteps)
                .equals(deterministicSteps(second.derivationSteps));
        boolean paritySteps = deterministicSteps(first.derivationSteps)
                .equals(deterministicSteps(jena.derivationSteps));
        ShaclReports.Comparison shaclComparison = ShaclReports.compare(first.shaclFindings, jena.shaclFindings);
        boolean deterministic = first.inputSha256.equals(second.inputSha256)
                && repeated.exact() && deterministicSteps
                && first.statementCount == second.statementCount;
        boolean exactParity = first.inputSha256.equals(jena.inputSha256)
                && parity.exact() && paritySteps;

        Failures.require(deterministic, "RDF4J_NONDETERMINISM",
                "Two clean RDF4J runs differed: " + repeated);
        Failures.require(exactParity, "ENGINE_GRAPH_DISAGREEMENT",
                "Jena derived graph results differ from RDF4J: " + parity);
        Failures.require(first.integrityConforms, "INTEGRITY_FAILURE",
                "Global integrity, lifecycle integrity, or contamination did not conform");
        Failures.require(first.shaclConforms && jena.shaclConforms,
                "SHACL_NONCONFORMANCE", "RDF4J or Jena SHACL validation did not conform");
        Failures.require(shaclComparison.exact(), "ENGINE_SHACL_DISAGREEMENT",
                "Normalized RDF4J/Jena SHACL findings differ: " + shaclComparison);
        Failures.require(first.incremental != null && first.incremental.conforms(),
                "INCREMENTAL_SHACL_FAILURE", "Incremental ShaclSail validation did not conform");
        Failures.require(first.cleaned && second.cleaned && jena.cleaned,
                "CLEANUP_FAILURE", "A proof workspace was not cleaned");

        long maxStoreBytes = Math.max(first.storeBytes, Math.max(second.storeBytes, jena.storeBytes));
        long elapsedMillis = Duration.between(started, Instant.now()).toMillis();
        long peakRssBytes = peakRssBytes();
        requireEngineResourceBounds(maxStoreBytes, peakRssBytes, elapsedMillis);

        LinkedHashMap<String, Object> stable = commonStableEvidence(repositoryRoot, manifest, authorityDigest,
                first, "proof", true);
        stable.put("deterministicRdf4j", true);
        stable.put("exactJenaParity", true);
        stable.put("independentProof", true);
        stable.put("comparison", Map.of(
                "repeatedRdf4j", repeated,
                "rdf4jJena", parity,
                "derivationTraceParity", paritySteps,
                "normalizedShaclParity", shaclComparison.exact()));
        stable.put("validation", Map.of(
                "rdf4jShaclConforms", first.shaclConforms,
                "jenaShaclConforms", jena.shaclConforms,
                "rdf4jShaclFindings", first.shaclFindings.size(),
                "jenaShaclFindings", jena.shaclFindings.size(),
                "globalIntegrityConforms", first.integrityConforms,
                "integrityViolationCounts", first.integrityViolationCounts,
                "contaminationCount", first.contaminationCount,
                "incremental", first.incremental));
        if (includeBenchmarkMeasurements) {
            stable.put("engines", Map.of("rdf4j", first.evidenceView(), "jena", jena.evidenceView()));
        }
        return finishEvidence(stable, started, elapsedMillis, peakRssBytes, maxStoreBytes,
                List.of("The primary RDF4J engine evaluates global and lifecycle integrity; Jena independently evaluates derivation and SHACL parity."));
    }

    private static LinkedHashMap<String, Object> commonStableEvidence(Path repositoryRoot, GraphManifest manifest,
                                                                      String authorityDigest, EngineRun primary,
                                                                      String profile, boolean proof) throws Exception {
        LinkedHashMap<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("schemaVersion", 1);
        evidence.put("evidenceKind", proof ? "validation-evidence-manifest" : "bounded-validation-result");
        evidence.put("semanticContract", "urn:usf:semanticcontract:localsemanticvalidationtoolchain");
        evidence.put("proofObligation", "urn:usf:proofobligation:localsemanticvalidationtoolchain");
        evidence.put("realisationDecision", "urn:usf:realisationdecision:localvalidationtoolchain");
        evidence.put("authorityDigest", authorityDigest);
        evidence.put("profile", profile);
        evidence.put("status", "pass");
        evidence.put("implementationIdentity", "maldous/usf:census/local-semantic-validation");
        evidence.put("implementationGitCommit", git(repositoryRoot, "rev-parse", "HEAD"));
        Map<String, String> sourceFiles = sourceFileDigests(repositoryRoot);
        evidence.put("sourceDigestRoots", Map.of(
                "java", "census/local-semantic-validation/src/main/java/org/usf/validation",
                "build", "census/local-semantic-validation"));
        evidence.put("sourceFileDigests", sourceFiles);
        evidence.put("sourceTreeDigest", sourceTreeDigest(sourceFiles));
        evidence.put("dependencyLockSha256", Digests.sha256(repositoryRoot.resolve(
                "census/local-semantic-validation/dependencies.lock.json")));
        evidence.put("manifestSha256", Digests.sha256(repositoryRoot.resolve("graph/manifest.yaml")));
        evidence.put("inputSha256", primary.inputSha256);
        evidence.put("shapeSetSha256", shapeSetDigest(repositoryRoot, manifest));
        evidence.put("ruleDigests", ruleDigests(repositoryRoot, manifest));
        evidence.put("derivationTraceSha256", derivationTraceDigest(primary.derivationSteps));
        evidence.put("derivedGraphs", primary.graphDigests);
        evidence.put("canonicalization", Map.of(
                "algorithm", Digests.GRAPH_ALGORITHM,
                "implementationVersion", Digests.GRAPH_IMPLEMENTATION_VERSION,
                "blankNodeHandling", Digests.RDF4J_CANONICALIZER.blankNodeHandling(),
                "graphIdentityHandling", Digests.RDF4J_CANONICALIZER.graphIdentityHandling(),
                "serializationNormalization", Digests.RDF4J_CANONICALIZER.serializationNormalization(),
                "digestAlgorithm", "sha256"));
        evidence.put("runtime", Map.of(
                "java", Runtime.version().toString(),
                "maven", "3.9.11",
                "rdf4j", Rdf4jEngine.VERSION,
                "jena", JenaEngine.VERSION));
        evidence.put("hostChrootBoundary", "host-full-corpus/chroot-bounded-json/no-java");
        evidence.put("cleanupVerified", true);
        evidence.put("nonclaims", List.of(
                "urn:usf:nonclaim:localenginenotsemanticauthority",
                "urn:usf:nonclaim:nochrootjavaruntime",
                "urn:usf:nonclaim:nolivepublicationfromlocalevidencealone"));
        return evidence;
    }

    private static ProofResult finishEvidence(LinkedHashMap<String, Object> stable, Instant started,
                                              long elapsedMillis, long peakRssBytes, long storeBytes,
                                              List<String> limitations) throws IOException {
        ObjectMapper mapper = BoundedResult.jsonMapper();
        stable.put("stableEvidenceDigest", "sha256:" + Digests.sha256(mapper.writeValueAsBytes(stable)));
        LinkedHashMap<String, Object> evidence = new LinkedHashMap<>(stable);
        evidence.put("resources", Map.of(
                "temporaryPersistentBytes", storeBytes,
                "peakRssBytes", peakRssBytes,
                "elapsedMillis", elapsedMillis,
                "storeLimitBytes", MAX_STORE_BYTES,
                "rssLimitBytes", MAX_RSS_BYTES,
                "proofLimitMillis", MAX_PROOF_MILLIS));
        evidence.put("generatedAt", started.toString());
        evidence.put("validUntil", started.plus(Duration.ofDays(30)).toString());
        evidence.put("limitations", limitations);
        evidence.put("evidenceDigest", "sha256:" + Digests.sha256(mapper.writeValueAsBytes(evidence)));
        return new ProofResult(Map.copyOf(evidence));
    }

    private static EngineRun runRdf4j(Path repositoryRoot, GraphManifest manifest, RdfMode mode) throws Exception {
        Path workspacePath;
        Rdf4jEngine.LoadResult load;
        Rdf4jEngine.DeriveResult derive;
        Rdf4jEngine.IntegrityResult integrity = null;
        Rdf4jEngine.ShaclResult shacl = null;
        Rdf4jEngine.IncrementalResult incremental = null;
        long count;
        long storeBytes;
        Instant cleanupStarted;
        try (ManagedWorkspace workspace = ManagedWorkspace.create(repositoryRoot, null, false)) {
            workspacePath = workspace.root();
            try (Rdf4jEngine engine = new Rdf4jEngine(repositoryRoot, manifest, workspace.rdf4jDirectory())) {
                load = engine.load();
                derive = engine.derive();
                if (mode != RdfMode.DETERMINISM_ONLY) {
                    integrity = engine.integrity(mode == RdfMode.PROOF_PRIMARY);
                    shacl = engine.validateStandalone();
                }
                count = engine.statementCount();
            }
            if (mode == RdfMode.PROOF_PRIMARY) {
                incremental = Rdf4jEngine.validateIncremental(repositoryRoot, manifest,
                        Files.createDirectories(workspace.root().resolve("rdf4j-incremental")));
            }
            storeBytes = workspace.byteSize();
            cleanupStarted = Instant.now();
        }
        long cleanupMillis = Duration.between(cleanupStarted, Instant.now()).toMillis();
        return new EngineRun("rdf4j-" + mode.name().toLowerCase(), load.inputSha256(), count,
                derive.graphDigests(), derive.steps(),
                integrity != null, integrity == null || integrity.conforms(),
                integrity == null ? Map.of() : integrity.violationCounts(),
                integrity == null ? 0 : integrity.contaminationCount(),
                shacl != null, shacl == null || shacl.conforms(),
                shacl == null ? List.of() : shacl.findings(), incremental,
                storeBytes, !Files.exists(workspacePath), load.elapsedMillis(), derive.elapsedMillis(),
                shacl == null ? 0 : shacl.elapsedMillis(),
                integrity == null ? Map.of() : integrity.timingsMillis(), derive.timingsMillis(),
                derive.canonicalizationMillis(), incremental == null ? 0 : incremental.elapsedMillis(),
                cleanupMillis);
    }

    private static EngineRun runJena(Path repositoryRoot, GraphManifest manifest) throws Exception {
        Path workspacePath;
        JenaEngine.LoadResult load;
        JenaEngine.DeriveResult derive;
        JenaEngine.ShaclResult shacl;
        long count;
        long storeBytes;
        Instant cleanupStarted;
        try (ManagedWorkspace workspace = ManagedWorkspace.create(repositoryRoot, null, false)) {
            workspacePath = workspace.root();
            try (JenaEngine engine = new JenaEngine(repositoryRoot, manifest, workspace.jenaDirectory())) {
                load = engine.load();
                derive = engine.derive();
                shacl = engine.validateShacl();
                count = engine.statementCount();
            }
            storeBytes = workspace.byteSize();
            cleanupStarted = Instant.now();
        }
        long cleanupMillis = Duration.between(cleanupStarted, Instant.now()).toMillis();
        return new EngineRun("jena-proof", load.inputSha256(), count, derive.graphDigests(), derive.steps(),
                false, true, Map.of(), 0, true, shacl.conforms(), shacl.findings(), null,
                storeBytes, !Files.exists(workspacePath), load.elapsedMillis(), derive.elapsedMillis(),
                shacl.elapsedMillis(), Map.of(), derive.timingsMillis(), derive.canonicalizationMillis(), 0,
                cleanupMillis);
    }

    private static List<DerivationStep.DeterministicIdentity> deterministicSteps(List<DerivationStep> steps) {
        return steps.stream().map(DerivationStep::deterministicIdentity).toList();
    }

    private static String derivationTraceDigest(List<DerivationStep> steps) throws IOException {
        return "sha256:" + Digests.sha256(BoundedResult.jsonMapper()
                .writeValueAsBytes(deterministicSteps(steps)));
    }

    private static void requireCommittedPackage(Path repositoryRoot) throws IOException, InterruptedException {
        String packageStatus = git(repositoryRoot, "status", "--porcelain", "--",
                "census/local-semantic-validation");
        Failures.require(packageStatus.isBlank(), "UNCOMMITTED_IMPLEMENTATION",
                "Implementation package differs from the Git commit used for proof evidence");
    }

    private static void requireEngineResourceBounds(long storeBytes, long peakRssBytes, long elapsedMillis) {
        Failures.require(storeBytes <= MAX_STORE_BYTES, "TEMPORARY_DISK_LIMIT",
                "Temporary persistent storage exceeded 256 MiB: " + storeBytes);
        Failures.require(peakRssBytes <= MAX_RSS_BYTES, "PEAK_RSS_LIMIT",
                "Peak RSS exceeded 2304 MiB: " + peakRssBytes);
        Failures.require(elapsedMillis <= MAX_PROOF_MILLIS, "PROOF_TIME_LIMIT",
                "Validation runtime exceeded 600 seconds: " + elapsedMillis);
    }

    private static String shapeSetDigest(Path repositoryRoot, GraphManifest manifest) throws IOException {
        StringBuilder value = new StringBuilder();
        for (GraphManifest.GraphEntry entry : manifest.shapeGraphs) {
            value.append(entry.file).append('\0')
                    .append(Digests.sha256(repositoryRoot.resolve("graph").resolve(entry.file))).append('\n');
        }
        return Digests.sha256(value.toString());
    }

    private static Map<String, String> ruleDigests(Path repositoryRoot, GraphManifest manifest) throws IOException {
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        for (GraphManifest.RuleEntry entry : manifest.rules) {
            values.put(entry.file, Digests.sha256(repositoryRoot.resolve("graph").resolve(entry.file)));
        }
        return Map.copyOf(values);
    }

    private static long peakRssBytes() throws IOException {
        for (String line : Files.readAllLines(Path.of("/proc/self/status"), StandardCharsets.UTF_8)) {
            if (line.startsWith("VmHWM:")) {
                String numeric = line.substring("VmHWM:".length()).trim().split("\\s+")[0];
                return Long.parseLong(numeric) * 1024L;
            }
        }
        throw new IllegalStateException("Linux peak RSS metric is unavailable");
    }

    private static Map<String, String> sourceFileDigests(Path repositoryRoot) throws IOException {
        Path packageRoot = repositoryRoot.resolve("census/local-semantic-validation");
        TreeMap<String, String> digests = new TreeMap<>();
        String javaRoot = "src/main/java/org/usf/validation/";
        List<String> buildFiles = List.of("pom.xml", "mvnw", "run", "toolchain.json",
                "dependencies.lock.json", ".mvn/wrapper/maven-wrapper.properties");
        try (Stream<Path> paths = Files.walk(packageRoot)) {
            for (Path path : paths.filter(Files::isRegularFile).toList()) {
                String name = packageRoot.relativize(path).toString().replace('\\', '/');
                if (name.startsWith(javaRoot)) {
                    digests.put("java/" + name.substring(javaRoot.length()), Digests.sha256(path));
                } else if (buildFiles.contains(name)) {
                    digests.put("build/" + name, Digests.sha256(path));
                }
            }
        }
        return Map.copyOf(digests);
    }

    private static String sourceTreeDigest(Map<String, String> files) {
        StringBuilder inventory = new StringBuilder();
        new TreeMap<>(files).forEach((path, digest) -> inventory.append(path).append('\0').append(digest).append('\n'));
        return "sha256:" + Digests.sha256(inventory.toString());
    }

    private static String git(Path repositoryRoot, String... arguments) throws IOException, InterruptedException {
        ArrayList<String> command = new ArrayList<>();
        command.add("git");
        command.add("-C");
        command.add(repositoryRoot.toString());
        command.addAll(List.of(arguments));
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        if (!process.waitFor(20, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IllegalStateException("Git evidence identity command timed out");
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        Failures.require(process.exitValue() == 0, "GIT_IDENTITY_FAILURE",
                "Git evidence identity command failed");
        return output;
    }

    private enum RdfMode {
        FAST,
        PROOF_PRIMARY,
        DETERMINISM_ONLY
    }

    private record EngineRun(String engine, String inputSha256, long statementCount,
                             Map<String, Digests.GraphDigest> graphDigests,
                             List<DerivationStep> derivationSteps,
                             boolean integrityEvaluated, boolean integrityConforms,
                             Map<String, Integer> integrityViolationCounts, int contaminationCount,
                             boolean shaclEvaluated, boolean shaclConforms,
                             List<ShaclFinding> shaclFindings,
                             Rdf4jEngine.IncrementalResult incremental,
                             long storeBytes, boolean cleaned, long loadMillis, long deriveMillis,
                             long shaclMillis, Map<String, Long> integrityTimings,
                             Map<String, Long> derivationTimings, long canonicalizationMillis,
                             long incrementalMillis, long cleanupMillis) {
        Map<String, Object> evidenceView() {
            LinkedHashMap<String, Object> value = new LinkedHashMap<>();
            value.put("engine", engine.startsWith("rdf4j")
                    ? "RDF4J NativeStore 6.0.0" : "Apache Jena TDB2 6.1.0");
            value.put("statementCount", statementCount);
            value.put("integrityEvaluated", integrityEvaluated);
            value.put("integrityConforms", integrityConforms);
            value.put("shaclEvaluated", shaclEvaluated);
            value.put("shaclConforms", shaclConforms);
            value.put("loadMillis", loadMillis);
            value.put("deriveMillis", deriveMillis);
            value.put("derivationFamilyMillis", derivationTimings);
            value.put("canonicalizationMillis", canonicalizationMillis);
            value.put("shaclMillis", shaclMillis);
            value.put("integrityMillis", integrityTimings);
            value.put("incrementalMillis", incrementalMillis);
            value.put("cleanupMillis", cleanupMillis);
            value.put("storeBytes", storeBytes);
            value.put("cleaned", cleaned);
            return value;
        }
    }

    public record ProofResult(Map<String, Object> evidence) {
    }

    record ProfilePlan(int rdf4jRuns, int jenaRuns, boolean globalIntegrity,
                       boolean incrementalShacl, boolean independentProof) {
    }
}
