# USF Semantic-First Foundation Publication Report

## Report status and authority

This file is a user-requested external-review handoff generated from repository,
local validation, transaction, and live Stardog evidence collected on 2026-07-14.

This report is not semantic authority. It does not override the live validated
Stardog model, repository semantic definitions, validator rules, admitted
evidence, or proof results. Git records the report as change-history evidence;
the report remains a lowest-authority projection.

The report is stored in the existing generated-report path family so it remains
outside product-source freshness anchors. External reviewers must not treat the
file path or the generated report as semantic authority.

## Executive result

The repaired semantic candidate was published successfully to the live `USF`
Stardog database using a minimal serializable transaction.

The live model now contains the semantic lifecycle and the active local
validation toolchain contract:

```text
model -> evidence -> proof -> contract -> realisation -> validation
```

The inverse implementation-first chain remains prohibited. The model continues
to distinguish semantic truth, admitted evidence, proof evaluation, warranted
contract activation, authorised realisation, and validation-produced evidence.

Final live state:

| Measure | Before | After |
|---|---:|---:|
| Named graphs | 43 | 43 |
| Triples | 578,232 | 579,406 |
| Legacy graph-count digest | `65d01b455a2117d2fee4798bfc80f874f45dbc3b018011a342f22a8e6bccc291` | `bd90141cf82aa44242cf120902ed0366d8c03e19423f27c147ab16f8fccff544` |
| Lifecycle authority assertion | absent | present |
| Local-validation contract | absent | active |
| Visible transactions | 0 | 0 |
| Visible queries | 0 | 0 |

The publication transaction returned HTTP 200 and the committed transaction is
closed. Independent post-commit inventory, canonical graph comparison, SHACL,
integrity, lifecycle, contamination, and contract-reference checks all passed.

This publication does not activate the compiler or bootstrap implementation
contracts. Both remain proof-blocked. The local validation realisation remains
`contractonly`; permanent RDF4J, compiler, MCP, bootstrap, CAS, canonical live
digest, and chroot implementation work remains separate.

## Repository lineage included in this state

Parent semantic commits, oldest first:

| Commit | Subject |
|---|---|
| `7ffcebb3` | `feat(graph): model semantic-first lifecycle` |
| `2b71b528` | `test(graph): enforce semantic-first lifecycle` |
| `3fdc8222` | `fix(graph): link derived evidence requirements` |
| `0c156039` | `fix(graph): bound repository and source disposition derivations` |
| `638f49a7` | `fix(graph): align lifecycle validation semantics` |
| `d7028c99` | `feat(graph): activate local validation toolchain contract` |
| `10bc3353` | `fix(graph): canonicalize nonnegative quantity constraints` |

Submodule state used by this work:

| Repository | Commit | Remote state before parent integration |
|---|---|---|
| `maldous/usf-graph` | `ee59fc8f09516c017bebeaf8a50b1570fb024834` | local `main` and `origin/main` identical |

No new submodule source change was required by the semantic publication. The
parent gitlink advances from `316e26997e05e0129d11762811a7f6a53cae448f`
to the already-published submodule `main` commit `ee59fc8f09516c017bebeaf8a50b1570fb024834`.

## Bootstrap and coordination discipline

The task reused the existing coordinator authority context. It did not perform
another independent `usf_bootstrap` during the publication and integration
continuation. Workers did not independently bootstrap.

The publication diagnostics and publisher used the existing official
`stardog.js` 10.0.1 dependency and approved credential projection. Credentials,
authorization headers, and raw credential-bearing endpoints were not written to
the report or transaction evidence.

## Semantic model repair

The lifecycle model distinguishes the following roles:

| Role | Meaning |
|---|---|
| Model | Defines semantic truth in the validated Stardog authority |
| Evidence | An admissible observation or produced fact with provenance, integrity, freshness, and scope |
| Proof | Evaluation of an exact admitted evidence set against a proof obligation |
| Contract | Claims, nonclaims, features, constraints, and activation warranted by successful proof |
| ADR | Historical rationale for a material decision; never semantic authority |
| Toolchain | Selected means of realisation |
| Code | Candidate realisation, not a source of requirements |
| Validation | Execution that produces further evidence |
| Report | Projection of state and outcomes; never admission or authority |
| Ticket | Work-tracking carrier; never contract activation |

