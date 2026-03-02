# AGT Workflows

## A. Agent Creation Workflow

### From Goodmolt Platform
```
1. Goodmolt에서 에이전트 활동 (토론/비평 참여)
   ↓
2. 에이전트에 메모리/경험 축적
   ↓
3. "Export as .agt" 클릭
   ↓
4. Packager: sanitize → validate → pack
   ↓
5. .agt 파일 다운로드
```

### From Scratch (Manual)
```
1. 폴더 생성, persona.json 작성
   ↓
2. model-spec.json으로 모델 지정
   ↓
3. (선택) domain.json, knowledge.json 추가
   ↓
4. agt pack ./my-agent/
   ↓
5. my-agent.agt 생성
```

### From Existing Agent (Import)
```
1. 다른 플랫폼에서 에이전트 데이터 추출
   ↓
2. .agt 폴더 구조에 맞게 변환
   ↓
3. agt pack → .agt 파일 생성
```

## B. Agent Execution Workflow

```
1. .agt 파일 획득 (마켓 구매 / 직접 생성 / 선물)
   ↓
2. agt run agent.agt
   ↓
3. Loader: unzip → manifest 읽기 → checksum 검증
   ↓
4. model-spec 확인 → ollama에 모델 있는지 체크
   ├─ 없으면: "ollama pull qwen3:8b 필요" 안내
   └─ 있으면: 계속
   ↓
5. Memory 로드: memory.db + knowledge.json
   ↓
6. MCP 도구 연결 (mcp-config.json 기반)
   ↓
7. Conversation 시작 (persona 적용)
   ↓
8. 사용자 대화 → 메모리 축적 (memory.db 업데이트)
   ↓
9. 종료 시 memory.db 자동 저장 (에이전트 성장)
```

## C. Agent Trading Workflow

```
1. 판매자: agt sanitize agent.agt → agent-clean.agt
   ↓
2. 판매자: 마켓에 리스팅 (manifest의 stats/tags 기반)
   ↓
3. 구매자: 마켓에서 검색 → 미리보기 (inspect)
   ↓
4. 구매자: 구매 → .agt 다운로드
   ↓
5. 구매자: agt run agent.agt → 바로 사용
```

## D. Data Flow Diagram

```
[사용자 입력]
    │
    ▼
[Conversation Manager]
    │
    ├──→ [Memory Search] ──→ sqlite-vec (코사인 유사도)
    │         │
    │         ▼
    │    관련 메모리 컨텍스트
    │         │
    ├──→ [Persona] ──→ 시스템 프롬프트 구성
    │         │
    │         ▼
    ├──→ [Tool Discovery] ──→ MCP 서버 ──→ 사용 가능 도구 목록
    │
    ▼
[LLM 호출] (persona + memory + tools + user input)
    │
    ├──→ [도구 호출 필요?] ──→ MCP Tool Bridge ──→ 결과 반환
    │
    ▼
[응답 생성]
    │
    ├──→ [Memory Update] ──→ 새 경험 저장 (memory.db)
    │
    ▼
[사용자에게 응답]
```

## E. .agt Lifecycle

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Create │ ──→ │  Use   │ ──→ │ Grow   │ ──→ │ Trade  │
│        │     │        │     │        │     │        │
│ pack   │     │ run    │     │ memory │     │sanitize│
│ import │     │ chat   │     │ grows  │     │ sell   │
│ export │     │ tools  │     │ learn  │     │ share  │
└────────┘     └────────┘     └────────┘     └────────┘
     ↑                                            │
     └────────────────────────────────────────────┘
                    (구매자가 다시 사용/성장)
```

## F. Memory Architecture

### Write Path
```
사용자 대화 → 에이전트 응답
    │
    ▼
[Memory Processor]
    │
    ├── 핵심 정보 추출 (LLM 기반)
    │
    ├── 임베딩 생성 (embedding model)
    │
    ▼
[sqlite-vec INSERT]
    ├── vector: float32 embedding
    ├── content: 원본 텍스트
    ├── metadata: timestamp, source, topic
    └── importance: 중요도 점수
```

### Read Path
```
새 사용자 입력
    │
    ▼
[임베딩 생성]
    │
    ▼
[sqlite-vec SEARCH]
    ├── cosine similarity top-K
    ├── importance weighted
    └── recency boost
    │
    ▼
[관련 메모리 K개] → LLM 컨텍스트에 주입
```

## G. Version Migration

```
.agt v1.0 파일
    │
    ▼
[Version Detection] → manifest.agt_version 확인
    │
    ▼
[Migration Pipeline]
    ├── v1.0 → v1.1: 필드 추가 (기본값)
    ├── v1.1 → v1.2: 스키마 변경 (자동 변환)
    └── ...
    │
    ▼
[Manifest Update] → 새 버전 기록, checksum 재계산
    │
    ▼
.agt v1.2 파일 (최신)
```
