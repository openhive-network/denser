import { expect, test } from "@playwright/test"

import { HomePage } from "../support/pages/homePage"

test("has the main timeline of posts (20 posts are displayed by default)", async ({
  page,
}) => {
  const homePage = new HomePage(page)

  await homePage.goto()
  await homePage.mainPostsTimelineVisible()
})

test.only("validate the first post (on Trending filter)", async ({page, request}) => {
  const homePage = new HomePage(page)
  await homePage.goto()

  const url = process.env.NEXT_PUBLIC_API_NODE_ENDPOINT
  console.log("5555 ", process.env.NEXT_PUBLIC_API_NODE_ENDPOINT)

  //const response = await request.post('https://api.hive.blog/', {
  const response = await request.post(`https://${url}/`, {
    data: {
      id:0,
      jsonrpc:"2.0",
      method:"bridge.get_ranked_posts",
      params:{sort:"trending",
              start_author:"",
              start_permlink:"",
              limit:20,
              tag:"",
              observer:""}
    },
    headers: {
      'Accept': 'application/json, text/plain, */*'
    }
  })

  // console.log((await response.json()).result[0])
  const postAuthor = (await response.json()).result[0].author
  // console.log("Post author: ", await postAuthor)
  const postAuthorReputation = (await response.json()).result[0].author_reputation.toFixed()
  // console.log("Post author reputation: ", await postAuthorReputation)
  const postTitle = (await response.json()).result[0].title
  // console.log("Post title: ", await postTitle)
  const postPayout = (await response.json()).result[0].payout.toFixed(2)
  // console.log("Post payout: ", await postPayout)
  const postTotalVotes = (await response.json()).result[0].stats.total_votes
  // console.log("Post total votes: ", await postTotalVotes)
  const postChildren = (await response.json()).result[0].children
  // console.log("Responses to post : ", await postChildren)

  expect(homePage.getFirstPostAuthor).toHaveText('@' + postAuthor)
  expect(homePage.getFirstPostAuthorReputation).toHaveText('@' + postAuthor + ' (' + postAuthorReputation + ')')
  expect(homePage.getFirstPostTitle).toHaveText(postTitle)
  expect(homePage.getFirstPostPayout).toHaveText(postPayout)

  const firstPostTotalVotes = (await homePage.getFirstPostVotes.allInnerTexts()).at(0)
  expect(firstPostTotalVotes).toBe(String(postTotalVotes))

  const firstPostChildren = (await homePage.getFirstPostChildren.allInnerTexts()).at(0)
  expect(firstPostChildren).toBe(String(postChildren))
})

test("move to the first post author profile page", async ({ page }) => {
  const homePage = new HomePage(page)

  await homePage.goto()
  await homePage.moveToFirstPostAuthorProfilePage()
})

test("move to the dark mode and back to the light mode", async ({ page }) => {
  const homePage = new HomePage(page)

  await homePage.goto()

  await homePage.validateThemeModeIsLight()
  await homePage.changeThemeMode("Dark")
  await homePage.validateThemeModeIsDark()
  await homePage.changeThemeMode("Light")
  await homePage.validateThemeModeIsLight()
  await homePage.changeThemeMode("Dark")
  await homePage.validateThemeModeIsDark()
  await homePage.changeThemeMode("System")
  await homePage.validateThemeModeIsSystem()
})

test("filtr posts in maintimeline", async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Automatic test works well on chromium');

  const newContext = await browser.newContext()
  const newPage = await newContext.newPage()
  const homePage = new HomePage(newPage)

  await homePage.goto()

  await expect(homePage.getFilterPosts).toHaveText("Trending")
  // click 'New' value of posts filter
  await homePage.getFilterPosts.click()
  await homePage.getFilterPostsList.getByText("New").locator('..').waitFor()
  await homePage.getFilterPostsList.getByText("New").locator('..').click()
  await expect(homePage.getFilterPosts).toHaveText("New")
  // // click 'Hot' value of posts filter
  await homePage.getFilterPosts.click()
  await homePage.getFilterPostsList.getByText("Hot").click()
  await expect(homePage.getFilterPosts).toHaveText("Hot")
  // click 'Payout' value of posts filter
  await homePage.getFilterPosts.click()
  await homePage.getFilterPostsList.getByText("Payout").click()
  await expect(homePage.getFilterPosts).toHaveText("Payout")
  // click 'Promoted' value of posts filter
  await homePage.getFilterPosts.click()
  await homePage.getFilterPostsList.getByText("Promoted").click()
  await expect(homePage.getFilterPosts).toHaveText("Promoted")
  // click 'Trending' value of posts filter
  await homePage.getFilterPosts.click()
  await homePage.getFilterPostsList.getByText("Trending").click()
  await expect(homePage.getFilterPosts).toHaveText("Trending")
})