The graph now models evidence requirements, evidence results, admission,
freshness, provenance, retention, supersession, proof obligations, evaluations,
algorithms, evidence-set digests, confidence, invalidation, contract activation,
realisation decisions, ADR requirements, validation obligations, and validation
evidence.

Live lifecycle resource counts after publication:

| Class | Count |
|---|---:|
| `EvidenceRequirement` | 128 |
| `EvidenceResult` | 11 |
| `EvidenceAdmission` | 1 |
| `ProofObligation` | 125 |
| `ProofEvaluation` | 1 |
| `ProofResult` | 52 |
| `SemanticContract` | 70 |
| `RealisationDecision` | 1 |
| `RealisationOption` | 6 |
| `ADRRequirement` | 1 |
| `ADRRecord` | 1 |
| `ValidationObligation` | 1 |
| `ValidationExecution` | 0 |
| `ValidationResult` | 0 |

Current governed activation facts:

| Fact | Count |
|---|---:|
| Admitted, fresh, integrity-valid evidence results | 1 |
| Successful proof results | 1 |
| Active contracts | 1 |
| Proof-blocked implementation contracts | 2 |

The absence of live `ValidationExecution` and `ValidationResult` instances is
not filled by this report. Future validation executions must enter the evidence
lifecycle through admission and proof recomputation.

## Datatype repair

The candidate originally contained 71 SHACL datatype violations because eleven
count properties used `xsd:nonNegativeInteger` while existing shapes required
exact `xsd:integer`.

The affected properties are cardinalities or non-negative quantities. The
portable authoritative representation is `xsd:integer` with explicit numeric
bounds, not exact use of an integer-derived datatype.

| Property family | Classification | Canonical representation | Bound |
|---|---|---|---|
| `observedRequiredPrerequisiteDependencyCount` | cardinality | `xsd:integer` | minimum 0 |
| `observedResolvedPrerequisiteDependencyCount` | cardinality | `xsd:integer` | minimum 0 |
| `observedSatisfiedPrerequisiteDependencyCount` | cardinality | `xsd:integer` | minimum 0 |
| `observedActiveBlockingDependencyCount` | cardinality | `xsd:integer` | conforming value 0 |
| `requiredRelationshipEvidenceMinimum` | non-negative quantity | `xsd:integer` | minimum 1 |
| `satisfactionBasisExactEvidenceHashCount` | cardinality | `xsd:integer` | minimum 1 |
| `satisfactionBasisCurrentRelationshipHashCount` | cardinality | `xsd:integer` | minimum 0 |
| `satisfactionBasisStructurallyProvenRelationshipHashCount` | cardinality | `xsd:integer` | minimum 0 |
| `satisfactionBasisDirectionMatchedRelationshipHashCount` | cardinality | `xsd:integer` | minimum 0 |
| `satisfactionBasisCurrentPrerequisiteArtifactHashCount` | cardinality | `xsd:integer` | minimum 0 |
| `satisfactionBasisCurrentPrerequisiteArtifactCount` | cardinality | `xsd:integer` | minimum 1 |

This formulation accepts zero and positive values where permitted, rejects
negative values, rejects datatype mismatches, and rejects invalid lexical forms.
It also reflects Stardog's normalization of integer-derived datatypes to
`xsd:integer`.

## Authored and derived integrity repair

Four authored requirement or obligation resources were rejected by a legacy
blanket assumption that evidence-related and proof-related resources must be
derived. The affected resources are authored `EvidenceRequirement` and
`ProofObligation` definitions, not runtime evidence results or proof outcomes.

The repaired rule classifies authority by semantic role. It permits authored
requirements and obligations while continuing to reject:

- Authored runtime proof results.
- Authored validation outcomes.
- Fabricated evidence results.
- Unsupported confidence.
- Successful proof without admitted, fresh, integrity-valid evidence.
- Directly authored readiness.
- Validation outcomes that bypass evidence admission.

Planted defects cover the prohibited authored-runtime cases.

