# Implementation Plan: Autonomous Human-Review Service Engine

## Architecture

Use shared contracts, canonical import, journaled decisions, an independent cap ledger, and a locked offline queue. Stop for human judgment/external actions. Enforce Day 0, pauses, acceptance, tracking, retention, and one offer.

## Main Files

Contracts/fixtures; service libraries and commands; operator workflow; truth gates; tests.

## Allowlist

Local client/prospect checks/exports and dry-run proof/acceptance review only. Everything else is denied.

## Verification

Cross-repo, determinism, atomicity, path/tamper/replay, cap, zero-write, product, claims, send, retention, syntax, and adversarial gates.

## Fallback

Remove queue commands and use guarded scripts. Keep private/provider state untouched.
