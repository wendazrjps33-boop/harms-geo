# GeoRank — Project Agent Instructions

## Project Overview

GeoRank is a GEO (Generative Engine Optimization) SaaS platform that helps brands monitor and improve their visibility across AI engines (ChatGPT, Claude, Gemini, DeepSeek, 通义千问, MiMo).

## Tech Stack

### Backend
- **Language:** Python 3.12+
- **Framework:** FastAPI 0.115+
- **ORM:** SQLAlchemy 2.x (sync mode)
- **Database:** PostgreSQL 16+
- **Cache/Queue:** Redis 7+ (cache + Celery broker)
- **Task Queue:** Celery 5.3+
- **Payments:** Stripe
- **Package Manager:** pip (requirements.txt)

### Frontend
- **Framework:** Next.js 14 (App Router) + React 18
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3
- **Editor:** TipTap (rich text)
- **Charts:** Chart.js + react-chartjs-2
- **HTTP Client:** axios

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # SQLAlchemy engine/session
│   ├── dependencies.py      # DI dependencies
│   ├── models/              # ORM models
│   ├── schemas/             # Pydantic v2 request/response models
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic
│   └── middleware/           # Request middleware
├── celery_app.py            # Celery application config
├── celery_tasks/            # Celery task definitions
├── tests/                   # pytest tests
├── migrations/              # SQL migrations
└── requirements.txt

frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable components (.tsx)
│   ├── lib/                 # Utility functions
│   ├── services/            # API client
│   └── types/               # TypeScript type definitions
├── package.json
└── tsconfig.json

docs/                        # Project documentation
├── constraints/             # Technical constraints
├── reports/                 # Historical QA/review reports
└── requirement-v4.md        # Current refactoring requirements
```

## Coding Conventions

### Python (Backend)
- Use type annotations on all function signatures
- Pydantic v2 `BaseModel` for all request/response schemas — no bare `dict`
- `async def` for I/O-bound functions
- `Depends()` for all dependency injection
- No `print()`, no `global`, no `time.sleep()` in async code
- Catch specific exception types — never swallow exceptions
- Layer separation: Router → Service → Repository; no cross-layer calls
- All public members need docstrings

### TypeScript (Frontend)
- All components use `.tsx` extension, utilities use `.ts`
- `interface` for reusable types; avoid inline type aliases
- No `any` type — API response types go in `src/types/`
- CSS: use Tailwind CSS + CSS variables, no magic numbers
- List keys must use unique business IDs — never array indices
- No `console.log` in production code
- Prefer framework reactive APIs over direct DOM manipulation

### Database
- `snake_case` for all table/column names
- Primary keys: always `id`
- Money fields: `DECIMAL(18,4)` — never `FLOAT`/`DOUBLE`
- Every field needs explicit `DEFAULT` + `COMMENT`
- Business tables require: `created_at`, `created_by`, `updated_at`, `updated_by`, `is_deleted`, `deleted_at`

## Testing

### Backend
- Framework: pytest + pytest-asyncio
- Run: `cd backend && pytest`
- Test files in `backend/tests/`
- Cover P0 routes: auth, brands, content, subscription, usage

### Frontend
- Type check: `cd frontend && npx tsc --noEmit`
- Build check: `cd frontend && npm run build`

## Key Technical Decisions

1. **Background tasks:** All long-running operations use Celery (not threading.Thread)
2. **Request pipeline:** Auth → Feature gate → Quota check → Business logic (via `require_feature_with_quota`)
3. **External services:** All LLM/SERP calls go through gateway services with timeout + retry
4. **Redis:** All keys must have explicit TTL — no orphan keys
5. **Stripe Webhooks:** Must use event_id deduplication

## Constraints Reference

See `docs/constraints/` for detailed technical constraints:
- `architect_constraint.md` — Full tech stack lock, banned dependencies, deployment limits
- `db_constraint.md` — Database naming, type specs, mandatory fields
- `ui_constraint.md` — Brand colors, typography, spacing, component library

## Current Focus: v4.0 Refactoring

See `docs/requirement-v4.md` for the full refactoring scope. Priority:

**P0 (blocking):**
1. Remove all .js/.jsx files, unify to TypeScript
2. Unify backend request pipeline (require_feature_with_quota)
3. Stripe Webhook idempotency
4. Redis key TTL coverage
5. Unify background tasks to Celery

**P1 (next):**
6. Fix JSON parsing fragility
7. External service timeout/retry
8. Backend P0 test coverage ≥80%
9. Enable tsconfig strict mode