## Lifecycle vocabulary disposition

The original integrity scan reported 66 unexplained lifecycle terms. Every term
was classified without a blanket lifecycle exemption.

| Classification | Original defect-set count | Treatment |
|---|---:|---|
| Used by semantic query | 20 | Retained and linked to integrity/query semantics |
| Required but not yet instantiated | 40 | Retained with lifecycle stage and intended-use rationale |
| Intentionally standalone | 6 | Retained for inversion-only semantics with zero instances by design |
| Superseded | 0 | None proven |
| Duplicate | 0 | None proven |
| Unnecessary | 0 | None removed without evidence |

The unexplained-unused-term integrity query now returns zero.

## Portable SHACL targets

Three SPARQL targets that embedded inline `PREFIX` declarations were rewritten
using full IRIs and portable query forms. The shapes do not contain an
engine-specific fork. RDF4J, Jena, and Stardog parse and execute the candidate
forms.

The complete live candidate passed Stardog SHACL inside the publication
transaction and passed a second bounded post-commit validation.

## Legacy derivation optimization

Two pre-existing derivations were pathological under full-corpus local query
planning:

- `graph/rules/repository-structure.rq`
- `graph/rules/source-dispositions.rq`

The repository-structure rewrite starts from selective dependency observations,
uses existence tests for parser provenance and policy permission, scopes set
equality to each candidate, and prevents parser-shard row multiplication.

The source-disposition rewrite separates explicit source bindings from generic
constrained policies, evaluates applicability before precedence selection, and
uses the maximum applicable precedence without repeatedly crossing every source
with every policy.

The rewrites preserved exact accepted output. The inactive ownership construct
was classified as `DEAD_CONSTRUCT_NOT_SEMANTICALLY_REQUIRED`; it remains absent.

Repository ownership continues to be represented through
`ownsObservedSourceArtefact`. Optional canonical ownership remains sourced only
from `observedOwnedCanonicalArtefact` and must target an `Artefact`.

## Fresh deterministic derived outputs

Two clean RDF4J NativeStore runs and an independent Jena run produced identical
candidate output for all seven registered derived graphs.

| Derived graph | Triples | Canonical SHA-256 | Serialized bytes |
|---|---:|---|---:|
| `repositorystructure` | 4,531 | `b1dbdc1868e7dd1c0ad8b76d2c435a5c13057502891786f01c387353ee9fc760` | 894,633 |
| `sourcedispositions` | 45,652 | `9f2ce664af30c474d47a7c93b9a7a7f7ef8c7c3be39a131e0754c3d261f0cb38` | 9,870,380 |
| `obligations` | 1,906 | `8cf64d1945051a79cff607ffbda8922487423694c0b2dbbbc688a13490d36401` | 337,732 |
| `evidence` | 2,288 | `5e3325b5c25b27dafd334430dc8b7887f841ad637b694b1ac468840f439692f6` | 417,854 |
| `surfaces` | 280 | `623a78f3368f2e1688710238dd5bdb04a4f50cb872769ce280c685ee17ebb941` | 39,445 |
| `coverage` | 610 | `efe2f97a39d4877dbd246a70500535fcb21cab6467ffbe082323c97e305908ce` | 112,728 |
| `readiness` | 499 | `889e7107b79dcbafb77981ff228e21374402394f763193f662f0ced1734e3c98` | 84,450 |

No prior snapshot was substituted for readiness. Cross-engine differences were
zero.

## Local validation evidence

| Engine or check | Result | Violations | Wall time | Peak RSS |
|---|---|---:|---:|---:|
| RDF4J standalone `ShaclValidator` | conforms | 0 | 12.13 s | 1,018,880 KiB |
| RDF4J `ShaclSail` Bulk | conforms | 0 | 67.57 s | 1,688,064 KiB |
| Jena SHACL | conforms | 0 | 14.19 s | 1,117,520 KiB |
| RDF4J five-index global integrity | pass | 0 | 74.025 s | within measured bound |
| Lifecycle integrity | pass | 0 | 0.009 s | included above |
| Contamination | pass | 0 | 4.277 s | included above |

Validation report digests:

