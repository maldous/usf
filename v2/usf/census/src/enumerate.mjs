import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareBy, framedDigest, sha256, writeJsonAtomic, writeJsonlAtomic } from './canonical.mjs';
import { censusRoot, repositoryRoot } from './constants.mjs';
import { assertUnique, validateUniverseMember } from './contract.mjs';

const universeFiles = {
  'repository-output': 'repository-universe.jsonl',
  'v2-graph-authority': 'v2-graph-universe.jsonl',
  'v2-compiler-implementation': 'v2-compiler-universe.jsonl',
  'v2-support-provisioning': 'v2-support-universe.jsonl'
};

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: options.encoding ?? 'buffer',
    maxBuffer: 1024 * 1024 * 1024
  });
}

function nulValues(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

export function trackedEntries() {
  const entries = new Map();
  for (const row of nulValues(git(['ls-files', '--stage', '-z']))) {
    const match = /^(\d{6}) ([a-f0-9]{40,64}) (\d)\t([\s\S]+)$/.exec(row);
    if (!match) throw new Error(`unparseable git index row: ${row.slice(0, 80)}`);
    const [, mode, objectId, stage, repoPath] = match;
    if (stage !== '0') throw new Error(`unmerged index stage for ${repoPath}`);
    entries.set(repoPath, { mode, objectId });
  }
  return entries;
}

export function workingStates() {
  const states = new Map();
  const rows = nulValues(git(['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const code = row.slice(0, 2);
    const repoPath = row.slice(3);
    if (code.includes('R') || code.includes('C')) index += 1;
    let state = 'tracked';
    if (code === '??') state = 'untracked';
    else if (code.includes('R')) state = 'renamed';
    else if (code.includes('D')) state = 'deleted';
    else if (code[0] !== ' ') state = 'staged';
    else if (code[1] !== ' ') state = 'modified';
    states.set(repoPath, state);
  }
  return states;
}

function walkFiles(relativeDirectory) {
  const absolute = path.join(repositoryRoot, relativeDirectory);
  const output = [];
  const visit = (directory) => {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const current = path.join(directory, entry.name);
      const relative = path.relative(repositoryRoot, current).split(path.sep).join('/');
      if (relative.startsWith('v2/usf/census/')) continue;
      if (entry.isDirectory()) visit(current);
      else output.push(relative);
    }
  };
  if (fs.existsSync(absolute)) visit(absolute);
  return output;
}

function ignoredPaths(paths) {
  if (paths.length === 0) return new Set();
  const input = Buffer.from(`${paths.join('\0')}\0`);
  try {
    return new Set(nulValues(execFileSync('git', ['check-ignore', '-z', '--stdin'], {
      cwd: repositoryRoot,
      input,
      encoding: 'buffer',
      maxBuffer: 1024 * 1024 * 1024
    })));
  } catch (error) {
    if (error.status === 1) return new Set();
    const output = error.stdout ? nulValues(error.stdout) : [];
    if (output.length > 0) return new Set(output);
    throw error;
  }
}

function modeFromStat(stat) {
  if (stat.isSymbolicLink()) return '120000';
  return stat.mode & 0o111 ? '100755' : '100644';
}

export function identifyFormat(repoPath, bytes, mode) {
  if (mode === '120000') return { binary: false, extension: '', mediaType: 'inode/symlink', formatKind: 'symbolic-link' };
  if (mode === '160000') return { binary: false, extension: '', mediaType: 'application/x-gitlink', formatKind: 'gitlink' };
  const lower = repoPath.toLowerCase();
  const extension = path.posix.extname(lower);
  const sample = bytes.subarray(0, 8192);
  const binary = sample.includes(0);
  const text = binary ? '' : sample.toString('utf8');
  if (text.startsWith('version https://git-lfs.github.com/spec/v1')) return { binary: false, extension, mediaType: 'text/plain', formatKind: 'git-lfs-pointer' };
  if (binary) {
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(extension)) return { binary, extension, mediaType: `image/${extension.slice(1).replace('jpg', 'jpeg')}`, formatKind: 'image-raster' };
    if (['.woff', '.woff2', '.ttf', '.otf'].includes(extension)) return { binary, extension, mediaType: 'font/unknown', formatKind: 'font' };
    if (['.zip', '.gz', '.tgz', '.xz', '.tar', '.jar'].includes(extension)) return { binary, extension, mediaType: 'application/octet-stream', formatKind: 'archive' };
    return { binary, extension, mediaType: 'application/octet-stream', formatKind: 'opaque-binary' };
  }
  if (['.json'].includes(extension)) return { binary, extension, mediaType: 'application/json', formatKind: 'structured-json' };
  if (['.jsonl', '.ndjson'].includes(extension)) return { binary, extension, mediaType: 'application/x-ndjson', formatKind: 'data-jsonl' };
  if (['.yaml', '.yml'].includes(extension)) return { binary, extension, mediaType: 'application/yaml', formatKind: 'structured-yaml' };
  if (extension === '.toml') return { binary, extension, mediaType: 'application/toml', formatKind: 'structured-toml' };
  if (['.xml', '.plist'].includes(extension)) return { binary, extension, mediaType: 'application/xml', formatKind: 'structured-xml' };
  if (extension === '.csv') return { binary, extension, mediaType: 'text/csv', formatKind: 'data-csv' };
  if (extension === '.md' || lower.endsWith('readme')) return { binary, extension, mediaType: 'text/markdown', formatKind: 'document-markdown' };
  if (['.html', '.htm'].includes(extension)) return { binary, extension, mediaType: 'text/html', formatKind: 'document-html' };
  if (extension === '.svg') return { binary, extension, mediaType: 'image/svg+xml', formatKind: 'image-vector' };
  if (extension === '.css') return { binary, extension, mediaType: 'text/css', formatKind: 'source-css' };
  if (['.ttl'].includes(extension)) return { binary, extension, mediaType: 'text/turtle', formatKind: 'rdf-turtle' };
  if (['.trig'].includes(extension)) return { binary, extension, mediaType: 'application/trig', formatKind: 'rdf-trig' };
  if (['.rq', '.sparql'].includes(extension)) return { binary, extension, mediaType: 'application/sparql-query', formatKind: 'sparql-query' };
  if (['.sh', '.bash'].includes(extension) || text.startsWith('#!/bin/sh') || text.startsWith('#!/usr/bin/env bash') || text.startsWith('#!/bin/bash')) return { binary, extension, mediaType: 'text/x-shellscript', formatKind: 'source-shell' };
  if (extension === '.sql') return { binary, extension, mediaType: 'application/sql', formatKind: 'source-sql' };
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.c', '.h', '.cpp'].includes(extension)) return { binary, extension, mediaType: 'text/plain', formatKind: 'source-code' };
  if (['.pem', '.crt', '.cer'].includes(extension)) return { binary, extension, mediaType: 'application/x-pem-file', formatKind: 'certificate' };
  if (['.env', '.ini', '.conf', '.config', '.properties'].includes(extension) || ['.gitignore', '.npmrc', '.editorconfig', 'makefile', 'dockerfile'].includes(path.posix.basename(lower))) return { binary, extension, mediaType: 'text/plain', formatKind: 'configuration-text' };
  return { binary, extension, mediaType: 'text/plain', formatKind: 'plain-text' };
}

function contentFor(repoPath, tracked) {
  const absolute = path.join(repositoryRoot, repoPath);
  if (fs.existsSync(absolute) || fs.lstatSync(path.dirname(absolute)).isDirectory()) {
    try {
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) return { bytes: Buffer.from(fs.readlinkSync(absolute)), stat, link: fs.readlinkSync(absolute) };
      return { bytes: fs.readFileSync(absolute), stat, link: null };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const entry = tracked.get(repoPath);
  if (!entry) throw new Error(`unreadable source path: ${repoPath}`);
  if (entry.mode === '160000') return { bytes: Buffer.from(`gitlink:${entry.objectId}`), stat: null, link: null };
  return { bytes: git(['cat-file', 'blob', entry.objectId]), stat: null, link: null };
}

function createMember(repoPath, universe, tracked, states, ignored) {
  const entry = tracked.get(repoPath);
  const { bytes, stat, link } = contentFor(repoPath, tracked);
  const mode = entry?.mode ?? modeFromStat(stat);
  const format = identifyFormat(repoPath, bytes, mode);
  const sourceState = states.get(repoPath) ?? (entry ? 'tracked' : ignored.has(repoPath) ? 'ignored-materialised' : 'untracked');
  const member = {
    path: repoPath,
    universe,
    sourceState,
    contentDigest: sha256(bytes),
    byteSize: bytes.length,
    fileMode: mode,
    executable: mode === '100755',
    binary: format.binary,
    extension: format.extension,
    mediaType: format.mediaType,
    formatKind: format.formatKind,
    symbolicLinkTarget: link
  };
  validateUniverseMember(member);
  return member;
}

function parseIgnoreFile(repoPath) {
  const lines = fs.readFileSync(path.join(repositoryRoot, repoPath), 'utf8').split(/\r?\n/);
  return lines.flatMap((raw, index) => {
    const pattern = raw.trim();
    if (!pattern || pattern.startsWith('#')) return [];
    const negated = pattern.startsWith('!');
    const value = negated ? pattern.slice(1) : pattern;
    let pathClass = 'runtime-output';
    let reason = 'transient execution output is not source';
    if (/env|credential|secret/i.test(value)) {
      pathClass = 'credential';
      reason = 'credential-bearing state is prohibited from source control';
    } else if (/node_modules|pnpm-store|\.venv|__pycache__|\.pyc/i.test(value)) {
      pathClass = 'dependency-installation';
      reason = 'installed dependencies are externally materialised';
    } else if (/dist|coverage|cache|\.claude|\.codex|proof-review/i.test(value)) {
      pathClass = 'generated-or-cache-output';
      reason = 'generated, review, or cache output is recreated by tracked commands';
    } else if (repoPath === 'v2/.gitignore' && value === '/*') {
      pathClass = 'chroot-runtime';
      reason = 'the V2 root is a chroot runtime whose source exceptions are explicitly negated';
    } else if (/snapshot/i.test(value)) {
      pathClass = 'derived-graph-output';
      reason = 'graph snapshots are derived and the tracked directory contract is retained';
    }
    return [{ ignoreFile: repoPath, line: index + 1, pattern, negated, pathClass, closureDecision: 'allowed', reason }];
  });
}

export function auditIgnoreRules(tracked) {
  const ignoreFiles = [...tracked.keys()].filter((repoPath) => path.posix.basename(repoPath) === '.gitignore').sort();
  const rules = ignoreFiles.flatMap(parseIgnoreFile);
  const blocked = rules.filter((rule) => rule.closureDecision === 'blocked');
  return {
    ignoreFiles,
    rules,
    blockedPatternCount: blocked.length,
    closureStatus: blocked.length === 0 ? 'complete' : 'incomplete'
  };
}

export function enumerateCurrent() {
  const tracked = trackedEntries();
  const states = workingStates();
  const nonignoredUntracked = nulValues(git(['ls-files', '--others', '--exclude-standard', '-z']));

  const repositoryPaths = [...new Set([
    ...[...tracked.keys()].filter((repoPath) => !repoPath.startsWith('v2/')),
    ...nonignoredUntracked.filter((repoPath) => !repoPath.startsWith('v2/'))
  ])].sort();
  const graphPaths = walkFiles('v2/usf/graph');
  const compilerPaths = walkFiles('v2/usf/compiler');
  const supportPaths = [...tracked.keys()].filter((repoPath) => repoPath.startsWith('v2/') &&
    !repoPath.startsWith('v2/usf/graph/') && !repoPath.startsWith('v2/usf/compiler/') && !repoPath.startsWith('v2/usf/census/')).sort();
  const allFilesystemPaths = [...graphPaths, ...compilerPaths];
  const ignored = ignoredPaths(allFilesystemPaths.filter((repoPath) => !tracked.has(repoPath)));

  const universes = {
    'repository-output': repositoryPaths.map((repoPath) => createMember(repoPath, 'repository-output', tracked, states, ignored)),
    'v2-graph-authority': graphPaths.map((repoPath) => createMember(repoPath, 'v2-graph-authority', tracked, states, ignored)),
    'v2-compiler-implementation': compilerPaths.map((repoPath) => createMember(repoPath, 'v2-compiler-implementation', tracked, states, ignored)),
    'v2-support-provisioning': supportPaths.map((repoPath) => createMember(repoPath, 'v2-support-provisioning', tracked, states, ignored))
  };
  for (const records of Object.values(universes)) {
    records.sort(compareBy(['path']));
    assertUnique(records, 'path');
  }
  return { universes, ignoreAudit: auditIgnoreRules(tracked) };
}

export function universeSummary(universes) {
  const summary = {};
  for (const [universe, records] of Object.entries(universes)) {
    summary[universe] = {
      count: records.length,
      digest: framedDigest(records, ['universe', 'path', 'sourceState', 'fileMode', 'contentDigest'])
    };
  }
  return {
    repositoryUniverseDigest: summary['repository-output'].digest,
    v2GraphUniverseDigest: summary['v2-graph-authority'].digest,
    v2CompilerUniverseDigest: summary['v2-compiler-implementation'].digest,
    v2SupportUniverseDigest: summary['v2-support-provisioning'].digest,
    universeCounts: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, value.count]))
  };
}

export function writeUniverseOutputs(result) {
  for (const [universe, records] of Object.entries(result.universes)) writeJsonlAtomic(path.join(censusRoot, universeFiles[universe]), records);
  writeJsonAtomic(path.join(censusRoot, 'universes.json'), universeSummary(result.universes));
  writeJsonAtomic(path.join(censusRoot, 'ignore-audit.json'), result.ignoreAudit);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = enumerateCurrent();
  writeUniverseOutputs(result);
  process.stdout.write(`${JSON.stringify(universeSummary(result.universes))}\n`);
}
