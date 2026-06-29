<div align="center">

# 🐥 VibePilot

### 바이브 코딩, 기획부터 배포까지 — AI 코치와 함께 체계적으로

**VibePilot**은 "바이브 코딩(Vibe Coding)"으로 앱을 만드는 1인 개발자가
**기획 → 설계 → 개발 → 배포**의 여정에서 *지금 어디쯤이고 다음에 무엇을 해야 하는지*를
관리하도록 돕는 **개인 생산성 웹 앱**입니다. AI 코치는 **근거 문서를 의미 검색(RAG)** 해 출처와 함께 안내합니다.

![VibePilot 데모](docs/vibepilot-demo.gif)

</div>

---

## ✨ 한눈에 보기

| | |
|---|---|
| 🎯 **무엇을** | 바이브 코딩 프로젝트 전체 여정을 단계별로 관리 |
| 👤 **누구를 위해** | 혼자 기획·개발·배포까지 하는 1인 개발자 |
| 🤖 **AI 역할** | `@github/copilot-sdk` 코치 + **pgvector RAG**로 근거·출처 기반 추천 |
| 💻 **실행 방식** | Next.js 웹 앱 · Docker 컨테이너 · Azure 무료 배포 |

---

## 🏗️ 인프라 / 아키텍처

```
GitHub PR ──► CI(lint·test·build) ─► 보안 6중 게이트 ─► CD(Docker push) ─► Azure
                                          │                                    │
              Gitleaks·Trivy·CodeQL·Sonar │              GHCR  ──► Container App
                                                                     │
              ┌──────────────────────────────────────────────────────┤
              ▼                          ▼                            ▼
   Azure Database for PostgreSQL   Azure OpenAI (임베딩)        Key Vault
        + pgvector (RAG)         text-embedding-3-large       (Managed Identity)
```

- **CI/CD**: GitHub Actions로 PR마다 lint→test(coverage)→build→이미지 빌드/푸시→Azure 배포
- **보안 6중 필수 게이트**: Gitleaks(시크릿) · Trivy(이미지) · CodeQL(코드) · SonarCloud(품질, 신규코드 80% 커버리지) — 전부 통과해야 main 머지
- **IaC**: 전체 리소스를 **Bicep**으로 코드화(`infra/main.bicep`), 재현 가능 배포
- **인증**: 비밀번호 없는 **Managed Identity**로 Azure OpenAI/DB 접근
- **데이터**: Azure PostgreSQL Flexible Server + **pgvector**(HNSW 코사인 인덱스)

---

## 🤖 AI 차별점 — 근거 기반 코칭 (RAG)

단순 "AI 호출"이 아니라, 단계별 베스트 프랙티스 문서를 **벡터로 검색**해 답변 근거와 출처를 붙입니다.

1. `knowledge/*.md` 문서를 **text-embedding-3-large(1536차원)** 로 임베딩 → `knowledge_chunks`에 저장
2. 사용자 질문도 임베딩해 **코사인 유사도 top-k** 검색(pgvector HNSW)
3. 코치 프롬프트에 **근거 + 출처**를 주입 → 환각 감소, 검증 가능한 추천
4. 임베딩 미가용 시 **빈 결과로 안전 폴백**(앱 흐름 유지)

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS |
| AI | `@github/copilot-sdk` · Azure OpenAI 임베딩 · pgvector RAG · GitHub MCP |
| 데이터 | Prisma ORM · PostgreSQL + pgvector |
| 인프라 | Docker · Azure Container Apps · Bicep IaC · Key Vault |
| 보안 | Gitleaks · Trivy · CodeQL · SonarCloud (필수 게이트) |
| 인증 | bcrypt · HttpOnly 세션 쿠키 · Managed Identity |
| 테스트 | Vitest (+ v8 coverage) |

---

## 🚀 로컬 실행 (Docker)

```bash
docker compose up -d        # PostgreSQL(pgvector) + 앱
# 또는 직접
npm install
npm run dev                 # http://localhost:3000
```

### 환경 변수 (AI/RAG 사용 시)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/vibepilot
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_EMBEDDING_DIMENSIONS=1536
```
- 로컬은 `az login`, 운영은 Managed Identity로 인증
- 변수 없어도 핵심 흐름(여정·체크리스트·진행도)은 동작

### 지식 베이스 적재
```bash
node scripts/ingest-knowledge.mjs   # knowledge/*.md → knowledge_chunks
```

---

## 🧪 테스트

```bash
npm test                 # 단위 테스트
npm run test:coverage    # 커버리지 (SonarCloud 연동)
```

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/        # AI 코치 (RAG 근거 주입)
│   │   ├── recommend/   # 추천 태스크
│   │   ├── auth/        # 로그인/세션
│   │   ├── projects/    # 프로젝트 CRUD
│   │   └── mcp/github/  # GitHub MCP
│   └── page.tsx         # 홈·대시보드·마이페이지
├── components/          # UI 컴포넌트
└── lib/
    ├── copilot/         # Copilot SDK 세션·도구·컨텍스트
    └── rag/             # 임베딩 + pgvector 검색
knowledge/               # 단계별 베스트 프랙티스 시드
infra/main.bicep         # Azure IaC
prisma/schema.prisma     # PostgreSQL + pgvector 스키마
```

---

## 🤝 책임 있는 AI 원칙

- AI 제안은 자동 실행이 아니라 **추천**으로 제시
- 근거에 **출처**를 표시해 검증 가능
- 시크릿은 서버 사이드에만, 프롬프트 입력 유도 금지

<div align="center">

VibePilot © 2026 — 바이브 코딩을 더 스마트하게 🐥

</div>
