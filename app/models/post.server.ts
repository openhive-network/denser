import type { User, Post } from '@prisma/client';
import { db } from '~/utils/db.server';

export function getPost({
	id,
	userId,
}: Pick<Post, 'id'> & {
	userId: User['id'];
}) {
	return db.post.findFirst({
		select: { id: true, body: true, title: true },
		where: { id, userId },
	});
}

export function getPostListItems({ userId }: { userId: User['id'] }) {
	return db.post.findMany({
		where: { userId },
		orderBy: { updated: 'desc' },
	});
}
