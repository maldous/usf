package org.usf.validation;

import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.riot.out.NodeFmtLib;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.rio.helpers.NTriplesUtil;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.TreeSet;

public final class ShaclReports {
    private static final int SUMMARY_LIMIT = 20;
    private static final String SHACL_NS = "http://www.w3.org/ns/shacl#";

    private ShaclReports() {
    }

    public static List<ShaclFinding> fromRdf4j(Model model) {
        ArrayList<ShaclFinding> findings = new ArrayList<>();
        for (var subject : model.filter(null, RDF.TYPE, SHACL.VALIDATION_RESULT).subjects()) {
            findings.add(new ShaclFinding(
                    rdf4j(object(model, subject, SHACL.FOCUS_NODE)),
                    rdf4jShape(object(model, subject, SHACL.SOURCE_SHAPE)),
                    rdf4j(object(model, subject, SHACL.SOURCE_CONSTRAINT_COMPONENT)),
                    rdf4jShape(object(model, subject, SHACL.RESULT_PATH)),
                    rdf4j(object(model, subject, SHACL.RESULT_SEVERITY)),
                    rdf4j(object(model, subject, SHACL.VALUE))));
        }
        return sorted(findings);
    }

    public static List<ShaclFinding> fromJena(org.apache.jena.rdf.model.Model model) {
        ArrayList<ShaclFinding> findings = new ArrayList<>();
        Resource resultType = model.createResource(SHACL_NS + "ValidationResult");
        model.listResourcesWithProperty(org.apache.jena.vocabulary.RDF.type, resultType).forEachRemaining(subject ->
                findings.add(new ShaclFinding(
                        jena(object(model, subject, "focusNode"), false),
                        jena(object(model, subject, "sourceShape"), true),
                        jena(object(model, subject, "sourceConstraintComponent"), false),
                        jena(object(model, subject, "resultPath"), true),
                        jena(object(model, subject, "resultSeverity"), false),
                        jena(object(model, subject, "value"), false))));
        return sorted(findings);
    }

    public static Comparison compare(Collection<ShaclFinding> expected, Collection<ShaclFinding> actual) {
        TreeSet<ShaclFinding> missing = new TreeSet<>(expected);
        missing.removeAll(actual);
        TreeSet<ShaclFinding> extra = new TreeSet<>(actual);
        extra.removeAll(expected);
        return new Comparison(missing.isEmpty() && extra.isEmpty(),
                missing.stream().limit(SUMMARY_LIMIT).toList(),
                extra.stream().limit(SUMMARY_LIMIT).toList());
    }

    private static Value object(Model model, org.eclipse.rdf4j.model.Resource subject, IRI predicate) {
        return model.filter(subject, predicate, null).objects().stream().findFirst().orElse(null);
    }

    private static RDFNode object(org.apache.jena.rdf.model.Model model, Resource subject, String localName) {
        var statement = subject.getProperty(model.createProperty(SHACL_NS + localName));
        return statement == null ? null : statement.getObject();
    }

    private static String rdf4j(Value value) {
        if (value == null) {
            return null;
        }
        return value instanceof BNode ? "_:blank" : NTriplesUtil.toNTriplesString(value);
    }

    private static String rdf4jShape(Value value) {
        return value instanceof BNode ? "_:shape" : rdf4j(value);
    }

    private static String jena(RDFNode value, boolean shapeBlankNode) {
        if (value == null) {
            return null;
        }
        if (value.isAnon()) {
            return shapeBlankNode ? "_:shape" : "_:blank";
        }
        return NodeFmtLib.strNT(value.asNode());
    }

    private static List<ShaclFinding> sorted(List<ShaclFinding> values) {
        values.sort(ShaclFinding::compareTo);
        return List.copyOf(values);
    }

    public record Comparison(boolean exact, List<ShaclFinding> missing, List<ShaclFinding> extra) {
    }
}
