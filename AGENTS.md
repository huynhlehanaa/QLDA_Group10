# QLDA Project Agent Guide (ECC-Adapted)

This repository uses a focused subset of Everything Claude Code (ECC) skills in `.agents/skills/`.

## Project Context

- Backend: FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery (`backend/`)
- Frontend: Next.js 14 + TypeScript + Zustand + Vitest (`frontend/`)
- Priority: security, test reliability, and safe iterative delivery

## Active Skills In This Repo

- `api-design`
- `backend-patterns`
- `frontend-patterns`
- `python-patterns`
- `python-testing`
- `postgres-patterns`
- `docker-patterns`
- `security-review`
- `tdd-workflow`
- `verification-loop`

## Working Rules For Agents

1. Plan first for multi-file or architecture changes.
2. Prefer TDD flow: write or update tests first, then implementation.
3. Validate all API inputs at boundaries (schema + auth checks).
4. Never hardcode secrets; use `backend/.env` and typed config access.
5. Keep backend errors explicit and frontend errors user-friendly.
6. Run verification before finishing any non-trivial change.

## Verification Commands

Backend:

```powershell
Set-Location backend
python -m pytest tests/tests -q
```

Frontend:

```powershell
Set-Location frontend
npm run typecheck
npm run test
```

Full loop (recommended after significant changes):

```powershell
Set-Location backend
python -m pytest tests/tests -q
Set-Location ../frontend
npm run typecheck
npm run test
```

## Suggested Skill Mapping

- API endpoint changes: `api-design` + `backend-patterns` + `security-review`
- DB/model/query changes: `postgres-patterns` + `backend-patterns`
- UI/page/component changes: `frontend-patterns`
- Python service/refactor: `python-patterns`
- Test fixes/new tests: `python-testing` + `tdd-workflow`
- Release-readiness pass: `verification-loop`
