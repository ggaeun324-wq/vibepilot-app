# 🐥 VibePilot — 바이브 코딩 매니저

> 바이브 코딩의 기획부터 배포까지, AI와 함께 체계적으로 관리하는 개인 생산성 웹앱

## 📌 프로젝트 소개

VibePilot은 **바이브 코딩(Vibe Coding)** 을 하는 개발자들이 프로젝트를 기획부터 배포까지 체계적으로 관리할 수 있도록 돕는 앱입니다.

사용자의 경험 수준에 따라 맞춤형 여정을 제공하고, 진행 상황을 시각적으로 추적할 수 있습니다.

## 🎯 핵심 기능

### 1. 레벨별 맞춤 여정
| 레벨 | 단계 수 | 대상 |
|------|---------|------|
| 🌱 초보자 | 5단계 (18스텝) | 코딩 경험 없음, AI에 전적 의존 |
| 🌿 중급자 | 7단계 | 코드를 읽고 수정할 수 있음 |
| 🌳 고급자 | 10단계 (45스텝) | 아키텍처부터 배포까지 직접 가능 |

### 2. 프로젝트 설정
- 프로젝트 이름 입력
- 🎯 목표 설정
- 📅 시작일 / 🏁 마감일 기간 설정
- D-day 카운터 자동 계산

### 3. 진행도 대시보드
- **프로그레스 링**: 전체 완료 퍼센테이지 시각화
- **탭 UI**: 개요&추천 / 단계별 체크리스트 분리
- **다음 할 일 안내**: 자동으로 다음 미완료 작업 표시
- **진행도 분석**: 시간 경과 vs 실제 진행 비교

### 4. GitHub 레포 코드 분석
- **PAT 기반 레포 목록 조회**: 사용자가 입력한 GitHub 토큰으로 접근 가능한 레포 목록을 읽기 전용으로 불러오기
- **Private 레포 분석**: 선택한 레포의 파일 트리와 대표 파일을 읽어 구조/진행 단계/개선 포인트 분석
- **Copilot SDK + MCP 연동**: `@github/copilot-sdk` 에이전트가 내부 GitHub MCP 도구를 통해 레포 컨텍스트를 읽고 질문에 답변

### 4. 마스코트 성장 시스템 🥚→🏆
진행도에 따라 마스코트가 진화합니다:

| 진행도 | 마스코트 | 이름 |
|--------|----------|------|
| 0% | 🥚 | 알 |
| ~25% | 🐣 | 병아리 탄생! |
| ~50% | 🐥 | 아기 병아리 |
| ~75% | 🐔 | 성장한 닭 |
| ~100% | 🦅 | 날개를 펼친 독수리 |
| 100% | 🏆 | 전설의 개발자! |

### 5. AI 기능 (Copilot SDK)
- **AI 채팅 어시스턴트**: 현재 단계에 맞는 바이브 코딩 가이드
- **오늘의 추천 태스크**: 진행 상황 분석 기반 우선순위 추천
- **GitHub 레포 분석**: URL 입력 → 프로젝트 상태/건강도 AI 분석

### 6. 로그인 & 데이터 영속성
- 이메일/비밀번호 로그인 및 회원가입
- PostgreSQL 기반 계정/프로젝트 저장
- HttpOnly 쿠키 기반 세션 유지
- 기존 브라우저 localStorage 데이터 안전 이전
- 재방문 시 세팅값 유지

### 7. 마이페이지
- 프로젝트 리스트업 및 선택
- 프로젝트 열기/삭제
- Google Calendar 연동 토글 ON/OFF

### 8. Google Calendar 연동
- 단계별 기간 자동 배분 (스텝 수 비례)
- 컬러 코딩 타임라인 바 시각화
- 클릭으로 단계별/전체 일정을 Google Calendar에 추가

### 9. 단계별 가이드 (❓ 툴팁)
- 각 스텝 옆 ? 아이콘 마우스 오버 시 상세 가이드 표시
- 현재 단계에서 구체적으로 무엇을 해야 하는지 안내

## 🛠️ 기술 스택

- **Frontend**: Next.js 16 + TypeScript
- **스타일링**: Tailwind CSS
- **AI 연동**: @github/copilot-sdk
- **DB/ORM**: PostgreSQL + Prisma
- **배포**: Azure Container Apps (단일 Next.js 서버)
- **AI 모델**: Azure OpenAI (fallback 내장)
- **인증**: 서버 API + HttpOnly 세션 쿠키
- **데이터 저장**: PostgreSQL (기존 localStorage 데이터 마이그레이션 지원)

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 필요한 환경 변수

Copilot SDK의 Azure OpenAI BYOM 경로를 사용합니다.

```bash
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
MODEL_NAME=<azure-openai-deployment-name>
NODE_ENV=development
```

