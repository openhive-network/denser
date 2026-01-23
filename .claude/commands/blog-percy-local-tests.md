# Blog Percy Visual Tests

Run the blog-percy-local-tests skill to execute Percy visual regression tests against the Denser blog application running on localhost:3000.

**Prerequisites:**
- Percy token configured in `apps/blog/.env.local`
- Blog application running on localhost:3000

Use the Skill tool to invoke the `blog-percy-local-tests` skill and follow its workflow:

1. Verify prerequisites (Percy token, blog running)
2. If blog not running, offer to start it
3. Ask user for browser mode preference (headed/headless)
4. Run 8 visual tests (4 pages × 2 themes)
5. Upload snapshots to Percy and provide build URL
