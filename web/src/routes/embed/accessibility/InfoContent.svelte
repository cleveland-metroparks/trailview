<script lang="ts" context="module">
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

	export let selectedTrail: AccessibleTrailName;
</script>

{#if selectedTrail === 'Bonnie Park Loop'}
	<p>Bonnie Park Loop Trail is 0.6 miles.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/b20b9624-49ba-4fd3-845f-96101b2851b5/MillStreamRunReservationMap.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Mill Stream Run Reservation map" src={imgMapMillStreamRun} /></a
	>
{:else if selectedTrail === 'Bunns Lake Loop'}
	<p>Bunns Lake Loop Trail is 0.5 miles.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/5d474272-b563-48e4-8b38-71bae1ec85b5/BradleyWoodsMap2017.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Bradley Woods Reservation map" src={imgMapBradleyWoods} /></a
	>
{:else if selectedTrail === 'Forbes Woods Loop'}
	<p>Forbes Woods Loop Trail is 0.25 miles long.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/36b8b4fb-839a-428c-a066-88063f2eeec0/BedfordMap2017.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Bedford Reservation map" src={imgMapBedford} /></a
	>
{:else if selectedTrail === 'Huntington Walkway Loop'}
	<p>Huntington Walkway Loop is 0.6 miles long.</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/0802d246-9e43-4b46-9908-a9d131fa0fdb/HuntingtonMap2017.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Huntington Reservation map" src={imgMapHuntington} /></a
	>
{:else if selectedTrail === 'Lower Edgewater APT Loop'}
	<p>Lower Edgewater APT Loop Trail is 0.9 miles.</p>

	<p>
		Note that this portion of the All Purpose Trail travels north past the Edgewater Beach House,
		east past the Fishing Pier, then back sound and west to the Edgewater Beach House.
	</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/afdabbf1-a4e2-49b4-9552-20142c409bb5/Lakefront-Reservation-Map.pdf.ashx?ext=.pdf"
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
		href="https://www.clevelandmetroparks.com/getmedia/1c7c2fde-4aed-4fbe-872d-e5aa3d2f0dba/RockyRiverMap.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Rocky River Reservation map" src={imgMapRockyRiver} /></a
	>
{:else if selectedTrail === 'West Creek APT Loop Trail'}
	<p>West Creek APT Loop Trail is 2.2 miles.</p>
	<p>
		This portion of the All Purpose Trail has three sections: North Loop Trail (0.55 miles), South
		Loop Trail (0.65 miles), Outer Loop Trail (1.0 miles)
	</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/d8e935c0-f0dd-47e2-9902-af0ef739c135/west-creek_reservation.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="West Creek Reservation map" src={imgMapWestCreek} /></a
	>
{:else if selectedTrail === 'Woodpecker Way'}
	<p>Accessible through Woodpecker Way to Center Pond Boardwalk Loop (0.75 miles).</p>

	<a
		href="https://www.clevelandmetroparks.com/getmedia/04c9cb54-ce81-456b-bb4e-852b0be66ac6/Acacia-map.pdf.ashx?ext=.pdf"
		target="_blank"><img alt="Acacia Reservation map" src={imgMapAcacia} /></a
	>
{/if}
