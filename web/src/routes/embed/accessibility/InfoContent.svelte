<script lang="ts" module>
	export type AccessibleTrailName =
		| 'Bonnie Park Loop'
		| 'Bunns Lake Loop'
		| 'Forbes Woods Loop'
		| 'Huntington Walkway Loop'
		| 'Lower Edgewater APT Loop'
		| 'Scenic Park APT Loop'
		| 'West Creek APT Loop Trail'
		| 'Woodpecker Way';
</script>

<script lang="ts">
	import imgMapAcacia from '$lib/assets/accessibility/maps/acacia.jpg';
	import imgMapBedford from '$lib/assets/accessibility/maps/bedford.jpg';
	import imgMapBradleyWoods from '$lib/assets/accessibility/maps/bradley-woods.jpg';
	import imgMapHuntington from '$lib/assets/accessibility/maps/huntington.jpg';
	import imgMapLakefront from '$lib/assets/accessibility/maps/lakefront.jpg';
	import imgMapMillStreamRun from '$lib/assets/accessibility/maps/mill-stream-run.jpg';
	import imgMapRockyRiver from '$lib/assets/accessibility/maps/rocky-river.jpg';
	import imgMapWestCreek from '$lib/assets/accessibility/maps/west-creek.jpg';

	interface Props {
		selectedTrail: AccessibleTrailName;
	}

	let { selectedTrail }: Props = $props();
</script>

{#if selectedTrail === 'Bonnie Park Loop'}
	<p>Bonnie Park Loop Trail is 0.6 miles.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/b3ee508b-93b7-4f12-aa59-498c7a7d03bd/MillStreamRunReservationMap.pdf"
		target="_blank"><img alt="Mill Stream Run Reservation map" src={imgMapMillStreamRun} /></a
	>
{:else if selectedTrail === 'Bunns Lake Loop'}
	<p>Bunns Lake Loop Trail is 0.5 miles.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/0298141e-5c70-44cd-bd7f-8fde677d830e/BradleyWoodsMap2017.pdf"
		target="_blank"><img alt="Bradley Woods Reservation map" src={imgMapBradleyWoods} /></a
	>
{:else if selectedTrail === 'Forbes Woods Loop'}
	<p>Forbes Woods Loop Trail is 0.25 miles long.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/3ec23417-beca-43d6-b7e5-a3e1bd7252a1/Bedford.pdf"
		target="_blank"><img alt="Bedford Reservation map" src={imgMapBedford} /></a
	>
{:else if selectedTrail === 'Huntington Walkway Loop'}
	<p>Huntington Walkway Loop is 0.6 miles long.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/77bee3a7-d547-4642-bf42-e6f5acf925ff/Huntington.pdf"
		target="_blank"><img alt="Huntington Reservation map" src={imgMapHuntington} /></a
	>
{:else if selectedTrail === 'Lower Edgewater APT Loop'}
	<p>Lower Edgewater APT Loop Trail is 0.9 miles.</p>

	<p>
		Note that this portion of the All Purpose Trail travels north past the Edgewater Beach House,
		east past the Fishing Pier, then back sound and west to the Edgewater Beach House.
	</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/3496c101-b5d3-44f1-b19c-7ddff3907e44/Lakefront-Reservation-Map.pdf"
		target="_blank"><img alt="Lakefront Reservation map" src={imgMapLakefront} /></a
	>
{:else if selectedTrail === 'Scenic Park APT Loop'}
	<p>Scenic Park APT Loop Trail is 0.6 miles long.</p>

	<p>
		Note that this portion of the All Purpose Trail is located in the Emerald Necklace Marina area.
		It travels west and north along the Rocky River, east past the Marina, then returns south toward
		the Rocky River.
	</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/ea5dbe3a-3d9e-4120-86cf-9800864cd54e/Rocky-River.pdf"
		target="_blank"><img alt="Rocky River Reservation map" src={imgMapRockyRiver} /></a
	>
{:else if selectedTrail === 'West Creek APT Loop Trail'}
	<p>West Creek APT Loop Trail is 2.2 miles.</p>
	<p>
		This portion of the All Purpose Trail has three sections: North Loop Trail (0.55 miles), South
		Loop Trail (0.65 miles), Outer Loop Trail (1.0 miles)
	</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/bf72cf95-0344-4b40-9ca6-d3e971eae08a/50788-West-Creek-Reservation-Map-Final.pdf"
		target="_blank"><img alt="West Creek Reservation map" src={imgMapWestCreek} /></a
	>
{:else if selectedTrail === 'Woodpecker Way'}
	<p>Accessible through Woodpecker Way to Center Pond Boardwalk Loop (0.75 miles).</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/b0a2bca8-0e7c-493b-8799-52a1bf95a472/Acacia-map.pdf"
		target="_blank"><img alt="Acacia Reservation map" src={imgMapAcacia} /></a
	>
{/if}
