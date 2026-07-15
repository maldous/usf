package org.usf.validation;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class DependencyLockMain {
    private DependencyLockMain() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1 || args.length > 2) {
            throw new IllegalArgumentException("Usage: DependencyLockMain <output> [expected-lock]");
        }
        Path localRepository = Path.of(System.getProperty("user.home"), ".m2", "repository").toRealPath();
        ArrayList<Map<String, Object>> artifacts = new ArrayList<>();
        for (String classPathEntry : System.getProperty("java.class.path").split(java.io.File.pathSeparator)) {
            Path path = Path.of(classPathEntry).toAbsolutePath().normalize();
            if (!path.toString().endsWith(".jar") || !path.startsWith(localRepository)) {
                continue;
            }
            Path relative = localRepository.relativize(path);
            LinkedHashMap<String, Object> artifact = new LinkedHashMap<>();
            artifact.put("repositoryPath", relative.toString().replace('\\', '/'));
            artifact.put("sha256", Digests.sha256(path));
            artifact.put("byteSize", Files.size(path));
            artifacts.add(artifact);
        }
        artifacts.sort(Comparator.comparing(value -> (String) value.get("repositoryPath")));
        LinkedHashMap<String, Object> lock = new LinkedHashMap<>();
        lock.put("schemaVersion", 1);
        lock.put("generatedBy", "org.usf.validation.DependencyLockMain");
        lock.put("artifacts", artifacts);
        ObjectMapper mapper = BoundedResult.jsonMapper();
        byte[] unsigned = mapper.writeValueAsBytes(lock);
        lock.put("lockDigest", "sha256:" + Digests.sha256(unsigned));
        byte[] encoded = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(lock);
        Files.write(Path.of(args[0]), encoded);
        if (args.length == 2) {
            Path expected = Path.of(args[1]);
            if (!Files.isRegularFile(expected)) {
                throw new IllegalStateException("Committed dependency lock is missing: " + expected);
            }
            var expectedTree = mapper.readTree(expected.toFile());
            var generatedTree = mapper.readTree(encoded);
            if (!expectedTree.equals(generatedTree)) {
                throw new IllegalStateException("Resolved runtime dependency set differs from dependencies.lock.json");
            }
        }
    }
}
