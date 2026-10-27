# ADR-007 — Leftover Screens Policy

**Date:** 2026-09-05
**Status:** Active

## Context

The customer app has a `MainNavigator` that appears unused (the live path is `AuthNavigator`). The partner app may also have leftover screens. Removing them can break Metro bundler.

## Decision

Do not delete screens, navigators, or components that look unused without first proving via import graph that nothing imports them.

## Rationale

Metro resolves imports at bundle time. An "unused" screen imported in a navigator will crash the bundle if removed. An import graph check is mandatory.

## Consequences

- Flag leftover screens in notes/ACTIVE.md rather than deleting them.
- Only delete when the user explicitly asks AND the import chain is proven clean.
- Tool for import check: `grep -r "MainNavigator" "customer application/src/"`.

## Affected Areas

`customer application/src/navigation/`, `mobile application/src/navigation/`.
