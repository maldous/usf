package org.usf.validation;

import java.io.IOException;
import java.util.Locale;

public final class Failures {
    private Failures() {
    }

    public static void require(boolean condition, String code, String message) {
        if (!condition) {
            throw new GateException(code, message);
        }
    }

    public static String code(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof GateException gate) {
                return gate.code();
            }
            current = current.getCause();
        }
        String value = throwable.getMessage() == null ? "" : throwable.getMessage().toLowerCase(Locale.ROOT);
        if (value.contains("timeout") || value.contains("timed out")) return "QUERY_TIMEOUT";
        if (value.contains("dependency lock")) return "DEPENDENCY_LOCK_MISMATCH";
        if (value.contains("java") && value.contains("25")) return "JAVA_VERSION_MISMATCH";
        if (value.contains("authority digest")) return "AUTHORITY_DIGEST_MISMATCH";
        if (value.contains("chroot") || value.contains("contamination")) return "BOUNDARY_CONTAMINATION";
        if (value.contains("cleanup") || value.contains("clean")) return "CLEANUP_FAILURE";
        if (throwable instanceof IllegalArgumentException) return "INVALID_ARGUMENT";
        if (throwable instanceof IOException) return "IO_FAILURE";
        return "UNEXPECTED_FAILURE";
    }

    public static final class GateException extends IllegalStateException {
        private final String code;

        public GateException(String code, String message) {
            super(message);
            if (code == null || !code.matches("[A-Z][A-Z0-9_]{2,63}")) {
                throw new IllegalArgumentException("Invalid safe error code");
            }
            this.code = code;
        }

        public String code() {
            return code;
        }
    }
}
