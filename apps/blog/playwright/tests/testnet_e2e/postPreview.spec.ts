import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';
import { PostEditorPage } from '../support/pages/postEditorPage';

test.describe('Post preview - tests', () => {
  let profileUserMenu: ProfileUserMenu;
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let postPage: PostPage;
  let postEditorPage: PostEditorPage;

  test.beforeEach(async ({ denserAutoTest0Page }) => {
    profileUserMenu = new ProfileUserMenu(denserAutoTest0Page.page);
    homePage = new HomePage(denserAutoTest0Page.page);
    profilePage = new ProfilePage(denserAutoTest0Page.page);
    postPage = new PostPage(denserAutoTest0Page.page);
    postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
  });

  test('Check if heading diplayed correctly', async ({ denserAutoTest0Page }) => {
    const postContentText: string = '# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4\n##### Heading 5\n###### Heading 6';


    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();
    expect(preview).toContain('<h1>Heading 1</h1>');
    expect(preview).toContain('<h2>Heading 2</h2>');
    expect(preview).toContain('<h3>Heading 3</h3>');
    expect(preview).toContain('<h4>Heading 4</h4>');
    expect(preview).toContain('<h5>Heading 5</h5>');
    expect(preview).toContain('<h6>Heading 6</h6>');
  });

  test('Check if text styles diplayed correctly', async ({ denserAutoTest0Page }) => {
    const postContentText: string = '*italic*\n**bold**\nLove**is**bold\nI just love __bold text__.\nalso _italic_\n***bold-italic***\n~~strikethrough~~\n[link](http://example.com)';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\"><em>italic</em><br>
<strong>bold</strong><br>
Love<strong>is</strong>bold<br>
I just love <strong>bold text</strong>.<br>
also <em>italic</em><br>
<strong><em>bold-italic</em></strong><br>
<del>strikethrough</del><br>
<a href=\"http://example.com\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">link</a></p>`;

    expect(preview).toContain(previewContent);
  });

});
