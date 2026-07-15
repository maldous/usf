package org.usf.validation;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

public record CliOptions(String command, Path repositoryRoot, Path workDirectory, Path output,
                         Path envelopeOutput, Path chrootRoot, Path authoritySnapshot,
                         String engine, String profile, boolean keepWork) {
    public static CliOptions parse(String[] args) {
        if (args.length == 0) {
            throw new IllegalArgumentException("A command is required");
        }
        Map<String, String> values = new LinkedHashMap<>();
        boolean keepWork = false;
        for (int index = 1; index < args.length; index++) {
            String argument = args[index];
            if ("--keep-work".equals(argument)) {
                keepWork = true;
                continue;
            }
            if (!argument.startsWith("--") || index + 1 >= args.length) {
                throw new IllegalArgumentException("Invalid command argument: " + argument);
            }
            if (values.put(argument, args[++index]) != null) {
                throw new IllegalArgumentException("Duplicate command argument: " + argument);
            }
        }
        Path repositoryRoot = values.containsKey("--repo")
                ? Path.of(values.remove("--repo"))
                : discoverRepositoryRoot(Path.of(""));
        Path workDirectory = values.containsKey("--work-dir") ? Path.of(values.remove("--work-dir")) : null;
        Path output = values.containsKey("--output") ? Path.of(values.remove("--output")) : null;
        Path envelopeOutput = values.containsKey("--envelope-output") ? Path.of(values.remove("--envelope-output")) : null;
        Path authoritySnapshot = values.containsKey("--authority-snapshot")
                ? Path.of(values.remove("--authority-snapshot")) : null;
        String configuredChroot = values.remove("--chroot-root");
        if (configuredChroot == null || configuredChroot.isBlank()) {
            configuredChroot = System.getenv("USF_CHROOT_ROOT");
        }
        String engine = values.containsKey("--engine") ? values.remove("--engine") : "rdf4j";
        String profile = values.containsKey("--profile") ? values.remove("--profile") : "fast";
        if (!values.isEmpty()) {
            throw new IllegalArgumentException("Unknown command arguments: " + values.keySet());
        }
        if (!SetValues.ENGINES.contains(engine) || !SetValues.PROFILES.contains(profile)) {
            throw new IllegalArgumentException("Unsupported engine or profile");
        }
        Path canonicalRepository = canonical(repositoryRoot);
        Path chrootRoot = configuredChroot == null || configuredChroot.isBlank()
                ? canonicalRepository.resolve("v2")
                : Path.of(configuredChroot).toAbsolutePath().normalize();
        return new CliOptions(args[0], canonicalRepository, workDirectory == null ? null : workDirectory.toAbsolutePath().normalize(),
                output == null ? null : output.toAbsolutePath().normalize(),
                envelopeOutput == null ? null : envelopeOutput.toAbsolutePath().normalize(),
                chrootRoot,
                authoritySnapshot == null ? null : authoritySnapshot.toAbsolutePath().normalize(),
                engine, profile, keepWork);
    }

    private static Path discoverRepositoryRoot(Path start) {
        Path current = start.toAbsolutePath().normalize();
        while (current != null) {
            if (Files.isRegularFile(current.resolve("graph/manifest.yaml"))
                    && Files.isRegularFile(current.resolve("AGENTS.md"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalArgumentException("Unable to discover repository root; pass --repo");
    }

    private static Path canonical(Path path) {
        try {
            return path.toRealPath();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Repository root does not exist: " + path, exception);
        }
    }

    private static final class SetValues {
        private static final java.util.Set<String> ENGINES = java.util.Set.of("rdf4j", "jena");
        private static final java.util.Set<String> PROFILES = java.util.Set.of("fast", "proof");
    }
}
