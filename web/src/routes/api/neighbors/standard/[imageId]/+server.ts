import { refreshImageData, standardImageData } from '$lib/server/dbcache';
import { json, type RequestHandler } from '@sveltejs/kit';
import { getNeighbors } from '../../common';
import { db } from '$lib/server/prisma';

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
		return json({ success: false, message: 'No imageId specified' }, { status: 400 });
	}
	if (standardImageData === undefined) {
		await refreshImageData(true);
	}
	if (standardImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const neighbors = getNeighbors(standardImageData, params.imageId, sequencesFilter, groupsFilter);

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
	await db.analytics.upsert({
		where: { imageId_date: { imageId: params.imageId, date: day } },
		create: { imageId: params.imageId, date: day, count: 1 },
		update: { count: { increment: 1 } }
	});

	if (neighbors === undefined) {
		return json({ success: false, message: 'Invalid image id' }, { status: 404 });
	}
	return json({ success: true, data: neighbors });
}) satisfies RequestHandler;
