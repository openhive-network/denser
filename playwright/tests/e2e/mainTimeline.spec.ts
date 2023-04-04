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

test("filtr posts in maintimeline", async ({ page }) => {
  const homePage = new HomePage(page)

  await homePage.goto()

  await expect(homePage.getFiltrPosts).toHaveText("Trending")
  // click 'New' value of posts filter
  await homePage.getFiltrPosts.click()
  await homePage.getFilterPostsList.getByText("New").click()
  await expect(homePage.getFiltrPosts).toHaveText("New")
  // click 'Hot' value of posts filter
  await homePage.getFiltrPosts.click()
  await homePage.getFilterPostsList.getByText("Hot").click()
  await expect(homePage.getFiltrPosts).toHaveText("Hot")
  // click 'Payout' value of posts filter
  await homePage.getFiltrPosts.click()
  await homePage.getFilterPostsList.getByText("Payout").click()
  await expect(homePage.getFiltrPosts).toHaveText("Payout")
  // click 'Promoted' value of posts filter
  await homePage.getFiltrPosts.click()
  await homePage.getFilterPostsList.getByText("Promoted").click()
  await expect(homePage.getFiltrPosts).toHaveText("Promoted")
  // click 'Trending' value of posts filter
  await homePage.getFiltrPosts.click()
  await homePage.getFilterPostsList.getByText("Trending").click()
  await expect(homePage.getFiltrPosts).toHaveText("Trending")
})
