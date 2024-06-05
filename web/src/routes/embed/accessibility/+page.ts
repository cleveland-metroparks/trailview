import type { PageLoad } from './$types';

import imgAcacia from '$lib/assets/accessibility/thumbnails/acacia.jpg';
import imgBonniePark from '$lib/assets/accessibility/thumbnails/bonnie-park.jpg';
import imgBradleyWoods from '$lib/assets/accessibility/thumbnails/bradley-woods.jpg';
import imgForbesWoods from '$lib/assets/accessibility/thumbnails/forbes-woods.jpg';
import imgHuntington from '$lib/assets/accessibility/thumbnails/huntington.jpg';
import imgLowerEdgewater from '$lib/assets/accessibility/thumbnails/lower-edgewater.jpg';
import imgScenicPark from '$lib/assets/accessibility/thumbnails/scenic-park.jpg';
import imgWestCreek from '$lib/assets/accessibility/thumbnails/west-creek.jpg';
import type { AccessibleTrailName } from './InfoContent.svelte';

export type FilterType =
	| { sequenceIds: number[] }
	| { groupIds: number[] }
	| { sequenceIds: number[]; groupIds: number[] };

type AccessibleTrail = {
	displayName: AccessibleTrailName;
	filter: FilterType;
	initImgId: string;
	thumbnail: string;
};

export const load = (() => {
	const accessibleTrails: AccessibleTrail[] = [
		{
			displayName: 'Woodpecker Way',
			filter: { groupIds: [7] },
			initImgId: '0d7ee3721c61412b93fa007b44074f51',
			thumbnail: imgAcacia
		},
		{
			displayName: 'Forbes Woods Loop',
			filter: { sequenceIds: [223] },
			initImgId: 'bb561a5b44a14f7d96c922e460df6311',
			thumbnail: imgForbesWoods
		},
		{
			displayName: 'Bunns Lake Loop',
			filter: { sequenceIds: [24] },
			initImgId: '0e19be57e6234dab872ccc637ed37d6b',
			thumbnail: imgBradleyWoods
		},
		{
			displayName: 'Huntington Walkway Loop',
			filter: { groupIds: [5] },
			initImgId: '36c151e656584816a95ecbef5458c224',
			thumbnail: imgHuntington
		},
		{
			displayName: 'Lower Edgewater APT Loop',
			filter: { groupIds: [6] },
			initImgId: 'cfcb74567f6f44c28821b030acface0e',
			thumbnail: imgLowerEdgewater
		},
		{
			displayName: 'Bonnie Park Loop',
			filter: { sequenceIds: [12] },
			initImgId: '9651b4b98a8f4b5383cf1b4b1d325037',
			thumbnail: imgBonniePark
		},
		{
			displayName: 'Scenic Park APT Loop',
			filter: { sequenceIds: [220] },
			initImgId: 'c04275fa686446288e92869e6f2df884',
			thumbnail: imgScenicPark
		},
		{
			displayName: 'West Creek APT Loop Trail',
			filter: { groupIds: [8] },
			initImgId: '645cb133cdd941f69b974ba72946ad72',
			thumbnail: imgWestCreek
		}
	];
	return { accessibleTrails };
}) satisfies PageLoad;
