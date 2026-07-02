# SonarQube Zero-Issue Quality Gate Assurance

USF-233 records the supported local SonarQube zero-open-issue gate. The gate is bounded to the synthetic TypeScript project created by the proof command. It is not a repository-wide, live-provider, staging, production, vulnerability-clearance, SOC, or ISO certification claim.

The proof starts local Compose SonarQube and sonar-postgres with the assurance profile, waits for bounded readiness, submits a temporary synthetic TypeScript project through the official SonarSource scanner package, reads the quality-gate result, queries unresolved issues and security hotspots, deletes the temporary project, revokes the temporary credential, suppresses scanner output, and tears down Compose resources.

The supported gate passes only when all of these are true:

- the quality-gate status is OK;
- unresolved issue count is zero for the synthetic project;
- security hotspot count is zero for the synthetic project;
- scanner output and proof evidence remain redacted;
- temporary project deletion and temporary credential revocation are checked;
- unavailable provider behaviour fails closed.

The current command surface is `make sonar-zero-issue-proof`, which routes to the compatibility target `make sonarqube-assurance-proof` and package script `proof:assurance:sonarqube`.

Excluded from this claim: SonarQube policy administration, security hotspot human review workflow, operator browser UI clickthrough, sonar-oidc-plugin identity integration, live SonarQube providers, environment promotion, production vulnerability management, repository-wide historical issue lifecycle, SOC readiness, ISO/IEC 27001 certification, and USF-133 closure.

Machine-readable evidence lives in `docs/architecture/sonarqube-zero-issue-quality-gate-assurance.json`.
