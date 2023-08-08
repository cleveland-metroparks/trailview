import { allImageData, refreshImageData } from '$lib/server/dbcache';
import { json, type RequestHandler } from '@sveltejs/kit';
import { getNeighbors } from '../../common';

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
	if (allImageData === undefined) {
		await refreshImageData(true);
	}
	if (allImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const neighbors = getNeighbors(allImageData, params.imageId, sequencesFilter, groupsFilter);
	if (neighbors === undefined) {
		return json({ success: false, message: 'Invalid image id' }, { status: 404 });
	}
	return json({ success: true, data: neighbors });
}) satisfies RequestHandler;
