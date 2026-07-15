package org.usf.validation;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

public final class GraphComparison {
    private static final int SUMMARY_LIMIT = 20;

    private GraphComparison() {
    }

    public static Result compare(Map<String, Digests.GraphDigest> expected,
                                 Map<String, Digests.GraphDigest> actual) {
        TreeSet<String> missing = new TreeSet<>(expected.keySet());
        missing.removeAll(actual.keySet());
        TreeSet<String> extra = new TreeSet<>(actual.keySet());
        extra.removeAll(expected.keySet());
        ArrayList<Map<String, Object>> mismatched = new ArrayList<>();
        TreeSet<String> common = new TreeSet<>(expected.keySet());
        common.retainAll(actual.keySet());
        for (String graph : common) {
            Digests.GraphDigest left = expected.get(graph);
            Digests.GraphDigest right = actual.get(graph);
            if (!left.equals(right) && mismatched.size() < SUMMARY_LIMIT) {
                LinkedHashMap<String, Object> difference = new LinkedHashMap<>();
                difference.put("graph", graph);
                difference.put("expected", left);
                difference.put("actual", right);
                mismatched.add(difference);
            }
        }
        boolean exact = missing.isEmpty() && extra.isEmpty() && mismatched.isEmpty()
                && expected.size() == actual.size();
        return new Result(exact, limited(missing), limited(extra), List.copyOf(mismatched));
    }

    private static List<String> limited(TreeSet<String> values) {
        return values.stream().limit(SUMMARY_LIMIT).toList();
    }

    public record Result(boolean exact, List<String> missingGraphs, List<String> extraGraphs,
                         List<Map<String, Object>> mismatchedGraphs) {
    }
}
