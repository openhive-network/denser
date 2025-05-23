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

  test('Check if lists are diplayed correctly', async ({ denserAutoTest0Page }) => {
    const postContentText: string = 'Lists:\n- Milk\n- Bread\n  - Wholegrain\n- Butter\n\n1. Tidy the kitchen\n2. Prepare ingredients\n3. Cook delicious things';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">Lists:</p>
<ul>
<li>Milk</li>
<li>Bread
<ul>
<li>Wholegrain</li>
</ul></li>
<li>Butter</li>
</ul>
<ol>
<li>Tidy the kitchen</li>
<li>Prepare ingredients</li>
<li>Cook delicious things</li>
</ol>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if images are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `![hive logo](https://cryptologos.cc/logos/hive-blockchain-hive-logo.png?v=035)

![sample image](https://usermedia.actifit.io/9246fa02-cdf0-424f-b1e8-634b1c209042)

<img src="https://images.hive.blog/0x0/https://pixabay.com/get/ga1c244ce6431365a20f00107112a940f237bebf510518ff4bbb105240cdb24f3c9a3032fe29f21cbea57dbaf288ca28e2fe12f6831f2f8ff1481531c13c58a96_640.jpg">`;


    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\"><img src=\"https://images.hive.blog/1536x0/https://cryptologos.cc/logos/hive-blockchain-hive-logo.png?v=035\" alt=\"hive logo\"></p>
<p class=\"my-0\"><img src=\"https://images.hive.blog/1536x0/https://usermedia.actifit.io/9246fa02-cdf0-424f-b1e8-634b1c209042\" alt=\"sample image\"></p>
<p class=\"my-0\"><img src=\"https://images.hive.blog/0x0/https://pixabay.com/get/ga1c244ce6431365a20f00107112a940f237bebf510518ff4bbb105240cdb24f3c9a3032fe29f21cbea57dbaf288ca28e2fe12f6831f2f8ff1481531c13c58a96_640.jpg\"></p>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if blockquote are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `blockquote:
> To be or not to be, that is the question.

Multi-paragraph blockquote:
> Dorothy followed her through many of the beautiful rooms in her castle.
>
> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.

Nested blockquote:
> Dorothy followed her through many of the beautiful rooms in her castle.
>
>> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.

Complex blockquote:
> #### The quarterly results look great!
>
> - Revenue was off the chart.
> - Profits were higher than ever.
>
>  *Everything* is going according to **plan**.`;



    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">blockquote:</p>
<blockquote>
<p class=\"my-0\">To be or not to be, that is the question.</p>
</blockquote>
<p class=\"my-0\">Multi-paragraph blockquote:</p>
<blockquote>
<p class=\"my-0\">Dorothy followed her through many of the beautiful rooms in her castle.</p>
<p class=\"my-0\">The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.</p>
</blockquote>
<p class=\"my-0\">Nested blockquote:</p>
<blockquote>
<p class=\"my-0\">Dorothy followed her through many of the beautiful rooms in her castle.</p>
<blockquote>
<p class=\"my-0\">The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.</p>
</blockquote>
</blockquote>
<p class=\"my-0\">Complex blockquote:</p>
<blockquote>
<h4>The quarterly results look great!</h4>
<ul>
<li>Revenue was off the chart.</li>
<li>Profits were higher than ever.</li>
</ul>
<p class=\"my-0\"><em>Everything</em> is going according to <strong>plan</strong>.</p>
</blockquote>
`

    expect(preview).toContain(previewContent);
  });

  test('Check if tables are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `Table

One   | Two   | Three
------|-------|------
four  | five  | six
seven | eight | nine

sample code:
At the command prompt, type \`nano\`.`;



    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">Table</p>
<div style=\"overflow-x: auto; width: 100%; display: block;\"><table>
<thead>
<tr><th>One</th><th>Two</th><th>Three</th></tr>
</thead>
<tbody>
<tr><td>four</td><td>five</td><td>six</td></tr>
<tr><td>seven</td><td>eight</td><td>nine</td></tr>
</tbody>
</table></div>
<p class=\"my-0\">sample code:<br>
At the command prompt, type <code>nano</code>.</p>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if html code is diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `Use \`code\` in your Markdown file.

    <html>
      <head>
      </head>
    </html>`;



    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">Use <code>code</code> in your Markdown file.</p>
<pre><code>&lt;html&gt;
  &lt;head&gt;
  &lt;/head&gt;
&lt;/html&gt;</code></pre>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if Links/Emails are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `Links/Emails:
<https://www.markdownguide.org>
<fake@example.com>

[link1](https://www.example.com/my%20great%20page)

<a href="https://www.example.com/my great page">link2</a>

X/Twitter:
[X link](https://x.com/ShouldHaveCat/status/1889804218132832323)`;


    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">Links/Emails:<br>
<a href=\"https://www.markdownguide.org\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">https://www.markdownguide.org</a><br>
<a href=\"https://mailto:fake@example.com\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">fake@example.com</a></p>
<p class=\"my-0\"><a href=\"https://www.example.com/my%20great%20page\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">link1</a></p>
<p class=\"my-0\"><a href=\"https://www.example.com/my great page\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">link2</a></p>
<p class=\"my-0\">X/Twitter:<br>
<a href=\"https://<div>twitter-id-1889804218132832323-author-ShouldHaveCat</div>\" rel=\"nofollow noopener\" title=\"Link expanded to plain text; beware of a potential phishing attempt\" target=\"_blank\" class=\"link-external\">X link</a></p>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if spoilers and backslashs are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `\\* Without the backslash, this would be a bullet in an unordered list.

Spoiler:
>! [Hidden Spoiler Text] This is the spoiler content.
> Optionally with more lines

Spoiler Output:
![image.png](https://usermedia.actifit.io/M20FVR8P5ZFXYEF49HN7QQH4KK8BJ9)`;

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">* Without the backslash, this would be a bullet in an unordered list.</p>
<p class=\"my-0\">Spoiler:</p>
<details><summary>Hidden Spoiler Text</summary><p class=\"my-0\">This is the spoiler content.<br>
Optionally with more lines</p>
</details><p class=\"my-0\">Spoiler Output:<br>
<img src=\"https://images.hive.blog/1536x0/https://usermedia.actifit.io/M20FVR8P5ZFXYEF49HN7QQH4KK8BJ9\" alt=\"image.png\"></p>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if collapsible section is diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `<details>
<summary>Click to expand</summary>

These details <em>remain</em> <strong>hidden</strong> until expanded.

<pre><code>PASTE LOGS HERE</code></pre>

</details>`;


    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<details><br>
<summary>Click to expand</summary>
<p class=\"my-0\">These details <em>remain</em> <strong>hidden</strong> until expanded.</p>
<pre><code>PASTE LOGS HERE</code></pre></details>
<p class=\"my-0\"></p>`;

    expect(preview).toContain(previewContent);
  });

  test('Check if 3speak and youtube videos are diplayed correctly', async ({ denserAutoTest0Page }) => {
    
    const postContentText: string = `3speak video (preferably displayed as embedded/playable video)
https://3speak.tv/watch?v=jongolson/vhtttbyf

Similarly for youtube videos (sample video below)
https://www.youtube.com/watch?v=a3ICNMQW7Ok`;

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await expect(postPage.articleBody).toBeVisible()

    const preview = await postPage.articleBody.innerHTML();

    const previewContent: string = `<p class=\"my-0\">3speak video (preferably displayed as embedded/playable video)<br></p><div class=\"threeSpeakWrapper videoWrapper\"><iframe width=\"640\" height=\"480\" src=\"https://3speak.tv/embed?v=jongolson/vhtttbyf\" frameborder=\"0\" allowfullscreen=\"\"></iframe></div><p class=\"my-0\"></p>
<p class=\"my-0\">Similarly for youtube videos (sample video below)<br>
</p><div class=\"videoWrapper\"><iframe width=\"640\" height=\"480\" src=\"https://www.youtube.com/embed/a3ICNMQW7Ok\" allowfullscreen=\"allowfullscreen\" webkitallowfullscreen=\"webkitallowfullscreen\" mozallowfullscreen=\"mozallowfullscreen\" frameborder=\"0\"></iframe></div><p class=\"my-0\"></p>`;

    expect(preview).toContain(previewContent);
  });
});
