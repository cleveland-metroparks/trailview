import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/prisma';

export type GetResType =
	| {
			success: true;
			data: {
				sequenceName: string;
				hits: number;
			}[];
	  }
	| {
			success: false;
			message: string;
	  };

export const GET = (async ({ cookies, params }) => {
	if ((await isSessionValid(cookies)) !== true) {
		return json({ success: false, message: 'Invalid session' } as GetResType, { status: 403 });
	}
	const paramDateValue = parseInt(params.dateValue);
	if (isNaN(paramDateValue)) {
		return json({ success: false, message: 'Invalid date value' } as GetResType, { status: 400 });
	}
	const day = new Date(paramDateValue);
	const query = await db.analytics.findMany({
		where: { date: { equals: day } },
		include: { image: { select: { sequence: { select: { name: true } } } } }
	});
	const analyticsMap = new Map<string, number>();
	for (const a of query) {
		const count = analyticsMap.get(a.image.sequence.name);
		if (count !== undefined) {
			analyticsMap.set(a.image.sequence.name, count + 1);
		} else {
			analyticsMap.set(a.image.sequence.name, 1);
		}
	}
	const dayAnalytics = Array.from(analyticsMap.entries())
		.map((a) => {
			return { sequenceName: a[0], hits: a[1] };
		})
		.sort((a, b) => {
			return b.hits - a.hits;
		});
	return json({ success: true, data: dayAnalytics } as GetResType);
}) satisfies RequestHandler;
