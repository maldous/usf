package org.usf.validation;

import org.apache.jena.graph.Node;
import org.apache.jena.sparql.core.Quad;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.List;

public final class Digests {
    public static final String GRAPH_ALGORITHM = "usf-sorted-term-tuples-v1";
    public static final String GRAPH_IMPLEMENTATION_VERSION = "1.0.0";
    public static final GraphCanonicalizer<Statement> RDF4J_CANONICALIZER = adapter(Digests::rdf4jStatements);
    public static final GraphCanonicalizer<Quad> JENA_CANONICALIZER = adapter(Digests::jenaQuads);

    private Digests() {
    }

    public static String sha256(Path path) throws IOException {
        MessageDigest digest = sha256Digest();
        byte[] buffer = new byte[128 * 1024];
        try (InputStream input = Files.newInputStream(path)) {
            for (int read; (read = input.read(buffer)) >= 0; ) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    public static String sha256(byte[] value) {
        return HexFormat.of().formatHex(sha256Digest().digest(value));
    }

    public static String sha256(String value) {
        return sha256(value.getBytes(StandardCharsets.UTF_8));
    }

    public static GraphDigest rdf4jStatements(Iterator<Statement> statements) {
        ArrayList<String> canonical = new ArrayList<>();
        while (statements.hasNext()) {
            Statement statement = statements.next();
            canonical.add(term(statement.getSubject()) + '\t'
                    + term(statement.getPredicate()) + '\t'
                    + term(statement.getObject()) + '\t'
                    + term(statement.getContext()));
        }
        return digestLines(canonical);
    }

    public static GraphDigest jenaQuads(Iterator<Quad> quads) {
        ArrayList<String> canonical = new ArrayList<>();
        while (quads.hasNext()) {
            Quad quad = quads.next();
            canonical.add(term(quad.getSubject()) + '\t'
                    + term(quad.getPredicate()) + '\t'
                    + term(quad.getObject()) + '\t'
                    + term(quad.getGraph()));
        }
        return digestLines(canonical);
    }

    private static GraphDigest digestLines(List<String> canonical) {
        canonical.sort(String::compareTo);
        MessageDigest digest = sha256Digest();
        for (String line : canonical) {
            digest.update(line.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) '\n');
        }
        return new GraphDigest(canonical.size(), HexFormat.of().formatHex(digest.digest()));
    }

    private static String term(Value value) {
        if (value == null) {
            return "D";
        }
        if (value instanceof BNode) {
            throw new IllegalStateException("Blank nodes are not permitted in deterministic derived outputs");
        }
        if (value instanceof IRI iri) {
            return sized("I", iri.stringValue());
        }
        if (value instanceof Literal literal) {
            return sized("L", literal.getLabel())
                    + sized("G", literal.getLanguage().orElse("").toLowerCase())
                    + sized("T", literal.getDatatype().stringValue());
        }
        throw new IllegalStateException("Unsupported RDF4J value: " + value.getClass().getName());
    }

    private static String term(Node node) {
        if (node == null || Quad.isDefaultGraph(node)) {
            return "D";
        }
        if (node.isBlank()) {
            throw new IllegalStateException("Blank nodes are not permitted in deterministic derived outputs");
        }
        if (node.isURI()) {
            return sized("I", node.getURI());
        }
        if (node.isLiteral()) {
            String datatype = node.getLiteralDatatypeURI();
            return sized("L", node.getLiteralLexicalForm())
                    + sized("G", node.getLiteralLanguage().toLowerCase())
                    + sized("T", datatype == null ? "http://www.w3.org/2001/XMLSchema#string" : datatype);
        }
        throw new IllegalStateException("Unsupported Jena node: " + node);
    }

    private static String sized(String kind, String value) {
        return kind + value.getBytes(StandardCharsets.UTF_8).length + ':' + value;
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static <T> GraphCanonicalizer<T> adapter(java.util.function.Function<Iterator<T>, GraphDigest> function) {
        return new GraphCanonicalizer<>() {
            @Override
            public String algorithm() {
                return GRAPH_ALGORITHM;
            }

            @Override
            public String implementationVersion() {
                return GRAPH_IMPLEMENTATION_VERSION;
            }

            @Override
            public String blankNodeHandling() {
                return "reject-derived-blank-nodes";
            }

            @Override
            public String graphIdentityHandling() {
                return "include-exact-named-graph-iri";
            }

            @Override
            public String serializationNormalization() {
                return "sorted-length-prefixed-rdf-terms-utf8";
            }

            @Override
            public GraphDigest digest(Iterator<T> values) {
                return function.apply(values);
            }
        };
    }

    public record GraphDigest(long statementCount, String sha256) {
    }
}
