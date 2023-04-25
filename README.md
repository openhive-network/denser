<div align="center">
    <img src="https://user-images.githubusercontent.com/8167068/232636144-c0cb3c35-9d79-4349-bc67-b2c0c298ee4b.png" alt="Pivot Logo">
    <p><strong>Decentralized social media app for Hive Blockchain ⛓️</strong></p>
    <small style='display: block'>Hive.blog successor (code name PIVOT)</small>
</div>

## What's in the stack
- Cache State [React Query](https://tanstack.com/query/latest)
- App State [Zustand](https://zustand-demo.pmnd.rs/)
- Styling with [Tailwind](https://tailwindcss.com/)
- End-to-end testing with [Playwright](https://playwright.dev/)
- Unit testing with [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com)
- Code formatting with [Prettier](https://prettier.io)
- Linting with [ESLint](https://eslint.org)
- Static Types with [TypeScript](https://typescriptlang.org)
- UI Component library [Radix UI](https://www.radix-ui.com/)
- Javascript library for talking to Hive API [DHive](https://gitlab.syncad.com/hive/dhive)
- [Hivesigner](https://hivesigner.com/) option for authentication

## Getting Started

First, run the development server: ⚡️

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Testing
### E2E Playwright
You can run automatic e2e tests in localhost by using node scripts but first run local Denser App by `npm run dev`
- `npm run pw:test:local:chromium` (to run tests on the Chrome browser engine)
- `npm run pw:test:local:firefox` (to run tests on the Firefox browser engine)
- `npm run pw:test:local:webkit` (to run tests on the Safari browser engine)
- `npm run pw:test:local` (to run tests on the browser engines above)

## Docker

### Build

You can build a Docker image using the following command

```bash
docker buildx bake local-build
```

or using the convenience script:

```bash
scripts/build_instance.sh .
```

Script usage is as follows:

```
Usage: scripts/build_instance.sh <source directory> [OPTION[=VALUE]]...

Build a Denser Docker image
by default tagged as 'registry.gitlab.syncad.com/hive/denser:latest'
OPTIONS:
  --registry=URL        Docker registry to assign the image to (default: 'registry.gitlab.syncad.com/hive/denser')
  --tag=TAG             Docker tag to be build (default: 'latest')
  --progress=TYPE       Determines how to display build progress (default: 'auto')
  -?|--help             Display this help screen and exit
```

### Run

There's a convenience script provided for running the Docker image. Using it to set up an instance is as simple as:

```bash
scripts/run_instance.sh
```

The full usage is as follows:

```
Usage: scripts/run_instance.sh [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IAMGE        Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL   API endpoint to be used by the new instance (default: 'api.hive.blog')
  --port=PORT          Port to be exposed (default: 3000)
  -?|--help            Display this help screen and exit
```

You can also run the pre-built Docker image with command:

```bash
docker run --detach --publish 3000:3000 registry.gitlab.syncad.com/hive/denser:latest
```

This will run a single instance of the App on port 3000, connected to [the default API](api.hive.blog).

You can change the port and the default enpoint by using environment variables like so:

```bash
docker run --detach --publish 80:80 --env PORT=80 --env API_NODE_ENDPOINT=api.example.com registry.gitlab.syncad.com/hive/denser:latest
```

Finally, there are example [Composefile](docker/docker-compose.yml) and accompanying (dotenv)[docker/.env] files available if you prefer to go that route.

## Learn More

To learn more about Next.js and Hive , take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Hive Documentation](https://developers.hive.io/) - learn about Hive Blockchain
- [Hive Ecosystem](https://hive.io/eco) - checkout apps ecosystem 📱
