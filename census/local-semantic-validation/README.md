# Local semantic validation

This package is the permanent host-side realisation of
`urn:usf:semanticcontract:localsemanticvalidationtoolchain`. It reads only the
repository graph manifest, preserves named graphs, and keeps every full-corpus
store and dependency cache outside Git and outside the chroot.

## Runtime and build

The launchers require host OpenJDK feature 25 at
`/usr/lib/jvm/java-25-openjdk-amd64` and Maven 3.9.11. The Maven distribution,
plugins, RDF4J 6.0.0, Jena 6.1.0, and every transitive runtime artifact are
pinned. The converged graph also pins patched Jackson 2.22.1 and Jena-compatible
Thrift 0.23.0. `dependencies.lock.json` contains the artifact sizes and SHA-256
digests; every build regenerates the resolved runtime inventory and fails if it
differs from the committed lock.

Resolve dependencies and run the full build once with:

```text
./mvnw clean verify
```

Thereafter the normal build is network-independent:

```text
./mvnw -o clean verify
```

Generate the optional CycloneDX JSON license/SBOM inventory with an online
`./mvnw -Psbom -DskipTests package`. The CycloneDX plugin intentionally skips
in Maven offline mode; it is not part of normal validation. The inventory is
generated under `target/` and is never committed. Maven and the runtime
launchers fix UTF-8, English locale, and UTC.

## Commands

Run `./run check` before staged use. The command surface is:

- `check`: fail-closed runtime, lock, authority, manifest, resource, Git-output,
  concurrency, temporary-path, and chroot-boundary preflight;
- `load`: create an ownership-marked persistent RDF4J or Jena workspace;
- `derive`: execute every registered derivation block in manifest order and
  report its rule, input state, output graph, count, digest, and timing;
- `validate`: run RDF4J standalone SHACL or Jena SHACL;
- `validate-incremental`: run the serializable ShaclSail delta lifecycle;
- `integrity`: run registered integrity and lifecycle queries plus contamination;
- `compare`: run bounded RDF4J/Jena graph, trace, and normalized SHACL parity;
- `prove`: run the selected validation profile;
- `benchmark`: run the selected profile without changing acceptance and return
  phase, resource, and cleanup measurements;
- `clean`: delete only a workspace carrying this tool's ownership marker.

Staged commands use `--work-dir PATH` and `--engine rdf4j|jena`. `--output PATH`
writes the same canonical JSON emitted on standard output. `--keep-work` is
available only for explicit diagnostic retention. Every machine result is
strict, self-digesting JSON no larger than 8 KiB; human diagnostics use standard
error.

## Profiles and authority snapshot

`--profile fast` runs one RDF4J NativeStore, all derivations, standalone SHACL,
lifecycle integrity, and contamination. It does not run Jena and explicitly
does not claim independent proof.

`--profile proof` uses NativeStore indexes
`spoc,posc,cosp,ospc,psoc` and runs two clean RDF4J derivations, deterministic
trace and graph comparison, independent Jena TDB2/ARQ derivation, normalized
dual-engine SHACL, global and lifecycle integrity, contamination, ShaclSail
delta fixtures, resource limits, and cleanup verification.

For evidence admission, pass a coordinator-projected live digest using
`--authority-snapshot PATH`. The file may contain the 64-character digest or a
small JSON object with `authorityDigest`; it is read at both proof boundaries.
The authorised digest remains pinned in `toolchain.json`.

## Host/chroot boundary

Full execution is host-only. In the integrated root worktree the default chroot
is `v2`; a separate worktree must pass `--chroot-root /home/user/src/usf/v2` or
set `USF_CHROOT_ROOT`. The check scans privileged chroot paths and rejects Java,
Maven/Gradle caches, NativeStore data, a complete graph/census corpus, and raw
validation or benchmark output.

The chroot receives only the bounded JSON result through a caller-controlled
pipe or untracked file. A consumer must verify `resultDigest` before using the
result. Neither RDF4J nor Jena becomes semantic authority.

## Canonical comparison

The replaceable `GraphCanonicalizer` boundary currently uses
`usf-sorted-term-tuples-v1`: exact named-graph IRIs and length-prefixed RDF terms
are sorted as UTF-8 and hashed with SHA-256. Derived blank nodes fail closed.
RDFLib remains outside the full-corpus execution path and may be used only for
parsing compatibility, minimized fixtures, canonical comparison support, and
lightweight diagnostics.