- 로컬 개발에서는 `az login` 상태여야 합니다.
- Azure Container Apps 배포에서는 Managed Identity를 사용하고, 필요하면 `AZURE_CLIENT_ID`를 함께 설정하세요.

### GitHub PAT 권한

- **Fine-grained PAT 권장**
- 최소 권한:
  - **Metadata: Read**
  - **Contents: Read**
- 토큰은 브라우저 메모리에서만 사용하며 저장하지 않습니다.

### 빌드
```bash
npm run build
```

### Azure 배포
```bash
azd up
```

기본 배포는 `azure.yaml` 기준으로 `web` 단일 서비스(Next.js + API Routes)로 Container Apps에 올라갑니다.

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # AI 채팅 API (Azure OpenAI + fallback)
│   │   ├── recommend/route.ts  # 오늘의 추천 태스크 API
│   │   └── analyze/route.ts    # GitHub 레포 분석 API
│   ├── globals.css             # 글로벌 스타일 + 애니메이션
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 메인 페이지 (홈 + 대시보드 + 마이페이지)
├── components/
│   ├── Header.tsx              # 상단 헤더 + 로그인/마이페이지 버튼
│   ├── LoginModal.tsx          # 로그인/회원가입 모달
│   ├── MyPage.tsx              # 마이페이지 (프로젝트 리스트 + 캘린더)
│   ├── LevelSelector.tsx       # 레벨 선택 카드 UI
│   ├── Mascot.tsx              # 마스코트 진화 시스템
│   ├── PhaseTimeline.tsx       # 단계별 체크리스트 + 툴팁
│   ├── ProgressRing.tsx        # 원형 프로그레스 바
│   ├── ProgressInsight.tsx     # 시간 vs 진행도 분석 패널
│   ├── AIChat.tsx              # 레포 컨텍스트 질문 지원 AI 채팅
│   ├── TodayRecommend.tsx      # 오늘의 추천 태스크
│   ├── RepoAnalyzer.tsx        # GitHub PAT 기반 레포 선택 + 코드 분석
│   └── GoogleCalendar.tsx      # Google Calendar 연동
├── lib/
│   ├── auth.ts                 # 인증 API 클라이언트 + legacy 이전
│   ├── storage.ts              # 프로젝트 저장 API + 진행도 계산 로직
│   ├── copilot.ts              # Copilot SDK + Azure OpenAI BYOM 실행
│   ├── github-mcp.ts           # GitHub 읽기 전용 MCP 도구 정의
│   ├── github.ts               # GitHub API 유틸 + 레포 컨텍스트 수집
│   ├── prisma.ts               # Prisma 클라이언트
│   ├── project-merge.ts        # legacy 프로젝트 안전 병합 로직
│   └── repo-analysis.ts        # 레포 분석/헬스 점수 계산
prisma/
│   ├── schema.prisma           # DB 스키마
│   └── migrations/             # 초기 마이그레이션
└── types/
    └── project.ts              # 타입 정의 + 전체 단계 데이터 (45스텝)
```

## 📊 진행도 로직

- **시작 전**: 모든 단계 0%, "예정" 상태
- **첫 클릭 후**: 시간 기반 목표치 계산 시작
- **상태 표시**: 완료 ✅ / 진행 중 🔄 / 지연 ⚠️ / 예정 ⏳
- **단계별 기간**: 총 기간을 스텝 수 비례로 자동 배분

## 📝 바이브 코딩 전체 단계 (10단계)

1. **🎯 기획** — 아이디어, 문제 정의, 타겟, 기능 목록, 우선순위, 일정
2. **🎨 설계** — 사용자 플로우, 화면 목록, 와이어프레임, UI, DB, API, 기술 스택
3. **⚙️ 환경 구축** — 프로젝트 초기화, Git, 개발 환경, 의존성, 환경변수, 폴더 구조
4. **🖥️ 프론트엔드** — 레이아웃, 라우팅, 컴포넌트, 화면 구현, 상태 관리, 반응형
5. **🔧 백엔드** — DB, API, 인증, 비즈니스 로직, 외부 API, 에러 처리
6. **🔗 통합** — 프론트-백 연결, 데이터 바인딩, 플로우 테스트, 버그 수정
7. **🧪 테스트** — 단위, 통합, E2E, 성능, 보안 테스트
8. **📦 배포 준비** — 빌드 최적화, 환경 분리, CI/CD, 도메인, 모니터링
9. **🚀 배포** — 스테이징, 최종 검증, 프로덕션, 배포 후 확인
10. **📈 운영** — 피드백 수집, 버그 대응, 기능 업데이트, 성능 개선

## 📜 라이선스

MIT License

---

🐥 *VibePilot — 바이브 코딩을 더 스마트하게*
