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

## Passing environment variables to the application

We use npm package
[@beam-australia/react-env](https://github.com/andrewmclagan/react-env)
for passing environment variables to application in runtime (when we
start application in shell).

Please note, that environment variables set in shell before application
start, this way for instance:

```bash
export REACT_APP_API_ENDPOINT="https://api.openhive.network"
```

will override everything set in any `*.env` files described below.

Main environment file for application is `.env`. Put all environment
variables, with their default values, into this file. Keep here values
used in development, common for all developers. When you want to
customize anything for your specific development requirement, do it in
file `.env.local`. This file is ignored by `git`. Values set in
this file will override values set in `.env` file.

Variables prefixed with `REACT_APP_` are available to the browser and
server. You can get variable `REACT_APP_API_ENDPOINT`, both in browser
and on server, this way:

```javascript
import env from "@beam-australia/react-env";
console.log('env("API_ENDPOINT")', env("API_ENDPOINT"));
```

Note, that prefix `REACT_APP_` will be omitted, when you use function
`env()`. You can also get this variable via
`process.env.REACT_APP_API_ENDPOINT`, but on server only.

Any other variables (not prefixed with `REACT_APP_`) are available to
server only, via `process.env`. Prefixing these variables is not
required, however we decided to use another prefix `DENSER_SERVER_` to
avoid interfering with other shell variables. Note, that prefix won't be
omitted, so you should use statement like

```javascript
process.env.DENSER_SERVER_HIDDEN_SECRET
```

to get these variables.

You can create another env files, like `.env.staging`, `.env.test`. Look
into npm package
[@beam-australia/react-env](https://github.com/andrewmclagan/react-env)
documentation, what you can do with them.

**Note**: PORT variable - which determines the port the app listens on - cannot be set in .env as booting up the HTTP server happens before any other code is initialized.

## Testing

### E2E Playwright

You can run automatic e2e tests in localhost by using node scripts but
first run local Denser App by `npm run dev`

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

```bash
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

```bash
Usage: scripts/run_instance.sh [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IAMGE         Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL    API endpoint to be used by the new instance (default: 'https://api.hive.blog')
  --images-endpoint=URL IMAGES endpoint to be used by the new instance (default: 'https://images.hive.blog/')
  --port=PORT           Port to be exposed (default: 3000)
  --name=NAME           Container name to be used (default: denser)
  --detach              Run in detached mode
  -?|--help             Display this help screen and exit
```

You can also run the pre-built Docker image with command:

```bash
docker run --detach --publish 3000:3000 registry.gitlab.syncad.com/hive/denser:latest
```

This will run a single instance of the application on port 3000, connected to [the default API](https://api.hive.blog).

You can change the port and the default API endpoint by using environment variables like so:

```bash
docker run --detach --publish 80:80 --env PORT=80 --env REACT_APP_API_ENDPOINT="https://api.hive.blog" --env REACT_APP_IMAGES_ENDPOINT="https://images.hive.blog/" registry.gitlab.syncad.com/hive/denser:latest
```

Finally, there are example [Composefile](docker/docker-compose.yml) and accompanying [dotenv](docker/.env) files available if you prefer to go that route.

**Note**: You can also set the apps environmantal variables by mounting a custom dotenv file inside the container rather than using the `--env` option - with the `PORT` variable being an exception.

The command would look like this:

```bash
docker run --detach --publish 3000:3000 --volume /path/to/custom/env/file:/home/node/app/.env.local \
  registry.gitlab.syncad.com/hive/denser:latest
```

## Learn More

To learn more about Next.js and Hive , take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Hive Documentation](https://developers.hive.io/) - learn about Hive Blockchain
- [Hive Ecosystem](https://hive.io/eco) - checkout apps ecosystem 📱
