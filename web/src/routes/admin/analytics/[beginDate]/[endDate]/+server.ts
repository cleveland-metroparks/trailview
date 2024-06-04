import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

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

export const GET = (async ({ params }) => {
	const paramBeginDate = parseInt(params.beginDate);
	const paramEndDate = parseInt(params.endDate);
	if (isNaN(paramBeginDate) || isNaN(paramEndDate)) {
		return json({ success: false, message: 'Invalid date value' } as GetResType, { status: 400 });
	}
	const beginDate = new Date(paramBeginDate);
	const endDate = new Date(paramEndDate);
	const imageQuery = db
		.$with('image')
		.as(db.select({ id: schema.image.id, sequenceId: schema.image.sequenceId }).from(schema.image));
	const sequenceQuery = db
		.$with('sequence')
		.as(db.select({ id: schema.sequence.id, name: schema.sequence.name }).from(schema.sequence));
	const analyticsQuery = await db
		.with(imageQuery, sequenceQuery)
		.select({ sequenceName: sequenceQuery.name })
		.from(schema.analytics)
		.where(and(gte(schema.analytics.date, beginDate), lte(schema.analytics.date, endDate)))
		.innerJoin(imageQuery, eq(imageQuery.id, schema.analytics.imageId))
		.innerJoin(sequenceQuery, eq(sequenceQuery.id, imageQuery.sequenceId));
	const analyticsMap = new Map<string, number>();
	for (const a of analyticsQuery) {
		const count = analyticsMap.get(a.sequenceName);
		if (count !== undefined) {
			analyticsMap.set(a.sequenceName, count + 1);
		} else {
			analyticsMap.set(a.sequenceName, 1);
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
