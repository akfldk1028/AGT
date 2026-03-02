# AGT Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   .agt 에코시스템                      │
│                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ Goodmolt │   │ 3rd Party│   │  사용자 직접  │    │
│  │ Platform │   │ Platform │   │  생성/편집    │    │
│  └────┬─────┘   └────┬─────┘   └──────┬───────┘    │
│       │              │                │             │
│       ▼              ▼                ▼             │
│  ┌─────────────────────────────────────────┐        │
│  │         Packager (패키징 레이어)          │        │
│  │  pack / unpack / sanitize / validate    │        │
│  └────────────────┬────────────────────────┘        │
│                   │                                 │
│                   ▼                                 │
│            ┌──────────┐                             │
│            │ .agt 파일 │  ← 이것이 거래 단위          │
│            └────┬─────┘                             │
│                 │                                   │
│       ┌─────────┼──────────┐                        │
│       ▼         ▼          ▼                        │
│  ┌────────┐ ┌───────┐ ┌────────┐                   │
│  │  CLI   │ │  Web  │ │ SDK    │                    │
│  │agt run │ │ UI    │ │ import │                    │
│  └───┬────┘ └───┬───┘ └───┬────┘                   │
│      │          │          │                        │
│      ▼          ▼          ▼                        │
│  ┌─────────────────────────────────────────┐        │
│  │         Runtime (실행 엔진)              │        │
│  │                                         │        │
│  │  ┌────────┐ ┌────────┐ ┌────────────┐  │        │
│  │  │ Loader │ │ Memory │ │Conversation│  │        │
│  │  │ 언팩   │ │ sqlite │ │   Loop     │  │        │
│  │  │ 검증   │ │ -vec   │ │            │  │        │
│  │  └────────┘ └────────┘ └─────┬──────┘  │        │
│  │                              │          │        │
│  │       ┌──────────────────────┤          │        │
│  │       ▼                      ▼          │        │
│  │  ┌─────────┐          ┌──────────┐      │        │
│  │  │   LLM   │          │   MCP    │      │        │
│  │  │ Ollama  │          │  Tools   │      │        │
│  │  │ Cloud   │          │  Bridge  │      │        │
│  │  └─────────┘          └──────────┘      │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Package Dependency Graph

```
@agt/core  ←── @agt/runtime
    ↑              ↑
    ├── @agt/packager
    │        ↑
    └── @agt/cli ──→ @agt/runtime
```

- `@agt/core` — Zero internal dependencies (only `zod`)
- `@agt/runtime` — Depends on `@agt/core`
- `@agt/packager` — Depends on `@agt/core`
- `@agt/cli` — Depends on all three

## Component Details

### 1. @agt/core (packages/agt-core)

Shared foundation for all packages.

**Responsibilities:**
- TypeScript type definitions (`Manifest`, `Persona`, `ModelSpec`, etc.)
- Zod schemas for runtime validation
- Constants (magic numbers, version, defaults)
- Zero external dependencies beyond `zod`

**Key files:**
- `src/types.ts` — All TypeScript interfaces/types
- `src/schema.ts` — Zod schemas matching each type
- `src/constants.ts` — AGT_VERSION, MAGIC_NUMBER, defaults

### 2. @agt/runtime (runtime/)

Execution engine that loads and runs .agt agents.

**Submodules:**

#### Loader (`src/loader.ts`)
1. Read .agt file (zip)
2. Extract to temp directory
3. Parse `manifest.json`
4. Verify checksum (SHA-256 of all files)
5. Validate against schema
6. Check version compatibility
7. Return `AgentBundle` object

#### Memory (`src/memory/`)
- **sqlite-vec adapter**: Load `memory.db`, perform vector similarity search (cosine)
- **Knowledge graph**: Load `knowledge.json`, traverse relationships
- **Memory manager**: Unified interface for retrieval and storage

