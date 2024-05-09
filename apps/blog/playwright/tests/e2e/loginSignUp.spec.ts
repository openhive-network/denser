import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;

  const user = {
    username: process.env.CI_TEST_USER as string,
    password: 'testtest',
    keys: [
        {
            type: 'posting',
            private: process.env.CI_TEST_USER_WIF_POSTING as string
        },
        {
            type: 'active',
            private: process.env.CI_TEST_USER_WIF_ACTIVE as string
        }
    ],
  }


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
    const loginFormDefaut = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
  })

  test('Check if after click sign up button correct modal is open', async ({page}) =>{
    await homePage.signupBtn.click()
    await page.waitForURL('https://signup.hive.io/')
    await expect(homePage.signupPageHeader).toBeVisible()
    await expect(homePage.signupPageHeader).toHaveText('Signup for Hive')
  })

  // -- Happy path for Sign in, Logout and Login
  test('Sign In to the Denser App', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(user.username);
    await loginFormDefaut.passwordInput.fill(user.password);
    await loginFormDefaut.wifInput.fill(user.keys[0].private); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(user.username);
  });

  test('Sign In and Logout to the Denser App', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(user.username);
    await loginFormDefaut.passwordInput.fill(user.password);
    await loginFormDefaut.wifInput.fill(user.keys[0].private); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(user.username);
    // Logout
    await profileMenu.logoutLink.click();
    // Validate user is logged out
    await expect(homePage.profileAvatarButton).not.toBeVisible();
    await homePage.isTrendingCommunitiesVisible();
  });

  test('Unlock user with password in the Denser App', async ({page}) =>{
    const loginForm = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginForm.usernameInput.fill(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.wifInput.fill(user.keys[0].private); // Posting Key
    await loginForm.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(user.username);
    // Logout
    await profileMenu.logoutLink.click();
    // Validate user is logged out
    await expect(homePage.profileAvatarButton).not.toBeVisible();
    await homePage.isTrendingCommunitiesVisible();
    // Unlock user with password
    await homePage.loginBtn.click();
    await loginForm.validateUnlockUserWithPasswordLoginFormIsLoaded(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.signInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(user.username);
  });

  test('Sign in with WIF', async ({page}) =>{
    const loginForm = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username in the login form
    await loginForm.usernameInput.fill(user.username);
    // Click Other sign in options button
    await loginForm.otherSignInOptionsButton.click();
    // Validate Other sign in options form with username is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    // Click Sign in with WIF
    await loginForm.signInWithWifButton.click();
    await loginForm.validateEnterYourWifKeyFormIsLoaded();
    // Type privet key of your user
    await loginForm.postingPrivateKeyInput.fill(user.keys[0].private); // type posting key
    // Click submit button
    await loginForm.postingPrivateKeySubmitButton.click();
    // Validate User is logged in
    await homePage.profileAvatarButton.click();
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(user.username);
  });

  // --

  test('Validate the other sign in options form is loaded', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Click Other sign in options button
    await loginForm.otherSignInOptionsButton.click();
    // Validate Other sign in options form is loaded in the default state
    await loginForm.validateDefaultOtherSignInOptionsFormIsLoaded();
  });

  test('Validate the other sign in options form with username is loaded', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username in the login form
    await loginForm.usernameInput.fill(user.username);
    // Click Other sign in options button
    await loginForm.otherSignInOptionsButton.click();
    // Validate Other sign in options form with username is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
  });

  test('Validate the other sign in options for wif is loaded', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username in the login form
    await loginForm.usernameInput.fill(user.username);
    // Click Other sign in options button
    await loginForm.otherSignInOptionsButton.click();
    // Validate Other sign in options form with username is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    // Click Sign in with WIF
    await loginForm.signInWithWifButton.click();
    await loginForm.validateEnterYourWifKeyFormIsLoaded();
  });

  // Account name should not be empty.   - Wrong username
  // Account name should be longer. - Wrong username
  test('Validate the error message for wrong username', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username with less then 3 characters into the username login form
    await loginForm.usernameInput.fill('ak');
    await expect(loginForm.usernameErrorMessage).toHaveText('Account name should be longer.');
    // Type empty string into the username login form
    await loginForm.usernameInput.fill('');
    await expect(loginForm.usernameErrorMessage).toHaveText('Account name should not be empty.');
  });

  // Password length should be more than 6 characters - Wrong password
  test('Validate the error message for too short password', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type Safe storage password with less then 6 characters into the password login form
    await loginForm.passwordInput.fill('ako');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    await expect(loginForm.passwordErrorMessage).toHaveText('Password length should be more than 6 characters');
    // Type empty string into the safe storage password in the login form
    await loginForm.passwordInput.fill('');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    await expect(loginForm.passwordErrorMessage).toHaveText('Password length should be more than 6 characters');
  });

  // WIF should not be empty. - Wrong WIF (needs username)
  // Invalid WIF format. - Wrong WIF (needs username)
  test('Validate the error message for wrong WIF format', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username (more than 3 chars)
    await loginForm.usernameInput.fill(user.username);
    // Type wrong WIF format to the input
    await loginForm.wifInput.fill('wrongWif');
    await expect(loginForm.wifInputErrorMessage).toHaveText('Invalid WIF format.');
    // Type empty string to the WIF input
    await loginForm.wifInput.fill('');
    await expect(loginForm.wifInputErrorMessage).toHaveText('WIF should not be empty.');
  });

  // No WIF key from user - in the other sign in options form
  test('Validate No WIF key from user in the other sign in options form', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username
    await loginForm.usernameInput.fill(user.username);
    // Move to the Other Sign in options
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    // Click Sign in with WIF
    await loginForm.signInWithWifButton.click();
    await loginForm.validateEnterYourWifKeyFormIsLoaded();
    await loginForm.closeDialog.last().click();
    // Validate other sign in options form with error message is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    await expect(loginForm.otherSignInOptionsErrorMessage).toHaveText('No WIF key from user');
  });

  // Invalid WIF checksum. - in Enter your WIF key
  test('Validate Invalid WIF checksum in the Enter your WIF form', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username
    await loginForm.usernameInput.fill(user.username);
    // Move to the Other Sign in options
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    // Click Sign in with WIF and type wrong WIF
    await loginForm.signInWithWifButton.click();
    await loginForm.validateEnterYourWifKeyFormIsLoaded();
    await loginForm.postingPrivateKeyInput.fill(user.keys[0].private + '1'); // wrong wif
    await loginForm.postingPrivateKeySubmitButton.click();
    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText('Invalid WIF checksum.');
    await loginForm.closeDialog.last().click();
    // Validate other sign in options form with error message is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    await expect(loginForm.otherSignInOptionsErrorMessage).toHaveText('No WIF key from user');
  });

  test('Check if Sign in with safe storage styles are correct in the light mode', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Default - empty Sign in with safe stroage form
    // Color and background color of the form
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'background-color')).toBe("rgb(255, 255, 255)");
    // Header color
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginFormHeader, 'color')).toBe("rgb(15, 23, 42)");
    // Description color
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginFormDescription, 'color')).toBe("rgb(100, 116, 139)");
    // Username input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameInput, 'color')).toBe("rgb(15, 23, 42)");
    // Safe storage password input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordInput, 'color')).toBe("rgb(15, 23, 42)");
    // WIF posting private key input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInput, 'color')).toBe("rgb(15, 23, 42)");
    // Save and sign in button color when disabled
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'background-color')).toBe("rgb(220, 38, 38)");
    // Other sign in options background-color and text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsButton, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsButton, 'background-color')).toBe("rgb(241, 245, 249)");
  });

  test('Check if Sign in with safe storage styles are correct in the dark mode', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Default - empty Sign in with safe stroage form
    // Color and background color of the form
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'color')).toBe("rgb(225, 231, 239)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'background-color')).toBe("rgb(3, 7, 17)");
    // Header color
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginFormHeader, 'color')).toBe("rgb(255, 255, 255)");
    // Description color
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginFormDescription, 'color')).toBe("rgb(127, 142, 163)");
    // Username input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameInput, 'color')).toBe("rgb(255, 255, 255)");
    // Safe storage password input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordInput, 'color')).toBe("rgb(255, 255, 255)");
    // WIF posting private key input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInput, 'color')).toBe("rgb(255, 255, 255)");
    // Save and sign in button color when disabled
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'background-color')).toBe("rgb(220, 38, 38)");
    // Other sign in options background-color and text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsButton, 'color')).toBe("rgb(248, 250, 252)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsButton, 'background-color')).toBe("rgb(15, 23, 42)");
  });

  test('Check if Other sign in options styles are correct in the light mode', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Move to the Other sign in options
    await loginForm.otherSignInOptionsButton.click();
    // Default - empty Other sign in options form
    // Color and background color of the form
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'background-color')).toBe("rgb(255, 255, 255)");
    // Header color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsHeader, 'color')).toBe("rgb(15, 23, 42)");
    // Description color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsDescription, 'color')).toBe("rgb(100, 116, 139)");
    // Username input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsUsernameInput, 'color')).toBe("rgb(15, 23, 42)");
    // Keychain Extension Button Color
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveKeychainExtensionButton, 'color')).toBe("rgb(15, 23, 42)");
    // WIF button color
    expect(await homePage.getElementCssPropertyValue(await loginForm.signInWithWifButton, 'color')).toBe("rgb(15, 23, 42)");
    // HiveAuth button
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveAuthButton, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveAuthButton, 'background-color')).toBe("rgba(0, 0, 0, 0)");
    // HiveSigner button
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveSignerButton, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveSignerButton, 'background-color')).toBe("rgba(0, 0, 0, 0)");
  });

  test('Check if Other sign in options styles are correct in the dark mode', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Move to the Other sign in options
    await loginForm.otherSignInOptionsButton.click();
    // Default - empty Other sign in options form
    // Color and background color of the form
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'color')).toBe("rgb(225, 231, 239)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.loginDialog, 'background-color')).toBe("rgb(3, 7, 17)");
    // Header color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsHeader, 'color')).toBe("rgb(255, 255, 255)");
    // Description color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsDescription, 'color')).toBe("rgb(127, 142, 163)");
    // Username input text color
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsUsernameInput, 'color')).toBe("rgb(255, 255, 255)");
    // Keychain Extension Button Color
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveKeychainExtensionButton, 'color')).toBe("rgb(255, 255, 255)");
    // WIF button color
    expect(await homePage.getElementCssPropertyValue(await loginForm.signInWithWifButton, 'color')).toBe("rgb(255, 255, 255)");
    // HiveAuth button
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveAuthButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveAuthButton, 'background-color')).toBe("rgba(0, 0, 0, 0)");
    // HiveSigner button
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveSignerButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.hiveSignerButton, 'background-color')).toBe("rgba(0, 0, 0, 0)");
  });


  test('Validate styles in the error message for wrong username in the light mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username with less then 3 characters into the username login form
    await loginForm.usernameInput.fill('ak');
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
    // Type empty string into the username login form
    await loginForm.usernameInput.fill('');
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
  });

  test('Validate styles in the error message for too short password in the light mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type Safe storage password with less then 6 characters into the password login form
    await loginForm.passwordInput.fill('ako');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
    // Type empty string into the safe storage password in the login form
    await loginForm.passwordInput.fill('');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
  });

  test('Validate styles in the error message for wrong WIF format in the light mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username (more than 3 chars)
    await loginForm.usernameInput.fill(user.username);
    // Type wrong WIF format to the input
    await loginForm.wifInput.fill('wrongWif');
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInputErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
    // Type empty string to the WIF input
    await loginForm.wifInput.fill('');
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInputErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
  });

  test('Validate styles in the error message for wrong username in the dark mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username with less then 3 characters into the username login form
    await loginForm.usernameInput.fill('ak');
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
    // Type empty string into the username login form
    await loginForm.usernameInput.fill('');
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
  });

  test('Validate styles in the error message for too short password in the dark mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type Safe storage password with less then 6 characters into the password login form
    await loginForm.passwordInput.fill('ako');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
    // Type empty string into the safe storage password in the login form
    await loginForm.passwordInput.fill('');
    await loginForm.page.waitForSelector(loginForm.passwordErrorMessage['_selector']);
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
  });

  test('Validate styles in the error message for wrong WIF format in the dark mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username (more than 3 chars)
    await loginForm.usernameInput.fill(user.username);
    // Type wrong WIF format to the input
    await loginForm.wifInput.fill('wrongWif');
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInputErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
    // Type empty string to the WIF input
    await loginForm.wifInput.fill('');
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInputErrorMessage, 'color')).toBe("rgb(129, 29, 29)");
  });

  test('Validate styles of the Invalid WIF checksum in the Enter your WIF form in the light mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Type username
    await loginForm.usernameInput.fill(user.username);
    // Move to the Other Sign in options
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    // Click Sign in with WIF and type wrong WIF
    await loginForm.signInWithWifButton.click();
    await loginForm.validateEnterYourWifKeyFormIsLoaded();
    await loginForm.postingPrivateKeyInput.fill(user.keys[0].private + '1'); // wrong wif
    await loginForm.postingPrivateKeySubmitButton.click();
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordErrorMessageEnterYourWifKey, 'color')).toBe("rgb(239, 68, 68)");
    await loginForm.closeDialog.last().click();
    // Validate other sign in options form with error message is loaded
    await loginForm.validateOtherSignInOptionsFormWithUsernameIsLoaded(user.username);
    expect(await homePage.getElementCssPropertyValue(await loginForm.otherSignInOptionsErrorMessage, 'color')).toBe("rgb(255, 0, 0)");
  });

  test('Validate styles during Unlock user with password in the Denser App in the light mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginForm.usernameInput.fill(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.wifInput.fill(user.keys[0].private); // Posting Key
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameInput, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordInput, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInput, 'color')).toBe("rgb(15, 23, 42)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'background-color')).toBe("rgb(220, 38, 38)");
  });

  test('Validate styles during Unlock user with password in the Denser App in the dark mode', async ({page}) =>{
    const loginForm = new LoginForm(page);

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.loginBtn.click()
    await loginForm.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginForm.usernameInput.fill(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.wifInput.fill(user.keys[0].private); // Posting Key
    expect(await homePage.getElementCssPropertyValue(await loginForm.usernameInput, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.passwordInput, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.wifInput, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'color')).toBe("rgb(255, 255, 255)");
    expect(await homePage.getElementCssPropertyValue(await loginForm.saveSignInButton, 'background-color')).toBe("rgb(220, 38, 38)");
  });
});
