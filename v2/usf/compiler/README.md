# compiler/ — Python semantic compiler (scaffold)

Runs inside the chroot using `/usf/.venv`. No logic yet.

- `importers/` — ingest external/source material into the graph.
- `generators/` — emit `graph/derived/*` from canonical graphs + `rules/*.rq`.
- `validators/` — RDF/SHACL/graph validation (rdflib + pyshacl).
- `transforms/` — graph-to-graph transforms and projections.
