# Denser - Hive Blockchain Frontend

Decentralized social media app for Hive Blockchain. Successor to hive/condenser (hive.blog).

## Architecture

### Monorepo Structure (pnpm + Turbo)
- **apps/blog** - Main social media frontend (blog.hive.blog, port 3000)
- **apps/wallet** - Wallet interface (wallet.hive.blog, port 4000)
- **apps/auth** - Legacy auth app (obsolete, but code referenced for patterns)
- **packages/** - Shared workspace packages used across apps
  - `smart-signer` - Hive authentication SDK (HiveAuth/Hivesigner integration)
  - `ui` - Common UI components (Radix UI based)
  - `transaction` - Hive blockchain transaction utilities
  - `renderer` - Content rendering (markdown, etc.)
  - `middleware` - Next.js middleware utilities
- **haf/** - Hive Application Framework (C++ blockchain backend, separate project)

### Tech Stack
- Next.js (standalone output, app and pages router mix)
- TypeScript, React 18
- Tailwind CSS
- TanStack Query (React Query) for data fetching
- Zustand for app state
- Playwright for E2E testing
- Node 20.11.1 (pinned via Volta)

### Hive Blockchain Integration
Apps consume Hive blockchain data via:
- **@hiveio/wax** - Primary API client for Hive (installed as `catalog:hiveio-toolset`)
- **@hiveio/hb-auth** - Authentication web worker (copied to `public/auth/` during build)
- Environment variables: `REACT_APP_API_ENDPOINT` (Hive API) and `REACT_APP_IMAGES_ENDPOINT`
- HAF (Hive Application Framework) provides blockchain data via PostgreSQL (see `haf/` directory for backend)

## Critical Workflows

### Development
```bash
pnpm install
pnpm run dev:blog      # Port 3000
pnpm run dev:wallet    # Port 4000
```
Version info is written to `version.json` before each dev/build command via `scripts/write-version.sh`.

### Building & Starting
```bash
pnpm run build:blog && pnpm run start:blog
pnpm run build:wallet && pnpm run start:wallet
```
Builds use `output: 'standalone'` mode. Post-build copies HiveAuth worker to `public/auth/`.

### Testing
```bash
pnpm run all:pw:test:local              # Both apps
pnpm run blog:pw:test:local             # Blog only
pnpm run blog:mir:pw:test:mir:chromium  # Against mirrornet test env
```
Multiple Playwright configs exist for different environments (local, mirrornet, stack deployments).

### Docker Deployment
Build individual app images:
```bash
./scripts/build_instance.sh --app-scope='@hive/blog' --app-path='/apps/blog' --app-name='blog' "$(pwd)"
BASE_PATH=/blog ./scripts/build_instance.sh ...  # For subdirectory deployments
```
Use `docker/docker-compose.yml` or `stack/compose.*.yml` for orchestration.

## Project Conventions

### Environment Variables (Runtime)
Use **@beam-australia/react-env** for runtime env vars (not build-time). Variables are injected when server starts, not at build time. Prefix with `REACT_APP_` for exposure to client.

### Base Path Support
Apps support deployment at root (`/`) or subdirectory (`/blog`, `/wallet`):
- Set `NEXT_PUBLIC_BASE_PATH` env var at build time
- `basePath` and `assetPrefix` in `next.config.js` are configured accordingly
- Blog middleware redirects `/` → `/trending`

### Package Dependencies
- Monorepo packages use `workspace:*` protocol
- External Hive tools use `catalog:hiveio-toolset` (defined in pnpm workspace)
- `transpilePackages` in next.config includes all workspace packages
- `neverBuiltDependencies`: `secp256k1`, `core-js` (defined in root package.json)

### Authentication Flow
1. HiveAuth worker copied from `@hiveio/hb-auth/dist/worker.js` to `public/auth/`
2. Middleware (`middleware.ts`) sets login challenge cookies
3. Login API endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/users/me`
4. Use hooks from `@hive/smart-signer/lib/auth/` (e.g., `use-logout.ts`, `use-user-client.ts`)
5. Forms in `packages/smart-signer/components/auth/`

### Localization
- Use `next-i18next` with `localePath: './public/locales'`
- Copy locale files via CopyPlugin during build (both app and package locales)
- Gitignore `public/locales/` in apps

### Code Organization
- **apps/*/pages/** - Next.js page routes
- **apps/*/app/** - Next.js App Router routes (hybrid router usage)
- **apps/*/features/** - Feature-specific components and logic
- **apps/*/lib/** - App-specific utilities
- **apps/*/store/** - Zustand stores
- **packages/** - Reusable cross-app code

### Turbo Configuration
Tasks in `turbo.json`:
- `dev`, `devssl` - Persistent, no cache
- `build` - Depends on `^build`, outputs `.next/**`
- `start` - Depends on `^build`

## Integration Points

### HAF Backend
HAF (Hive Application Framework) is the blockchain data layer:
- C++/PostgreSQL based backend (see `haf/` directory)
- Provides blockchain data via sql_serializer plugin
- Apps typically consume via Wax API client pointing to HAF-powered API endpoints
- HAF handles fork resolution automatically

### Blockchain APIs
Apps consume Hive data via `REACT_APP_API_ENDPOINT`:
- Production: `https://api.hive.blog`
- Test: Mirrornet environments (`*.bc.fqdn.pl:8083`)
- Local: Point to local HAF instance

### Stack Deployment
`stack/` contains Docker Compose files for full-stack deployment:
- `compose.stack.yml` - HAF backend services
- `compose.blog.yml`, `compose.wallet.yml` - Frontend apps
- `compose.caddy.yml` - Reverse proxy (Caddy)
- Uses registry.gitlab.syncad.com for images

### PWA Support
Both apps use `next-pwa`:
- Service worker: `public/sw.js`
- Cache-Control headers prevent caching of workers
- Disabled in development mode

## Key Files

- `turbo.json` - Monorepo task orchestration
- `pnpm-workspace.yaml` - Workspace package definitions
- `apps/*/next.config.js` - Next.js config with basePath, rewrites, transpilePackages
- `packages/smart-signer/README.md` - Comprehensive auth integration guide
- `scripts/build_instance.sh` - Docker image build script
- `haf/README.md` - HAF backend architecture documentation
