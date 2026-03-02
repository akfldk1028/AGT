# .agt File Format Specification

**Version**: 1.0.0
**Status**: Draft

## Overview

A `.agt` file is a standard **zip archive** with the `.agt` extension. It contains structured JSON files that define an AI agent's personality, memory, knowledge, and configuration.

## File Structure

```
agent.agt (zip archive)
├── manifest.json          # REQUIRED. Metadata and integrity
├── persona.json           # REQUIRED. Personality and behavior
├── model-spec.json        # REQUIRED. LLM requirements
├── appearance.json        # OPTIONAL. 2D procedural visual appearance
├── memory.db              # OPTIONAL. sqlite-vec vector database
├── knowledge.json         # OPTIONAL. Structured knowledge graph
├── domain.json            # OPTIONAL. Domain expertise config
├── mcp-config.json        # OPTIONAL. MCP tool connections
└── assets/                # OPTIONAL. Static assets
    ├── avatar.png
    └── ...
```

## Required Files

### manifest.json

The manifest is the entry point. It contains metadata, versioning, and integrity information.

```json
{
  "agt_version": "1.0.0",
  "name": "Agent Display Name",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-03-01T00:00:00.000Z",
  "updated_at": "2026-03-02T12:00:00.000Z",
  "author": {
    "name": "Author Name",
    "url": "https://example.com"
  },
  "description": "A brief description of this agent",
  "tags": ["medical", "debate", "korean"],
  "stats": {
    "total_conversations": 0,
    "memory_entries": 0,
    "knowledge_nodes": 0
  },
  "files": {
    "persona": "persona.json",
    "model_spec": "model-spec.json",
    "appearance": "appearance.json",
    "memory": "memory.db",
    "knowledge": "knowledge.json",
    "domain": "domain.json",
    "mcp_config": "mcp-config.json"
  },
  "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "license": "MIT"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agt_version | string (semver) | Yes | Format version (e.g., "1.0.0") |
| name | string | Yes | Display name |
| id | string (UUID v4) | Yes | Unique identifier |
| created_at | string (ISO 8601) | Yes | Creation timestamp |
| updated_at | string (ISO 8601) | Yes | Last update timestamp |
| author | object | No | Author info |
| author.name | string | No | Author name |
| author.url | string (URL) | No | Author URL |
| description | string | Yes | Agent description |
| tags | string[] | No | Searchable tags |
| stats | object | No | Usage statistics |
| files | object | Yes | File map (which optional files are present) |
| checksum | string | Yes | SHA-256 hash of all content files |
| license | string | No | License identifier (SPDX) |

### persona.json

Defines the agent's personality, behavior, and system prompt.

```json
{
  "system_prompt": "You are a medical debate expert...",
  "name": "Dr. Kim",
  "role": "Medical Debater",
  "traits": ["analytical", "evidence-based", "empathetic"],
  "communication_style": {
    "tone": "professional",
    "language": "ko",
    "formality": "formal"
  },
  "constraints": [
    "Always cite medical evidence",
    "Acknowledge uncertainty when appropriate"
  ],
  "examples": [
    {
      "user": "고혈압 치료에 대해 설명해주세요",
      "assistant": "고혈압 치료는 크게 생활습관 개선과 약물 치료로 나뉩니다..."
    }
  ]
}
```

### model-spec.json

Specifies LLM and embedding model requirements.

```json
{
  "inference": {
    "preferred": "qwen3:8b",
    "minimum_params": "7b",
    "context_length": 8192,
    "capabilities": ["chat", "tool_use"],
    "fallback": [
      "llama3.1:8b",
      "gemma2:9b"
    ]
  },
  "embedding": {
    "model": "nomic-embed-text",
    "dimensions": 768
  },
  "temperature": 0.7,
  "top_p": 0.9
}
```

## Optional Files

### memory.db

A sqlite-vec database containing the agent's episodic and semantic memory.

**Schema:**
```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,          -- float32 vector
  importance REAL DEFAULT 0.5,      -- 0.0 to 1.0
  source TEXT,                       -- 'conversation', 'training', 'imported'
  topic TEXT,
  metadata TEXT,                     -- JSON string
  created_at TEXT DEFAULT (datetime('now')),
  accessed_at TEXT
);

