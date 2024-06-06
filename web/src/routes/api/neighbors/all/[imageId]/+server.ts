import { json, type RequestHandler } from '@sveltejs/kit';
import { getNeighbors, type Neighbor } from '$api/neighbors/common';
import { zodImageId } from '$lib/util';

export type GetResType = { success: false; message: string } | { success: true; data: Neighbor[] };

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
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
		});
	}
	const neighbors = await getNeighbors({
		imageId: imageIdParse.data,
		includePrivate: true,
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
