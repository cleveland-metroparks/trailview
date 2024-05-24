import { db } from '$lib/server/prisma';

export async function getGroup(
	id: number,
	includeAll: boolean
): Promise<
	| Error
	| {
			id: number;
			name: string;
			images: {
				id: string;
			}[];
	  }
> {
	if (isNaN(id)) {
		return new Error('Invalid group id');
	}
	const group =
		includeAll === true
			? await db.group.findUnique({
					where: { id: id },
					include: { images: { select: { id: true } } }
				})
			: await db.group.findUnique({
					where: { id: id },
					include: { images: { select: { id: true }, where: { visibility: true } } }
				});
	if (group === null) {
		return new Error('Invalid group id');
	}
	return group;
}
