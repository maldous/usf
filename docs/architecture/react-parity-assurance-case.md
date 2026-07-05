# React Parity Assurance Case

This artefact supports USF-291 only. It does not claim React UI parity, product UI readiness, Staging readiness, Production readiness, SOC readiness, ISO certification, enterprise production readiness, browser E2E readiness, or full product parity.

|id|claimText|humanDecisionStatus|limitations|
|---|---|---|---|
|claim-react-baseline-complete|Historical React non-UI baseline is refreshed and frozen from the current tracked React repository.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-every-item-dispositioned|Every React-derived non-UI item has exactly one allowed disposition and evidence trail.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-services-equivalent|React Compose/service/operator substrate is covered by proven USF equivalents, documented non-applicability, or bounded lineage disposition.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-ui-foundation-rewritten|Foundation behaviours historically proven through React UI/Playwright are rewritten as non-UI USF proof where in scope.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-no-stale-react-proof|React evidence is lineage only and is not used as current USF proof.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-enterprise-support|Enterprise/ISO-style support domains are mapped without claiming certification or readiness beyond this gate.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|
|claim-non-claims-preserved|UI parity, staging, production, SOC, ISO, browser E2E, and full product parity remain unclaimed.|not-required-for-validator-backed aggregate claim|React UI/UX and product browser journeys are excluded; USF-290 handles proof-cockpit human acceptance separately.|


Chain of custody entries are in react-parity-assurance-case.json.
