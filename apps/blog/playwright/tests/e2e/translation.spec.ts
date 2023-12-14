import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommentViewPage } from '../support/pages/commentViewPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { WitnessPage } from '../support/pages/witnessesPage';
import { WalletPage } from "../../../../wallet/playwright/tests/support/pages/walletPage";

test.describe.only('Translation tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;
  let commentViewPage: CommentViewPage;
  let communitiesPage: CommunitiesPage;
  let witnessPage: WitnessPage;
  let walletPage: WalletPage;

  test.beforeEach(async ({ page, browserName }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
    commentViewPage = new CommentViewPage(page);
    communitiesPage = new CommunitiesPage(page);
    witnessPage = new WitnessPage(page)
    walletPage = new WalletPage(page);
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
  });

  test('Check if user can change language', async ({page}) =>{
    await homePage.goto();
    await expect(homePage.toggleLanguage).toBeVisible()
    await homePage.toggleLanguage.click()
    await homePage.page.waitForSelector(homePage.languageMenu['_selector'])
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()

    const postsTabText = await homePage.getNavPostsLink.textContent()
    const proposalsTabText = await homePage.getNavProposalsLink.textContent()
    const witnessesTabText = await homePage.getNavWitnessesLink.textContent()
    const dappsTabText = await homePage.getNavOurdAppsLink.textContent()

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible()
    await expect(postsTabText).toBe('Posty')
    await expect(proposalsTabText).toBe('Propozycje')
    await expect(witnessesTabText).toBe('Delegaci')
    await expect(dappsTabText).toBe('Nasze dApps')
  });

  test('Profile page - user info', async ({page}) =>{

    const tabs = [
      'Blog',
      'Posty',
      'Odpowiedzi',
      'Społecznościowe',
      'Powiadomienia'
    ]
    await homePage.goto();
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible()
    await homePage.getFirstPostAuthor.click()
    await expect(profilePage.profileInfo).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(profilePage.profileInfo).toBeVisible()

    await expect(page.getByRole('link', { name: 'Liczba obserwujących:' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Liczba obserwujących:' })).toContainText('Liczba obserwujących:')
    await expect(page.getByRole('link', { name: 'Liczba wpisów:' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Liczba wpisów:' })).toContainText('Liczba wpisów:')
    await expect(page.getByRole('link', { name: 'Liczba obserwowanych:' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Liczba obserwowanych:' })).toContainText('Liczba obserwowanych:' )
    await expect(page.getByRole('link', { name: 'Użytkownicy na Czarnej Liście' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Użytkownicy na Czarnej Liście' })).toContainText('Użytkownicy na Czarnej Liście')
    await expect(page.getByRole('link', { name: 'Wyciszeni użytkownicy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Wyciszeni użytkownicy' })).toContainText('Wyciszeni użytkownicy' )
    await expect(page.getByRole('link', { name: 'Obserwowane Czarne Listy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Obserwowane Czarne Listy' })).toContainText('Obserwowane Czarne Listy' )
    await expect(page.getByRole('link', { name: 'Obserwowane Wyciszone Listy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Obserwowane Wyciszone Listy' })).toContainText('Obserwowane Wyciszone Listy' )

    await expect(page.getByRole('button', { name: 'Obserwuj' })).toContainText('Obserwuj' )
    await expect(page.getByRole('link', { name: 'Portfel' })).toContainText('Portfel' )

    const profileNavigation = await page.$$('[data-testid="profile-navigation"] ul:first-child li a');

    for (let i = 0; i < profileNavigation.length; i++) {
    const el = profileNavigation[i];
    const TabText = await el.textContent();

    await expect(TabText).toEqual(tabs[i]);
}
  })

  test('Profile page - posts tab', async ({page}) =>{

    const tabs = [
      'Posty',
      'Komentarze',
      'Wynagrodzenia',
    ]

    await homePage.goto();
    await homePage.getFirstPostAuthor.click()
    await profilePage.profilePostsLink.click()
    await expect(postPage.userPostMenu).toBeVisible()
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(postPage.userPostMenu).toBeVisible()
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible()

    const userPostMenu = await page.$$('[role="tab"]');

    for (let i = 0; i < userPostMenu.length; i++) {
    const el = userPostMenu[i];
    const TabText = await el.textContent();

    await expect(TabText).toEqual(tabs[i]);
}
  })

  test.skip('Profile page - social tab', async ({page}) =>{
    await homePage.goto();
    await homePage.getFirstPostAuthor.click()
    await profilePage.profileSocialLink.click()
    await expect(profilePage.socialCommunitySubscriptionsLabel).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(profilePage.socialCommunitySubscriptionsLabel).toBeVisible()
    await expect(profilePage.socialCommunitySubscriptionsLabel).toHaveText('Subskrypcje społeczności')
    await expect(profilePage.socialCommunitySubscriptionsDescription).toHaveText('Autor zasubskrybował poniższe Społeczności Hive')
    await expect(profilePage.socialBadgesAchivementsLabel).toHaveText('Odznaki i osiągnięcia')
    await expect(profilePage.socialBadgesAchivementsDescription).toContainText('Są to odznaki otrzymane przez autora za pośrednictwem zewnętrznych aplikacji')
  })

  test('Profile page - notifications tab', async ({page}) =>{

    const tabs = [
      'Wszystkie',
      'Odpowiedzi',
      'Wzmianki',
      'Obserwacje',
      'Głosy za',
      'Reblogi',
    ]
    await homePage.goto();
    await homePage.getFirstPostAuthor.click()
    await profilePage.profileNotificationsLink.click()
    await expect(profilePage.notificationsMenu).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(profilePage.notificationsMenu).toBeVisible()

    const notificationsMenu = await page.$$('[role="tab"]');

    for (let i = 0; i < notificationsMenu.length; i++) {
    const el = notificationsMenu[i];
    const TabText = await el.textContent();

    await expect(TabText).toEqual(tabs[i]);
}
  })

  // test('Wallet page', async({page}) =>{
  //   await page.goto('http://localhost:4000/@gtg/transfers')
  //   await expect(page.locator('.container.p-0').last()).toBeVisible()
  //   await homePage.toggleLanguage.click()
  //   await expect(homePage.languageMenu).toBeVisible()
  //   await page.getByRole('menuitem', { name: 'pl' }).click()
  //   await expect(page.locator('.container.p-0').last()).toBeVisible()
  //   await expect(page.getByTestId('wallet-balances-link')).toHaveText('Salda')
  //   await expect(page.getByRole('link', { name: 'Delegacje' })).toBeVisible()
  //   await expect(page.getByTestId('wallet-hive-description')).toHaveText('Zbywalne tokeny, które mogą być przesłane gdziekolwiek w dowolnym momencie. HIVE mogą zostać również przekonwertowane na HIVE POWER w procesie nazywanym zwiększenie mocy.')
  //   await expect(page.getByTestId('wallet-hive-power-description')).toContainText('Tokeny wpływu, które zwiększają Twój wpływ na podział wypłat za publikowanie treści, oraz pozwalają Ci zarabiać na głosowaniu na treści. Część z Twoich jednostek wpływu HIVE POWER jest Ci oddelegowana. Delegowanie jednostek to czasowe użyczenie dla zwiększenia wpływu lub by pomóc nowym użytkownikom platformy w korzystaniu ze Hive. Kwota oddelegowanych jednostek może się zmieniać w czasie. ')
  //   await expect(page.getByTestId('wallet-account-history-description')).toContainText('Uważaj na spam i linki phishingowe w notatkach transakcji. Nie otwieraj linków od użytkowników, którym nie ufasz. Nie udostępniaj swoich kluczy prywatnych żadnym stronom internetowym osób trzecich. Transakcje nie zostaną wyświetlone, dopóki nie zostaną potwierdzone w blockchain, co może zająć kilka minut.')
  // })

  test('Community page', async ({page}) =>{
    await homePage.goto();
    await homePage.getLeoFinanceCommunitiesLink.click()
    await expect(homePage.getHeaderLeoCommunities).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await homePage.page.waitForSelector(homePage.getHeaderLeoCommunities['_selector']);
    await expect(homePage.getHeaderLeoCommunities).toBeVisible()
    await expect(await page.locator('[data-testid="community-name-unmoderated"]').textContent()).toBe('Społeczność')
    await expect(await communitiesPage.communitySubscribeButton.textContent()).toBe('Subskrybuj')
    await expect(await communitiesPage.communityNewPostButton.textContent()).toBe('Nowy post')
  })

  // test('Witnesses page', async ({page}) =>{
  //   await page.goto('http://localhost:4000/~witnesses')
  //   await expect(witnessPage.witnessHeaderTitle).toBeVisible()
  //   await homePage.toggleLanguage.click()
  //   await expect(homePage.languageMenu).toBeVisible()
  //   await page.getByRole('menuitem', { name: 'pl' }).click()
  //   await expect(witnessPage.witnessHeaderTitle).toBeVisible()
  //   await expect(await witnessPage.witnessHeaderTitle.textContent()).toBe('Głosowanie na delegatów')
  //   await expect(await witnessPage.witnessHeaderDescription.textContent()).toBe(
  //   'Na poniższej liście znajduje sie 100 pierwszych delegatów, aktywnych jak również nieaktywnych. Każdy delegat powyżej 100 pozycji jest filtrowany i nie wyświetlany jeśli nie wyprodukował bloku w ostatnich 30 dniach.')
  //   await expect(page.getByRole('button', { name: 'Zagłosuj' })).toBeVisible()
  //   await expect(page.getByRole('button', { name: 'Ustaw pełnomocnika' })).toBeVisible()
  // })

  test('Post page', async ({page}) =>{
    await homePage.goto();
    await homePage.getFirstPostTitle.click()
    await expect(postPage.articleTitle).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(postPage.articleTitle).toBeVisible()
    await expect(await postPage.articleAuthorData.textContent()).toContain('temu')
    await expect(await postPage.commentReplay.textContent()).toBe('Odpowiedz')

    await postPage.commentCardsFooterReply.first().click()
    await expect(postPage.commentCardsFooterReplyEditor).toBeVisible()
    await expect(page.getByPlaceholder("Odpowiedz")).toBeVisible()
    await expect(page.getByText('Wstaw obrazy, przeciągając i upuszczając, wklejając ze schowka lub za pomocą wyb')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anuluj' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wyślij' })).toBeVisible()

    await postPage.getCommentFilter.click()
    await expect(await postPage.getCommentFilterList.getByText('Popularność')).toBeVisible()
    await expect(await postPage.getCommentFilterList.getByText('Liczba głosów')).toBeVisible()
    await expect(await postPage.getCommentFilterList.getByText('Wiek')).toBeVisible()

  })

  test('User hover card', async ({page}) =>{
    await homePage.goto();
    await homePage.getFirstPostTitle.click()
    await expect(postPage.articleTitle).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await expect(postPage.articleTitle).toBeVisible()
    await postPage.articleAuthorName.hover()
    await expect(await postPage.userHoverCardFollowButton.textContent()).toBe('Obserwuj')
    await expect(await postPage.userFollowingHoverCard.textContent()).toContain('Obserwowani')
    await expect(await postPage.userFollowersHoverCard.textContent()).toContain('Obserwujący')
  })

  test('Home page', async ({page}) =>{
    await homePage.goto();
    await expect(homePage.getFirstPostTitle).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await homePage.page.waitForSelector(homePage.getTrendingCommunitiesSideBar['_selector'])
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible()
    await expect(page.getByRole('link', { name: 'Wszystkie posty' })).toBeVisible()
    await expect(page.getByText('Popularne Społeczności')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pokaż więcej społeczności...' })).toBeVisible()
    await expect(await page.getByTestId('community-name').textContent()).toBe('Wszystkie posty')

    await expect(await homePage.loginBtn.textContent()).toBe('Zaloguj się')
    await expect(await homePage.signupBtn.textContent()).toBe('Zapisz się')

    await homePage.loginBtn.click()
    await expect(page.getByRole('heading', { name: 'Logowanie' })).toBeVisible()
    await expect(page.getByPlaceholder('Podaj nazwę użytkownika')).toBeVisible()
    await expect(page.getByPlaceholder('Hasło lub WIF')).toBeVisible()
    await expect(page.getByRole('button', {name: 'Zaloguj się'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Wyczyść formularz'})).toBeVisible()
    await page.getByTestId('close-dialog').click()

    await homePage.themeMode.click()
    await expect(page.getByRole('menuitem', { name: 'Tryb jasny' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Tryb ciemny' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Domyślny z systemu' })).toBeVisible()
    await homePage.themeMode.click({force:true})

    await homePage.getFilterPosts.click()
    await expect(page.locator('div').filter({ hasText: 'PopularneNa czasieNoweWynagrodzeniaWyciszone' }).nth(2)).toBeVisible()
  })

  test('Navigation - right side', async ({page,browserName}) =>{
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');
    const menuElements = [
      'Witaj',
      'FAQ',
      'Block Explorer',
      'Odzyskiwanie skradzionego konta',
      'Zmiana hasła konta',
      'Głosuj na delegatów',
      'Hive, Propozycje',
      'OpenHive Czat ',
      'Dokumentacja Hive API ',
      'Oficjalna księga Hive ',
      'Polityka prywatności',
      'Warunki korzystania z usługi'

    ]
    await homePage.goto();
    await expect(homePage.getFirstPostTitle).toBeVisible()
    await homePage.toggleLanguage.click()
    await expect(homePage.languageMenu.first()).toBeVisible()
    await homePage.languageMenuPl.click()
    await homePage.page.waitForTimeout(3000)
    await expect(homePage.getNavSidebarMenu).toBeVisible()
    await homePage.getNavSidebarMenu.click()
    await homePage.page.waitForSelector(homePage.getNavSidebarMenuContent['_selector'])
    await expect(homePage.getNavSidebarMenuContent).toBeVisible()
    // li.text-foreground
    const menuItems = await page.$$('li.text-foreground');

    for (let i = 0; i < menuItems.length; i++) {
    const el = menuItems[i];
    const TabText = await el.textContent();

    await expect(TabText).toEqual(menuElements[i]);
}
  });
});
