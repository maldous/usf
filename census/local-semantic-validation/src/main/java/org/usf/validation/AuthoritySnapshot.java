package org.usf.validation;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class AuthoritySnapshot {
    private AuthoritySnapshot() {
    }

    public static String read(Path path) throws IOException {
        if (path == null) {
            return Preflight.AUTHORITY_DIGEST;
        }
        Failures.require(Files.isRegularFile(path) && !Files.isSymbolicLink(path),
                "AUTHORITY_SNAPSHOT_UNSAFE", "Authority snapshot must be a regular non-symbolic file");
        byte[] bytes = Files.readAllBytes(path);
        Failures.require(bytes.length > 0 && bytes.length <= 4096,
                "AUTHORITY_SNAPSHOT_UNSAFE", "Authority snapshot must be between 1 and 4096 bytes");
        String raw = new String(bytes, StandardCharsets.UTF_8).trim();
        String digest;
        if (raw.startsWith("{")) {
            JsonNode node = BoundedResult.jsonMapper().readTree(bytes);
            digest = node.path("authorityDigest").asText();
        } else {
            digest = raw;
        }
        Failures.require(digest.matches("[0-9a-f]{64}"),
                "AUTHORITY_SNAPSHOT_INVALID", "Authority snapshot digest is malformed");
        return digest;
    }

    public static String requireCurrent(Path path) throws IOException {
        String digest = read(path);
        Failures.require(Preflight.AUTHORITY_DIGEST.equals(digest),
                "AUTHORITY_DIGEST_MISMATCH", "Authority snapshot differs from the authorised toolchain digest");
        return digest;
    }
}
