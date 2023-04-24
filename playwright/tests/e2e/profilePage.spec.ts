import { expect, test } from "@playwright/test"
import { HomePage } from "../support/pages/homePage"
import { ProfilePage } from "../support/pages/profilePage"

test.describe("Profile page of @gtg", () => {
  test("url of the profile page @gtg is correct", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg$/)
  })

  test("profile info of @gtg is loaded", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileInfoIsVisible(
      "@gtg",
      "Gandalf the Grey",
      "IT Wizard, Hive Witness",
      "Joined June 2016"
    )
  })

  test("profile navigation of @gtg is loaded", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileNavigationIsVisible()
  })

  test("profile feed tab of @gtg is loaded", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileFeedTabIsSelected()
  })

  test("move to Posts Tab", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profilePostsTabIsNotSelected()
    await profilePage.moveToPostsTab()
  })

  test("move to Replies Tab", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileRepliesTabIsNotSelected()
    await profilePage.moveToRepliesTab()
  })

  test("move to Social Tab", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileSocialTabIsNotSelected()
    await profilePage.moveToSocialTab()
  })

  test("move to Peakd by link in Social Tab",async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileSocialTabIsNotSelected()
    await profilePage.moveToSocialTab()
    await profilePage.moveToPeakdByLinkInSocialTab()
  })

  test("move to Hivebuzz by link in Social Tab",async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileSocialTabIsNotSelected()
    await profilePage.moveToSocialTab()
    await profilePage.moveToHivebuzzByLinkInSocialTab()
  })

  test("move to Notifications Tab", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileNotificationsTabIsNotSelected()
    await profilePage.moveToNotificationsTab()
  })

  test("move to Wallet Page", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.moveToWalletPage()
  })

  test("move to Settings Tab", async ({ page }) => {
    const profilePage = new ProfilePage(page)

    await profilePage.gotoProfilePage("@gtg")
    await profilePage.profileSettingsTabIsNotSelected()
    await profilePage.moveToSettingsTab()
  })

  test("The Follow button changes color when you hover over it (Light theme)", async ({
    page,
  }) => {
    const profilePage = new ProfilePage(page)
    await profilePage.gotoProfilePage("@gtg")

    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "color"
      )
    ).toBe("rgb(220, 38, 38)")
    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "background-color"
      )
    ).toBe("rgba(0, 0, 0, 0)")

    await profilePage.followButton.hover()
    await profilePage.page.waitForTimeout(1000)

    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "color"
      )
    ).toBe("rgb(255, 255, 255)")
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.followButton,
        "background-color"
      )
    ).toBe("rgb(239, 68, 68)")
  })

  test("The Follow button changes color when you hover over it (Dark theme)", async ({
    page,
  }) => {
    const profilePage = new ProfilePage(page)
    const homePage = new HomePage(page)

    await profilePage.gotoProfilePage("@gtg")

    await homePage.changeThemeMode("Dark")
    await homePage.validateThemeModeIsDark()

    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "color"
      )
    ).toBe("rgb(220, 38, 38)")
    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "background-color"
      )
    ).toBe("rgba(0, 0, 0, 0)")

    await profilePage.followButton.hover()
    await profilePage.page.waitForTimeout(1000)

    expect(
      await profilePage.getElementCssPropertyValue(
        profilePage.followButton,
        "color"
      )
    ).toBe("rgb(220, 38, 38)")
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.followButton,
        "background-color"
      )
    ).toBe("rgb(239, 68, 68)")
  })
})
