# MR Test Cases Generator

Generate test cases for Merge Request changes by analyzing the diff between the MR branch and develop.

**Input options:**
- Current branch (default)
- Branch name: `gandalf/comment-pagination`
- MR number: `!123` or `123`
- GitLab MR URL: `https://gitlab.syncad.com/hive/denser/-/merge_requests/123`

Use the Skill tool to invoke the `mr-test-cases` skill with optional argument: $ARGUMENTS

The skill will:
1. Fetch branch information and diff from git or GitLab API
2. Analyze changed files and identify affected areas
3. Generate prioritized test cases (P0-P4)
4. Create markdown report with test approach and commands to run
