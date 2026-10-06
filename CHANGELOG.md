# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-11

### Added
- Musk 5-Step Algorithm pi-extension: single tool `musk_algorithm` (phases question/delete/simplify/accelerate/automate/full) with `outputSchema` + `promptSnippet` + `promptGuidelines`
- Slash command `/run-musk-algo <task>` (idle/steer handling)
- Skill `run-musk-algo` (`SKILL.md`) for system-prompt discovery
- `extensions/musk-algorithm/index.ts` (jiti-loaded, no build), `pi` manifest in `package.json`
- Tests for happy paths, chaining, and print-mode rendering (`node:test` + `vitest`)

### Fixed
- N/A — initial release
