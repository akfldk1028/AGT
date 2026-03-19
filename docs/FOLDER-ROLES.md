# AGT 폴더/파일 역할 문서

> OpenJarvis 모듈화 패턴(Registry, ABC+Stubs, EventBus, Config-driven) 참고

---

## `packages/agt-core/src/` — 공유 기반 (@agt/core)

의존성: `zod`만. 다른 패키지가 모두 의존하는 최하위 레이어.

| 파일 | 역할 |
|------|------|
| `types.ts` | 모든 인터페이스/타입 정의 (Manifest, Persona, ModelSpec, Appearance, AgentBundle 등) |
| `schema.ts` | types.ts 각 타입의 Zod 런타임 검증 스키마 |
| `constants.ts` | AGT_VERSION, MAGIC_NUMBER, 기본 temperature 등 불변값 |
| `errors.ts` | 공통 에러 클래스 계층 (AgtError → ValidationError, LoadError, LLMError, MemoryError, PackageError) |
| `events.ts` | EventBus pub/sub 시스템 — 모듈간 느슨한 결합. AGENT_LOAD, LLM_CALL, MEMORY_QUERY 등 |
| `index.ts` | 배럴 export |

---

## `runtime/src/` — 실행 엔진 (@agt/runtime)

.agt 파일을 로드하고, 대화를 처리하고, 메모리를 저장하는 핵심 엔진.

| 파일/디렉토리 | 역할 |
|---------------|------|
| `loader.ts` | .agt zip 읽기 → 언팩 → manifest 검증 → AgentBundle 반환 |
| `conversation.ts` | 대화 메인 루프: system prompt 구성 → RAG → 도구 호출 → LLM → 응답 → 메모리 저장 |
| `saver.ts` | 대화 후 memory.db를 .agt zip에 re-pack (에이전트 성장 저장) |
| `llm/index.ts` | LLMManager — LLMProvider 인터페이스 + Ollama/Cloud 선택 팩토리 |
| `llm/ollama.ts` | Ollama HTTP 어댑터 (로컬 추론) |
| `llm/cloud.ts` | OpenAI-compatible 클라우드 폴백 |
| `memory/index.ts` | MemoryManager — MemoryProvider 인터페이스 + 팩토리 |
| `memory/sqlite-vec.ts` | sqlite-vec 벡터 검색 (임베딩 기반 RAG) |
| `memory/knowledge-graph.ts` | knowledge.json 그래프 탐색 |
| `mcp/index.ts` | McpManager — MCP 서버 연결 관리 |
| `mcp/tool-bridge.ts` | MCP 서버 연결 + 도구 실행 브릿지 |
| `traces/index.ts` | TraceCollector — EventBus 이벤트를 캡처하여 세션별 추적 |
| `traces/store.ts` | TraceStore — SQLite 영속화 (traces, trace_steps 테이블) |
| `index.ts` | 배럴 export + AgentRuntime 고수준 API |

---

## `packager/src/` — .agt 파일 조작 (@agt/packager)

| 파일 | 역할 |
|------|------|
| `pack.ts` | 폴더 → .agt: 스키마 검증 → SHA-256 체크섬 → zip 압축 |
| `unpack.ts` | .agt → 폴더: zip 해제 → 체크섬 검증 |
| `validate.ts` | 구조/스키마/호환성 종합 검증 |
| `sanitize.ts` | PII(이메일, 전화, 이름) 패턴 탐지 및 제거 — 마켓 등록 전 필수 |
| `migrate.ts` | 구버전 → 신버전 마이그레이션 변환 체인 |
| `index.ts` | 배럴 export |

---

## `cli/src/` — 커맨드라인 도구 (@agt/cli)

| 파일 | 역할 |
|------|------|
| `commands/run.ts` | `agt run <file>` — .agt 로드 → 런타임 시작 → 단발 질의/응답 |
| `commands/chat.ts` | `agt chat <file>` — 인터랙티브 채팅 모드 (readline) |
| `commands/inspect.ts` | `agt inspect <file>` — 메타데이터 표시 (persona, model-spec, 메모리 크기 등) |
| `commands/validate.ts` | `agt validate <file>` — .agt 파일 검증 결과 출력 |
| `commands/pack.ts` | `agt pack <dir>` — 폴더 → .agt 패키징 |
| `commands/unpack.ts` | `agt unpack <file>` — .agt → 폴더 추출 |
| `ui/terminal.ts` | Rich-style 터미널 출력 (색상, 테이블, 프로그레스) |
| `index.ts` | commander 등록 |

---

## `spec/` — .agt 포맷 스펙 (구현과 분리)

| 파일/디렉토리 | 역할 |
|---------------|------|
| `FORMAT.md` | .agt 파일 구조, 필수/선택 파일, 체크섬 알고리즘 |
| `VERSIONING.md` | 버전 번호 규칙, 호환성 정책 |
| `schemas/` | JSON Schema 6개 (manifest, persona, model-spec, appearance, domain, mcp-config) |
| `examples/` | 예제 에이전트 소스 (minimal, book-critic, medical-debate) |

---

## `test/` — 테스트

| 디렉토리 | 대상 |
|----------|------|
| `core/` | 타입, 스키마, 에러, 이벤트 |
| `runtime/` | 로더, LLM, 메모리, 트레이스 |
| `packager/` | pack/unpack/validate/sanitize/migrate |
| `cli/` | CLI 명령어 |
| `fixtures/` | 테스트용 .agt 파일 |
| `helpers/` | 테스트 유틸리티 |

---

## `docs/` — 문서

| 파일 | 역할 |
|------|------|
| `ARCHITECTURE.md` | 시스템 아키텍처 다이어그램 |
| `WORKFLOW.md` | 사용자 워크플로우 |
| `FOLDER-ROLES.md` | 이 문서 — 폴더별 역할 레퍼런스 |

---

## 확장 포인트

| 위치 | 확장 대상 |
|------|----------|
| `runtime/src/llm/` | 새 LLM 프로바이더 추가 (llama.cpp, vLLM 등) |
| `runtime/src/memory/` | 새 메모리 백엔드 추가 (pgvector, FAISS 등) |
| `core/src/events.ts` | 새 이벤트 타입 추가 → 플러그인/훅 가능 |
| `core/src/errors.ts` | 도메인별 에러 클래스 추가 |
| `packager/src/` | 새 마이그레이션 버전, 새 검증 규칙 |
| `cli/src/commands/` | 새 CLI 명령어 추가 |
