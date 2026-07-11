import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createParserRegistry, parseMembers } from '../src/parsers/registry.mjs';
import { structuredParsers } from '../src/parsers/structured.mjs';

function context(syntaxKind, text, path = `fixtures/example.${syntaxKind}`) {
  return { syntaxKind, text, pathContext: 'fixture-or-test', member: { path } };
}

function parse(syntaxKind, text, path) {
  const parser = structuredParsers.find((candidate) => candidate.supports({ syntaxKind }));
  assert.ok(parser, `parser exists for ${syntaxKind}`);
  return parser.parse(context(syntaxKind, text, path));
}

test('parser objects satisfy registry contracts and cover every assigned syntax', () => {
  assert.equal(createParserRegistry(structuredParsers).length, 5);
  for (const syntax of ['structured-json', 'data-jsonl', 'yaml', 'compose-yaml', 'workflow-yaml', 'toml', 'xml', 'csv', 'markdown', 'make', 'shell', 'dockerfile', 'sql', 'configuration', 'html', 'svg', 'css', 'certificate', 'git-lfs-pointer']) {
    assert.ok(structuredParsers.some((parser) => parser.supports({ syntaxKind: syntax })), syntax);
  }
});

test('identical content at distinct paths retains member-specific cached projections', () => {
  const paths = [
    'artifacts/proof-cockpit/machine-runs/2026-07-11T03-59-53-440Z/adapter-manifest.json',
    'artifacts/proof-cockpit/machine-runs/2026-07-11T03-59-53-440Z/external-review-bundle/adapter-manifest.json'
  ];
  const members = fs.readFileSync(new URL('../repository-universe.jsonl', import.meta.url), 'utf8')
    .trim().split('\n').map(JSON.parse).filter((member) => paths.includes(member.path));
  assert.equal(members.length, 2);
  assert.equal(members[0].contentDigest, members[1].contentDigest);
  const parsed = parseMembers(members, structuredParsers);
  assert.notEqual(parsed[0].cacheKey, parsed[1].cacheKey);
  assert.deepEqual(parsed.map((entry) => entry.inventory.scope).sort(), paths.sort());
  assert.deepEqual(parsed.map((entry) => entry.declarations[0].identifier).sort(), paths.sort());
});

test('JSON and JSONL inventories are substantive and retain declared relationships', () => {
  const json = parse('structured-json', JSON.stringify({ name: 'example', scripts: { verify: 'node verify.mjs' }, dependencies: { yaml: '2.9.0' }, manifest: './manifest.json' }), 'fixtures/package.json');
  assert.ok(json.declarations.some((entry) => entry.kind === 'package'));
  assert.ok(json.declarations.some((entry) => entry.kind === 'command' && entry.attributes.executableContext.kind === 'package-script'));
  assert.ok(json.relationships.some((entry) => entry.relationshipType === 'depends-on' && entry.target === 'yaml'));
  assert.ok(json.relationships.some((entry) => entry.target.endsWith('/manifest.json')));
  assert.equal(json.inventory.inventoryKind, 'keyed-map');
  const jsonl = parse('data-jsonl', '{"id":"one","path":"./one.json"}\n\n{"id":"two"}\n');
  assert.deepEqual(jsonl.declarations.filter((entry) => entry.kind === 'jsonl-record').map((entry) => entry.identifier), ['one', 'two']);
});

test('workflow YAML includes nested jobs, conditions, matrices, anchors, actions, and multiline command context', () => {
  const parsed = parse('workflow-yaml', `
defaults: &defaults
  timeout-minutes: 5
jobs:
  build:
    <<: *defaults
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
        os: [ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - id: verify
        if: success()
        shell: bash
        run: |
          npm ci
          npm test
  publish:
    needs: [build]
    uses: owner/repo/.github/workflows/reuse.yml@main
`, '.github/workflows/verify.yml');
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'yaml-anchor' && entry.identifier === 'defaults'));
  assert.ok(parsed.relationships.some((entry) => entry.extractionMethod === 'yaml-alias' && entry.target === 'defaults'));
  assert.deepEqual(parsed.declarations.filter((entry) => entry.kind === 'workflow-job').map((entry) => entry.identifier), ['build', 'publish']);
  assert.equal(parsed.declarations.filter((entry) => entry.kind === 'workflow-matrix-axis').length, 2);
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'workflow-condition'));
  const command = parsed.declarations.find((entry) => entry.kind === 'command' && entry.attributes.executableContext.kind === 'workflow-step');
  assert.match(command.attributes.command, /npm ci\nnpm test/);
  assert.equal(command.attributes.executableContext.interpreter, 'bash');
  assert.ok(parsed.relationships.some((entry) => entry.relationshipType === 'needs' && entry.target === 'build'));
  assert.equal(parsed.inventory.inventoryKind, 'workflow-definition');
});

