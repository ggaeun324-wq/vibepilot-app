# 환경 구축 / 백엔드 (Backend & Setup) 베스트 프랙티스

## 한 문장 정의
환경 구축은 코드를 안정적으로 돌리기 위한 기반(저장소, 환경변수 분리, DB 연결)을 먼저 끝내는 단계다.

## 핵심 가이드
- 시크릿은 코드에 넣지 않고 환경변수로 분리한다. .env는 .gitignore에 넣고 .env.example만 커밋.
- DB는 로컬은 Docker(예: pgvector/pgvector:pg16), 운영은 Azure Database for PostgreSQL Flexible Server.
- 마이그레이션은 도구(Prisma migrate)로 버전 관리하고, 운영엔 migrate deploy로 적용한다.
- 운영 DB 접근은 비밀번호 대신 관리 ID(Managed Identity)로 키 없이 인증하는 게 안전하다.
- 비용은 서버를 정지(stop)하면 컴퓨팅 과금이 멈춘다. 토큰 단위 과금(임베딩)은 유휴 시 0.

## 흔한 실수
- 시크릿을 커밋해 Gitleaks에 잡힘. allowlist 대신 시크릿 분리가 우선이다.
