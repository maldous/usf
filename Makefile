SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := verify

.PHONY: verify install dev dev-smoke dev.work test-compose parity db-proof authz-proof audit-proof config-proof files-proof auth-proof jobs-proof notify-proof api-proof providers-proof observability-proof guardrails-proof bulk-proof search-proof resources-proof

install:
	corepack pnpm install --frozen-lockfile

dev:
	corepack pnpm dev

dev-smoke:
	corepack pnpm dev:smoke

dev.work:
	corepack pnpm dev:work

test-compose:
	corepack pnpm test-compose

parity:
	corepack pnpm parity

db-proof:
	docker compose -f compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:db; s=$$?; docker compose -f compose.yaml down -v --remove-orphans; exit $$s'

authz-proof:
	docker compose -f compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:authz; s=$$?; docker compose -f compose.yaml down -v --remove-orphans; exit $$s'

audit-proof:
	docker compose -f compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:audit; s=$$?; docker compose -f compose.yaml down -v --remove-orphans; exit $$s'

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

resources-proof:
	corepack pnpm proof:resources

files-proof:
	docker compose -f compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:files; s=$$?; docker compose -f compose.yaml down -v --remove-orphans; exit $$s'

verify: install
	corepack pnpm verify
