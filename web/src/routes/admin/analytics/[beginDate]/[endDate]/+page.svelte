<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';
	import type ApexCharts from 'apexcharts';
	import { fly, scale } from 'svelte/transition';
	import { localDateTimeString } from '$lib/util';
	import { afterNavigate, goto } from '$app/navigation';
	import urlJoin from 'url-join';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';

	export let data: PageData;

	let lineChartContainer: HTMLDivElement;
	let lineChart: ApexCharts | null = null;

	let barChartContainer: HTMLDivElement;
	let barChart: ApexCharts | null = null;

	let showLoadingSpinner = false;

	afterNavigate(() => {
		if (lineChart !== null) {
			updateLineChart();
		}
		if (barChart !== null) {
			updateBarChart();
		}
		updateHeatmap();
	});

	onMount(async () => {
		await createLineChart();
		lineChart?.zoomX(data.selectedMinDate.valueOf(), data.selectedMaxDate.valueOf());
		await createBarChart();
		createHeatmap();
	});

	onDestroy(() => {
		lineChart?.destroy();
		barChart?.destroy();
		heatmap?.remove();
	});

	type DateRange = { min: Date; max: Date };

	async function createLineChart() {
		const ApexCharts = await import('apexcharts');

		const options: ApexOptions = {
			theme: {
				mode: 'dark'
			},
			colors: ['#6ab03e'],
			series: [
				{
					name: 'Image Hits',
					data: data.lineChartData
				}
			],
			chart: {
				animations: {
					enabled: false
				},
				type: 'area',
				stacked: false,
				height: 250,
				zoom: {
					type: 'x',
					enabled: true,
					autoScaleYaxis: true
				},
				toolbar: {
					autoSelected: 'zoom',
					tools: {
						pan: false,
						reset: false
					}
				},
				events: {
					zoomed(_chart, options: { xaxis: { min: number | undefined; max: number | undefined } }) {
						if (options.xaxis.min !== undefined && options.xaxis.max !== undefined) {
							gotoRange({
								min: new Date(options.xaxis.min),
								max: new Date(options.xaxis.max)
							});
						}
					}
				}
			},
			dataLabels: {
				enabled: false
			},
			markers: {
				size: 0
			},
			fill: {
				type: 'gradient',
				gradient: {
					shadeIntensity: 0.1,
					inverseColors: false,
					opacityFrom: 0.8,
					opacityTo: 0.5,
					stops: [0, 90, 100]
				}
			},
			yaxis: {
				title: {
					text: 'Image Hits'
				}
			},
			xaxis: {
				type: 'datetime',
				labels: {
					datetimeUTC: false
				},
				tooltip: {
					enabled: false
				}
			},
			tooltip: {
				shared: false
			}
		};
		lineChart = new ApexCharts.default(lineChartContainer, options);
		lineChart.render();
	}

	async function createBarChart() {
		const ApexCharts = await import('apexcharts');
		var options: ApexOptions = {
			theme: {
				mode: 'dark'
			},
			colors: ['#6ab03e'],
			series: [
				{
					name: 'Image Hits',
					data: data.barChartData.map((d) => {
						return d.hits;
					})
				}
			],
			chart: {
				type: 'bar',
				height: Math.max(data.barChartData.length * 30, 200)
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
				categories: data.barChartData.map((d) => {
					return d.sequenceName;
				})
			}
		};

		barChart = new ApexCharts.default(barChartContainer, options);
		barChart.render();
	}

	async function updateLineChart() {
		if (lineChart === null) {
			console.warn('Unable to update null line chart');
			return;
		}
		lineChart.updateSeries([
			{
				name: 'Image Hits',
				data: data.lineChartData
			}
		]);
	}

	async function updateBarChart() {
		if (barChart === null) {
			console.warn('Unable to update null bar chart');
			return;
		}
		barChart.updateSeries(
			[
				{
					name: 'Image Hits',
					data: data.barChartData.map((d) => {
						return d.hits;
					})
				}
			],
			true
		);
		barChart.updateOptions(
			{
				chart: { height: Math.max(data.barChartData.length * 30, 200) },
				xaxis: {
					categories: data.barChartData.map((d) => {
						return d.sequenceName;
					})
				}
			} satisfies ApexOptions,
			true,
			true
		);
	}

	let currentRange: DateRange = {
		min: new Date($page.params.beginDate),
		max: new Date($page.params.endDate)
	};
	function gotoRange(range: DateRange) {
		console.log(currentRange, range);
		if (
			range.min.valueOf() === currentRange.min.valueOf() &&
			range.max.valueOf() === currentRange.max.valueOf()
		) {
			return;
		}
		currentRange = range;
		goto(urlJoin('/admin/analytics', range.min.toISOString(), range.max.toISOString()), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	const presetRanges = ['Max', 'Year', '6-Month', 'Month', 'Week', 'Day'] as const;
	type PresetRange = (typeof presetRanges)[number];
	function onPresetRange(range: PresetRange) {
		const updateRange = (range: DateRange) => {
			gotoRange(range);
			lineChart?.zoomX(range.min.valueOf(), range.max.valueOf());
		};
		const now = new Date();
		switch (range) {
			case 'Max':
				if (data.minDate !== null && data.maxDate !== null) {
					updateRange({ min: data.minDate, max: data.maxDate });
				}
				break;
			case 'Year':
				updateRange({ min: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), max: now });
				break;
			case '6-Month':
				updateRange({
					min: new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000),
					max: now
				});
				break;
			case 'Month':
				updateRange({ min: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), max: now });
				break;
			case 'Week':
				updateRange({ min: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), max: now });
				break;
			case 'Day':
				updateRange({ min: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), max: now });
				break;
		}
	}

	let mapContainer: HTMLDivElement;
	let heatmap: mapboxgl.Map | null = null;
	function createHeatmap() {
		heatmap = new mapboxgl.Map({
			accessToken: env.PUBLIC_TV_MAPBOX_KEY,
			container: mapContainer,
			style: 'mapbox://styles/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn?optimize=true',
			center: [-81.682665, 41.4097766],
			zoom: 9.5,
			pitchWithRotate: false,
			dragRotate: false,
			touchPitch: false,
			boxZoom: false
		});
		const nav = new mapboxgl.NavigationControl({
			showCompass: false,
			showZoom: true,
			visualizePitch: false
		});
		heatmap.addControl(nav, 'bottom-right');
		heatmap.on('load', () => {
			addHeatmapLayer();
			zoomFitHeatmap();
		});
	}

	function addHeatmapLayer() {
		heatmap?.addSource('image_hits_src', {
			type: 'geojson',
			data: data.heatmapGeoJson
		});
		heatmap?.addLayer({
			id: 'image_hits',
			type: 'heatmap',
			source: 'image_hits_src',
			paint: {
				'heatmap-weight': {
					property: 'hits',
					type: 'exponential',
					stops: [
						[1, 0],
						[30, 1]
					]
				},
				// increase intensity as zoom level increases
				'heatmap-intensity': {
					type: 'exponential',
					stops: [
						[15, 1],
						[22, 10]
					]
				},
				// assign color values be applied to points depending on their density
				'heatmap-color': [
					'interpolate',
					['linear'],
					['heatmap-density'],
					0,
					'rgba(55,255,0,0)',
					0.2,
					'rgb(196,238,71)',
					0.4,
					'rgb(250,220,76)',
					0.6,
					'rgb(221,110,39)',
					0.8,
					'rgb(224,36,55)'
				],
				'heatmap-radius': {
					stops: [
						[11, 15],
						[15, 20]
					]
				}
			}
		});
	}

	function updateHeatmap() {
		if (heatmap === null) {
			return;
		}
		heatmap.removeLayer('image_hits');
		heatmap.removeSource('image_hits_src');
		addHeatmapLayer();
		zoomFitHeatmap();
	}

	function zoomFitHeatmap() {
		const bounds = new mapboxgl.LngLatBounds();
		data.heatmapGeoJson.features.forEach((f) => {
			bounds.extend(f.geometry.coordinates);
		});
		heatmap?.fitBounds(bounds, { padding: 20 });
	}
</script>

<svelte:head>
	<title>TrailView Analytics</title>
</svelte:head>

<div class="px-5 mt-3 h-100 w-100 overflow-y-auto">
	<p>Select a range from the top chart to see a detailed breakdown for that selected range</p>
	<h2 style="font-size:24px">Image Hits per Day</h2>
	<div class="d-flex flex-row-reverse">
		<div class="btn-group btn-group-sm">
			{#each presetRanges as range}
				<button
					on:click={() => {
						onPresetRange(range);
					}}
					type="button"
					class="btn btn-outline-secondary">{range}</button
				>
			{/each}
		</div>
	</div>
	<div bind:this={lineChartContainer} />
	<h2 transition:fly style="font-size:24px">
		Image Hits per Sequence for {localDateTimeString(data.selectedMinDate)} - {localDateTimeString(
			data.selectedMaxDate
		)}
		{#if showLoadingSpinner}<span transition:scale class="spinner-border"></span>{/if}
	</h2>
	<div class="d-flex flex-row">
		<div bind:this={barChartContainer} class="w-50" />
		<div class="w-50">
			<div bind:this={mapContainer} style="height:500px" />
		</div>
	</div>
</div>

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