test('Compose YAML includes nested services, dependencies, anchors, health checks, commands, and inventories', () => {
  const parsed = parse('compose-yaml', `
x-service: &service
  restart: unless-stopped
services:
  api:
    <<: *service
    image: example/api:1
    depends_on:
      db:
        condition: service_healthy
    command: |
      node server.mjs
      --verify
    healthcheck:
      test: [CMD-SHELL, curl -f http://localhost/health]
    volumes:
      - ./config.json:/app/config.json:ro
  db:
    image: postgres:17
volumes:
  data: {}
networks:
  internal: {}
`, 'compose/compose.yaml');
  assert.deepEqual(parsed.declarations.filter((entry) => entry.kind === 'compose-service').map((entry) => entry.identifier), ['api', 'db']);
  assert.ok(parsed.relationships.some((entry) => entry.relationshipType === 'depends-on' && entry.target === 'db'));
  assert.ok(parsed.relationships.some((entry) => entry.relationshipType === 'health-checks' && entry.target === 'api'));
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'command' && entry.attributes.executableContext.kind === 'compose-healthcheck'));
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'compose-volume' && entry.identifier === 'data'));
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'compose-network' && entry.identifier === 'internal'));
});

test('TOML, XML, SVG, and CSV use structural representations', () => {
  const toml = parse('toml', '[build]\ncommand = "npm run build"\npublish = "dist/site.json"\n');
  assert.ok(toml.declarations.some((entry) => entry.kind === 'toml-table' && entry.identifier === 'build'));
  const xml = parse('xml', '<?xml version="1.0"?><catalog><item id="one" href="./one.json"/></catalog>');
  assert.ok(xml.declarations.some((entry) => entry.kind === 'xml-element' && entry.attributes.localName === 'item'));
  assert.ok(xml.relationships.some((entry) => entry.target.endsWith('/one.json')));
  const svg = parse('svg', '<svg xmlns="http://www.w3.org/2000/svg"><use id="copy" href="./icons.svg"/></svg>');
  assert.ok(svg.declarations.some((entry) => entry.kind === 'svg-id' && entry.identifier === 'copy'));
  const csv = parse('csv', 'id,description,path\r\none,"multi\nline",./one.json\r\n');
  assert.equal(csv.declarations.filter((entry) => entry.kind === 'csv-row').length, 1);
  assert.equal(csv.inventory.inventoryKind, 'tabular-matrix');
});

test('Make, shell, and Dockerfile commands always carry executable context', () => {
  const make = parse('make', 'include shared.mk\nverify: input.json\n\tnode verify.mjs\n', 'Makefile');
  const shell = parse('shell', '#!/usr/bin/env bash\nsource ./common.sh\nNAME=value\necho "$NAME"\n', 'tools/verify.sh');
  const docker = parse('dockerfile', 'FROM node:22 AS build\nCOPY package.json ./\nRUN npm ci \\\n+ && npm test\nCMD ["node", "server.mjs"]\n', 'Dockerfile');
  for (const parsed of [make, shell, docker]) {
    const commands = parsed.declarations.filter((entry) => entry.kind === 'command');
    assert.ok(commands.length > 0);
    assert.ok(commands.every((entry) => entry.attributes.executableContext?.kind && entry.attributes.executableContext?.owner));
  }
  assert.ok(make.declarations.some((entry) => entry.kind === 'make-target'));
  assert.ok(shell.relationships.some((entry) => entry.extractionMethod === 'shell-source'));
  assert.ok(docker.declarations.some((entry) => entry.kind === 'container-stage' && entry.identifier === 'build'));
});

test('SQL CST extracts statements and declared entities', () => {
  const parsed = parse('sql', 'CREATE TABLE widgets (id text PRIMARY KEY); INSERT INTO widgets VALUES (\'one\');', 'migrations/001.sql');
  assert.ok(parsed.declarations.some((entry) => entry.kind === 'table' && entry.identifier === 'widgets'));
  assert.ok(parsed.declarations.filter((entry) => entry.kind === 'sql-statement').length >= 2);
  assert.ok(parsed.relationships.some((entry) => entry.relationshipType === 'persists-to' && entry.target === 'widgets'));
});

test('bounded document alternatives declare partial coverage and unsupported structures', () => {
  const samples = [
    ['markdown', '# Heading\n\n[manifest](./manifest.json)\n\n```sh\necho ok\n```\n'],
    ['configuration', '[build]\noutput=./dist.json\n'],
    ['html', '<main id="content"><a href="./next.html">Next</a></main>'],
    ['css', '@import "./base.css"; .item { background: url(./image.png); color: red; }']
  ];
  for (const [syntax, text] of samples) {
    const parsed = parse(syntax, text);
    assert.equal(parsed.structuralCoverage, 'partial');
    assert.ok(parsed.unsupportedStructures.length > 0);
    assert.equal(parsed.confidence.level, 'medium');
    assert.ok(parsed.inventory.declarations.length > 0);
  }
  assert.ok(parse('markdown', 'plain prose only\n').declarations.some((entry) => entry.kind === 'markdown-document'));
});

test('PEM and Git LFS parsers validate their structural envelopes', () => {
  const pem = parse('certificate', '-----BEGIN PUBLIC KEY-----\nAQID\n-----END PUBLIC KEY-----\n', 'keys/example.pem');
  assert.equal(pem.declarations[0].attributes.byteLength, 3);
  const digest = 'a'.repeat(64);
  const lfs = parse('git-lfs-pointer', `version https://git-lfs.github.com/spec/v1\noid sha256:${digest}\nsize 123\n`, 'assets/large.bin');
  assert.equal(lfs.declarations[0].attributes.byteSize, 123);
  assert.throws(() => parse('git-lfs-pointer', 'version bad\noid sha256:no\nsize x\n'));
});
