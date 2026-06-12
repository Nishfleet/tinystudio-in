# Handoff Agent Gate

## Purpose

The handoff agent turns approved work into a clean delivery package.

Before revenue, this is a package generator and checklist. It does not contact prospects or clients automatically.

## Inputs

- approved intake/spec
- production lane outputs
- verifier decision
- claim-proof ledger
- measurement contract
- client/prospect folder
- next command

## Required Handoff Package

Every handoff must include:

- what changed
- before state
- after/fix
- proof source
- client-visible value
- approval-needed claims
- measurement contract
- next action
- rollback or do-not-use notes
- link to source folder

## Commands That Feed Handoff

- `npm run prospect:send-prep`
- `npm run prospect:outbox`
- `npm run prospect:reply-prep`
- `npm run prospect:close-prep`
- `npm run client:dashboard`
- `npm run client:proof-review`
- `npm run client:acceptance`
- `npm run owned:handoff`

## Approval Boundary

The handoff agent may prepare copy and commands. The operator must approve before:

- sending a prospect message
- sending a client update
- publishing proof
- approving a claim
- marking delivery accepted
- asking for renewal