| Evidence | SHA-256 |
|---|---|
| RDF4J standalone | `c832bee91036145a161ad58845ea850cc3c001d3047ebb886da5882282dd2122` |
| RDF4J ShaclSail Bulk | `77df54327a8ab05884189405ed3e650d508d6225b1bf0a3565a88ea00674491b` |
| Jena SHACL | `0ee6381c4000944bea7501fd4c89d7e0465f2f40ded3dbbfbb2b2f3bae8e4f64` |

RDFLib remains useful for parsing, canonicalization compatibility, reduced
fixtures, and diagnostics. RDFLib full-corpus query performance is not a
semantic acceptance condition.

## Local validation toolchain contract

The live contract is:

```text
urn:usf:semanticcontract:localsemanticvalidationtoolchain
```

Its successful proof uses:

```text
urn:usf:proofresult:localsemanticvalidationtoolchain
```

The proof relies on admitted evidence:

```text
urn:usf:evidenceresult:rdf4jjenasemanticparity
```

The evidence is admitted, fresh, and integrity-valid. The contract is active,
but its current realisation is explicitly `contractonly` and not yet an
implementable code authorisation.

The contract selects RDF4J NativeStore and ShaclSail as the candidate primary
indexed local engine and retains Jena as an independent parity validator. It
does not make either engine semantic authority.

Resource and failure bounds include:

- Temporary persistent data at or below 256 MiB.
- Peak RSS at or below 2,304 MiB.
- A 180-second bound for a global local query.
- A 600-second bound for a complete local run.
- Named-graph preservation.
- Deterministic derived output.
- Independent-engine agreement.
- Locked dependencies and runtime versions.
- Cleanup of temporary NativeStore data.
- Fail-closed behavior for disk shortage, version drift, baseline mismatch, output disagreement, SHACL disagreement, or cleanup failure.

## Host and chroot boundary

The evaluated boundary is split operation:

- Full-corpus RDF4J NativeStore and ShaclSail execution remains host-side.
- Jena remains host-side as an independent parity oracle.
- The chroot consumes bounded validation results and evidence manifests only.
- Java 25 is not installed in the chroot.
- NativeStore databases are not copied into the chroot.
- Broad Maven caches are not copied into the chroot.

Evidence for this boundary includes RDF4J 6.0.0's Java 25 requirement,
approximately 105 to 168 MiB of NativeStore disk use, approximately 1.0 to 1.7
GiB of final validation RSS with earlier measurements above 2 GiB, the
host-side ownership of `graph/` and `census/`, and the intentionally minimal
chroot.

The candidate-authorized future source path is
`census/local-semantic-validation`. It was not materialized by this task.

## Publication payload

Verified publication inputs:

| Item | Value |
|---|---|
| Replacement graphs | 10 |
| Replacement bytes | 2,932,422 |
| Manifest SHA-256 | `e439b3878ca14fd5bb23db13579e109e589f2a61907a5676614b4e7184ad5643` |
| Publication plan SHA-256 | `82cf660589ecca1584ce45a71934be38ef056618dc80e816e4fe57ab57fe13e5` |
| Candidate authored-state SHA-256 | `4405594d46daae2e9eed7bc729e6454a84c7c1afeb4b7bdc748ff29745ea2537` |

The earlier full seven-derived-graph transaction payload was 15,961,251 bytes.
Canonical live comparison proved that `repositorystructure`,
`sourcedispositions`, and `readiness` were already identical. Omitting them
reduced the transaction payload by approximately 81.6 percent.

Exact replacement set:

| Graph | Role | Bytes | Expected triples |
|---|---|---:|---:|
| `urn:usf:graph:authority` | authored authority | 8,329 | 59 |
| `urn:usf:graph:capabilities` | authored contracts/capabilities | 562,262 | 3,266 |
| `urn:usf:graph:evidence` | authored evidence metadata | 27,090 | 174 |
| `urn:usf:graph:ontology` | authored ontology | 722,709 | 4,688 |
| `urn:usf:graph:proofs` | authored proof metadata | 157,121 | 1,146 |
| `urn:usf:graph:shapes` | SHACL shapes | 373,662 | 2,984 |
| `urn:usf:graph:derived:obligations` | derived | 406,348 | 1,906 |
| `urn:usf:graph:derived:evidence` | derived | 493,358 | 2,288 |
| `urn:usf:graph:derived:surfaces` | derived | 48,685 | 280 |
| `urn:usf:graph:derived:coverage` | derived | 132,858 | 610 |

