SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := verify

.PHONY: verify install dev dev-smoke dev.work test-compose

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

verify: install
	corepack pnpm verify
