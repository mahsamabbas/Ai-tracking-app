# ADR 001: OTLP-first local connector

## Status

Accepted (Phase 0)

## Context

Multiple CLI agents expose OpenTelemetry. VS Code extensions cannot read Cursor/Copilot agent internals.

## Decision

The connector listens for OTLP (HTTP) and Claude Code hooks; provider adapters map to the normalized event schema.

## Consequences

- One upload pipeline for Claude Code, Codex, Gemini
- Cursor/Copilot use server-side pullers (Tier B) with honest UI limits