The observed graph and all other canonically unchanged graphs were left
untouched. No derivation query ran inside the serializable transaction.

## Stardog transport diagnosis

The original transaction-local baseline query failed before mutation because
the Cloud runtime rejected the literal timeout parameter supplied through the
SDK:

```text
HTTP 400 Bad Request
code: 000IA2
message: For input string: "60s"
```

The request path, SPARQL query, transaction API, and `reasoning=false` parameter
were valid. This runtime accepts no duration suffix in that parameter position,
despite the documented human-facing duration syntax. Publication therefore used
no `timeout` query parameter and inherited the database `query.timeout=5m`.

The diagnostic compatibility transaction was:

```text
31c2a972-a2b8-4646-bb7c-2dacc7eb9707
```

| Probe | Operation | HTTP | Time | Result |
|---|---|---:|---:|---|
| T1 | Minimal transaction query | 200 | 187 ms | one binding |
| T2 | Full graph-count inventory | 200 | 929 ms | 43 graph rows, 578,232 triples |
| T3 | Minimal query with `reasoning=false` | 200 | 186 ms | one binding |
| T4 | Transaction-local no-op ICV | 200 | 199 ms | conforms |

Diagnostic rollback returned HTTP 200 in 184 ms. A subsequent transaction query
returned safe code `0D0TU2`, confirming that the diagnostic transaction was no
longer known.

## Publication attempts and rollback evidence

Several bounded attempts were necessary while diagnosing temporary publisher
and stale-query defects. Every failed attempt rolled back and was verified not
to alter the committed live state.

| Attempt | Transaction | Mutation began | Outcome | Cause |
|---|---|---|---|---|
| Initial transport attempt | `783e40c5-28b4-46f0-9536-0ceb4a2ac4cf` | no | rolled back | transaction query rejected `timeout=60s` |
| Minimal publisher attempt | `b41a472c-f1c0-4c42-adb1-65ccecb4e402` | yes | rollback HTTP 200, 761 ms | temporary logger referenced undefined `graphUri` |
| Integrity-gated attempt | `18de7811-9ccc-4369-9ca9-64572c0781ce` | yes | rollback HTTP 200, 198 ms | publisher used a stale pre-`638f49a7` integrity snapshot |
| Final publication | `c1c36e4d-f9dc-4650-82c6-b1713a2e6a4a` | yes | committed HTTP 200 | current rules and verified payload |

The stale integrity snapshot incorrectly retained the pre-repair derived-only
assumption for authored `ProofObligation` and `EvidenceRequirement` resources.
Diagnostic transaction `3213daca-4de4-4762-b88c-45988678ae15` proved that the
current committed integrity query returned zero results against the candidate.
It was rolled back successfully.

This sequence demonstrates rollback integrity, but it also identifies a process
defect: a one-use publisher must bind every query digest to the candidate commit
and publication manifest. A temporary file path is not sufficient provenance.

## Successful publication transaction

Publication transaction:

```text
c1c36e4d-f9dc-4650-82c6-b1713a2e6a4a
```

All graph clears, uploads, and counts returned HTTP 200.

| Graph | Clear | Upload | Count verification | Final triples |
|---|---:|---:|---:|---:|
| `authority` | 185 ms | 738 ms | 188 ms | 59 |
| `capabilities` | 194 ms | 1,054 ms | 210 ms | 3,266 |
| `evidence` | 185 ms | 192 ms | 188 ms | 174 |
| `ontology` | 201 ms | 387 ms | 216 ms | 4,688 |
| `proofs` | 190 ms | 198 ms | 202 ms | 1,146 |
| `shapes` | 221 ms | 225 ms | 227 ms | 2,984 |
| `derived:obligations` | 190 ms | 224 ms | 201 ms | 1,906 |
| `derived:evidence` | 192 ms | 231 ms | 216 ms | 2,288 |
| `derived:surfaces` | 198 ms | 193 ms | 189 ms | 280 |
| `derived:coverage` | 186 ms | 194 ms | 194 ms | 610 |

