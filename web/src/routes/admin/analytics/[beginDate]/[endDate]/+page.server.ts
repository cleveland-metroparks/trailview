import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { and, asc, eq, gte, lte, sum } from 'drizzle-orm';

const dateParamSchema = z
	.string()
	.datetime()
	.transform((d) => new Date(d));

export const load = (async ({ params }) => {
	const beginDateParse = dateParamSchema.safeParse(params.beginDate);
	const endDateParse = dateParamSchema.safeParse(params.endDate);
	if (beginDateParse.success !== true || endDateParse.success !== true) {
		throw error(400, 'Invalid date range');
	}
	const beginDate = beginDateParse.data;
	const endDate = endDateParse.data;
	const imagesQuery = db
		.$with('images')
		.as(db.select({ id: schema.image.id, sequenceId: schema.image.sequenceId }).from(schema.image));
	const sequencesQuery = db
		.$with('sequences')
		.as(db.select({ id: schema.sequence.id, name: schema.sequence.name }).from(schema.sequence));
	const analyticsQueryLineChart = await db
		.select({ date: schema.analytics.date, hits: sum(schema.analytics.count).mapWith(Number) })
		.from(schema.analytics)
		.groupBy(schema.analytics.date)
		.orderBy(asc(schema.analytics.date));
	const analyticsQueryBarChart = await db
		.with(imagesQuery, sequencesQuery)
		.select({
			sequenceName: sequencesQuery.name,
			hits: sum(schema.analytics.count).mapWith(Number)
		})
		.from(schema.analytics)
		.where(and(gte(schema.analytics.date, beginDate), lte(schema.analytics.date, endDate)))
		.innerJoin(imagesQuery, eq(imagesQuery.id, schema.analytics.imageId))
		.innerJoin(sequencesQuery, eq(sequencesQuery.id, imagesQuery.sequenceId))
		.groupBy(sequencesQuery.name);
	return {
		minDate: analyticsQueryLineChart[0].date,
		maxDate: analyticsQueryLineChart[analyticsQueryLineChart.length - 1]?.date,
		selectedMinDate: beginDate,
		selectedMaxDate: endDate,
		lineChartData: analyticsQueryLineChart.map((d) => {
			return [d.date.valueOf(), d.hits];
		}),
		barChartData: analyticsQueryBarChart.sort((a, b) => b.hits - a.hits)
	};
}) satisfies PageServerLoad;
