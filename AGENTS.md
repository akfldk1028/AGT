# AI Agent Guidelines for AGT Project

## Project Context

This is the AGT (Agent File Format) project — an open file format for packaging AI agents.
Read [GOAL.md](./GOAL.md) first to understand the vision.

## Key Decisions

- **Monorepo**: pnpm workspaces. 4 packages: `agt-core`, `runtime`, `packager`, `cli`
- **Language**: TypeScript throughout. Strict mode enabled
- **Validation**: Zod for runtime, JSON Schema for spec documents
- **File format**: .agt = zip archive with known structure
- **Memory**: sqlite-vec embedded vector database
- **LLM**: Ollama (local, primary) + OpenAI-compatible API (cloud fallback)
- **Tools**: MCP (Model Context Protocol) standard

## Code Conventions

- Use ESM (`"type": "module"` in package.json)
- Prefer `const` over `let`, never use `var`
- Use explicit return types for all exported functions
- Error handling: throw typed errors, no silent catches
- File naming: kebab-case for files, PascalCase for types/classes
- Imports: relative within package, `@agt/core` for cross-package

## Architecture Rules

1. `agt-core` has ZERO internal dependencies — only `zod`
2. `runtime`, `packager`, `cli` depend on `agt-core`
3. `cli` depends on `runtime` and `packager`
4. `runtime` and `packager` are independent of each other

```
agt-core  ←── runtime
    ↑          ↑
    ├── packager
    │      ↑
    └── cli ──→ runtime
```

## Important File Locations

- Spec schemas: `spec/schemas/*.schema.json`
- Core types: `packages/agt-core/src/types.ts`
- Zod schemas: `packages/agt-core/src/schema.ts`
- Runtime entry: `runtime/src/index.ts`
- CLI entry: `cli/src/index.ts`

## Testing

- Test files go in `test/` at project root
- Fixture .agt files in `test/fixtures/`
- Example .agt files in `spec/examples/`

## When Making Changes

1. If modifying types → update both `types.ts` AND `schema.ts` in agt-core
2. If modifying .agt file structure → update `spec/FORMAT.md` AND JSON schemas
3. If adding a CLI command → add to `cli/src/commands/` AND update README
4. If changing runtime behavior → update `docs/ARCHITECTURE.md`