-- sqlite-vec virtual table for vector search
CREATE VIRTUAL TABLE memory_vec USING vec0(
  id INTEGER PRIMARY KEY,
  embedding float[768]
);
```

### knowledge.json

Structured knowledge graph for domain expertise.

```json
{
  "nodes": [
    {
      "id": "hypertension",
      "label": "고혈압",
      "type": "condition",
      "properties": {
        "definition": "수축기 혈압 140mmHg 이상...",
        "prevalence": "성인 약 30%"
      }
    }
  ],
  "edges": [
    {
      "source": "hypertension",
      "target": "ace_inhibitors",
      "relation": "treated_by",
      "weight": 0.9
    }
  ]
}
```

### domain.json

Domain expertise configuration.

```json
{
  "name": "medical",
  "expertise_level": "specialist",
  "topics": ["cardiology", "internal-medicine"],
  "evidence_standards": "peer-reviewed",
  "terminology_preference": "professional"
}
```

### appearance.json

2D procedural agent visual appearance. Defines the agent's face structure, colors, outfit, and expression behavior. This is NOT a static image — it's parameters for a procedural rendering system based on Plutchik's emotion wheel.

```json
{
  "face_params": {
    "head_shape": 0.3,
    "eye_size": 0.5,
    "eye_spacing": 0.5,
    "nose_size": 0.4,
    "mouth_width": 0.5,
    "brow_thickness": 0.5,
    "chin_length": 0.4
  },
  "colors": {
    "skin": "#F1C27D",
    "hair": "#2C1810",
    "eye": "#2E1A0E",
    "outfit": "#1a1a2e"
  },
  "outfit": {
    "style": "lab-coat",
    "accessories": ["glasses"]
  },
  "personality_visual": {
    "openness": 0.7,
    "conscientiousness": 0.8,
    "extraversion": 0.4,
    "agreeableness": 0.6,
    "neuroticism": 0.3
  }
}
```

**Face parameters** (all 0-1 normalized):
| Parameter | 0 | 1 |
|-----------|---|---|
| head_shape | round | angular |
| eye_size | small | large |
| eye_spacing | close | wide |
| nose_size | small | large |
| mouth_width | narrow | wide |
| brow_thickness | thin | thick |
| chin_length | short | long |

**Personality visual** (Big Five traits, affect runtime expression):
- `extraversion` — Controls expressiveness (0.5x to 1.3x scale)
- `neuroticism` — Controls blink/breath rate variation

**Emotion bases** (optional): Override the default Plutchik 8-vector to 14-parameter expression mapping.

### mcp-config.json

MCP (Model Context Protocol) tool connections.

```json
{
  "servers": [
    {
      "name": "pubmed-search",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "pubmed-mcp-server"],
      "description": "Search PubMed medical literature"
    },
    {
      "name": "calculator",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "calculator-mcp-server"],
      "description": "Mathematical calculations"
    }
  ],
  "permissions": {
    "network": ["pubmed.ncbi.nlm.nih.gov"],
    "filesystem": "none"
  }
}
```

### assets/

Directory for static assets (avatar images, custom data files, etc.).

- `avatar.png` — Agent avatar (recommended: 256x256 PNG)
- Other files as needed

## Checksum Calculation

The `checksum` in `manifest.json` is computed as:

1. List all files in the archive EXCEPT `manifest.json` itself
2. Sort filenames alphabetically
3. For each file, compute SHA-256 of its contents
4. Concatenate all hashes (hex strings) in order
5. Compute SHA-256 of the concatenated string
6. Prefix with `sha256:`

```
checksum = "sha256:" + SHA256(SHA256(file1) + SHA256(file2) + ...)
```

## Compression

- The zip archive SHOULD use DEFLATE compression
- Individual files within the archive are stored as-is (JSON, SQLite, binary)
- Maximum recommended .agt file size: 500MB

## MIME Type

- Recommended MIME type: `application/x-agt`
- File extension: `.agt`
