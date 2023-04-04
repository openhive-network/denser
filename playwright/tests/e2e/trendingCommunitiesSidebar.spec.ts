import { test, expect } from "@playwright/test"

import { HomePage } from "../support/pages/homePage"
import { CommunitiesPage } from "../support/pages/communitiesPage"

test('has "Trending Communities" sidebar', async ({ page }) => {
  const homePage = new HomePage(page)

  await homePage.goto()
  await homePage.isTrendingCommunitiesVisible()
})

test('move from one community to other community and home page next', async ({page}) => {
  const homePage = new HomePage(page)

  await homePage.goto()
  // move from HomePage to LeoFinance community
  await homePage.moveToLeoFinanceCommunities()
  await homePage.moveToPinmappleCommunities()
  // move from Pinmapple to Home page
  await homePage.moveToHomePage()
})

test('move to Explore communities... from Home Page', async ({page})=> {
  const homePage = new HomePage(page);
  const communitiesPage = new CommunitiesPage(page)

  await homePage.goto()
  await homePage.getExploreCommunities.click();
  await communitiesPage.validataCommunitiesPageIsLoaded();
})
