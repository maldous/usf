SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := verify

.PHONY: verify install dev dev-smoke dev.work test-compose parity db-proof authz-proof audit-proof config-proof files-proof auth-proof

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

files-proof:
	docker compose -f compose.yaml up -d --wait postgres
	bash -c 'corepack pnpm proof:files; s=$$?; docker compose -f compose.yaml down -v --remove-orphans; exit $$s'

verify: install
	corepack pnpm verify
