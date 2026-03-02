# AGT — Agent File Format

> `.mp3` is music. `.pdf` is documents. **`.agt` is agents.**

AGT is an open file format for packaging AI agents — their personality, memory, domain knowledge, and tool configurations — into a single portable file.

## Why

AI agents today are trapped in platforms. If the service shuts down, your agent is gone. AGT solves this by making agents **files you own**.

- **Own it** — One file contains everything. No cloud dependency
- **Run locally** — Ollama + sqlite-vec, no internet required
- **Growing agents** — Memory accumulates with every conversation
- **Tradeable** — Sanitize PII and sell/share on marketplaces
- **Open standard** — Anyone can create and run .agt files

## Quick Start

```bash
# Install
pnpm install

# Validate an agent file
pnpm --filter @agt/cli exec agt validate spec/examples/minimal.agt

# Inspect agent metadata
pnpm --filter @agt/cli exec agt inspect spec/examples/medical-debate.agt

# Run an agent (requires Ollama)
pnpm --filter @agt/cli exec agt run spec/examples/minimal.agt

# Package a folder into .agt
pnpm --filter @agt/cli exec agt pack ./my-agent/

# Unpack .agt to folder
pnpm --filter @agt/cli exec agt unpack agent.agt
```

## What's Inside a .agt File

A `.agt` file is a zip archive containing:

```
agent.agt (zip)
├── manifest.json     # Required. Metadata, version, checksum
├── persona.json      # Required. Personality, tone, system prompt
├── model-spec.json   # Required. Recommended LLM + embedding model
├── memory.db         # Optional. sqlite-vec vector database
├── knowledge.json    # Optional. Structured knowledge graph
├── domain.json       # Optional. Domain expertise config
├── mcp-config.json   # Optional. MCP tool connections
└── assets/           # Optional. Avatar, images, etc.
```

## Project Structure

```
AGT/
├── spec/             # .agt format specification (open standard)
├── packages/
│   └── agt-core/     # Core types + utilities (shared)
├── runtime/          # .agt execution engine
├── packager/         # .agt file creation/manipulation
├── cli/              # Command-line tool
├── docs/             # Documentation
└── test/             # Tests + fixtures
```

## Packages

| Package | Description |
|---------|-------------|
| `@agt/core` | Core types, Zod schemas, constants |
| `@agt/runtime` | Agent execution engine (loader, memory, LLM, MCP) |
| `@agt/packager` | Pack/unpack/sanitize/validate .agt files |
| `@agt/cli` | Command-line interface |

## Documentation

- [GOAL.md](./GOAL.md) — Project vision and motivation
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture
- [WORKFLOW.md](./docs/WORKFLOW.md) — User and data workflows
- [FORMAT.md](./spec/FORMAT.md) — .agt file format specification
- [VERSIONING.md](./spec/VERSIONING.md) — Version management policy

## License

MIT
