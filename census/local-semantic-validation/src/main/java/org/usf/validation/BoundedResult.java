package org.usf.validation;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

public final class BoundedResult {
    public static final int MAX_BYTES = 8192;
    private static final ObjectMapper JSON = new ObjectMapper()
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .disable(JsonGenerator.Feature.AUTO_CLOSE_TARGET);

    private BoundedResult() {
    }

    public static byte[] encode(String command, String status, Map<String, ?> details) throws IOException {
        LinkedHashMap<String, Object> value = new LinkedHashMap<>();
        value.put("schemaVersion", 1);
        value.put("command", command);
        value.put("status", status);
        value.put("details", details);
        byte[] unsigned = JSON.writeValueAsBytes(value);
        value.put("resultDigest", "sha256:" + Digests.sha256(unsigned));
        byte[] encoded = JSON.writeValueAsBytes(value);
        if (encoded.length > MAX_BYTES) {
            throw new IllegalStateException("Bounded result exceeds " + MAX_BYTES + " bytes");
        }
        return encoded;
    }

    public static void emit(String command, String status, Map<String, ?> details, Path output) throws IOException {
        byte[] encoded = encode(command, status, details);
        if (output != null) {
            write(output, encoded);
        }
        System.out.write(encoded);
        System.out.write('\n');
    }

    public static void write(Path output, byte[] encoded) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.write(output, encoded);
    }

    public static ObjectMapper jsonMapper() {
        return JSON.copy();
    }

    public static Map<String, Object> ordered() {
        return new LinkedHashMap<>();
    }
}
