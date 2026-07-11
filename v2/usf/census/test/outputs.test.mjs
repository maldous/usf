import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { censusRoot, classifications } from '../src/constants.mjs';
import { readJsonl } from '../src/canonical.mjs';

test('reviewed selectors are digest anchored and unique', () => {
  const rows = readJsonl(path.join(censusRoot, 'src', 'reviewed-overrides.jsonl'));
  const keys = rows.map((row) => `${row.universe}\0${row.path}\0${row.contentDigest}`);
  assert.equal(new Set(keys).size, rows.length);
  assert.ok(rows.every((row) => /^[a-f0-9]{64}$/.test(row.contentDigest)));
});

test('semantic layer review covers the complete controlled layer set', () => {
  const rows = readJsonl(path.join(censusRoot, 'src', 'semantic-layer-review.jsonl'));
  assert.deepEqual(rows.map((row) => row.layer).sort(), [...classifications.semanticLayers].sort());
  assert.ok(rows.every((row) => row.coverageStatus === 'complete' || (row.preciseGaps.length > 0 && row.requiredSemanticLayers.length > 0)));
});

test('work packages own every row and relationship exactly once', () => {
  const packages = JSON.parse(fs.readFileSync(path.join(censusRoot, 'workpackages.json'), 'utf8')).workPackages;
  const rows = packages.flatMap((item) => item.affectedRows);
  const relationships = packages.flatMap((item) => item.affectedRelationships);
  assert.equal(rows.length, new Set(rows).size);
  assert.equal(relationships.length, new Set(relationships).size);
  assert.equal(rows.length, readJsonl(path.join(censusRoot, 'census.jsonl')).length + classifications.semanticLayers.length);
  assert.equal(relationships.length, readJsonl(path.join(censusRoot, 'references.jsonl')).length);
});

test('work-package hard dependencies are valid and acyclic', () => {
  const packages = JSON.parse(fs.readFileSync(path.join(censusRoot, 'workpackages.json'), 'utf8')).workPackages;
  const dependencies = JSON.parse(fs.readFileSync(path.join(censusRoot, 'dependencies.json'), 'utf8')).dependencies;
  const keys = new Set(packages.map((item) => item.key));
  const graph = new Map();
  for (const dependency of dependencies) {
    assert.ok(keys.has(dependency.workPackage));
    assert.ok(keys.has(dependency.dependsOn));
    if (!graph.has(dependency.workPackage)) graph.set(dependency.workPackage, []);
    graph.get(dependency.workPackage).push(dependency.dependsOn);
  }
  const active = new Set();
  const complete = new Set();
  const visit = (key) => {
    assert.ok(!active.has(key), `dependency cycle at ${key}`);
    if (complete.has(key)) return;
    active.add(key);
    for (const dependency of graph.get(key) ?? []) visit(dependency);
    active.delete(key);
    complete.add(key);
  };
  for (const key of keys) visit(key);
});

test('canonical outputs contain no coordinator or current issue metadata', () => {
  const files = fs.readdirSync(censusRoot).filter((file) => /\.jsonl?$/.test(file));
  const forbidden = /\/home\/user|USF-(?:111[6-9]|112\d|113[0-3])|linearIssue|linearProject|agentMetadata|gitBranch|gitCommit/;
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(censusRoot, file), 'utf8'), forbidden, file);
});
