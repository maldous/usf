SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := verify

# Public proof edge FQDNs for the composed external-caddy edge (docker/caddy/Caddyfile).
# Override per environment, e.g. make caddy-up USF_PROOF_STAGING_FQDN=localhost.
USF_PROOF_STAGING_FQDN ?= 1e100.network
USF_PROOF_PROD_FQDN ?= aldous.info
export USF_PROOF_STAGING_FQDN
export USF_PROOF_PROD_FQDN

.PHONY: \
	help commands setup foundation dev-ready test-ready test test-composed test-coverage test-assurance \
	test-readiness-validate test-readiness-semantic test-readiness-fixtures test-readiness-integration \
	test-readiness-coverage test-readiness-selftest \
	proof-cockpit-validate proof-cockpit-selftest \
	foundation-substrate-closure-validate foundation-substrate-closure-selftest \
	public-fqdn-validate public-fqdn-selftest public-proof-origin public-fqdn-proof public-fqdn-proof-staging public-fqdn-proof-production \
	artifact-promotion-validate artifact-promotion-selftest environment-ladder-validate environment-ladder-selftest \
	app-surface-validate app-surface-selftest \
	public-route-proof public-route-proof-staging public-route-proof-production proof-review-public caddy-up caddy-down proof-review-up proof-review-down proof-review-repin \
	external-http-behaviour-proof external-http-cache-proof external-http-observability-proof pre-staging-external-smoke-proof \
	assurance evidence \
	validate-foundation validate-coverage validate-assurance validate-evidence \
	validate-bootstrap \
	verify install dev dev-smoke dev.work \
	runtime-proof runtime-proof-in-memory runtime-proof-compose runtime-validate \
	enterprise-validate \
	compose-generate compose-validate compose-policy compose-check-generated \
	compose-dev compose-test compose-staging compose-production \
	compose-ports compose-ports-dev compose-ports-test compose-ports-staging \
	compose-ports-profiles compose-hardening compose-security test-compose \
	parity \
	db-proof authz-proof audit-proof config-proof files-proof auth-proof \
	jobs-proof notify-proof api-proof api-graphql-generated-client-proof \
	providers-proof observability-proof observability-browser-telemetry-proof \
	observability-operations-execution-proof operator-lifecycle-proof \
	sentry-observability-proof guardrails-proof bulk-proof search-proof \
	search-proof-meilisearch scanner-proof-clamav clickhouse-analytics-proof \
	pgbackrest-proof backup-operations-proof windmill-workflow-proof \
	wiremock-proof localstack-proof redis-cache-proof mock-substrate-proof \
	resources-proof sonar-zero-issue-proof sonarqube-assurance-proof

help:
	@printf '%s\n' \
		'USF current-state command surface' \
		'' \
		'Primary workflow:' \
		'  make setup                 Install exact pinned dependencies (alias: install)' \
		'  make foundation            Run the full local foundation gate (alias: verify)' \
		'  make dev-ready             Run the developer and AI-agent handover gate (alias: verify)' \
		'  make test-ready            Run the bounded test-readiness local/CI gate' \
		'  make test                  Alias for test-ready' \
		'' \
		'Current-state validators:' \
		'  make validate-foundation   Full local foundation gate (compatibility: verify)' \
		'  make validate-coverage     Foundation coverage validators (compatibility: parity)' \
		'  make validate-assurance    Enterprise assurance evidence validator (compatibility: enterprise-validate)' \
		'  make validate-evidence     Repository evidence validators (compatibility: corepack pnpm repo:validate)' \
		'  make validate-bootstrap    Bootstrap governance validator (compatibility: corepack pnpm validate-bootstrap)' \
			'  make artifact-promotion-validate  Validate Dev/Test/Staging artifact handoff contract' \
			'  make environment-ladder-validate  Validate environment ladder discipline' \
			'  make app-surface-validate  Validate app-surface semantic validator tranche' \
			'  make app-surface-selftest  Run app-surface planted-defect selftest' \
			'' \
		'Common proof groups:' \
		'  make runtime-proof         API and worker runtime proof' \
		'  make providers-proof       Provider adapter proof' \
		'  make test-compose          Generated Compose validation and smoke' \
		'  make test-composed         Composed semantic harness, deterministic fixtures, and service integration matrix' \
		'  make test-coverage         Generate bounded LCOV and enforce 100% in-scope coverage' \
		'  make test-assurance        Bounded local SonarQube zero-open-issue proof' \
		'  make test-readiness-selftest  Run planted-defect regression selftest' \
		'  make public-fqdn-validate  Validate public FQDN semantic contract and non-claims' \
		'  make public-proof-origin  Prove the gateway-neutral public proof origin locally' \
		'  make public-fqdn-proof     Strict external DNS/TLS/HTTPS public FQDN proof' \
		'  make public-route-proof    Narrow public browser route and telemetry bootstrap proof' \
		'  make proof-review-public   Verify live /proof human review surface availability' \
		'  make caddy-up              Bring up the shared composed public proof edge (external-caddy; no operator credential)' \
		'  make caddy-down            Stop the shared composed public proof edge' \
		'  make proof-review-up       Open the operator-authenticated /proof gate on the running edge (prompts for credential)' \
		'  make proof-review-down     Commit the acceptance ledger from the review volume and tear the surface down' \
		'  make proof-review-repin    Regenerate and re-pin proof-cockpit machine evidence to the current commit (then commit)' \
		'  make external-http-behaviour-proof  Validate external HTTP behaviour contract' \
		'  make external-http-cache-proof  Prove cache policy for public proof routes' \
		'  make external-http-observability-proof  Prove bounded external HTTP observability evidence' \
		'  make pre-staging-external-smoke-proof  Fail-closed non-destructive external smoke gate' \
		'  make sonar-zero-issue-proof  Bounded local SonarQube zero-open-issue proof' \
		'  make sonarqube-assurance-proof  Bounded local SonarQube assurance proof' \
		'' \
		'Compatibility targets remain valid. Historical names do not imply product readiness, staging, production, live-provider, SOC, ISO certification, enterprise production, product UI, or browser E2E readiness.'

