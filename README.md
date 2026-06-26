# Travel Miniprogram

Local runnable MVP for a China domestic travel guide WeChat Mini Program.

## Local Requirements

- Go 1.22+
- MySQL 8.0+
- Node.js 20+
- WeChat Developer Tools
- `migrate` CLI from `golang-migrate`

## Workspace

```text
apps/api          Go API service
apps/miniprogram  Native WeChat Mini Program
data/seeds        Official seed content
packages/shared   Shared OpenAPI contract and generated assets
```

## Initial Setup

```bash
cp .env.example .env
make mini-install
```

The target product and implementation sequence are documented in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
