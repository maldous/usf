package org.usf.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BoundaryAndCliTest {
    private static final Path REPOSITORY_ROOT = repositoryRoot();

    @TempDir
    Path temporary;

    @Test
    void cliDefaultsToPrimaryEngineAndFastProfile() {
        CliOptions options = CliOptions.parse(new String[]{"check", "--repo", REPOSITORY_ROOT.toString()});
        assertThat(options.engine()).isEqualTo("rdf4j");
        assertThat(options.profile()).isEqualTo("fast");
    }

    @Test
    void cliAcceptsProofProfileAndJena() {
        CliOptions options = CliOptions.parse(new String[]{"prove", "--repo", REPOSITORY_ROOT.toString(),
                "--engine", "jena", "--profile", "proof"});
        assertThat(options.engine()).isEqualTo("jena");
        assertThat(options.profile()).isEqualTo("proof");
    }

    @Test
    void cliAcceptsExplicitAuthorityAndChrootSnapshots() throws Exception {
        Path authority = Files.writeString(temporary.resolve("authority.txt"), Preflight.AUTHORITY_DIGEST);
        Path chroot = Files.createDirectory(temporary.resolve("chroot"));
        CliOptions options = CliOptions.parse(new String[]{"check", "--repo", REPOSITORY_ROOT.toString(),
                "--authority-snapshot", authority.toString(), "--chroot-root", chroot.toString()});
        assertThat(options.authoritySnapshot()).isEqualTo(authority);
        assertThat(options.chrootRoot()).isEqualTo(chroot);
    }

    @Test
    void cliRejectsUnknownEngine() {
        assertThatThrownBy(() -> CliOptions.parse(new String[]{"check", "--repo", REPOSITORY_ROOT.toString(),
                "--engine", "unknown"})).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cliRejectsDuplicateArguments() {
        assertThatThrownBy(() -> CliOptions.parse(new String[]{"check", "--repo", REPOSITORY_ROOT.toString(),
                "--engine", "jena", "--engine", "rdf4j"})).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void workspaceMustBeOutsideRepository() {
        assertThatThrownBy(() -> ManagedWorkspace.create(REPOSITORY_ROOT,
                REPOSITORY_ROOT.resolve("target/forbidden-workspace"), false))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("outside");
    }

    @Test
    void workspaceRequiresOwnershipMarkerWhenOpened() throws Exception {
        Path unowned = Files.createDirectory(temporary.resolve("unowned"));
        assertThatThrownBy(() -> ManagedWorkspace.open(REPOSITORY_ROOT, unowned, false))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("unowned");
    }

    @Test
    void workspaceMetadataRoundTripsAndCleans() throws Exception {
        Path requested = temporary.resolve("owned");
        ManagedWorkspace workspace = ManagedWorkspace.create(REPOSITORY_ROOT, requested, true);
        workspace.writeMetadata(new ManagedWorkspace.StoreMetadata("rdf4j", REPOSITORY_ROOT,
                "manifest", "input", 7, Map.of()));
        assertThat(workspace.readMetadata().statementCount).isEqualTo(7);
        workspace.clean();
        assertThat(requested).doesNotExist();
    }

    @Test
    void stagedCommandRejectsABaselineManifestMismatch() throws Exception {
        Path requested = temporary.resolve("baseline-mismatch");
        ManagedWorkspace workspace = ManagedWorkspace.create(REPOSITORY_ROOT, requested, true);
        try {
            workspace.writeMetadata(new ManagedWorkspace.StoreMetadata("rdf4j", REPOSITORY_ROOT,
                    "0".repeat(64), "input", 7, Map.of()));
            CliOptions options = CliOptions.parse(new String[]{"derive", "--repo", REPOSITORY_ROOT.toString(),
                    "--work-dir", requested.toString(), "--engine", "rdf4j"});
            assertThatThrownBy(() -> Main.verifyMetadata(workspace, options, false))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("stale");
        } finally {
            workspace.clean();
        }
    }

    @Test
    void workspaceCloseCleansByDefault() throws Exception {
        Path requested = temporary.resolve("auto-clean");
        try (ManagedWorkspace ignored = ManagedWorkspace.create(REPOSITORY_ROOT, requested, false)) {
            assertThat(requested).exists();
        }
        assertThat(requested).doesNotExist();
    }

    @Test
    void workspaceCleansAfterFailure() throws Exception {
        Path requested = temporary.resolve("failure-clean");
        assertThatThrownBy(() -> {
            try (ManagedWorkspace ignored = ManagedWorkspace.create(REPOSITORY_ROOT, requested, false)) {
                throw new IllegalStateException("planted failure");
            }
        }).isInstanceOf(IllegalStateException.class).hasMessage("planted failure");
        assertThat(requested).doesNotExist();
    }

    @Test
    void workspaceInterruptionHookCleansOwnedPath() throws Exception {
        Path requested = temporary.resolve("interruption-clean");
        try (ManagedWorkspace workspace = ManagedWorkspace.create(REPOSITORY_ROOT, requested, false)) {
            workspace.cleanupOnShutdown();
            assertThat(requested).doesNotExist();
        }
    }

    @Test
    void workspaceRejectsSymbolicRequestedPath() throws Exception {
        Path actual = Files.createDirectory(temporary.resolve("actual"));
        Path link = Files.createSymbolicLink(temporary.resolve("link"), actual);
        assertThatThrownBy(() -> ManagedWorkspace.create(REPOSITORY_ROOT, link, false))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("symbolic");
    }

    @Test
    void workspaceDiskMeasurementUsesAllocatedBytes() throws Exception {
        Path requested = temporary.resolve("measure");
        try (ManagedWorkspace workspace = ManagedWorkspace.create(REPOSITORY_ROOT, requested, false)) {
            assertThat(workspace.byteSize()).isPositive();
        }
    }

    @Test
    void dependencyLockIsStrictJsonAndContentAddressed() throws Exception {
        Path lock = REPOSITORY_ROOT.resolve("census/local-semantic-validation/dependencies.lock.json");
        var root = BoundedResult.jsonMapper().readTree(lock.toFile());
        assertThat(root.path("artifacts").size()).isGreaterThan(50);
        assertThat(root.path("lockDigest").asText()).startsWith("sha256:");
        Preflight.verifyDependencyLock(lock);
    }

    @Test
    void dependencyLockMismatchFailsClosed() throws Exception {
        Path source = REPOSITORY_ROOT.resolve("census/local-semantic-validation/dependencies.lock.json");
        String changed = Files.readString(source, StandardCharsets.UTF_8)
                .replaceFirst("\\\"byteSize\\\"\\s*:\\s*([0-9]+)", "\"byteSize\": 1");
        Path lock = Files.writeString(temporary.resolve("dependencies.lock.json"), changed);
        assertThatThrownBy(() -> Preflight.verifyDependencyLock(lock))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("self-digest");
    }

    @Test
    void javaFeatureVersionIsExact() {
        Preflight.requireJavaFeature(25);
        assertThatThrownBy(() -> Preflight.requireJavaFeature(24)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> Preflight.requireJavaFeature(26)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void capacityChecksRejectEachInsufficientResource() {
        Preflight.requireCapacity(Preflight.REQUIRED_TEMPORARY_BYTES,
                Preflight.REQUIRED_AVAILABLE_MEMORY_BYTES, Preflight.REQUIRED_MAX_HEAP_BYTES);
        assertThatThrownBy(() -> Preflight.requireCapacity(Preflight.REQUIRED_TEMPORARY_BYTES - 1,
                Preflight.REQUIRED_AVAILABLE_MEMORY_BYTES, Preflight.REQUIRED_MAX_HEAP_BYTES))
                .hasMessageContaining("disk");
        assertThatThrownBy(() -> Preflight.requireCapacity(Preflight.REQUIRED_TEMPORARY_BYTES,
                Preflight.REQUIRED_AVAILABLE_MEMORY_BYTES - 1, Preflight.REQUIRED_MAX_HEAP_BYTES))
                .hasMessageContaining("memory");
        assertThatThrownBy(() -> Preflight.requireCapacity(Preflight.REQUIRED_TEMPORARY_BYTES,
                Preflight.REQUIRED_AVAILABLE_MEMORY_BYTES, Preflight.REQUIRED_MAX_HEAP_BYTES - 1))
                .hasMessageContaining("heap");
    }

    @Test
    void temporaryRootRejectsRepositoryAndSymbolicPaths() throws Exception {
        assertThatThrownBy(() -> Preflight.validateTemporaryRoot(REPOSITORY_ROOT, REPOSITORY_ROOT))
                .hasMessageContaining("outside");
        Path actual = Files.createDirectory(temporary.resolve("temporary-actual"));
        Path link = Files.createSymbolicLink(temporary.resolve("temporary-link"), actual);
        assertThatThrownBy(() -> Preflight.validateTemporaryRoot(REPOSITORY_ROOT, link))
                .hasMessageContaining("symbolic");
    }

    @Test
    void concurrentInvocationIsRejected() throws Exception {
        try (RunLock ignored = RunLock.acquire(REPOSITORY_ROOT)) {
            assertThatThrownBy(() -> RunLock.acquire(REPOSITORY_ROOT))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("conflicting");
        }
        try (RunLock ignored = RunLock.acquire(REPOSITORY_ROOT)) {
            assertThat(ignored).isNotNull();
        }
    }

    @Test
    void chrootBoundaryAcceptsMinimizedRootAndRejectsJava() throws Exception {
        Path chroot = Files.createDirectory(temporary.resolve("minimal-chroot"));
        Preflight.verifyChrootBoundary(chroot);
        Path java = chroot.resolve("opt/jdk-25/bin/java");
        Files.createDirectories(java.getParent());
        Files.writeString(java, "not a runtime");
        assertThatThrownBy(() -> Preflight.verifyChrootBoundary(chroot))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("contamination");
    }

    @Test
    void chrootScannerClassifiesCachesStoresAndFullCorpusPaths() {
        assertThat(Preflight.forbiddenChrootRelativePath("root/.m2/repository/x.jar")).isTrue();
        assertThat(Preflight.forbiddenChrootRelativePath("tmp/store/nativerdf.ver")).isTrue();
        assertThat(Preflight.forbiddenChrootRelativePath("usf/graph/manifest.yaml")).isTrue();
        assertThat(Preflight.forbiddenChrootRelativePath("usr/bin/node")).isFalse();
        assertThat(Preflight.forbiddenChrootRelativePath("opt/stardog-12.1.1/bin/stardog-admin")).isFalse();
    }

    @Test
    void authoritySnapshotIsContentBound() throws Exception {
        Path valid = Files.writeString(temporary.resolve("authority-valid.txt"), Preflight.AUTHORITY_DIGEST);
        assertThat(AuthoritySnapshot.requireCurrent(valid)).isEqualTo(Preflight.AUTHORITY_DIGEST);
        Path stale = Files.writeString(temporary.resolve("authority-stale.txt"), "0".repeat(64));
        assertThatThrownBy(() -> AuthoritySnapshot.requireCurrent(stale))
                .isInstanceOf(Failures.GateException.class)
                .extracting(value -> ((Failures.GateException) value).code())
                .isEqualTo("AUTHORITY_DIGEST_MISMATCH");
    }

    @Test
    void runtimeProfilesHaveDifferentProofBoundaries() {
        assertThat(ProofRunner.profilePlan("fast"))
                .isEqualTo(new ProofRunner.ProfilePlan(1, 0, false, false, false));
        assertThat(ProofRunner.profilePlan("proof"))
                .isEqualTo(new ProofRunner.ProfilePlan(2, 1, true, true, true));
    }

    @Test
    void generatedStoresAndDependencyCachesAreNotTracked() throws Exception {
        Process process = new ProcessBuilder("git", "-C", REPOSITORY_ROOT.toString(), "ls-files", "--",
                "census/local-semantic-validation/target",
                "census/local-semantic-validation/.m2",
                "census/local-semantic-validation/.gradle")
                .redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        assertThat(process.waitFor()).isZero();
        assertThat(output).isEmpty();
    }

    private static Path repositoryRoot() {
        try {
            return Path.of("../..").toRealPath();
        } catch (Exception exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }
}
