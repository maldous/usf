package org.usf.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.sparql.core.Quad;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.DynamicModelFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.apache.jena.rdf.model.ModelFactory;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DigestsAndResultsTest {
    private static final String GRAPH = "urn:test:graph";

    @Test
    void sha256UsesUtf8Deterministically() {
        assertThat(Digests.sha256("USF")).isEqualTo("be233f80c03b1e71575c2155ad027e4d52e67a8a5e591fcb3a45272b0c315b48");
    }

    @Test
    void rdf4jDigestIsOrderIndependent() {
        List<Statement> statements = rdf4jStatements();
        Digests.GraphDigest forward = Digests.rdf4jStatements(statements.iterator());
        Digests.GraphDigest reverse = Digests.rdf4jStatements(List.of(statements.get(1), statements.get(0)).iterator());
        assertThat(reverse).isEqualTo(forward);
    }

    @Test
    void rdf4jAndJenaCanonicalDigestsMatch() {
        Digests.GraphDigest rdf4j = Digests.rdf4jStatements(rdf4jStatements().iterator());
        Digests.GraphDigest jena = Digests.jenaQuads(jenaQuads().iterator());
        assertThat(jena).isEqualTo(rdf4j);
    }

    @Test
    void blankNodesFailClosedInRdf4jDerivedOutput() {
        var factory = SimpleValueFactory.getInstance();
        Statement statement = factory.createStatement(factory.createBNode(), factory.createIRI("urn:test:p"),
                factory.createLiteral("x"), factory.createIRI(GRAPH));
        assertThatThrownBy(() -> Digests.rdf4jStatements(List.of(statement).iterator()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Blank nodes");
    }

    @Test
    void blankNodesFailClosedInJenaDerivedOutput() {
        Quad quad = new Quad(NodeFactory.createURI(GRAPH), NodeFactory.createBlankNode(),
                NodeFactory.createURI("urn:test:p"), NodeFactory.createLiteralString("x"));
        assertThatThrownBy(() -> Digests.jenaQuads(List.of(quad).iterator()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Blank nodes");
    }

    @Test
    void boundedResultIsStrictJsonAndBelowLimit() throws Exception {
        byte[] result = BoundedResult.encode("check", "pass", Map.of("value", 1));
        JsonNode parsed = BoundedResult.jsonMapper().readTree(result);
        assertThat(parsed.path("status").asText()).isEqualTo("pass");
        assertThat(result.length).isLessThanOrEqualTo(BoundedResult.MAX_BYTES);
    }

    @Test
    void boundedResultSelfDigestVerifies() throws Exception {
        ObjectMapper mapper = BoundedResult.jsonMapper();
        JsonNode parsed = mapper.readTree(BoundedResult.encode("check", "pass", Map.of("value", 1)));
        @SuppressWarnings("unchecked")
        Map<String, Object> unsigned = mapper.convertValue(parsed, Map.class);
        String claimed = (String) unsigned.remove("resultDigest");
        assertThat(claimed).isEqualTo("sha256:" + Digests.sha256(mapper.writeValueAsBytes(unsigned)));
    }

    @Test
    void stableIncrementalEvidenceExcludesVariableElapsedTime() throws Exception {
        var first = new Rdf4jEngine.IncrementalResult(true, true, true, true, true,
                "bounded-family", "SERIALIZABLE", true, false, 10);
        var second = new Rdf4jEngine.IncrementalResult(true, true, true, true, true,
                "bounded-family", "SERIALIZABLE", true, false, 9999);
        Map<String, Object> firstStable = ProofRunner.stableIncremental(first);
        Map<String, Object> secondStable = ProofRunner.stableIncremental(second);
        assertThat(firstStable).isEqualTo(secondStable).doesNotContainKey("elapsedMillis");
        ObjectMapper mapper = BoundedResult.jsonMapper();
        assertThat(Digests.sha256(mapper.writeValueAsBytes(firstStable)))
                .isEqualTo(Digests.sha256(mapper.writeValueAsBytes(secondStable)));
    }

    @Test
    void stableEvidenceDigestExcludesBenchmarkMeasurements() throws Exception {
        var firstStable = new LinkedHashMap<String, Object>(Map.of("acceptance", "pass"));
        var secondStable = new LinkedHashMap<String, Object>(Map.of("acceptance", "pass"));
        ProofRunner.ProofResult first = ProofRunner.finishEvidence(firstStable, Instant.EPOCH,
                10, 20, 30, List.of(), Map.of("rdf4j", Map.of("deriveMillis", 1)));
        ProofRunner.ProofResult second = ProofRunner.finishEvidence(secondStable, Instant.EPOCH,
                999, 888, 777, List.of(), Map.of("rdf4j", Map.of("deriveMillis", 9999)));
        assertThat(first.evidence().get("stableEvidenceDigest"))
                .isEqualTo(second.evidence().get("stableEvidenceDigest"));
        assertThat(first.evidence().get("engines")).isNotEqualTo(second.evidence().get("engines"));
    }

    @Test
    void oversizedResultFailsClosed() {
        assertThatThrownBy(() -> BoundedResult.encode("prove", "pass", Map.of("value", "x".repeat(9000))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("exceeds");
    }

    @Test
    void graphComparisonReportsBoundedIntentionalDifferences() {
        Digests.GraphDigest left = new Digests.GraphDigest(1, "a".repeat(64));
        Digests.GraphDigest right = new Digests.GraphDigest(2, "b".repeat(64));
        GraphComparison.Result result = GraphComparison.compare(
                Map.of("urn:test:expected", left, "urn:test:mismatch", left),
                Map.of("urn:test:extra", right, "urn:test:mismatch", right));
        assertThat(result.exact()).isFalse();
        assertThat(result.missingGraphs()).containsExactly("urn:test:expected");
        assertThat(result.extraGraphs()).containsExactly("urn:test:extra");
        assertThat(result.mismatchedGraphs()).hasSize(1);
    }

    @Test
    void normalizedShaclComparisonDetectsSemanticDisagreement() {
        ShaclFinding expected = new ShaclFinding("<urn:test:focus>", "_:shape",
                "<urn:test:component>", "<urn:test:path>", "<urn:test:severity>", "\"left\"");
        ShaclFinding actual = new ShaclFinding("<urn:test:focus>", "_:shape",
                "<urn:test:component>", "<urn:test:path>", "<urn:test:severity>", "\"right\"");
        ShaclReports.Comparison comparison = ShaclReports.compare(List.of(expected), List.of(actual));
        assertThat(comparison.exact()).isFalse();
        assertThat(comparison.missing()).containsExactly(expected);
        assertThat(comparison.extra()).containsExactly(actual);
    }

    @Test
    void normalizedShaclReportsIgnoreEngineSpecificBlankNodeIdentities() {
        var factory = SimpleValueFactory.getInstance();
        var rdf4j = new DynamicModelFactory().createEmptyModel();
        var rdfResult = factory.createBNode("rdf-result");
        var rdfShape = factory.createBNode("rdf-shape");
        rdf4j.add(rdfResult, RDF.TYPE, SHACL.VALIDATION_RESULT);
        rdf4j.add(rdfResult, SHACL.FOCUS_NODE, factory.createIRI("urn:test:focus"));
        rdf4j.add(rdfResult, SHACL.SOURCE_SHAPE, rdfShape);
        rdf4j.add(rdfResult, SHACL.SOURCE_CONSTRAINT_COMPONENT, factory.createIRI("urn:test:component"));
        rdf4j.add(rdfResult, SHACL.RESULT_PATH, factory.createIRI("urn:test:path"));
        rdf4j.add(rdfResult, SHACL.RESULT_SEVERITY, SHACL.VIOLATION);
        rdf4j.add(rdfResult, SHACL.VALUE, factory.createIRI("urn:test:value"));

        var jena = ModelFactory.createDefaultModel();
        var jenaResult = jena.createResource();
        var jenaShape = jena.createResource();
        String sh = "http://www.w3.org/ns/shacl#";
        jenaResult.addProperty(org.apache.jena.vocabulary.RDF.type, jena.createResource(sh + "ValidationResult"));
        jenaResult.addProperty(jena.createProperty(sh + "focusNode"), jena.createResource("urn:test:focus"));
        jenaResult.addProperty(jena.createProperty(sh + "sourceShape"), jenaShape);
        jenaResult.addProperty(jena.createProperty(sh + "sourceConstraintComponent"), jena.createResource("urn:test:component"));
        jenaResult.addProperty(jena.createProperty(sh + "resultPath"), jena.createResource("urn:test:path"));
        jenaResult.addProperty(jena.createProperty(sh + "resultSeverity"), jena.createResource(sh + "Violation"));
        jenaResult.addProperty(jena.createProperty(sh + "value"), jena.createResource("urn:test:value"));

        ShaclReports.Comparison comparison = ShaclReports.compare(
                ShaclReports.fromRdf4j(rdf4j), ShaclReports.fromJena(jena));
        assertThat(comparison.exact()).isTrue();
        assertThat(comparison.missing()).isEmpty();
        assertThat(comparison.extra()).isEmpty();
    }

    @Test
    void structuredFailureCodesAreAlwaysMachineReadable() {
        Failures.GateException failure = new Failures.GateException("PLANTED_FAILURE", "bounded message");
        assertThat(Failures.code(failure)).isEqualTo("PLANTED_FAILURE");
        assertThat(Failures.code(new IllegalArgumentException("bad input"))).isEqualTo("INVALID_ARGUMENT");
    }

    private static List<Statement> rdf4jStatements() {
        var factory = SimpleValueFactory.getInstance();
        var graph = factory.createIRI(GRAPH);
        return List.of(
                factory.createStatement(factory.createIRI("urn:test:s1"), factory.createIRI("urn:test:p"),
                        factory.createLiteral("hello", "en"), graph),
                factory.createStatement(factory.createIRI("urn:test:s2"), factory.createIRI("urn:test:p"),
                        factory.createIRI("urn:test:o"), graph));
    }

    private static List<Quad> jenaQuads() {
        var graph = NodeFactory.createURI(GRAPH);
        return List.of(
                new Quad(graph, NodeFactory.createURI("urn:test:s1"), NodeFactory.createURI("urn:test:p"),
                        NodeFactory.createLiteralLang("hello", "en")),
                new Quad(graph, NodeFactory.createURI("urn:test:s2"), NodeFactory.createURI("urn:test:p"),
                        NodeFactory.createURI("urn:test:o")));
    }
}
