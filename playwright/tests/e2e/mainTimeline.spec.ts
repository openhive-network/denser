import exp from "constants"
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

test.only("move to the dark mode and back to the light mode", async ({
  page,
}) => {
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