commands: help

setup: install

foundation: verify

dev-ready: verify

test-ready:
	corepack pnpm test-readiness

test: test-ready

test-composed:
	corepack pnpm test-readiness:composed

test-coverage:
	corepack pnpm test-readiness:coverage

test-assurance:
	corepack pnpm test-readiness:assurance

test-readiness-validate:
	corepack pnpm test-readiness:validate

test-readiness-semantic:
	corepack pnpm test-readiness:semantic

test-readiness-fixtures:
	corepack pnpm test-readiness:fixtures

test-readiness-integration:
	corepack pnpm test-readiness:integration

test-readiness-coverage:
	corepack pnpm test-readiness:coverage

test-readiness-selftest:
	corepack pnpm test-readiness:selftest

proof-cockpit-validate:
	corepack pnpm proof-cockpit:validate

proof-cockpit-selftest:
	corepack pnpm proof-cockpit:selftest

foundation-substrate-closure-validate:
	corepack pnpm foundation-substrate-closure:validate

foundation-substrate-closure-selftest:
	corepack pnpm foundation-substrate-closure:selftest

public-fqdn-validate:
	corepack pnpm public-fqdn:validate

public-fqdn-selftest:
	corepack pnpm public-fqdn:selftest

artifact-promotion-validate:
	corepack pnpm artifact-promotion:validate

artifact-promotion-selftest:
	corepack pnpm artifact-promotion:selftest

environment-ladder-validate:
	corepack pnpm environment-ladder:validate

environment-ladder-selftest:
	corepack pnpm environment-ladder:selftest

app-surface-validate:
	corepack pnpm app-surface:validate

app-surface-selftest:
	corepack pnpm app-surface:selftest

public-proof-origin:
	corepack pnpm proof:public-origin

public-fqdn-proof:
	corepack pnpm proof:public-fqdn

public-fqdn-proof-staging:
	corepack pnpm proof:public-fqdn:staging

public-fqdn-proof-production:
	corepack pnpm proof:public-fqdn:production

public-route-proof:
	corepack pnpm proof:public-route

public-route-proof-staging:
	corepack pnpm proof:public-route:staging

public-route-proof-production:
	corepack pnpm proof:public-route:production

proof-review-public:
	corepack pnpm proof:proof-review-public

caddy-up:
	bash tools/proof-review/proof-review.sh caddy-up

caddy-down:
	bash tools/proof-review/proof-review.sh caddy-down

proof-review-up: caddy-up
	bash tools/proof-review/proof-review.sh up

proof-review-down:
	bash tools/proof-review/proof-review.sh down

proof-review-repin:
	corepack pnpm proof-cockpit:machine-qa
	corepack pnpm proof-cockpit:promote
	@printf '%s\n' '[proof-review] Machine evidence regenerated and re-pinned to the current commit.' \
		'[proof-review] Review git status and commit the regenerated evidence, e.g.:' \
		'[proof-review]   git add evidence/proof-evidence/proof-cockpit artifacts/proof-cockpit && git commit -m "chore(proof): re-pin machine evidence"'

