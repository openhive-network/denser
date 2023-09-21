import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;
  
  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);

    await homePage.goto();
  });

  test('Check if login and sign up buttons are displayed correctly - light mode', async ({ page }) => {
    await expect(homePage.loginBtn).toBeVisible()
    expect(await homePage.getElementCssPropertyValue(homePage.loginBtn, 'color')).toBe("rgb(15, 23, 42)");
    await expect(homePage.loginBtn).toHaveText("Login")
    await homePage.loginBtn.hover()
    await page.waitForTimeout(500)
    expect(await homePage.getElementCssPropertyValue(homePage.loginBtn, 'color')).toBe("rgb(239, 68, 68)");


    await expect(homePage.signupBtn).toBeVisible()
    expect(await homePage.getElementCssPropertyValue(homePage.signupBtn, 'color')).toBe("rgb(255, 255, 255)");
    await expect(homePage.signupBtn).toHaveText("Sign up")
    await homePage.signupBtn.hover()
    await page.waitForTimeout(500)
    expect(await homePage.getElementCssPropertyValue(homePage.signupBtn, 'background-color')).toBe("rgb(220, 38, 38)");
  });

  test('Check if login and sign up buttons are displayed correctly - dark mode', async ({ page }) => {
    await homePage.changeThemeMode("Dark")
    await expect(homePage.loginBtn).toBeVisible()
    // expect(await homePage.getElementCssPropertyValue(homePage.loginBtn, 'color')).toBe("rgb(52, 60, 77)");
    await expect(homePage.loginBtn).toHaveText("Login")
    await homePage.loginBtn.hover()
    await page.waitForTimeout(500)
    expect(await homePage.getElementCssPropertyValue(homePage.loginBtn, 'color')).toBe("rgb(239, 68, 68)");


    await expect(homePage.signupBtn).toBeVisible()
    expect(await homePage.getElementCssPropertyValue(homePage.signupBtn, 'color')).toBe("rgb(255, 255, 255)");
    await expect(homePage.signupBtn).toHaveText("Sign up")
    await homePage.signupBtn.hover()
    await page.waitForTimeout(500)
    expect(await homePage.getElementCssPropertyValue(homePage.signupBtn, 'background-color')).toBe("rgb(220, 38, 38)");
    await homePage.changeThemeMode("Light")
  });

  test('Check if after click login button correct modal is open', async ({page}) =>{
    await homePage.loginBtn.click()
    await expect(homePage.loginModal).toBeVisible()
    await expect(homePage.loginModalHeader).toHaveText("Returning Users: Login to Vote")
    await expect(homePage.loginModalUsernameInput).toBeVisible()
    await expect(homePage.loginModalPasswordInput).toBeVisible()
    await expect(homePage.loginModalHiveAuthText).toBeVisible()
    await expect(homePage.loginModalKeepLoggedInText).toBeVisible()
    await expect(page.getByRole('button', {name: "Sign in"})).toBeVisible()
    await expect(page.getByRole('button', {name: "Cancel"})).toBeVisible()
    await expect(homePage.hivsignerBtn).toBeVisible()
  })

  test('Check if after click sign up button correct modal is open', async ({page}) =>{
    await homePage.signupBtn.click()
    await page.waitForURL('https://signup.hive.io/')
    await expect(homePage.signupPageHeader).toBeVisible()
    await expect(homePage.signupPageHeader).toHaveText('Signup for Hive')
  })
})