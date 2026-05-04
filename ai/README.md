# AI Guidance Bundle

This directory is the canonical, environment-agnostic home for AI agent guidance in this repository.

Do not treat `.cursor/`, root `AGENTS.md`, or root `CLAUDE.md` as the source of truth. Those files are environment adapters that can be installed from this bundle when needed.

## Contents

- `crud-automator/SKILL.md` - primary CRUD Automator skill
- `crud-automator/reference.md` - detailed source-aligned reference
- `crud-automator/examples.md` - copyable implementation patterns
- `crud-automator/pitfalls.md` - common drift and failure modes
- `AGENTS.md` - adapter text for Codex-style agents
- `CLAUDE.md` - adapter text for Claude Code

## Installation

Use these commands only when you want a specific tool to auto-discover the guidance. The files in `ai/` remain canonical.

### Cursor

Project-local skill:

```bash
mkdir -p .cursor/skills
ln -s ../../ai/crud-automator .cursor/skills/crud-automator
```

Global user skill:

```bash
mkdir -p ~/.cursor/skills
ln -s "$PWD/ai/crud-automator" ~/.cursor/skills/crud-automator
```

### Claude Code

```bash
ln -s ai/CLAUDE.md CLAUDE.md
```

### Codex-Style Agents

```bash
ln -s ai/AGENTS.md AGENTS.md
```

If symlinks are not suitable for the environment, copy the adapter files instead and refresh them whenever `ai/` changes.

## Maintenance

When the public API changes, update `ai/crud-automator/` first, then refresh any installed adapters. Keep examples checked against `src/interface/**`, `src/type/**`, exported barrels, and tests.
