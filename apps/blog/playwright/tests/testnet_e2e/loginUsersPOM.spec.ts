import { test, expect } from '../../fixtures';
import { LoginHelper, users } from '../support/loginHelper';
import { HomePage } from '../support/pages/homePage';

test.describe('Login tests with users of POM by fixtures', () => {
  test('Login as denserautotest0 and denserautotest1 by fixture and pom', async ({ denserAutoTest0Page, denserAutoTest1Page }) => {
    // Open a browser window with logged in denserautotest0
    let homePage0 = new HomePage(denserAutoTest0Page.page);
    let loginHelper0 = new LoginHelper(denserAutoTest0Page.page);

    await homePage0.goto();
    await loginHelper0.validateLoggedInUser(users.denserautotest0.username)

    // Open a browser window with logged in denserautotest0
    let homePage1 = new HomePage(denserAutoTest1Page.page);
    let loginHelper1 = new LoginHelper(denserAutoTest1Page.page);

    await homePage1.goto();
    await loginHelper1.validateLoggedInUser(users.denserautotest1.username)
  });

  test('Login as denserautotest2 and denserautotest3 by fixture and pom', async ({ denserAutoTest2Page, denserAutoTest3Page }) => {
    // Open a browser window with logged in denserautotest2
    let homePage0 = new HomePage(denserAutoTest2Page.page);
    let loginHelper0 = new LoginHelper(denserAutoTest2Page.page);

    await homePage0.goto();
    await loginHelper0.validateLoggedInUser(users.denserautotest2.username)

    // Open a browser window with logged in denserautotest3
    let homePage1 = new HomePage(denserAutoTest3Page.page);
    let loginHelper1 = new LoginHelper(denserAutoTest3Page.page);

    await homePage1.goto();
    await loginHelper1.validateLoggedInUser(users.denserautotest3.username)
  });
});
