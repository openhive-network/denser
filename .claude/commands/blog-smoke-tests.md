# Blog Smoke Tests

Run the blog-smoke-tests skill to execute Playwright smoke tests against https://blog.openhive.network.

Use the Skill tool to invoke the `blog-smoke-tests` skill and follow its workflow:

1. Ask user for preferences (headed/headless mode, test scope)
2. Run the 15 smoke tests with retry logic
3. Collect artifacts on failures
4. Generate HTML report and summary
