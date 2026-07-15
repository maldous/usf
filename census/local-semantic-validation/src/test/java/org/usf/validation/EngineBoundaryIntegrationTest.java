package org.usf.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.nio.file.Files;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.sail.memory.MemoryStore;

import static org.assertj.core.api.Assertions.assertThat;

class EngineBoundaryIntegrationTest {
    @TempDir
    Path temporary;

    @Test
    void incrementalFixtureLifecyclePassesAndRollsBackDefect() throws Exception {
        Path repositoryRoot = Path.of("../..").toRealPath();
        GraphManifest manifest = GraphManifest.read(repositoryRoot);
        Rdf4jEngine.IncrementalResult result = Rdf4jEngine.validateIncremental(
                repositoryRoot, manifest, temporary.resolve("incremental"));
        assertThat(result.conformingCommitted()).isTrue();
        assertThat(result.defectRejected()).isTrue();
        assertThat(result.shapeChangeCommitted()).isTrue();
        assertThat(result.boundedDataCommitted()).isTrue();
        assertThat(result.isolationLevel()).isEqualTo("SERIALIZABLE");
        assertThat(result.cacheSelectNodes()).isTrue();
        assertThat(result.parallelValidation()).isFalse();
        assertThat(result.rollbackClean()).isTrue();
        assertThat(result.conforms()).isTrue();
    }

    @Test
    void bothEnginesPreserveTheRegisteredNamedGraph() throws Exception {
        Path repository = Files.createDirectories(temporary.resolve("mini-repository"));
        Files.createDirectories(repository.resolve("graph"));
        Files.writeString(repository.resolve("graph/input.ttl"),
                "<urn:test:subject> <urn:test:predicate> <urn:test:object> .\n");
        GraphManifest manifest = miniManifest("input.ttl", "urn:test:registered");
        try (Rdf4jEngine rdf4j = new Rdf4jEngine(repository, manifest, temporary.resolve("rdf4j"));
             JenaEngine jena = new JenaEngine(repository, manifest, temporary.resolve("jena"))) {
            assertThat(rdf4j.load().statementCount()).isEqualTo(1);
            assertThat(jena.load().statementCount()).isEqualTo(1);
            assertThat(rdf4j.runtimeGraphIris()).containsExactly("urn:test:registered");
            assertThat(jena.runtimeGraphIris()).containsExactly("urn:test:registered");
        }
    }

    @Test
    void loaderRejectsAnUnknownNamedGraphFromTrig() throws Exception {
        Path repository = Files.createDirectories(temporary.resolve("unknown-repository"));
        Files.createDirectories(repository.resolve("graph"));
        Files.writeString(repository.resolve("graph/input.trig"),
                "<urn:test:unknown> { <urn:test:s> <urn:test:p> <urn:test:o> . }\n");
        GraphManifest manifest = miniManifest("input.trig", "urn:test:registered");
        try (Rdf4jEngine rdf4j = new Rdf4jEngine(repository, manifest, temporary.resolve("unknown-rdf4j"))) {
            org.assertj.core.api.Assertions.assertThatThrownBy(rdf4j::load)
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("Unregistered named graph");
        }
    }

    @Test
    void integrityEvaluatorDetectsPlantedGlobalAndLifecycleRows() {
        MemoryStore store = new MemoryStore();
        SailRepository repository = new SailRepository(store);
        repository.init();
        try (var connection = repository.getConnection()) {
            String passing = "SELECT ?violation ?subject WHERE { VALUES (?violation ?subject) {} }";
            String failing = "SELECT ?violation ?subject WHERE { VALUES (?violation ?subject) { (\"planted\" <urn:test:subject>) } }";
            assertThat(Rdf4jEngine.evaluateIntegrityQuery(connection, passing, "global").count()).isZero();
            assertThat(Rdf4jEngine.evaluateIntegrityQuery(connection, failing, "global").count()).isOne();
            assertThat(Rdf4jEngine.evaluateIntegrityQuery(connection, failing, "lifecycle").count()).isOne();
            assertThat(Rdf4jEngine.queryTimeoutSeconds()).isEqualTo(180);
        } finally {
            repository.shutDown();
        }
    }

    @Test
    void contaminationCounterDetectsDefaultAndUnknownNamedData() {
        MemoryStore store = new MemoryStore();
        SailRepository repository = new SailRepository(store);
        repository.init();
        var factory = SimpleValueFactory.getInstance();
        try (var connection = repository.getConnection()) {
            connection.add(factory.createIRI("urn:test:s1"), factory.createIRI("urn:test:p"),
                    factory.createIRI("urn:test:o"));
            connection.add(factory.createIRI("urn:test:s2"), factory.createIRI("urn:test:p"),
                    factory.createIRI("urn:test:o"), factory.createIRI("urn:test:unknown"));
            assertThat(Rdf4jEngine.contaminationCount(connection, Set.of())).isEqualTo(2);
            connection.clear();
            connection.add(factory.createIRI("urn:test:s"), factory.createIRI("urn:test:p"),
                    factory.createIRI("urn:test:o"), factory.createIRI("urn:test:registered"));
            assertThat(Rdf4jEngine.contaminationCount(connection, Set.of("urn:test:registered"))).isZero();
        } finally {
            repository.shutDown();
        }
    }

    private static GraphManifest miniManifest(String file, String graph) {
        GraphManifest manifest = new GraphManifest();
        manifest.baseIri = "urn:test:";
        GraphManifest.GraphEntry entry = new GraphManifest.GraphEntry();
        entry.file = file;
        entry.graph = graph;
        entry.loadOrder = 1;
        manifest.definitionGraphs = List.of(entry);
        manifest.authoredGraphs = List.of();
        manifest.observedGraphs = List.of();
        manifest.shapeGraphs = List.of();
        manifest.rules = List.of();
        manifest.derivedGraphs = List.of();
        return manifest;
    }
}
