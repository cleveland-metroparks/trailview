import type { PageLoad } from './$types';

interface AccessibleTrail {
	displayName: string;
	sequenceId: number;
	initImgId: string;
	infoHtml: string;
	thumbnail: string;
}

export const load = (async ({ fetch }) => {
	const accessibleTrails: AccessibleTrail[] = [
		{
			displayName: 'Woodpecker Way',
			sequenceId: 113,
			initImgId: '0d7ee3721c61412b93fa007b44074f51',
			infoHtml: await (await fetch('/embed/accessibility/info/woodpecker-way.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/acacia.jpg'
		},
		// {
		// 	displayName: 'Forbes Woods Loop',
		//     sequenceId:
		// },
		{
			displayName: 'Bunns Lake Loop',
			sequenceId: 24,
			initImgId: '0e19be57e6234dab872ccc637ed37d6b',
			infoHtml: await (await fetch('/embed/accessibility/info/bunns-lake-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/bradley-woods.jpg'
		},
		{
			displayName: 'Huntington Walkway Loop',
			sequenceId: 221,
			initImgId: '36c151e656584816a95ecbef5458c224',
			infoHtml: await (await fetch('/embed/accessibility/info/huntington-walkway.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/huntington.jpg'
		},
		{
			displayName: 'Lower Edgewater APT Loop',
			sequenceId: 2,
			initImgId: 'b29c6295453340fb98028680ca54dac0',
			infoHtml: await (
				await fetch('/embed/accessibility/info/lower-edgewater-apt-loop.html')
			).text(),
			thumbnail: '/embed/accessibility/thumbnails/lower-edgewater.jpg'
		},
		{
			displayName: 'Bonnie Park Loop',
			sequenceId: 12,
			initImgId: '9651b4b98a8f4b5383cf1b4b1d325037',
			infoHtml: await (await fetch('/embed/accessibility/info/bonnie-park-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/bonnie-park.jpg'
		},
		{
			displayName: 'Scenic Park APT Loop',
			sequenceId: 220,
			initImgId: 'c04275fa686446288e92869e6f2df884',
			infoHtml: await (await fetch('/embed/accessibility/info/scenic-park-apt-loop.html')).text(),
			thumbnail: '/embed/accessibility/thumbnails/scenic-park.jpg'
		},
		{
			displayName: 'West Creek APT Loop Trail',
			sequenceId: 104, // TODO: plus another
			initImgId: '645cb133cdd941f69b974ba72946ad72',
			infoHtml: await (
				await fetch('/embed/accessibility/info/west-creek-apt-loop-trail.html')
			).text(),
			thumbnail: '/embed/accessibility/thumbnails/west-creek.jpg'
		}
	];
	return { accessibleTrails };
}) satisfies PageLoad;