In-transaction gates:

| Gate | Result | Time |
|---|---|---:|
| Complete Stardog SHACL validation | conforms | 297,608 ms |
| Global integrity | zero results | 49,308 ms |
| Lifecycle integrity | zero results | 252 ms |
| Contamination | zero | 7,399 ms |
| Final inventory | 43 graphs, 579,406 triples | bounded query |
| Lifecycle assertion | present | bounded ASK |
| Local-validation contract and proof references | present | bounded ASK |
| Compiler/bootstrap implementation contracts | proof-blocked | bounded ASK |

Commit returned HTTP 200 in 194 ms. The response was not retried.

The temporary harness initially labeled the outcome ambiguous because a
post-commit logging expression reused the undefined `graphUri` variable. That
label was a client-side verifier defect, not a Stardog commit ambiguity. The
HTTP 200 commit response, committed candidate inventory, lifecycle assertion,
contract state, closed transaction, and repeated read-only verification prove
the outcome was `COMMITTED`.

## Post-commit verification

Post-commit bounded Stardog validation conformed in 247,479 ms.

Post-commit checks:

| Check | Result |
|---|---|
| Graph count | 43 |
| Triple count | 579,406 |
| Replacement graph counts | all exact |
| Replacement graph canonical digests | all exact |
| Global integrity | zero results |
| Lifecycle integrity | zero results |
| Contamination | zero |
| Lifecycle authority assertion | present |
| Local-validation contract | active and resolvable |
| Admitted evidence reference | resolvable |
| Successful proof reference | resolvable |
| Compiler/bootstrap implementation state | proof-blocked |
| Publication transaction | closed, safe code `0D0TU2` on reuse |
| Current-credential-visible transactions | 0 |
| Current-credential-visible queries | 0 |

Transaction visibility is global only when the credential is a superuser.
Superuser status was not established, so the reported zero is accurately scoped
to transactions visible to the current credential. The exact publication
transaction is independently proven closed.

## Preserved graph canonical verification

The three preserved derived graphs were exported after commit and compared to
the candidate using their established historical algorithm: parse RDF, reject
blank nodes, serialize deterministic N-Triples, lexical sort, and SHA-256.

| Preserved graph | Triples | Canonical SHA-256 | Missing | Extra |
|---|---:|---|---:|---:|
| `derived:repositorystructure` | 4,531 | `b1dbdc1868e7dd1c0ad8b76d2c435a5c13057502891786f01c387353ee9fc760` | 0 | 0 |
| `derived:sourcedispositions` | 45,652 | `9f2ce664af30c474d47a7c93b9a7a7f7ef8c7c3be39a131e0754c3d261f0cb38` | 0 | 0 |
| `derived:readiness` | 499 | `889e7107b79dcbafb77981ff228e21374402394f763193f662f0ced1734e3c98` | 0 | 0 |

An earlier post-commit verifier compared these established N-Triples hashes to
URDNA2015 N-Quads that retained named-graph context. Counts were identical but
hashes differed because the digest algorithms represented different inputs.
Rerunning the exact registered algorithm proved semantic set equality.

This is another process insight: every digest must carry an explicit algorithm
identifier, normalization profile, graph-context policy, and version. A bare
`sha256:` value is insufficient for cross-tool comparison.

## Evidence and diagnostic locations

The following temporary files contain machine-readable evidence. `/tmp` paths
are diagnostic locations, not permanent governed evidence paths.

