package org.usf.validation;

public record ShaclFinding(String focusNode, String sourceShape, String constraintComponent,
                           String resultPath, String severity, String value) implements Comparable<ShaclFinding> {
    @Override
    public int compareTo(ShaclFinding other) {
        return key().compareTo(other.key());
    }

    private String key() {
        return nullSafe(focusNode) + '\u0000' + nullSafe(sourceShape) + '\u0000'
                + nullSafe(constraintComponent) + '\u0000' + nullSafe(resultPath) + '\u0000'
                + nullSafe(severity) + '\u0000' + nullSafe(value);
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
