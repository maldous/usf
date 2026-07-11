import fs from 'node:fs';
import path from 'node:path';
import { censusRoot } from './constants.mjs';
import { enumerateCurrent, universeSummary } from './enumerate.mjs';

const baseline = JSON.parse(fs.readFileSync(path.join(censusRoot, 'universes.json'), 'utf8'));
const current = universeSummary(enumerateCurrent().universes);
const keys = ['repositoryUniverseDigest', 'v2GraphUniverseDigest', 'v2CompilerUniverseDigest', 'v2SupportUniverseDigest'];
const drift = keys.filter((key) => baseline[key] !== current[key]);
if (drift.length > 0) {
  process.stderr.write(`${JSON.stringify({ driftStatus: 'detected', changedUniverses: drift })}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ driftStatus: 'none', verifiedUniverses: keys.length })}\n`);
}