```
Query: "심장 질환 치료법"
  → Embedding: [0.12, -0.34, ...]
  → sqlite-vec: cosine similarity search
  → Top-K results with metadata
  → Injected into LLM context
```

#### LLM (`src/llm/`)
- **Ollama adapter**: HTTP API at localhost:11434
  - Model pull check, generate, chat, embeddings
- **Cloud adapter**: OpenAI-compatible API fallback
  - Configurable base URL and API key
- **Interface**: Common `LLMProvider` with `chat()` and `embed()` methods

```
model-spec.json → preferred: "qwen3:8b"
  → Check Ollama: ollama list
  → Found? → Use Ollama
  → Not found? → Prompt user to pull, or fallback to cloud
```

#### MCP (`src/mcp/`)
- **MCP client**: Connect to MCP servers via stdio or SSE
- **Tool bridge**: Discover tools from MCP servers, expose to conversation loop
- **Tool execution**: Route LLM tool calls to appropriate MCP server

#### Conversation (`src/conversation.ts`)
Main conversation loop:

```
1. Build system prompt from persona.json
2. User sends message
3. Search memory for relevant context (RAG)
4. Discover available tools (MCP)
5. Call LLM with: system + memory context + tools + user message
6. If LLM requests tool call → execute via MCP → feed result back
7. Generate response
8. Save interaction to memory.db
9. Return response to user
```

### 3. @agt/packager (packager/)

Creates and manipulates .agt files.

**Operations:**

#### pack (`src/pack.ts`)
```
Input: folder with agent files
  → Validate all files against schemas
  → Generate manifest.json (auto-fill stats, compute checksum)
  → Zip into .agt file
Output: agent.agt
```

#### unpack (`src/unpack.ts`)
```
Input: agent.agt
  → Verify zip integrity
  → Extract to folder
  → Verify checksum from manifest
Output: folder with agent files
```

#### sanitize (`src/sanitize.ts`)
```
Input: agent.agt (with PII)
  → Scan memory.db for PII patterns (email, phone, name)
  → Remove/redact detected PII
  → Recalculate checksum
Output: agent-clean.agt (safe for trading)
```

#### validate (`src/validate.ts`)
```
Input: agent.agt
  → Check zip integrity
  → Validate manifest against schema
  → Validate all JSON files against schemas
  → Verify memory.db is valid sqlite
  → Check model-spec compatibility
Output: ValidationResult (pass/fail with details)
```

#### migrate (`src/migrate.ts`)
```
Input: agent.agt (old version)
  → Detect version from manifest
  → Apply migration transforms (v1→v2, v2→v3, etc.)
  → Update manifest version
Output: agent-migrated.agt (new version)
```

### 4. @agt/cli (cli/)

Command-line interface built with `commander`.

**Commands:**
| Command | Description | Uses |
|---------|-------------|------|
| `agt run <file>` | Run agent (start conversation) | runtime |
| `agt chat <file>` | Interactive chat mode | runtime |
| `agt inspect <file>` | Show agent metadata | packager (unpack + read) |
| `agt validate <file>` | Validate .agt file | packager |
| `agt pack <dir>` | Package folder → .agt | packager |
| `agt unpack <file>` | Extract .agt → folder | packager |

## Security Model

### File Integrity
- SHA-256 checksum in manifest covers all files
- Verified on every load

### PII Protection
- `sanitize` command scans for common PII patterns
- Required before marketplace listing

### Sandboxing
- MCP tools run in declared scope only
- No filesystem access beyond the agent's own data
- Network access only through declared MCP servers

## Technology Choices

| Choice | Why |
|--------|-----|
| zip for .agt | Universal, inspectable, tooling everywhere |
| sqlite-vec for memory | Single file, embedded, no server needed |
| Ollama for LLM | Local-first, many model options, simple HTTP API |
| MCP for tools | Industry standard (Anthropic), growing ecosystem |
| Zod for validation | TypeScript-native, excellent DX, runtime safety |
| pnpm workspaces | Fast, strict, proper monorepo support |
