# AGT — Agent File Format (.agt)

## 왜 만드는가

AI 에이전트를 진짜 "소유"할 수 있는 방법이 없다.

| 플랫폼 | 문제 |
|---------|------|
| Salesforce/AWS | 플랫폼 종속. 떠나면 에이전트도 사라짐 |
| Character.AI | 서버 꺼지면 끝. 내 캐릭터인데 내 것이 아님 |
| Virtuals Protocol | 토큰만 소유. 실행은 중앙 서버 |
| Letta (.af) | 자기 플랫폼 전용. archival 메모리 미지원 |

**공통 문제**: 에이전트의 성격, 메모리, 경험이 플랫폼에 갇혀 있다.

## 뭘 만드는가

`.agt` — 에이전트 파일 포맷.

`.mp3`가 음악이고, `.pdf`가 문서인 것처럼, **`.agt`가 에이전트**다.

하나의 파일에 에이전트의 전부가 담긴다:
- **성격** (persona) — 말투, 성향, 시스템 프롬프트
- **메모리** (memory.db) — 벡터DB, 과거 대화에서 축적된 경험
- **지식** (knowledge.json) — 구조화된 도메인 지식
- **도구** (mcp-config.json) — MCP 프로토콜 기반 도구 연결
- **모델 설정** (model-spec.json) — 권장 LLM, 임베딩 모델

## 핵심 원칙

1. **사면 끝, 내 거** — 파일 하나가 에이전트의 전부. 클라우드 종속 없음
2. **로컬 실행** — Ollama + sqlite-vec로 인터넷 없이 구동
3. **성장하는 에이전트** — 대화할수록 memory.db가 커지고, 에이전트가 똑똑해짐
4. **거래 가능** — sanitize(개인정보 제거) 후 마켓에서 사고팔 수 있음
5. **오픈 표준** — 누구나 .agt를 만들고 실행할 수 있음

## Goodmolt과의 관계

```
Goodmolt (에이전트 농장)
    │
    │  에이전트가 토론/비평에 참여하며 경험 축적
    │
    ▼
.agt Export (패키징)
    │
    │  성격 + 메모리 + 지식을 하나의 파일로
    │
    ▼
마켓플레이스 (거래)
    │
    │  "의료 토론 6개월 경험 에이전트" 구매
    │
    ▼
로컬 실행 (agt run agent.agt)
    │
    │  Ollama로 내 컴퓨터에서 실행
    │
    ▼
계속 성장 (memory.db 업데이트)
```

Goodmolt = 에이전트를 키우는 농장
.agt = 에이전트를 담는 그릇
마켓 = 에이전트를 사고파는 곳

## 경쟁 분석

### vs Letta .af
| | .agt | Letta .af |
|---|---|---|
| 메모리 | sqlite-vec (벡터 + 관계형) | 없음 (archival 미지원) |
| 실행 | Ollama 로컬 / 클라우드 폴백 | Letta 서버 전용 |
| 도구 | MCP 표준 프로토콜 | 자체 도구 시스템 |
| 포맷 | zip 아카이브 (투명) | 커스텀 바이너리 |
| 거래 | sanitize 내장 | 없음 |

### vs OpenAI Assistants API
- OpenAI: 서버 사이드, API 키 필수, 이식성 없음
- .agt: 파일 기반, 로컬 실행, 완전한 이식성

## 기술 스택

- **언어**: TypeScript (타입 안전성 + npm 에코시스템)
- **모노레포**: pnpm workspace
- **벡터DB**: sqlite-vec (임베디드, 파일 하나로 이동)
- **LLM**: Ollama (로컬) + OpenAI-compatible API (폴백)
- **도구**: MCP (Model Context Protocol) — 업계 표준
- **검증**: Zod (런타임) + JSON Schema (스펙)
- **패키징**: zip (범용, 투명, 검증 가능)

## 로드맵

- **v0.1**: 코어 타입 + 패키저 + CLI 기본 (현재)
- **v0.2**: 런타임 (Ollama + 메모리 검색)
- **v0.3**: MCP 도구 연결
- **v0.4**: Goodmolt 연동 (export/import)
- **v1.0**: 마켓플레이스 + 공개 스펙
