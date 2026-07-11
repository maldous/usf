#!/usr/bin/env node
// Command-line entry point for the USF semantic compiler.
//
//   node src/cli.js check     local manifest + graph checks (no network)
//   node src/cli.js compile   transactionally provision the graph into Stardog
//   node src/cli.js verify    read-only conformance report as JSON
//
// All output is structured JSON on stdout. Credentials are never printed.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig, describeConfig } from './config.js';
import { loadManifest } from './manifest.js';
import { createClient } from './stardog.js';
import { checkLocal, compile, verify, CompilerError } from './compiler.js';

const GRAPH_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'graph');

function emit(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

async function main() {
  const command = process.argv[2];

  if (command === 'check') {
    const manifest = loadManifest(GRAPH_DIR);
    const summary = checkLocal(manifest);
    emit({ command, ...summary });
    return 0;
  }

  if (command === 'compile') {
    const config = loadConfig();
    const manifest = loadManifest(GRAPH_DIR);
    const client = createClient(config);
    const result = await compile({ manifest, client });
    emit({ command, target: describeConfig(config), ...result });
    return 0;
  }

  if (command === 'verify') {
    const config = loadConfig();
    const manifest = loadManifest(GRAPH_DIR);
    const client = createClient(config);
    const report = await verify({ manifest, client });
    emit({ command, target: describeConfig(config), ...report });
    const conformant =
      report.reachable &&
      report.validationConforms === true &&
      report.integrityConforms === true &&
      report.contaminationCount === 0 &&
      report.missingGraphs.length === 0 &&
      report.unexpectedGraphs.length === 0;
    return conformant ? 0 : 1;
  }

  process.stderr.write('usage: cli.js <check|compile|verify>\n');
  return 2;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof CompilerError) {
      const { name, message, phase, failures, violations, count } = err;
      emit({ ok: false, error: name, phase, message, failures, violations, count });
    } else {
      // Config and adapter errors are already credential-free by construction.
      emit({ ok: false, error: err.name || 'Error', message: err.message });
    }
    process.exit(1);
  });
