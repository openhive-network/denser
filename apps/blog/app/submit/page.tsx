'use client';

import React from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import PostForm from '@/blog/features/post-editor/post-form';

const Page = () => {
  const { user } = useUserClient();
  return <PostForm username={user.username} editMode={false} sideBySidePreview={true} />;
};

export default Page;

const markdownContent = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

*italic*
**bold**
Love**is**bold
I just love __bold text__.
also _italic_
***bold-italic***
~~strikethrough~~
[link](http://example.com)

Lists:
- Milk
- Bread
    - Wholegrain
- Butter

1. Tidy the kitchen  
2. Prepare ingredients  
3. Cook delicious things  

![hive logo](https://cryptologos.cc/logos/hive-blockchain-hive-logo.png?v=035)

![sample image](https://usermedia.actifit.io/9246fa02-cdf0-424f-b1e8-634b1c209042)

<img src="https://images.hive.blog/0x0/https://pixabay.com/get/ga1c244ce6431365a20f00107112a940f237bebf510518ff4bbb105240cdb24f3c9a3032fe29f21cbea57dbaf288ca28e2fe12f6831f2f8ff1481531c13c58a96_640.jpg">

---
blockquote:
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
>  *Everything* is going according to **plan**.

Table

One   | Two   | Three
------|-------|------
four  | five  | six
seven | eight | nine

sample code:
At the command prompt, type \`nano\`.

\`\`Use \`code\` in your Markdown file.\`\`

    <html>
      <head>
      </head>
    </html>

Links/Emails:
<https://www.markdownguide.org>
<fake@example.com>

[link1](https://www.example.com/my%20great%20page)

<a href="https://www.example.com/my great page">link2</a>


\\* Without the backslash, this would be a bullet in an unordered list.

Spoiler:
>! [Hidden Spoiler Text] This is the spoiler content.
> Optionally with more lines

Spoiler Output:
![image.png](https://usermedia.actifit.io/M20FVR8P5ZFXYEF49HN7QQH4KK8BJ9)

Collapsible section:

<details>
<summary>Click to expand</summary>

These details <em>remain</em> <strong>hidden</strong> until expanded.

<pre><code>PASTE LOGS HERE</code></pre>

</details>

3speak video (preferably displayed as embedded/playable video)
https://3speak.tv/watch?v=jongolson/vhtttbyf

Similarly for youtube videos (sample video below)
https://www.youtube.com/watch?v=a3ICNMQW7Ok

Footnotes[^1] have a label[^@#$%] and the footnote's content.

[^1]: This is a footnote content.
[^@#$%]: A footnote on the label: "@#$%".
`;
