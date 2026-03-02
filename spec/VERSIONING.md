# AGT Versioning Policy

## Format Version

The `.agt` format uses [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes to file structure (new required files, renamed fields)
- **MINOR**: Backwards-compatible additions (new optional files/fields)
- **PATCH**: Clarifications, bug fixes in spec (no format changes)

## Current Version

**1.0.0** — Initial release

## Compatibility Rules

### Reading (Loading)
- A runtime MUST support loading files with the same MAJOR version
- A runtime SHOULD support loading files with older MINOR versions (same MAJOR)
- A runtime MAY support loading files with older MAJOR versions via migration

### Writing (Packing)
- A packager MUST write the latest version it supports
- A packager MUST set `agt_version` in manifest to the exact version written

## Migration

When a `.agt` file has an older version than the runtime supports:

1. **Same MAJOR, older MINOR**: Load directly, treat missing fields as defaults
2. **Older MAJOR**: Run migration pipeline (v1→v2, v2→v3, etc.)
3. **Newer than supported**: Reject with clear error message

### Migration Pipeline

```
v1.0.0 → v1.1.0: Add new optional fields with defaults
v1.x.x → v2.0.0: Transform schema (automated where possible)
```

Each migration step is:
- **Deterministic**: Same input always produces same output
- **Lossless**: No data is discarded (may be restructured)
- **Testable**: Roundtrip tests for each migration

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-02 | Initial specification |

## Deprecation Policy

- A MINOR version is supported for at least 6 months after its successor
- A MAJOR version is supported for at least 12 months after its successor
- Deprecated versions trigger a warning on load, not an error
