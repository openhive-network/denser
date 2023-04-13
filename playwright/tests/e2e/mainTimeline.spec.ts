import { expect, test } from "@playwright/test"

import { HomePage } from "../support/pages/homePage"

test("has the main timeline of posts (20 posts are displayed by default)", async ({
  page,
}) => {
  const homePage = new HomePage(page)

  await homePage.goto()
  await homePage.mainPostsTimelineVisible()
})

test("move tho the first post author profile page", async ({ page }) => {
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
