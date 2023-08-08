import type { PageLoad } from './$types';

export type FilterType =
	| { sequenceIds: number[] }
	| { groupIds: number[] }
	| { sequenceIds: number[]; groupIds: number[] };

type AccessibleTrail = {
	displayName: string;
	filter: FilterType;
	initImgId: string;
	infoHtml: string;
	thumbnail: string;
};

export const load = (async ({ fetch }) => {
	const accessibleTrails: AccessibleTrail[] = [
		{
			displayName: 'Woodpecker Way',
			filter: { groupIds: [7] },
			initImgId: '0d7ee3721c61412b93fa007b44074f51',
			infoHtml: await (await fetch('/embed/accessibility/info/woodpecker-way.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/acacia.jpg'
		},
		{
			displayName: 'Forbes Woods Loop',
			filter: { sequenceIds: [223] },
			initImgId: 'bb561a5b44a14f7d96c922e460df6311',
			infoHtml: await (await fetch('/embed/accessibility/info/forbes-woods-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/forbes-woods.jpg'
		},
		{
			displayName: 'Bunns Lake Loop',
			filter: { sequenceIds: [24] },
			initImgId: '0e19be57e6234dab872ccc637ed37d6b',
			infoHtml: await (await fetch('/embed/accessibility/info/bunns-lake-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/bradley-woods.jpg'
		},
		{
			displayName: 'Huntington Walkway Loop',
			filter: { groupIds: [5] },
			initImgId: '36c151e656584816a95ecbef5458c224',
			infoHtml: await (await fetch('/embed/accessibility/info/huntington-walkway.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/huntington.jpg'
		},
		{
			displayName: 'Lower Edgewater APT Loop',
			filter: { groupIds: [6] },
			initImgId: 'cfcb74567f6f44c28821b030acface0e',
			infoHtml: await (
				await fetch('/embed/accessibility/info/lower-edgewater-apt-loop.html')
			).text(),
			thumbnail: '/embed/accessibility/thumbnails/lower-edgewater.jpg'
		},
		{
			displayName: 'Bonnie Park Loop',
			filter: { sequenceIds: [12] },
			initImgId: '9651b4b98a8f4b5383cf1b4b1d325037',
			infoHtml: await (await fetch('/embed/accessibility/info/bonnie-park-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/bonnie-park.jpg'
		},
		{
			displayName: 'Scenic Park APT Loop',
			filter: { sequenceIds: [220] },
			initImgId: 'c04275fa686446288e92869e6f2df884',
			infoHtml: await (await fetch('/embed/accessibility/info/scenic-park-apt-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/scenic-park.jpg'
		},
		{
			displayName: 'West Creek APT Loop Trail',
			filter: { groupIds: [8] },
			initImgId: '645cb133cdd941f69b974ba72946ad72',
			infoHtml: await (
				await fetch('/embed/accessibility/info/west-creek-apt-loop-trail.html')
			).text(),
			thumbnail: '/embed/accessibility/thumbnails/west-creek.jpg'
		}
	];
	return { accessibleTrails };
}) satisfies PageLoad;
