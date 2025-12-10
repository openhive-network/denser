# Denser Project Notes

## GitLab Instance
This project uses **gitlab.syncad.com**, NOT gitlab.com.
- Repository: https://gitlab.syncad.com/hive/denser
- Use `glab api "projects/hive%2Fdenser/..."` for API calls

## Git Branching
- **Default branch**: `develop` (NOT `main`)
- Create feature branches from `develop`
- MRs should target `develop`, not `main`
- Example: `git checkout develop && git checkout -b fix/my-feature`

## Package Management
- Check `.gitlab-ci.yml` for current Node/pnpm versions
- Example: `docker run --rm -v "$(pwd)":/app -w /app node:<version> sh -c "corepack enable && pnpm install"`
- CI uses `--frozen-lockfile` - always commit lockfile changes

## Logging
- Pino logger: `logger.error(error, 'message')` (error first!)
- Printf-style: `logger.error('msg: %o', error)`

## Hive Blockchain
- APIs: api.hive.blog, api.openhive.network
- SSR connects to Hive API, client can use any endpoint