external-http-behaviour-proof:
	corepack pnpm proof:external-http-behaviour

external-http-cache-proof:
	corepack pnpm proof:external-http-cache

external-http-observability-proof:
	corepack pnpm proof:external-http-observability

pre-staging-external-smoke-proof:
	corepack pnpm proof:pre-staging-external-smoke

validate-foundation: verify

validate-coverage: parity

validate-assurance: enterprise-validate

validate-evidence:
	corepack pnpm repo:validate

validate-bootstrap:
	corepack pnpm validate-bootstrap

assurance: validate-assurance

evidence: validate-evidence

install:
	corepack pnpm install --frozen-lockfile

dev:
	corepack pnpm dev

dev-smoke:
	corepack pnpm dev:smoke

dev.work:
	corepack pnpm dev:work

runtime-proof:
	corepack pnpm runtime:proof

runtime-proof-in-memory:
	corepack pnpm runtime:proof:in-memory

runtime-proof-compose:
	corepack pnpm runtime:proof:compose

sonar-zero-issue-proof: sonarqube-assurance-proof

sonarqube-assurance-proof:
	corepack pnpm proof:assurance:sonarqube

runtime-validate:
	corepack pnpm runtime:validate

enterprise-validate:
	corepack pnpm enterprise:validate

compose-generate:
	corepack pnpm compose:generate

compose-validate:
	corepack pnpm compose:validate

compose-policy:
	corepack pnpm compose:policy

compose-check-generated:
	corepack pnpm compose:check-generated

compose-dev:
	corepack pnpm compose:dev

compose-test:
	corepack pnpm compose:test

compose-staging:
	corepack pnpm compose:staging

compose-production:
	corepack pnpm compose:production

compose-ports:
	corepack pnpm compose:ports

compose-ports-dev:
	corepack pnpm compose:ports:dev

compose-ports-test:
	corepack pnpm compose:ports:test

compose-ports-staging:
	corepack pnpm compose:ports:staging

compose-ports-profiles:
	corepack pnpm compose:ports:profiles

compose-hardening:
	corepack pnpm compose:hardening

compose-security:
	corepack pnpm compose:security

test-compose:
	corepack pnpm test-compose

parity:
	corepack pnpm parity

db-proof:
	docker compose -f compose/compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:db; s=$$?; docker compose -f compose/compose.yaml down -v --remove-orphans; exit $$s'

authz-proof:
	docker compose -f compose/compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:authz; s=$$?; docker compose -f compose/compose.yaml down -v --remove-orphans; exit $$s'

audit-proof:
	docker compose -f compose/compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:audit; s=$$?; docker compose -f compose/compose.yaml down -v --remove-orphans; exit $$s'

config-proof:
	corepack pnpm proof:config

auth-proof:
	corepack pnpm proof:auth

jobs-proof:
	corepack pnpm proof:jobs

notify-proof:
	corepack pnpm proof:notify

api-proof:
	corepack pnpm proof:api

api-graphql-generated-client-proof:
	corepack pnpm proof:api:graphql-generated-client

providers-proof:
	corepack pnpm proof:providers

observability-proof:
	corepack pnpm proof:observability

observability-browser-telemetry-proof:
	corepack pnpm proof:observability:browser-telemetry

observability-operations-execution-proof:
	corepack pnpm proof:observability:operations-execution

operator-lifecycle-proof:
	corepack pnpm proof:operator-lifecycle

sentry-observability-proof:
	corepack pnpm proof:observability:sentry

guardrails-proof:
	corepack pnpm proof:guardrails

bulk-proof:
	corepack pnpm proof:bulk

search-proof:
	corepack pnpm proof:search

search-proof-meilisearch:
	corepack pnpm proof:search:meilisearch

scanner-proof-clamav:
	corepack pnpm proof:scanner:clamav

clickhouse-analytics-proof:
	corepack pnpm proof:analytics:clickhouse

pgbackrest-proof:
	corepack pnpm proof:backup:pgbackrest

backup-operations-proof:
	corepack pnpm proof:backup:operations

windmill-workflow-proof:
	corepack pnpm proof:workflow:windmill

wiremock-proof:
	corepack pnpm proof:wiremock

localstack-proof:
	corepack pnpm proof:localstack

redis-cache-proof:
	corepack pnpm proof:cache:redis

mock-substrate-proof:
	corepack pnpm proof:mock-substrate

resources-proof:
	corepack pnpm proof:resources

files-proof:
	docker compose -f compose/compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:files; s=$$?; docker compose -f compose/compose.yaml down -v --remove-orphans; exit $$s'

verify: install
	corepack pnpm verify