| Evidence | Path or digest |
|---|---|
| Original semantic repair corpus | `/tmp/usf-semantic-repair-20260714T064155Z/` |
| Publication manifest | `/tmp/usf-stardog-candidate-publication-20260714T084806Z/delta-manifest.json` |
| Publication execution result | `/tmp/usf-stardog-transport-and-publication-20260714T094450Z/result.json` |
| Publication result SHA-256 | `aa454b5cd638d1a038a31bc73963e81289a70c198c0f678b4f6a8c12f188fd7f` |
| Post-commit verification | `/tmp/usf-stardog-post-commit-verification-20260714T095317Z/result.json` |
| Corrected preserved-graph verification | `/tmp/usf-preserved-derived-verification-20260714T095937Z/result.json` |
| Preserved-graph result SHA-256 | `4d78f0ed76fd06a7757a7d1823348b6d537602b8cf7330a727cd84be4bf2a49b` |
| Previous report archive | `/tmp/usf-stardog-transport-preflight-20260714T091250Z/report-archive/report.md` |
| Previous report SHA-256 | `9d51cb0b028baa7155026bd93df59435c513f6cc49a00605b7b5f3c077b5156f` |

The temporary evidence must not be assumed durable. Durable admission requires
a live-authorized evidence representation and retention path.

## Files changed by the semantic work

Semantic and validation files changed across the seven parent commits include:

- `graph/ontology.ttl`
- `graph/rules/integrity.rq`
- `graph/rules/lifecycle.rq`
- `graph/rules/repository-structure.rq`
- `graph/rules/source-dispositions.rq`
- `graph/shapes/contracts.ttl`
- `graph/shapes/repository-structure.ttl`
- `graph/contracts/repository-structure-policy.trig`
- `graph/assurance/evidence.trig`
- `graph/assurance/proofs.trig`
- `graph/contracts/capabilities.trig`
- Authorized conforming and planted-defect fixture files under `graph/fixtures/`

This integration adds this generated review report and records the existing
submodule `main` gitlink. No compiler, MCP, bootstrap, chroot, Java, RDF4J, or
Jena runtime source was modified by the publication continuation.

## Engineering insights and follow-on design

### Canonical content authority digest

The current final digest reported above is the legacy graph-count digest. It is
diagnostic only and cannot detect same-count semantic drift.

The permanent digest should:

- Canonicalize each governed graph with a registered RDF canonicalization and datatype-normalization profile.
- Include graph identity so reassignment changes the digest.
- Digest each graph independently.
- Sort graph identity plus graph digest records deterministically.
- Include the authority-boundary registry and compiler/schema version.
- Digest the ordered set.
- Publish algorithm identity, covered graph count, and verification state.

### Transactional compare-and-swap

The permanent publisher should begin a transaction, compute the live canonical
authority digest, compare it with the caller's expected digest, mutate only
registered authority graphs, validate the exact uncommitted candidate, compute
the post-update digest, verify the expected result, and commit only after every
gate succeeds. All failures must roll back. A stale writer must fail closed.

### Digest-bound publication bundles

A publication bundle should bind:

- Parent commit.
- Submodule commit.
- Authored-state digest.
- Rule file digests.
- Rule execution order.
- Shape graph digest.
- Integrity and lifecycle query digests.
- Output graph digests and counts.
- Canonicalization algorithm identifiers.
- Expected live pre-state digest.
- Expected post-state digest.

The stale integrity-query incident demonstrates why query content must be part
of the bundle rather than resolved from an old temporary path.

### Stardog timeout interoperability

The SDK transport should accept a normalized numeric timeout only after the
runtime's exact API unit is established. Human-facing duration strings such as
`60s` must not be passed blindly through an integer API field. Until the
per-runtime representation is proven, omitting the override and inheriting the
configured server timeout is safer.

Errors should retain exact HTTP status, safe Stardog code, safe bounded message,
correlation identifiers, response size, and response digest. Credentials and
raw arbitrary bodies must remain excluded.

### Validation query cost

Stardog complete candidate SHACL required approximately 298 seconds inside the
transaction and approximately 247 seconds after commit. This is within the
configured five-minute query timeout but leaves little margin.

Future work should profile individual high-cost shapes and consider equivalent
selective targets or query structures. Semantic scope must not be weakened for
performance. Publication should continue using one decisive full validation,
not three redundant full validations.

### Evidence, proof, and contract materialization

The lifecycle metadata is correctly materialized in Stardog because it consists
of canonical identities, relationships, states, provenance, obligations,
admissions, evaluations, confidence basis, and contract activation facts.

Large or binary evidence payloads should not be forced into Stardog. The leading
composition remains:

