SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := verify

.PHONY: verify install dev dev-smoke dev.work runtime-proof runtime-proof-in-memory runtime-proof-compose runtime-validate enterprise-validate compose-generate compose-validate compose-policy compose-check-generated compose-dev compose-test compose-staging compose-production compose-ports compose-ports-dev compose-ports-test compose-ports-staging compose-ports-profiles compose-hardening compose-security test-compose parity db-proof authz-proof audit-proof config-proof files-proof auth-proof jobs-proof notify-proof api-proof providers-proof observability-proof guardrails-proof bulk-proof search-proof search-proof-meilisearch scanner-proof-clamav wiremock-proof mock-substrate-proof resources-proof

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

providers-proof:
	corepack pnpm proof:providers

observability-proof:
	corepack pnpm proof:observability

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

wiremock-proof:
	corepack pnpm proof:wiremock

mock-substrate-proof:
	corepack pnpm proof:mock-substrate

resources-proof:
	corepack pnpm proof:resources

files-proof:
	docker compose -f compose/compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:files; s=$$?; docker compose -f compose/compose.yaml down -v --remove-orphans; exit $$s'

verify: install
	corepack pnpm verify
