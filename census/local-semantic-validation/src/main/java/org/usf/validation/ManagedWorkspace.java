package org.usf.validation;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

public final class ManagedWorkspace implements AutoCloseable {
    private static final String MARKER = ".usf-local-semantic-validation-owner.json";
    private final Path root;
    private final Path repositoryRoot;
    private volatile boolean keep;
    private final Thread cleanupHook;
    private boolean closed;

    private ManagedWorkspace(Path root, Path repositoryRoot, boolean keep) {
        this.root = root;
        this.repositoryRoot = repositoryRoot;
        this.keep = keep;
        this.cleanupHook = keep ? null : new Thread(this::cleanupOnShutdown,
                "usf-local-semantic-validation-cleanup-" + root.getFileName());
        if (cleanupHook != null) {
            Runtime.getRuntime().addShutdownHook(cleanupHook);
        }
    }

    public static ManagedWorkspace create(Path repositoryRoot, Path requested, boolean keep) throws IOException {
        Path root = requested == null
                ? Files.createTempDirectory("usf-local-semantic-validation-")
                : requested.toAbsolutePath().normalize();
        if (requested != null && Files.isSymbolicLink(root)) {
            throw new IllegalArgumentException("Requested work directory must not be symbolic: " + root);
        }
        if (root.startsWith(repositoryRoot)) {
            throw new IllegalArgumentException("Working stores must be outside tracked repository source");
        }
        if (requested != null) {
            if (Files.exists(root)) {
                try (Stream<Path> children = Files.list(root)) {
                    if (children.findAny().isPresent()) {
                        throw new IllegalArgumentException("Requested work directory is not empty: " + root);
                    }
                }
            } else {
                Files.createDirectories(root);
            }
        }
        Path canonicalRoot = root.toRealPath();
        Map<String, Object> marker = Map.of(
                "schemaVersion", 1,
                "owner", "urn:usf:semanticcontract:localsemanticvalidationtoolchain",
                "workspaceId", UUID.randomUUID().toString(),
                "createdAt", Instant.now().toString(),
                "repositoryRoot", repositoryRoot.toString()
        );
        ObjectMapper mapper = BoundedResult.jsonMapper();
        Files.write(canonicalRoot.resolve(MARKER), mapper.writeValueAsBytes(marker));
        return new ManagedWorkspace(canonicalRoot, repositoryRoot, keep);
    }

    public static ManagedWorkspace open(Path repositoryRoot, Path root, boolean keep) throws IOException {
        if (root == null) {
            throw new IllegalArgumentException("--work-dir is required for this command");
        }
        if (Files.isSymbolicLink(root)) {
            throw new IllegalArgumentException("Work directory must not be symbolic: " + root);
        }
        Path canonicalRoot = root.toRealPath();
        if (canonicalRoot.startsWith(repositoryRoot)) {
            throw new IllegalArgumentException("Working stores must be outside tracked repository source");
        }
        verifyMarker(canonicalRoot, repositoryRoot);
        return new ManagedWorkspace(canonicalRoot, repositoryRoot, keep);
    }

    public Path root() {
        return root;
    }

    public void retain() {
        keep = true;
    }

    public Path rdf4jDirectory() throws IOException {
        return Files.createDirectories(root.resolve("rdf4j"));
    }

    public Path jenaDirectory() throws IOException {
        return Files.createDirectories(root.resolve("jena"));
    }

    public Path metadataPath() {
        return root.resolve("store-metadata.json");
    }

    public long byteSize() throws IOException {
        Process process = new ProcessBuilder("du", "--summarize", "--block-size=1", "--one-file-system", root.toString())
                .redirectErrorStream(true)
                .start();
        try {
            if (!process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("Persistent workspace measurement timed out");
            }
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0 || output.isBlank()) {
                throw new IllegalStateException("Persistent workspace measurement failed: " + output);
            }
            return Long.parseLong(output.split("\\s+", 2)[0]);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while measuring persistent workspace", exception);
        }
    }

    public void writeMetadata(StoreMetadata metadata) throws IOException {
        Files.write(metadataPath(), BoundedResult.jsonMapper().writeValueAsBytes(metadata));
    }

    public StoreMetadata readMetadata() throws IOException {
        return BoundedResult.jsonMapper().readValue(metadataPath().toFile(), StoreMetadata.class);
    }

    public void clean() throws IOException {
        verifyMarker(root, repositoryRoot);
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exception) throws IOException {
                if (exception != null) {
                    throw exception;
                }
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    @Override
    public synchronized void close() throws IOException {
        if (closed) {
            return;
        }
        closed = true;
        if (cleanupHook != null && Thread.currentThread() != cleanupHook) {
            try {
                Runtime.getRuntime().removeShutdownHook(cleanupHook);
            } catch (IllegalStateException ignored) {
                // JVM shutdown is already in progress; the hook owns cleanup.
            }
        }
        if (!keep && Files.exists(root)) {
            clean();
        }
    }

    void cleanupOnShutdown() {
        try {
            if (!keep && Files.exists(root)) {
                clean();
            }
        } catch (Exception exception) {
            System.err.println("USF workspace interruption cleanup failed for owned workspace");
        }
    }

    private static void verifyMarker(Path root, Path repositoryRoot) throws IOException {
        Path markerPath = root.resolve(MARKER);
        if (!Files.isRegularFile(markerPath) || Files.isSymbolicLink(markerPath)) {
            throw new IllegalArgumentException("Refusing to use or clean unowned work directory: " + root);
        }
        ObjectMapper mapper = BoundedResult.jsonMapper();
        @SuppressWarnings("unchecked")
        Map<String, Object> marker = mapper.readValue(markerPath.toFile(), Map.class);
        if (!Integer.valueOf(1).equals(marker.get("schemaVersion"))
                || !"urn:usf:semanticcontract:localsemanticvalidationtoolchain".equals(marker.get("owner"))
                || !repositoryRoot.toString().equals(marker.get("repositoryRoot"))) {
            throw new IllegalArgumentException("Work directory ownership marker does not match this repository");
        }
    }

    public static final class StoreMetadata {
        public int schemaVersion;
        public String engine;
        public String repositoryRoot;
        public String manifestSha256;
        public String inputSha256;
        public long statementCount;
        public Map<String, Digests.GraphDigest> derivedGraphs;

        public StoreMetadata() {
        }

        public StoreMetadata(String engine, Path repositoryRoot, String manifestSha256,
                             String inputSha256, long statementCount,
                             Map<String, Digests.GraphDigest> derivedGraphs) {
            this.schemaVersion = 1;
            this.engine = engine;
            this.repositoryRoot = repositoryRoot.toString();
            this.manifestSha256 = manifestSha256;
            this.inputSha256 = inputSha256;
            this.statementCount = statementCount;
            this.derivedGraphs = derivedGraphs;
        }
    }
}
