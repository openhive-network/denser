# Blog Smoke Tests

Run the blog-smoke-tests skill to execute Playwright smoke tests against the Denser blog application.

**Available environments:**
- Production: https://blog.openhive.network
- Dev: https://blog.dev.openhive.network
- Localhost: http://localhost:3000

Use the Skill tool to invoke the `blog-smoke-tests` skill and follow its workflow:

1. Ask user for preferences (target environment, headed/headless mode, test scope)
2. Run the 15 smoke tests with retry logic
3. Collect artifacts on failures
4. Generate HTML report and summary
