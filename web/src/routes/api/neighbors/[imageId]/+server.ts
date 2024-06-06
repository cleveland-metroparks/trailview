import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { sql } from 'drizzle-orm';
import { zodImageId } from '$lib/util';
import { getNeighbors, type GetResType } from './common';

export const GET = (async ({ url, params }) => {
	const searchParamSequencesFilter = url.searchParams.get('s');
	let sequencesFilter: number[] | undefined = undefined;
	if (searchParamSequencesFilter !== null) {
		const filterStrings = searchParamSequencesFilter.split(',');
		sequencesFilter = filterStrings.map((sequenceId) => {
			return parseInt(sequenceId);
		});
	}

	const searchParamGroupsFilter = url.searchParams.get('g');
	let groupsFilter: number[] | undefined = undefined;
	if (searchParamGroupsFilter !== null) {
		const filterStrings = searchParamGroupsFilter.split(',');
		groupsFilter = filterStrings.map((groupId) => {
			return parseInt(groupId);
		});
	}

	if (params.imageId === undefined) {
		return json({ success: false, message: 'No imageId specified' } satisfies GetResType, {
			status: 400
		});
	}

	// Analytics
	const current = new Date();
	const day = new Date(
		current.getFullYear(),
		current.getMonth(),
		current.getDate(),
		current.getHours(),
		0,
		0
	);

	await db
		.insert(schema.analytics)
		.values({ imageId: params.imageId, date: day, count: 1 })
		.onConflictDoUpdate({
			target: [schema.analytics.imageId, schema.analytics.date],
			set: { count: sql`${schema.analytics.count} + 1` }
		});

	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
		});
	}
	const neighbors = await getNeighbors({
		imageId: imageIdParse.data,
		includePrivate: false,
		groupsFilter,
		sequencesFilter
	});
	if (neighbors === null) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: neighbors } satisfies GetResType);
}) satisfies RequestHandler;