| Material | Candidate representation |
|---|---|
| Semantic identities and lifecycle metadata | Stardog named graphs |
| Immutable large or binary evidence payloads | Content-addressed object storage |
| Large derived tabular evidence | Parquet or another proved analytical projection |
| Bounded agent packets and manifests | JSON or JSON-LD |
| Ephemeral local working index | SQLite or NativeStore, never shared authority |

This composition remains a hypothesis until the representation proof obligation
is evaluated and the corresponding contract becomes active. An ADR may record
the decision afterward but cannot override the graph.

### Repository integration discipline

The parent owns semantic source representations, shapes, rules, fixtures,
regeneration material, the publication report, and the submodule pin. The
submodule owns compiler, MCP, bootstrap, Stardog transport, agent tooling, and
chroot implementation. No parent semantic commit should silently create
submodule implementation behavior.

## Final integration validation

Before integration, `make foundation` was run from the coordinator worktree.
The frozen dependency install completed successfully and the lockfile passed its
supply-chain policy. The gate then stopped at the repository-wide Prettier check
because 27 pre-existing application, package, configuration, and test files are
not formatted according to the current repository configuration.

None of the 27 reported files is part of the semantic-first foundation commit
set or this report. They include existing mobile/web surface files, app-surface
package and test files, and root TypeScript/ESLint/Vitest configuration. They
were not changed solely to make this integration green because that would mix
unrelated source changes into the semantic publication history.

Therefore:

- Foundational JSON parsing passed.
- Git diff whitespace checking passed.
- The frozen dependency install passed.
- The complete `make foundation` aggregate did not pass.
- No claim is made that the repository-wide foundation gate is green.
- The semantic candidate retains its independent RDF4J, Jena, Stardog SHACL, integrity, contamination, deterministic derivation, transaction, and canonical graph evidence described above.

The 27-file formatting baseline remains a repository-level follow-on issue for
an independently scoped change.

## Explicit nonclaims

- This report is not semantic authority.
- The legacy graph-count digest is not a canonical content authority digest.
- Publication does not prove that the permanent compiler publisher is correct.
- Publication does not implement compare-and-swap protection.
- Publication does not activate compiler or bootstrap implementation contracts.
- Publication does not authorize permanent RDF4J source materialization.
- Publication does not install Java in the chroot.
- Publication does not establish a permanent evidence storage architecture.
- Local RDF4J and Jena results remain evidence, not live authority.
- A successful Stardog validation is evidence of conformance, not the source of semantic intent.
- A successful commit is change-history evidence, not semantic truth by itself.
- Current-credential transaction visibility is not claimed to be global without established superuser status.
- Temporary `/tmp` diagnostics are not claimed to satisfy durable retention.

## Remaining work

- Implement the canonical content authority digest with explicit algorithm metadata.
- Implement transactional expected-digest compare-and-swap in the authorised compiler path after its contract activates.
- Replace count-only authority verification in health and bootstrap responses.
- Redesign bootstrap packets around `model -> evidence -> proof -> contract -> realisation -> validation` with byte, binding, depth, snapshot, and continuation bounds.
- Bound arbitrary SPARQL execution before server work.
- Enforce transport-boundary error redaction while preserving safe exact diagnostic fields.
- Enforce coordinator task-session identity and one-bootstrap accounting.
- Extend behavioural agent verification for every semantic inversion.
- Admit durable publication and benchmark evidence through a governed retention path.
- Evaluate the representation proof obligation before accepting a storage architecture ADR.
- Reevaluate compiler and bootstrap implementation contracts using admitted live evidence.
- Materialize RDF4J/Jena tooling only after the realisation becomes implementable.

## Final readiness statement

The live Stardog authority now structurally contains and validates the repaired
semantic lifecycle. The semantic candidate publication is complete.

The broader original semantic-first foundation program is not fully complete:
compiler CAS, canonical live content digest, bounded bootstrap/gateway behavior,
agent verification, durable evidence storage, and representation implementation
remain governed follow-on work. Those gaps are explicit rather than silently
upgraded by this report.

Publication verdict:

```text
USF_STARDOG_CANDIDATE_PUBLISHED
```
