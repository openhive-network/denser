import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { render, screen } from '../utils';
import PostListItem from '~/components/PostListItem';

const post = 	{
	author: 'acidyo',
	permlink: 'a-quick-rundown-on-all-ocd-activities',
	category: 'hive-174578',
	title: 'A quick rundown on all ocd activities',
	body: "Since many have been asking, what constitutes an ocd vote, what doesn't, I figured I'd write down quick some main parts of our daily curation activity so you can maybe get in our scope easier if you're having trouble with it. \n\nhttps://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg\n\n#### First up, community incubation. \n\nHere we invite 1-3 community leaders/curators from a unique niche community (unique as in we do…ng it's mostly cause they either do too well for our scope or our focus on newcomers gets in the way of curating them. \n\nHope this may have cleared up some questions to some of you but if it raised more then feel free to ask in the comment section and I'll try to answer them as best as I can. :)\n\nWe got a lot planned for 2023 so keep an eye out!\n\n___\n\nhttps://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/acidyo/23xKmtx2stpKP9Z7FKWJm6oDohuHxVtHKHQCUx6Fs8rDT65jB1FfvZ1xKByyeb3N1874c.png",
	image:
		'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
	votes: 100,
	children: 32,
	payout: 160.686,
	author_reputation: 81.89,
	community: 'hive-174578',
	community_title: 'OCD',
}
/**
 * Example tests.
 * Learn more about MSW: https://mswjs.io
 * Learn more about Vitest: https://vitest.dev
 * Learn more about Testing Library: https://testing-library.com/
 */
describe('Example unit tests.', () => {
	it('Should get data from Mocks.', async () => {
		const data = await fetch('https://my-mock-api.com').then((response) => response.json());
		expect(data).not.toBeNull();
	});

	it('Should have "Default message." as text content.', async () => {
    render(<PostListItem />)
    expect(screen.getByRole('h2')).toHaveTextContent(
      '',
    )
  })
  it('Should have "Vitest message." as text content.', async () => {
    render(<PostListItem post={post} />)
    expect(screen.getByRole('h2')).toHaveTextContent(
      'A quick rundown on all ocd activities',
    )
  })
});
