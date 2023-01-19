import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
	const user = await db.user.create({
		data: {
			username: 'hive',
			// this is a hashed version of "hive123" by bcryptjs round 10
			passwordHash: '$2a$10$ro4qOXYxgafMF8hkv7u7gOVa/P4giWA9JYu3HynMMq.N4x/IM.oHS',
		},
	});
	await Promise.all(
		getPosts().map((post) => {
			const data = { userId: user.id, ...post };
			return db.post.create({ data });
		}),
	);
	console.log(`Database has been successfully seeded. 🌱`);
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});

function getPosts() {
	return [
		{
			author: 'acidyo',
			permlink: 'a-quick-rundown-on-all-ocd-activities',
			category: 'hive-174578',
			title: 'A quick rundown on all ocd activities',
			body: "Since many have been asking, what constitutes an ocd vote, what doesn't, I figured I'd write down quick some main parts of our daily curation activity so you can maybe get in our scope easier if you're having trouble with it. \n\nhttps://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg\n\n#### First up, community incubation. \n\nHere we invite 1-3 community leaders/curators from a unique niche community (unique as in we do…ng it's mostly cause they either do too well for our scope or our focus on newcomers gets in the way of curating them. \n\nHope this may have cleared up some questions to some of you but if it raised more then feel free to ask in the comment section and I'll try to answer them as best as I can. :)\n\nWe got a lot planned for 2023 so keep an eye out!\n\n___\n\nhttps://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/acidyo/23xKmtx2stpKP9Z7FKWJm6oDohuHxVtHKHQCUx6Fs8rDT65jB1FfvZ1xKByyeb3N1874c.png",
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 32,
			payout: 160.686,
			author_reputation: 81.89,
			community: 'hive-174578',
			community_title: 'OCD',
		},
		{
			author: 'lordbutterfly',
			permlink: 'announcing-a-mini-documentary-about-the-hive-rally-team-update-1',
			category: 'hive',
			title: 'Announcing a mini-documentary about the Hive Rally Team// UPDATE 1',
			body: '\n![IMG-20230111-WA0002.jpg](https://files.peakd.com/file/peakd-hive/lordbutterfly/23vsScV2Gwh8v4Gfu7PxpHxGpZisLvZQT9ov2cRtG2VxiLkEW6aw8p9YjDWBV35FWhnTq.jpg)\n\n\n\n@valueplan has hired my team thats working on the „Freechain“ documentary to make a mini documentary film about the Hive rally team. For those that are out of the loop ValuePlan has recently sponsored a rally car and wrapped it in Hive colors. The car will represent Hive on all the big WRC races. The first one coming up is the „Croatia Rally“ i…igning the contract under my name. All taxes paid in Serbia according to the CRO-SRB taxation agreement.. \n\nWe have already had multiple calls to arrange everything and will possibly have 1 more once the interview questions are written. For now, that is all the infomation I have to share, the next: „UPDATE 2“, will be after the shoot, late February, early March. \nThe work to be done till then is writing the interview questions and preparing a storyboard. \nIf you have any questions feel free to ask. \n',
			image:
				'https://files.peakd.com/file/peakd-hive/lordbutterfly/23vsScV2Gwh8v4Gfu7PxpHxGpZisLvZQT9ov2cRtG2VxiLkEW6aw8p9YjDWBV35FWhnTq.jpg',
			children: 38,
			payout: 165.069,
			author_reputation: 75.19,
			community: 'hive-167922',
			community_title: 'LeoFinance',
		},
		{
			author: 'rubencress',
			permlink: 'case-study-hbd-savings-delegation',
			category: 'hive-167922',
			title: 'Case Study: HBD Savings Delegation',
			body: '<br><br>\n#### Introduction\n_My name is Ruben Cress, I\'m a content strategist and photographer based in the Netherlands. I\'ve been working as a photographer and content strategist for over 10 years. I\'ve worked for respectable big and small international companies worldwide. It was my job to find solutions for companies, and translate a brand\'s mission into high-quality visuals. While photography has always been a passion, finding and creating out-of-the-box solutions for companies has been my drive to cr…en discussions on the potential of this case study\'s feature (Delegated Locked HBD) and how it can benefit the Hive ecosystem.\n<br>\nSigned, and written (with much passion) by,\nRuben Cress\n<br><br>\n<center><img src="https://i.imgur.com/4GxyD3J.gif"/><p><sub><a href="https://foundation.app/RubenCress">Follow me on Foundation</a> | <a href="https://twitter.com/RubenCress">Follow me on Twitter</a> | <a href="https://instagram.com/storyshooters">Follow me on Instagram</a></sub></p></center><br><br>',
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 34,
			payout: 240.291,
			author_reputation: 73.96,
			community: 'hive-167922',
			community_title: 'LeoFinance',
		},
		{
			author: 'jesuslnrs',
			permlink:
				'this-dear-hiver-continues-in-his-great-battle-for-life-or-este-querido-hiver-continua-en-su-gran-batalla-por-la-vida',
			category: 'hive-105786',
			title:
				'This Dear Hiver Continues In His Great Battle For Life | Este Querido Hiver Continúa En Su Gran Batalla Por La Vida',
			body: '<center>![IMG-20230118-WA0008.jpg](https://files.peakd.com/file/peakd-hive/fernanblog/23zbMPdinQwiQrZ3QFukkiwP5LX5HnKBqB14uinHHPAHbGh3sQvtKeNpr9pRSCPs46Zp6.jpg)</center>\n\n<div class="text-justify"><p>Hola amigos de Hive y mi amada familia Hive Open Mic, desde el mes de agosto del año pasado muchas cosas han pasado con el estado de salud de mi papá @armandolnrs, sin embargo les traeré de forma resumida como ha sido su evolución y lo que ha acontecido recientemente…\n\n> <div class="text-justify"><p>He…0230118_151722_083.jpg](https://files.peakd.com/file/peakd-hive/jesuslnrs/Eq119qVyv4PixTyfb24M95xit2NhG2ct5b4DEzT7EyJNXrXnt8Yuvi8QvLtPLtcqZZb.jpg)\n\n<br>\n\n\n![IMG_20230118_151837_553.jpg](https://files.peakd.com/file/peakd-hive/jesuslnrs/EppLfPxG4dc57WAN7fmiAWqpoDTxabpf7T33CdQZZ1HL9ySaVQ5M6VXUZN21UhZ7AwA.jpg)\n\n\n<br>\n\n\n<center>![02112bd5663142e88a162c98fcda50e9.jpg](https://files.peakd.com/file/peakd-hive/fernanblog/23yxCgX4CZ43h74ZuMppfMDZTRCEDubsw4id8kKJmwUm8Q1vNAZZM69PY9RxtGv4HseCM.jpg)</center>',
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 28,
			payout: 99.543,
			author_reputation: 72.17,
			community: 'hive-105786',
			community_title: 'Hive Open Mic',
		},
		{
			author: 'oflyhigh',
			permlink: '2pgny3',
			category: 'hive-105017',
			title: '业主方便车风波',
			body: '小区为了方便业主搬运一些东西，在主要门岗处放置了一些业主方便车，就是超市那种购物车，这东西也确实方便了业主们。\n\n\n![image.png](https://images.hive.blog/DQmVBETTY8mEESu5A7UyMxE6hyL6rz5Se1tC3GiBjGn13iW/image.png)\n(图源 ：[pixabay](https://pixabay.com/photos/shopping-venture-shopping-purchasing-1080840/))\n\n不过这几天邻居微信群中，经常有人晒业主方便车放在某栋楼某单元门口的照片，谴责业主用完方便车不给送回门岗。\n\n原本发生一两次这样的事情，并无所谓，无论是用业主方便车没送的，还是发照片谴责的，我觉得他们可能都有自己的原因可立场，我也懒得去理会。\n\n不过最近两天，关于业主方便车的讨论竟然愈演愈烈，很多人竟然纷纷发言谴责不将业主方便车送回门岗的业主，并怒斥其素质低下，不配做我们的邻居等等。\n\n虽然吧，这事根本不关我啥事，但是我实在是忍不住了，于是在群里发了这样一句消息：\n>明明是物业服务质量下降了，结果大家…\n其实这和一些餐厅（KFC、金拱门）等用餐完毕送餐盘一样，虽然我每次用餐完毕都会整理餐桌并且把餐盘送回餐盘回收处，但是我并不认为没送餐盘的人有什么不妥，毕竟大家出来吃饭是享受服务的，而不是出来打工的。\n\n那么谴责不送餐盘的人素质低下的人，既然你那么能，以后去任何一个饭店吃饭完毕后，都记得帮人家收拾桌子，最好把碗碟都帮人家洗了。\n\n扯远了，当我发表完言论后，我想肯定会有一堆人怼我，不过没想到的是一帮小区的老住户纷纷上来挺我，都说早期业主方便车确实是保安负责收。\n\n\n![image.png](https://images.hive.blog/DQmWNibdVUU1LLy8cmP8yWwoSStAKg2Yp2B1PEU9y8uSiVZ/image.png)\n(图源 ：[pixabay](https://pixabay.com/photos/shopping-venture-shopping-purchasing-1269166/))\n\n哎，不过我也懒得继续参与讨论了，好多年前，我自己家就有了一大一小两个推车，已经有N多年没用过业主方便车了，我和他们讨论个锤子呢！\n\n还是选择沉默是金吧！',
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 6,
			payout: 56.58,
			author_reputation: 83.53,
			community: 'hive-105017',
			community_title: 'HIVE CN 中文社区',
		},
		{
			author: 'galenkp',
			permlink: 'think-like-a-roman-part-three',
			category: 'hive-126152',
			title: 'Think Like a Roman: Part three',
			body: "<div class=\"text-justify\">\n\nVery little is needed to make a happy life; it is all within yourself, in your way of thinking. **- Marcus Aurelius**\n\n<center>![6.png](https://files.peakd.com/file/peakd-hive/galenkp/AKGbg2sg2QMEpWPSTuWi4YwUEa4wuHQaB39Y6ppXBXf1sAGtPb36nhJDpkRp6vC.png)</center>\n\nI love history, and looking backward in time; learning from those who have come before me provides great insight into my own life, offers different perspectives and the opportunity to think and act a little diffe… latest iPhone or some such thing though, I mean life-happiness. What has made you deeply and sustainably happy in your life, how have you maintained it and what challenges have you faced whilst pursuing happiness? Alternatively, if you're not happy overall, what do you think you could do to rectify the situation? Feel free to comment below.\n\n<center>🔘 🔘 🔘</center>\n\n</div>\n\n***\n\nDesign and create your ideal life, don't live it by default, tomorrow isn't promised so be humble and kind - galenkp\n",
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 37,
			payout: 60.557,
			author_reputation: 81.74,
			community: 'hive-126152',
			community_title: 'Reflections',
		},
		{
			author: 'tarazkp',
			permlink: 'with-a-side-of-violence',
			category: 'hive-126152',
			title: 'With a Side of Violence',
			body: "<div class=\"text-justify\">\n\nA day ago, there was a stabbing murder at our local supermarket. Perhaps in some places this isn't news, but in Finland and especially at 5pm on a weekday, it is rare. Yet, this kind of violence seems to be increasing. This wasn't a random act of violence in the sense that they were strangers, as they knew each other, but it is still quite *random,* as they arrived in the same car together. Apparently, an argument broke out and someone or both (it hasn't been mentioned but t…for it, as if encouraging consumer mindset behavior and polarized views on topics is not going to affect people's walking world activity. We are not good at compartmentalizing and when we spend so more time isolated in front of screens than connecting and interacting with humans, it is *natural* that our habits and behaviors are going to be influenced to act more like the outraged feeds, than the *relative* civility of face to face conversation.\n\nWe are what we eat.\n\n\nTaraz\n[ Gen1: Hive ]\n\n\n</div>",
			image:
				'https://files.peakd.com/file/peakd-hive/ocdb/AKAsjHuZcQ4zA1bvXaA9Lc9ZAnj1uVVb7U326J5cFS8AuUNveXQPnP99bTLH3oN.jpg',
			children: 31,
			payout: 45.508,
			author_reputation: 83.9,
			community: 'hive-126152',
			community_title: 'Reflections',
		},
		{
			author: 'naymhapz',
			permlink: 'the-unwinding-moment-of-myself',
			category: 'hive-168869',
			title: 'The Unwinding Moment of Myself',
			body: '<div class="text-justify">\n\n<center>"All truly great thoughts are conceived by walking.” \n– Friedrich Nietzsche</center>\n\n\n![IMG20230114162813.jpg](https://files.peakd.com/file/peakd-hive/naymhapz/EopuSUyDnLi1Gw8fPAtVKM6VwztyJwzKYgt42GfEo6NN5hbgm5XNTzbASHKnXQ3Hg4E.jpg)\n\n![inbound6214790155724416169.jpg](https://files.peakd.com/file/peakd-hive/naymhapz/EpA3xChB7LeHskyGwC7aQbCQwFq5q45GhAQCMvB37nYh9pxR2ehUHs8Cmzok7QEbDvr.jpg)\n\nThe weather was still gloomy, and my emotions were shifting. I was ill…EYyGa6KyjXLpKB7G34s9BcXLFfUgfnKB.jpg)\n\n![IMG20230114164154.jpg](https://files.peakd.com/file/peakd-hive/naymhapz/EpNoKWvuLVRo2qUjoJzuYhDYe6uWKh9TfGmhi4U8RGhDzix5frU9CQuBwSGADvG9qNJ.jpg)\n\n\nGiving value to oneself is an important thing that we need to do. Have a break, take a walk when you are stressed, and bond with your child or your loved ones. A healthy mind, body, and soul are all that matter.\n\nThank you for your time dear Hivers and for reading my blog, until then, God bless.\n\n\n</div>\n\n\n\n',
			image:
				'https://files.peakd.com/file/peakd-hive/naymhapz/EopuSUyDnLi1Gw8fPAtVKM6VwztyJwzKYgt42GfEo6NN5hbgm5XNTzbASHKnXQ3Hg4E.jpg',
			children: 12,
			payout: 82.587,
			author_reputation: 66.99,
			community: 'hive-168869',
			community_title: 'WEEKEND EXPERIENCES',
		},
		{
			author: 'carolynstahl',
			permlink: 'homade-pasta-with-bolognese-sauce-plant-based',
			category: 'hive-180569',
			title: 'Homade pasta with bolognese sauce - Plant based',
			body: '\n![DSC_4513.jpg](https://files.peakd.com/file/peakd-hive/carolynstahl/23wCNJexMWDaB8eP1fbJWmBYMVnd51hppCoBSk6FFNRpnq5nS7KRi35BgyNWskP5BbqcU.jpg)\n\nAs someone who grew up in Canada, I have discovered foods of the world. Much of the world lives here and gives us an introduction to many different cuisines. I tend to put Asian dishes at the top of my list because of the spice combinations and the aromatics that are often used, which are exciting to me. After a spree of these foods I need a rest to go into an….\n\n![DSC_4522.jpg](https://files.peakd.com/file/peakd-hive/carolynstahl/23zGs7X2Yhoxs4VHd1cEyxHouh27DHvyeqatKE8Ms8gAuW894QqQF8dhigS38z5qjhvt5.jpg)\n\nThanks for stopping by and have a great day.\n\n*Photos taken with Nikon D7500 and edited in Photoshop*\n\n<center>[![carolynbanner.jpg](https://files.peakd.com/file/peakd-hive/kidsisters/23zbakG8bjP7Hi7JDdb66QFQPcjEPUfSnCDw5cAieeT3a9t34szvYGmqdC9ZHi5RRtSNg.jpg)](https://peakd.com/@carolynstahl/posts)<sup><sup>**design by: @KidSisters**</sup></sup></center>',
			image:
				'https://files.peakd.com/file/peakd-hive/carolynstahl/23wCNJexMWDaB8eP1fbJWmBYMVnd51hppCoBSk6FFNRpnq5nS7KRi35BgyNWskP5BbqcU.jpg',
			children: 35,
			payout: 104.407,
			author_reputation: 74.07,
			community: 'hive-180569',
			community_title: 'Plant Power (Vegan)',
		},
		{
			author: 'dosisweb3',
			permlink: 'dosis-web3-en-la-web3',
			category: 'hive-110011',
			title: 'Dosis Web3 en la WEB3',
			body: '<div class="text-justify">\n\n<center><h1> Dosis WEB3</h1></center> Hola Hivers, estamos muy felices de anunciar que vamos a estar creando contenido en esta gran comunidad.\n\n> Hi Hivers, we\'re so happy to announce that we\'ll be creating content in this great community.\n\n<center>\n![DW3 x HIVE - intro.png](https://files.peakd.com/file/peakd-hive/dosisweb3/23tbRQSzQuryLCbtJcbRCbGjtZ55o27HCyJvuGrrVjJSrhwiCAKvmBGtg4fukRUoU9fG6.png)\n</center>\n\n<center><h3>Pero ¿Quiénes somos?</h3></center> Les contamos…2zYxwDh7tiVcMbvZ3o9nSiLAsitgLzWQ.jpg">\n</td>\n<td>\n<img src=https://files.peakd.com/file/peakd-hive/dosisweb3/AK54boZCr58wdnQYCW4qC8nr9QZ9czXV67kE97ApdeMnx2wNEqEUB6GToL4hz76.jpg">\n</td>\n</table>\n</center>\n\n*Las imagenes y capturas de pantalla de esta publicación pertenecen a los creadores del proyecto Dosis Web3 | The images and screenshots in this publication belong to the creators of the Dosis Web3 project.\nBanner realizado en Adobe Illustrator | Banner made in Adobe Illustrator.*\n\n\n</div>\n',
			image:
				'https://files.peakd.com/file/peakd-hive/dosisweb3/23tbRQSzQuryLCbtJcbRCbGjtZ55o27HCyJvuGrrVjJSrhwiCAKvmBGtg4fukRUoU9fG6.png',
			children: 9,
			payout: 56.819,
			author_reputation: 54.23,
			community: 'hive-110011',
			community_title: 'Aliento',
		},
	];
}
