import { json, type RequestHandler } from '@sveltejs/kit';
import { getNeighbors } from '../../common';
import type { ImageData } from '$api/common';
import { zodImageId } from '$lib/util';

export type GetResType = { success: false; message: string } | { success: true };

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

	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' }, { status: 400 });
	}
	const neighbors = getNeighbors(allImageData, params.imageId, sequencesFilter, groupsFilter);
	if (neighbors === undefined) {
		return json({ success: false, message: 'Invalid image id' }, { status: 404 });
	}
	return json({ success: true, data: neighbors });
}) satisfies RequestHandler;
