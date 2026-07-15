package org.usf.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.jena.Jena;
import org.eclipse.rdf4j.common.io.MavenUtil;
import org.eclipse.rdf4j.sail.nativerdf.NativeStore;

import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public final class Preflight {
    public static final String AUTHORITY_DIGEST = "c017bb46d7dbce674d3eff93ed3d6db4b0876b0003a22bff03480d726ac79cce";
    static final long REQUIRED_TEMPORARY_BYTES = 256L * 1024 * 1024;
    static final long REQUIRED_AVAILABLE_MEMORY_BYTES = 2304L * 1024 * 1024;
    static final long REQUIRED_MAX_HEAP_BYTES = 1024L * 1024 * 1024;

    private Preflight() {
    }

    public static Result check(Path repositoryRoot, GraphManifest manifest) throws IOException, InterruptedException {
        return check(repositoryRoot, manifest, repositoryRoot.resolve("v2"), null);
    }

    public static Result check(Path repositoryRoot, GraphManifest manifest, Path chrootRoot)
            throws IOException, InterruptedException {
        return check(repositoryRoot, manifest, chrootRoot, null);
    }

    public static Result check(Path repositoryRoot, GraphManifest manifest, Path chrootRoot, Path authoritySnapshot)
            throws IOException, InterruptedException {
        LinkedHashMap<String, Object> checks = new LinkedHashMap<>();
        requireJavaFeature(Runtime.version().feature());
        checks.put("java", Runtime.version().toString());

        String rdf4jVersion = MavenUtil.loadVersion("org.eclipse.rdf4j", "rdf4j-sail-nativerdf", "unknown");
        require(Rdf4jEngine.VERSION.equals(rdf4jVersion), "Loaded RDF4J version is not " + Rdf4jEngine.VERSION + ": " + rdf4jVersion);
        String jenaVersion = MavenUtil.loadVersion("org.apache.jena", "jena-core", "unknown");
        require(JenaEngine.VERSION.equals(jenaVersion), "Loaded Jena version is not " + JenaEngine.VERSION + ": " + jenaVersion);
        checks.put("rdf4j", rdf4jVersion);
        checks.put("jena", jenaVersion);
        checks.put("nativeStoreIndexes", Rdf4jEngine.INDEXES);

        Path packageRoot = repositoryRoot.resolve("census/local-semantic-validation");
        JsonNode toolchain = BoundedResult.jsonMapper().readTree(packageRoot.resolve("toolchain.json").toFile());
        require(AUTHORITY_DIGEST.equals(toolchain.path("authorityDigest").asText()), "Toolchain authority digest is not the bootstrapped live digest");
        require("maldous/usf".equals(toolchain.path("repository").asText()), "Toolchain repository ownership mismatch");
        require("census/local-semantic-validation".equals(toolchain.path("authorisedPath").asText()), "Toolchain source-path authorization mismatch");
        checks.put("authorityDigest", AUTHORITY_DIGEST);
        checks.put("authoritySnapshot", AuthoritySnapshot.requireCurrent(authoritySnapshot));
        checks.put("manifestSha256", Digests.sha256(repositoryRoot.resolve("graph/manifest.yaml")));

        String remote = gitRemote(repositoryRoot);
        require(remote.matches("(?:https://github\\.com/|git@github\\.com:|ssh://git@github\\.com/)?maldous/usf(?:\\.git)?"),
                "Git origin is not maldous/usf");
        checks.put("repository", "maldous/usf");

        verifyDependencyLock(packageRoot.resolve("dependencies.lock.json"));
        checks.put("dependencyLock", Digests.sha256(packageRoot.resolve("dependencies.lock.json")));

        Path temporaryRoot = Path.of(System.getProperty("java.io.tmpdir")).toRealPath();
        validateTemporaryRoot(repositoryRoot, temporaryRoot);
        long usableBytes = Files.getFileStore(temporaryRoot).getUsableSpace();
        long availableMemoryBytes = availableMemoryBytes();
        long maxHeapBytes = Runtime.getRuntime().maxMemory();
        requireCapacity(usableBytes, availableMemoryBytes, maxHeapBytes);
        checks.put("temporaryUsableBytes", usableBytes);
        checks.put("availableMemoryBytes", availableMemoryBytes);
        checks.put("maxHeapBytes", maxHeapBytes);
        require(Files.isExecutable(Path.of("/usr/bin/du")), "GNU du is required at /usr/bin/du");
        require(Files.isExecutable(Path.of("/usr/bin/timeout")), "GNU timeout is required at /usr/bin/timeout");
        require(gitCheckIgnored(repositoryRoot, "census/local-semantic-validation/target"),
                "Generated package target is not ignored by Git");

        verifyChrootBoundary(chrootRoot);
        checks.put("chrootBoundary", "no-java-no-full-corpus-no-maven-repository");
        checks.put("manifestDataGraphs", manifest.dataGraphs().size());
        checks.put("manifestShapeFragments", manifest.shapeGraphs.size());
        checks.put("manifestDerivationFamilies", manifest.derivationRules().size());
        return new Result(checks);
    }

    static void requireJavaFeature(int feature) {
        require(feature == 25, "OpenJDK feature version is not 25: " + feature);
    }

    static void requireCapacity(long usableBytes, long availableMemoryBytes, long maxHeapBytes) {
        require(usableBytes >= REQUIRED_TEMPORARY_BYTES,
                "Insufficient temporary disk: " + usableBytes);
        require(availableMemoryBytes >= REQUIRED_AVAILABLE_MEMORY_BYTES,
                "Insufficient available memory: " + availableMemoryBytes);
        require(maxHeapBytes >= REQUIRED_MAX_HEAP_BYTES,
                "Insufficient Java heap allowance: " + maxHeapBytes);
    }

    static void validateTemporaryRoot(Path repositoryRoot, Path temporaryRoot) throws IOException {
        require(Files.isDirectory(temporaryRoot) && !Files.isSymbolicLink(temporaryRoot),
                "Temporary root is missing, non-directory, or symbolic: " + temporaryRoot);
        require(Files.isWritable(temporaryRoot), "Temporary root is not writable: " + temporaryRoot);
        require(!temporaryRoot.startsWith(repositoryRoot.toRealPath()),
                "Temporary root must be outside the repository: " + temporaryRoot);
    }

    static void verifyDependencyLock(Path lockPath) throws IOException {
        require(Files.isRegularFile(lockPath), "Dependency lock is missing");
        ObjectMapper mapper = BoundedResult.jsonMapper();
        JsonNode root = mapper.readTree(lockPath.toFile());
        require(root.path("schemaVersion").asInt() == 1, "Dependency lock schema is unsupported");
        require(root.path("artifacts").isArray() && !root.path("artifacts").isEmpty(), "Dependency lock has no artifacts");

        @SuppressWarnings("unchecked")
        Map<String, Object> lock = mapper.convertValue(root, Map.class);
        Object claimed = lock.remove("lockDigest");
        String observedLockDigest = "sha256:" + Digests.sha256(mapper.writeValueAsBytes(lock));
        require(observedLockDigest.equals(claimed), "Dependency lock self-digest mismatch");

        Path localRepository = Path.of(System.getProperty("user.home"), ".m2", "repository").toRealPath();
        for (JsonNode artifact : root.path("artifacts")) {
            String relative = artifact.path("repositoryPath").asText();
            Path path = localRepository.resolve(relative).normalize();
            require(path.startsWith(localRepository) && Files.isRegularFile(path), "Locked artifact is unavailable: " + relative);
            require(artifact.path("sha256").asText().equals(Digests.sha256(path)), "Locked artifact digest mismatch: " + relative);
            require(artifact.path("byteSize").asLong() == Files.size(path), "Locked artifact size mismatch: " + relative);
        }
    }

    static void verifyChrootBoundary(Path chroot) {
        require(Files.isDirectory(chroot) && !Files.isSymbolicLink(chroot),
                "Chroot root is missing, non-directory, or symbolic: " + chroot);
        List<Path> forbidden = List.of(
                chroot.resolve("usr/bin/java"),
                chroot.resolve("etc/alternatives/java"),
                chroot.resolve("usr/lib/jvm"),
                chroot.resolve("opt/jdk"),
                chroot.resolve("opt/java"),
                chroot.resolve("root/.m2/repository"),
                chroot.resolve("root/.gradle/caches"),
                chroot.resolve("home/user/.m2/repository"),
                chroot.resolve("home/user/.gradle/caches"),
                chroot.resolve("graph"),
                chroot.resolve("census")
        );
        ArrayList<String> present = new ArrayList<>(forbidden.stream().filter(Files::exists)
                .map(Path::toString).toList());
        Path opt = chroot.resolve("opt");
        if (Files.isDirectory(opt)) {
            try (var children = Files.list(opt)) {
                children.filter(path -> path.getFileName().toString().matches("(?i).*(?:jdk|jre|java).*$"))
                        .map(Path::toString).forEach(present::add);
            } catch (IOException exception) {
                throw new IllegalStateException("Unable to inspect chroot /opt boundary", exception);
            }
        }
        present.addAll(inspectChrootTree(chroot));
        require(present.isEmpty(), "Host/chroot boundary contamination detected: " + present);
    }

    static List<String> inspectChrootTree(Path chroot) {
        ArrayList<String> command = new ArrayList<>();
        Path privilegedRoot = chroot.resolve("root");
        if (Files.isDirectory(privilegedRoot) && !Files.isReadable(privilegedRoot)) {
            command.add("sudo");
            command.add("-n");
        }
        command.add("/usr/bin/find");
        command.add(chroot.toString());
        command.add("-xdev");
        command.add("-printf");
        command.add("%y\\t%p\\n");
        Process process;
        try {
            process = new ProcessBuilder(command).redirectErrorStream(true).start();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to start fail-closed chroot boundary inspection", exception);
        }
        ArrayList<String> present = new ArrayList<>();
        int paths = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                paths++;
                if (paths > 500_000) {
                    process.destroyForcibly();
                    throw new IllegalStateException("Chroot boundary inspection exceeded 500000 paths");
                }
                int separator = line.indexOf('\t');
                if (separator != 1) {
                    continue;
                }
                char fileType = line.charAt(0);
                Path value;
                try {
                    value = Path.of(line.substring(2)).toAbsolutePath().normalize();
                } catch (Exception exception) {
                    continue;
                }
                if (!value.startsWith(chroot.toAbsolutePath().normalize())) {
                    continue;
                }
                String relative = chroot.toAbsolutePath().normalize().relativize(value)
                        .toString().replace('\\', '/');
                if (forbiddenChrootRelativePath(fileType, relative) && present.size() < 20) {
                    present.add(relative);
                }
            }
            if (!process.waitFor(60, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("Chroot boundary inspection timed out");
            }
        } catch (IOException exception) {
            process.destroyForcibly();
            throw new IllegalStateException("Chroot boundary inspection failed", exception);
        } catch (InterruptedException exception) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Chroot boundary inspection was interrupted", exception);
        }
        require(process.exitValue() == 0, "Chroot boundary inspection was incomplete");
        return List.copyOf(present);
    }

    static boolean forbiddenChrootRelativePath(String value) {
        return forbiddenChrootRelativePath('f', value);
    }

    static boolean forbiddenChrootRelativePath(char fileType, String value) {
        String lower = value.toLowerCase(java.util.Locale.ROOT);
        String name = lower.substring(lower.lastIndexOf('/') + 1);
        boolean executableArtifact = (fileType == 'f' || fileType == 'l')
                && Set.of("java", "javac", "mvn", "gradle").contains(name);
        boolean storeArtifact = fileType == 'f'
                && Set.of("nativerdf.ver", "values.dat", "triples.prop").contains(name);
        return executableArtifact || storeArtifact
                || lower.contains("/.m2/repository")
                || lower.contains("/.gradle/caches")
                || lower.equals("graph/manifest.yaml")
                || lower.endsWith("/graph/manifest.yaml")
                || lower.equals("census")
                || lower.startsWith("census/")
                || lower.contains("/validation-report")
                || lower.contains("/benchmark-result");
    }

    private static long availableMemoryBytes() throws IOException {
        for (String line : Files.readAllLines(Path.of("/proc/meminfo"), StandardCharsets.UTF_8)) {
            if (line.startsWith("MemAvailable:")) {
                String numeric = line.substring("MemAvailable:".length()).trim().split("\\s+")[0];
                return Long.parseLong(numeric) * 1024L;
            }
        }
        throw new IllegalStateException("Linux MemAvailable metric is unavailable");
    }

    private static boolean gitCheckIgnored(Path repositoryRoot, String path)
            throws IOException, InterruptedException {
        Process process = new ProcessBuilder("git", "-C", repositoryRoot.toString(),
                "check-ignore", "--quiet", "--", path).start();
        if (!process.waitFor(10, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IllegalStateException("Git ignore check timed out");
        }
        return process.exitValue() == 0;
    }

    private static String gitRemote(Path repositoryRoot) throws IOException, InterruptedException {
        Process process = new ProcessBuilder("git", "-C", repositoryRoot.toString(), "config", "--get", "remote.origin.url")
                .redirectErrorStream(true)
                .start();
        if (!process.waitFor(10, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IllegalStateException("Git origin lookup timed out");
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        require(process.exitValue() == 0 && !output.isBlank(), "Git origin lookup failed");
        return output;
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    public record Result(Map<String, Object> checks) {
    }
}
