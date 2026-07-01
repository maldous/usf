# SonarQube Service Semantic Proof Boundary

USF-195 records the SonarQube service-proof boundary lineage. USF-204 adds a bounded local Compose proof for SonarQube scanner submission and quality-gate readback, not a service readiness claim.

The repository keeps local deterministic validation mandatory for foundation work, but those commands are not equivalent to SonarQube service history, dashboards, issue lifecycle, security hotspot workflow, scanner execution, or quality-gate operations.

USF-204 starts the assurance-profile SonarQube and sonar-postgres services, waits with bounded readiness retry, uses the official SonarSource `@sonar/scan` package through the adapter boundary, submits a synthetic TypeScript project, reads the quality gate, queries unresolved issues and security hotspots, validates authenticated local API access, deletes the temporary project, revokes the temporary proof credential, checks redaction, and proves unavailable-provider fail-closed behaviour.

Operator browser UI clickthrough, quality-gate policy administration, security hotspot human review workflow, sonar-oidc-plugin bootstrap and identity integration, environment promotion, live-provider operation, and production operating evidence remain deferred to USF-169, USF-193, or later source issues as applicable.

This note and the matching JSON artefact support future enterprise evidence organization only. They do not claim full dev readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, full React parity, or USF-133 closure.
