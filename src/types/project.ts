export type UserLevel = "beginner" | "intermediate" | "advanced";

export interface Phase {
  id: string;
  name: string;
  emoji: string;
  steps: Step[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  guide?: string;
}

export interface Project {
  id: string;
  name: string;
  level: UserLevel;
  startDate: string;
  endDate: string;
  phases: Phase[];
  repoUrl?: string;
}

export const LEVEL_CONFIG = {
  beginner: {
    label: "🌱 초보자",
    description: "코딩은 처음! AI가 다 해줘요",
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    phases: ["planning-beginner", "building-ui", "building-function", "testing-beginner", "deploying"],
  },
  intermediate: {
    label: "🌿 중급자",
    description: "코드를 읽고 수정할 수 있어요",
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    phases: ["planning", "design", "setup", "frontend", "backend", "testing", "deploying"],
  },
  advanced: {
    label: "🌳 고급자",
    description: "아키텍처부터 배포까지 직접!",
    color: "from-purple-400 to-violet-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    phases: [
      "planning", "design", "setup", "frontend", "backend",
      "integration", "testing", "pre-deploy", "deploying", "operation",
    ],
  },
} as const;

export const ALL_PHASES: Phase[] = [
  // === 초보자 전용 단계 ===
  {
    id: "planning-beginner",
    name: "기획하기",
    emoji: "💭",
    steps: [
      { id: "b1.1", title: "만들고 싶은 것 정하기", description: "어떤 앱을 만들고 싶은지 한 줄로 정리", completed: false, guide: "💡 예시: '할일 관리 앱', '가계부 앱', '일기 앱' 처럼 한 줄로 적어보세요!" },
      { id: "b1.2", title: "필요한 기능 3개 적기", description: "꼭 들어가야 할 기능만 3개", completed: false, guide: "📝 많이 적지 마세요! 딱 3개만. 예: ① 할일 추가 ② 할일 완료 ③ 할일 삭제" },
      { id: "b1.3", title: "화면 구상하기", description: "어떤 화면이 필요한지 상상", completed: false, guide: "🎨 종이에 대충 그려보세요. 메인 화면, 입력 화면 정도면 충분해요!" },
    ],
  },
  {
    id: "building-ui",
    name: "화면 만들기",
    emoji: "🎨",
    steps: [
      { id: "b2.1", title: "프로젝트 시작하기", description: "AI에게 프로젝트 만들어달라고 하기", completed: false, guide: "🚀 AI에게 이렇게 말하세요: '나는 [앱이름]을 만들고 싶어. Next.js로 프로젝트를 시작해줘'" },
      { id: "b2.2", title: "메인 화면 만들기", description: "첫 번째 화면을 AI에게 요청", completed: false, guide: "💬 '메인 페이지에 [기능1]과 [기능2]가 보이는 화면을 만들어줘' 라고 요청하세요!" },
      { id: "b2.3", title: "디자인 다듬기", description: "색상, 크기 등 원하는 대로 수정 요청", completed: false, guide: "🎨 '버튼을 더 크게 해줘', '배경 색을 파란색으로 바꿔줘' 처럼 구체적으로 말하세요!" },
      { id: "b2.4", title: "화면 동작 확인", description: "브라우저에서 잘 보이는지 확인", completed: false, guide: "👀 npm run dev로 실행하고 localhost:3000에서 확인하세요. 안 되면 AI에게 에러를 보여주세요!" },
    ],
  },
  {
    id: "building-function",
    name: "기능 붙이기",
    emoji: "⚡",
    steps: [
      { id: "b3.1", title: "첫 번째 기능 구현", description: "가장 중요한 기능을 AI에게 요청", completed: false, guide: "💬 '사용자가 [하는 행동]을 하면 [결과]가 되도록 기능을 만들어줘' 라고 요청!" },
      { id: "b3.2", title: "두 번째 기능 구현", description: "다음 기능도 AI에게 요청", completed: false, guide: "💡 한 번에 하나씩! 첫 번째가 잘 되면 두 번째를 요청하세요." },
      { id: "b3.3", title: "세 번째 기능 구현", description: "마지막 기능 추가", completed: false, guide: "🎯 MVP의 마지막 기능이에요! 완성이 눈앞이에요!" },
      { id: "b3.4", title: "전체 동작 확인", description: "모든 기능이 잘 되는지 테스트", completed: false, guide: "✅ 모든 버튼을 눌러보고, 모든 기능을 사용해보세요. 안 되는 건 AI에게 스크린샷 보여주세요!" },
    ],
  },
  {
    id: "testing-beginner",
    name: "확인하기",
    emoji: "✅",
    steps: [
      { id: "b4.1", title: "모든 화면 확인", description: "각 페이지가 잘 보이는지 체크", completed: false, guide: "📱 모바일에서도 확인해보세요! 크기가 이상하면 AI에게 '모바일에서 잘 보이게 해줘'라고 하세요." },
      { id: "b4.2", title: "에러 수정하기", description: "빨간 에러가 있으면 AI에게 보여주기", completed: false, guide: "🐛 콘솔에 빨간 글씨가 있으면 복사해서 AI에게 '이 에러 고쳐줘'라고 하세요!" },
      { id: "b4.3", title: "친구에게 보여주기", description: "다른 사람에게 사용해보라고 하기", completed: false, guide: "👥 다른 사람이 써보면 내가 못 본 문제를 찾을 수 있어요. 피드백을 받아보세요!" },
    ],
  },
  // === 공통 단계 (중급/고급도 사용) ===
  {
    id: "planning",
    name: "기획",
    emoji: "🎯",
    steps: [
      { id: "1.1", title: "아이디어 정의", description: "무엇을 만들 것인가", completed: false, guide: "💡 AI에게 '나는 ~한 앱을 만들고 싶어'라고 말해보세요. 한 줄로 정리하면 방향이 잡혀요!" },
      { id: "1.2", title: "문제 정의", description: "누구의 어떤 문제를 해결하는가", completed: false, guide: "🤔 '이 앱이 없으면 사용자는 어떤 불편을 겪을까?' 를 적어보세요." },
      { id: "1.3", title: "타겟 사용자 정의", description: "주 사용자층 결정", completed: false, guide: "👥 누가 쓸 앱인지 구체적으로 정하세요. 예: '코딩 입문 대학생', '사이드 프로젝트 개발자'" },
      { id: "1.4", title: "핵심 기능 목록", description: "MVP 범위 기능 나열", completed: false, guide: "📝 꼭 필요한 기능만 3~5개 적으세요. 나머지는 나중에! MVP가 핵심이에요." },
      { id: "1.5", title: "우선순위 결정", description: "기능별 중요도 매트릭스", completed: false, guide: "⚡ 각 기능에 '필수/있으면 좋음/나중에' 태그를 붙여보세요." },
      { id: "1.6", title: "일정 수립", description: "마감일 기준 역산 스케줄", completed: false, guide: "📅 마감일부터 거꾸로 계산하세요. 각 단계에 며칠씩 배분하면 현실적인 일정이 됩니다." },
    ],
  },
  {
    id: "design",
    name: "설계",
    emoji: "🎨",
    steps: [
      { id: "2.1", title: "사용자 플로우 설계", description: "사용자 경로 정의", completed: false, guide: "🗺️ 사용자가 앱에 들어와서 목표를 달성할 때까지의 경로를 그려보세요." },
      { id: "2.2", title: "화면 목록 정리", description: "필요한 페이지 나열", completed: false, guide: "📄 필요한 모든 페이지를 나열하세요. 예: 홈, 로그인, 대시보드, 설정..." },
      { id: "2.3", title: "와이어프레임 제작", description: "레이아웃 스케치", completed: false, guide: "✏️ 종이나 피그마에 각 화면의 대략적인 구조를 그려보세요. 예쁠 필요 없어요!" },
      { id: "2.4", title: "UI 디자인", description: "색상, 폰트, 스타일 결정", completed: false, guide: "🎨 메인 색상 2~3개, 폰트 1~2개만 정하면 충분해요. AI에게 추천을 받아보세요." },
      { id: "2.5", title: "데이터 모델 설계", description: "DB 스키마 구조", completed: false, guide: "🗄️ 어떤 데이터를 저장할지 정리하세요. 예: 사용자(이름, 이메일), 프로젝트(제목, 상태)..." },
      { id: "2.6", title: "API 설계", description: "엔드포인트 목록 정의", completed: false, guide: "🔌 프론트와 백엔드가 주고받을 데이터 경로를 정하세요. 예: GET /api/projects" },
      { id: "2.7", title: "기술 스택 결정", description: "프레임워크, 인프라 선택", completed: false, guide: "⚒️ 프레임워크, DB, 배포 플랫폼을 정하세요. 익숙한 걸 선택하는 게 가장 빨라요!" },
    ],
  },
  {
    id: "setup",
    name: "환경 구축",
    emoji: "⚙️",
    steps: [
      { id: "3.1", title: "프로젝트 초기화", description: "보일러플레이트 생성", completed: false, guide: "🚀 'npx create-next-app' 같은 명령어로 프로젝트 뼈대를 만드세요." },
      { id: "3.2", title: "Git 저장소 생성", description: "레포 생성 + 초기 커밋", completed: false, guide: "📦 GitHub에서 새 저장소를 만들고 첫 커밋을 올리세요. 버전 관리의 시작!" },
      { id: "3.3", title: "개발 환경 설정", description: "린터, 포매터 설정", completed: false, guide: "⚙️ ESLint, Prettier를 설정하면 코드 품질이 자동으로 관리됩니다." },
      { id: "3.4", title: "의존성 설치", description: "패키지 설치", completed: false, guide: "📥 필요한 라이브러리를 설치하세요. npm install로 한번에!" },
      { id: "3.5", title: "환경변수 설정", description: ".env, 시크릿 관리", completed: false, guide: "🔐 API 키, DB 주소 등 민감한 정보는 .env 파일에 넣고 절대 커밋하지 마세요!" },
      { id: "3.6", title: "폴더 구조 구성", description: "디렉토리 컨벤션", completed: false, guide: "📁 components/, pages/, utils/ 등 폴더를 미리 만들어두면 나중에 편해요." },
    ],
  },
  {
    id: "frontend",
    name: "프론트엔드",
    emoji: "🖥️",
    steps: [
      { id: "4.1", title: "공통 레이아웃", description: "헤더, 푸터, 네비게이션", completed: false, guide: "🏗️ 모든 페이지에 공통으로 들어가는 헤더, 푸터, 사이드바를 먼저 만드세요." },
      { id: "4.2", title: "페이지 라우팅", description: "페이지 간 이동 구조", completed: false, guide: "🔀 각 페이지 파일을 만들고 링크로 연결하세요. Next.js는 파일 기반 라우팅!" },
      { id: "4.3", title: "공통 컴포넌트", description: "버튼, 폼, 카드 등", completed: false, guide: "🧩 재사용할 버튼, 입력창, 카드 컴포넌트를 먼저 만들면 개발 속도가 빨라져요." },
      { id: "4.4", title: "각 화면 UI 구현", description: "페이지별 화면 구현", completed: false, guide: "🎨 와이어프레임을 보면서 각 페이지의 실제 UI를 만드세요. AI에게 코드를 요청해보세요!" },
      { id: "4.5", title: "상태 관리", description: "데이터 흐름 관리", completed: false, guide: "🔄 컴포넌트 간 데이터 공유가 필요하면 useState, Context, 또는 Zustand를 사용하세요." },
      { id: "4.6", title: "반응형 처리", description: "모바일/데스크탑 대응", completed: false, guide: "📱 Tailwind의 sm:, md:, lg: 접두사로 화면 크기별 스타일을 적용하세요." },
    ],
  },
  {
    id: "backend",
    name: "백엔드",
    emoji: "🔧",
    steps: [
      { id: "5.1", title: "DB 생성", description: "데이터베이스 구축", completed: false, guide: "🗄️ PostgreSQL, MongoDB 등을 선택하고 테이블/컬렉션을 생성하세요." },
      { id: "5.2", title: "API 구현", description: "CRUD 로직 작성", completed: false, guide: "🔌 Create, Read, Update, Delete 4개 기본 API를 만드세요. 이게 백엔드의 핵심!" },
      { id: "5.3", title: "인증/인가", description: "로그인, 권한 처리", completed: false, guide: "🔑 로그인(인증)과 권한 확인(인가)을 구현하세요. OAuth나 JWT를 활용해보세요." },
      { id: "5.4", title: "비즈니스 로직", description: "핵심 기능 서버 로직", completed: false, guide: "⚡ 앱의 고유한 기능 로직을 구현하세요. 예: 추천 알고리즘, 데이터 가공 등" },
      { id: "5.5", title: "외부 API 연동", description: "3rd party 서비스 연결", completed: false, guide: "🌐 GitHub API, OpenAI API 등 외부 서비스를 연결하세요. API 키 관리에 주의!" },
      { id: "5.6", title: "에러 처리", description: "예외 상황 대응", completed: false, guide: "🛡️ try-catch로 에러를 잡고 사용자에게 친절한 에러 메시지를 보여주세요." },
    ],
  },
  {
    id: "integration",
    name: "통합",
    emoji: "🔗",
    steps: [
      { id: "6.1", title: "프론트-백 연결", description: "API 호출 연동", completed: false, guide: "🔗 fetch나 axios로 프론트엔드에서 API를 호출하고 데이터를 받아보세요." },
      { id: "6.2", title: "데이터 바인딩 확인", description: "실제 데이터 동작 확인", completed: false, guide: "✅ 실제 DB 데이터가 화면에 제대로 표시되는지 확인하세요." },
      { id: "6.3", title: "전체 플로우 테스트", description: "시나리오 통과 확인", completed: false, guide: "🏃 회원가입 → 로그인 → 기능 사용 → 로그아웃까지 전체 흐름을 테스트하세요." },
      { id: "6.4", title: "버그 수정", description: "발견된 이슈 해결", completed: false, guide: "🐛 발견된 버그를 목록으로 정리하고 하나씩 해결하세요. AI에게 에러 메시지를 보여주세요!" },
    ],
  },
  {
    id: "testing",
    name: "테스트",
    emoji: "🧪",
    steps: [
      { id: "7.1", title: "단위 테스트", description: "개별 함수 테스트", completed: false, guide: "🧪 각 함수가 올바른 결과를 반환하는지 테스트 코드를 작성하세요." },
      { id: "7.2", title: "통합 테스트", description: "API+DB 연동 테스트", completed: false, guide: "🔗 API가 DB와 제대로 연동되는지 테스트하세요." },
      { id: "7.3", title: "E2E 테스트", description: "시나리오 자동화 테스트", completed: false, guide: "🤖 Playwright나 Cypress로 사용자 시나리오를 자동화 테스트하세요." },
      { id: "7.4", title: "성능 테스트", description: "로딩, 응답 시간 측정", completed: false, guide: "⏱️ Lighthouse로 페이지 로딩 속도를 측정하고 3초 이내 목표를 잡으세요." },
      { id: "7.5", title: "보안 점검", description: "취약점 스캔", completed: false, guide: "🔒 XSS, SQL Injection 등 기본 보안 취약점을 점검하세요. npm audit도 실행!" },
    ],
  },
  {
    id: "pre-deploy",
    name: "배포 준비",
    emoji: "📦",
    steps: [
      { id: "8.1", title: "빌드 최적화", description: "번들, 이미지 최적화", completed: false, guide: "📦 npm run build로 프로덕션 빌드하고 번들 사이즈를 확인하세요. 이미지는 WebP로!" },
      { id: "8.2", title: "환경별 설정 분리", description: "dev/staging/prod 구분", completed: false, guide: "🔧 개발/테스트/프로덕션 환경변수를 분리하세요. .env.local, .env.production 등" },
      { id: "8.3", title: "CI/CD 구축", description: "자동 빌드/배포 설정", completed: false, guide: "🤖 GitHub Actions로 push 시 자동 빌드 & 배포 파이프라인을 만드세요." },
      { id: "8.4", title: "도메인 & SSL", description: "커스텀 도메인, HTTPS", completed: false, guide: "🌐 커스텀 도메인을 연결하고 SSL 인증서(HTTPS)를 설정하세요." },
      { id: "8.5", title: "모니터링 설정", description: "에러 추적, 로그 수집", completed: false, guide: "📊 Sentry 같은 도구로 에러를 실시간 추적하고 로그를 수집하세요." },
    ],
  },
  {
    id: "deploying",
    name: "배포",
    emoji: "🚀",
    steps: [
      { id: "9.1", title: "스테이징 배포", description: "테스트 환경 배포", completed: false, guide: "🧪 프로덕션 전에 테스트 환경에 먼저 배포해서 문제가 없는지 확인하세요." },
      { id: "9.2", title: "최종 검증", description: "스테이징 전체 확인", completed: false, guide: "✅ 스테이징 환경에서 모든 기능을 한번 더 테스트하세요. 체크리스트를 만들면 좋아요!" },
      { id: "9.3", title: "프로덕션 배포", description: "실제 서비스 배포", completed: false, guide: "🚀 드디어 실제 서비스 배포! Azure, Vercel 등에 배포하세요. 긴장되지만 해봐요!" },
      { id: "9.4", title: "배포 후 확인", description: "정상 동작 모니터링", completed: false, guide: "👀 배포 후 30분간 모니터링하세요. 에러 로그, 응답 시간, 사용자 접속을 확인!" },
    ],
  },
  {
    id: "operation",
    name: "운영",
    emoji: "📈",
    steps: [
      { id: "10.1", title: "피드백 수집", description: "사용자 의견 모으기", completed: false, guide: "📬 실사용자에게 피드백을 받으세요. 구글 폼이나 앱 내 피드백 버튼을 활용!" },
      { id: "10.2", title: "버그 대응", description: "이슈 추적 & 핫픽스", completed: false, guide: "🐛 GitHub Issues로 버그를 관리하고 긴급한 건 핫픽스로 빠르게 배포하세요." },
      { id: "10.3", title: "기능 업데이트", description: "신규 기능 추가", completed: false, guide: "✨ 피드백을 바탕으로 새 기능을 추가하세요. 작은 단위로 자주 배포하는 게 좋아요!" },
      { id: "10.4", title: "성능 개선", description: "병목 분석 & 최적화", completed: false, guide: "⚡ 느린 페이지나 API를 찾아서 최적화하세요. 캐싱, 쿼리 최적화, 코드 분할 등" },
    ],
  },
];
