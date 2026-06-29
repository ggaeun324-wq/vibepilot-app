# 배포 / CI-CD / Docker 베스트 프랙티스

## 한 문장 정의
CI는 변경마다 lint→test→build로 품질을 자동 검증하고, CD는 통과한 이미지를 자동 배포한다. Docker는 "어디서나 같은 환경"을 보장한다.

## 핵심 가이드
- 파이프라인 순서: lint → test(+coverage) → build → 이미지 빌드/푸시 → 배포.
- 보안 게이트를 필수로 승격: Gitleaks(시크릿), Trivy(이미지 취약점), CodeQL(코드), SonarCloud(품질).
- Dockerfile은 멀티스테이지로 작게 빌드하고, Next.js는 standalone 출력으로 런타임을 슬림화.
- 인프라는 Bicep/Terraform으로 코드화(IaC)해 재현 가능하게 만든다.
- 브랜치 보호 ruleset으로 PR이 모든 체크 통과해야만 main 머지 가능하게 막는다.

## 흔한 실수
- 보안 스캔을 선택 체크로 두면 무력화됨. 필수(required)로 승격해야 의미가 있다.
