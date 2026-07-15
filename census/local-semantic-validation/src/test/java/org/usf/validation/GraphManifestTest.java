package org.usf.validation;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;

import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class GraphManifestTest {
    private static Path repositoryRoot;
    private static GraphManifest manifest;

    @BeforeAll
    static void loadManifest() throws Exception {
        repositoryRoot = Path.of("../..").toRealPath();
        manifest = GraphManifest.read(repositoryRoot);
    }

    @Test
    void identityIsCanonical() {
        assertThat(manifest.version).isEqualTo(1);
        assertThat(manifest.database).isEqualTo("USF");
        assertThat(manifest.baseIri).isEqualTo("urn:usf:");
    }

    @Test
    void dataGraphInventoryIsComplete() {
        assertThat(manifest.dataGraphs()).hasSize(35);
        assertThat(manifest.dataGraphIris()).hasSize(35);
    }

    @Test
    void shapeFragmentsUseOneRegisteredGraph() {
        assertThat(manifest.shapeGraphs).hasSize(12);
        assertThat(manifest.shapeGraphs).allMatch(entry -> "urn:usf:graph:shapes".equals(entry.graph));
    }

    @Test
    void fixturesNeverLoadAsAuthority() {
        assertThat(manifest.fixtures.loadAsAuthority).isFalse();
    }

    @Test
    void integrityRulesAreOrdered() {
        assertThat(manifest.integrityRules()).extracting(entry -> entry.file)
                .containsExactly("rules/integrity.rq", "rules/lifecycle.rq");
    }

    @TestFactory
    Stream<DynamicTest> derivationFamiliesRemainOrderedAndRegistered() {
        List<String> names = List.of("repositorystructure", "sourcedispositions", "obligations", "evidence",
                "surfaces", "coverage", "readiness");
        return java.util.stream.IntStream.range(0, names.size()).mapToObj(index -> DynamicTest.dynamicTest(
                "derivation family " + names.get(index), () -> {
                    GraphManifest.RuleEntry rule = manifest.derivationRules().get(index);
                    GraphManifest.GraphEntry graph = manifest.derivedGraphs.get(index);
                    assertThat(rule.output).isEqualTo("urn:usf:graph:derived:" + names.get(index));
                    assertThat(graph.graph).isEqualTo(rule.output);
                }));
    }

    @Test
    void runtimeGraphSetsExcludeAndIncludeShapesAtCorrectStages() {
        assertThat(manifest.allRuntimeGraphIris()).doesNotContain("urn:usf:graph:shapes");
        assertThat(manifest.integrityGraphIris()).contains("urn:usf:graph:shapes");
    }
}
