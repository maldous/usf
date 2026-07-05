# Browser Telemetry Faro Foundation Proof

USF-225 adds a bounded local browser telemetry proof for the foundation observability slice. The proof uses a transient loopback-only static browser page, the official Grafana Faro browser SDK, and Playwright Core against a local Chromium executable.

This artefact is proof evidence organization only. It does not create product UI, React application delivery, page systems, component systems, visual snapshots, broad browser E2E coverage, accessibility journeys, public monitoring, live Faro ingestion, staging readiness, production readiness, SOC readiness, ISO/IEC 27001 certification, full dev readiness, full product readiness, enterprise production readiness, or USF-133 closure.

## Proof Boundary

- Issue: USF-225.
- Parent: USF-133.
- Proof file: packages/proof/src/browser-telemetry-faro-proof.ts.
- Proof command: corepack pnpm proof:observability:browser-telemetry.
- Make target: make observability-browser-telemetry-proof.
- Validator: python3 tools/validate-parity/validate-observability.py all --json.
- Runtime mode: minimal-static-browser-proof.
- Provider mode: local-test.
- Data boundary: synthetic tenant, actor, token, endpoint, stack, provider payload, session, event, trace, metric, log, and root-cause correlation values only.

## SDK Selection

@grafana/faro-web-sdk version 2.8.2 is the selected browser telemetry SDK. It is the official Grafana Faro browser SDK, uses Apache-2.0 package metadata, ships TypeScript support, and can be initialized locally without live ingestion credentials.

playwright-core version 1.61.1 is the selected browser automation client. It is a maintained de-facto standard browser automation library, uses Apache-2.0 package metadata, and allows the proof to drive local Chromium without provisioning product UI or a bundled browser.

Raw protocol calls, shell-driven browser automation, ad hoc HTTP telemetry clients, and hand-rolled telemetry clients are rejected because suitable SDK/client boundaries exist.

## Evidence Captured

The proof verifies:

- Faro SDK initialization in a browser boundary.
- Synthetic browser event capture.
- Synthetic browser log capture.
- Synthetic browser error capture.
- Synthetic browser trace capture.
- Synthetic browser metric/session evidence capture.
- Bounded backend/root-cause correlation through a local endpoint.
- Redaction of raw tenant, actor, token, endpoint, stack, and provider payload values.
- Value-free audit, log, trace, metric, privacy, tenant, and synthetic-data posture.
- Cleanup of browser, context, server, and temporary directory.

## Deferred Boundaries

Product UI and browser journey readiness remain outside USF-225 and are retained as disposition context under USF-134. Live Faro ingestion and environment promotion semantics remain outside USF-225 and are owned by later environment-readiness authority such as USF-193.

Missing future work must not be treated as implied completion. Any broader UI, browser E2E, monitoring-provider, staging, production, SOC, ISO, full dev readiness, full product readiness, or USF-133 closure claim requires a separate source issue and merged proof.

## Non-Claims

USF-225 does not claim full dev readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, full product readiness, browser E2E readiness, product UI readiness, live Faro readiness, live monitoring readiness, or USF-133 closure.
