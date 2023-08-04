<script lang="ts">
	import { onMount } from 'svelte';
	import { mainHeading } from '../stores';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';

	$mainHeading = 'TrailView Analytics';

	export let data: PageData;

	onMount(async () => {
		const ApexCharts = await import('apexcharts');

		const sequenceAnalyticsMap = new Map<string, number>();
		data.analytics.forEach((a) => {
			const val = sequenceAnalyticsMap.get(a.image.sequence.name);
			if (val !== undefined) {
				sequenceAnalyticsMap.set(a.image.sequence.name, val + a.count);
			} else {
				sequenceAnalyticsMap.set(a.image.sequence.name, a.count);
			}
		});

		const sortedSequenceAnalytics = Array.from(sequenceAnalyticsMap.entries()).sort((a, b) => {
			return b[1] - a[1];
		});

		var options: ApexOptions = {
			theme: {
				mode: 'dark'
			},
			colors: ['#6ab03e'],
			series: [
				{
					name: 'Image Hits',
					data: sortedSequenceAnalytics.map((a) => {
						return a[1];
					})
				}
			],
			chart: {
				type: 'bar',
				height: 600
			},
			plotOptions: {
				bar: {
					borderRadius: 4,
					horizontal: true
				}
			},
			dataLabels: {
				enabled: true
			},
			xaxis: {
				categories: sortedSequenceAnalytics.map((a) => {
					return a[0];
				})
			}
		};

		var chart = new ApexCharts.default(chartContainer, options);
		chart.render();
	});

	let chartContainer: HTMLDivElement;
</script>

<h2>Image Hits per Sequence of All Time</h2>
<div bind:this={chartContainer} />

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
