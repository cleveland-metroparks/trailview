<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';
	import type { GetResType as DayAnalyticsGetResType } from './[dateValue]/+server';
	import type ApexCharts from 'apexcharts';
	import { fly, scale } from 'svelte/transition';

	export let data: PageData;

	let chartContainer: HTMLDivElement;
	let mainChart: ApexCharts | undefined;

	let selectedDay: Date;
	let dayChartContainer: HTMLDivElement;
	let dayChart: ApexCharts | undefined;
	let showLoadingSpinner = false;

	onMount(async () => {
		await createMainChart();
	});

	onDestroy(() => {
		mainChart?.destroy();
		dayChart?.destroy();
	});

	async function createMainChart() {
		const ApexCharts = await import('apexcharts');

		const options: ApexOptions = {
			theme: {
				mode: 'dark'
			},
			colors: ['#6ab03e'],
			series: [
				{
					name: 'Image Hits',
					data: data.hitsPerDay
				}
			],
			chart: {
				type: 'area',
				stacked: false,
				height: 250,
				zoom: {
					type: 'x',
					enabled: true,
					autoScaleYaxis: false
				},
				toolbar: {
					autoSelected: 'zoom'
				},
				events: {
					markerClick(e, chart, options) {
						const day = new Date(data.hitsPerDay[options.dataPointIndex as number][0]);
						selectedDay = day;
						showDayDetails(selectedDay);
					}
				}
			},
			dataLabels: {
				enabled: false
			},
			markers: {
				size: 4
			},
			fill: {
				type: 'gradient',
				gradient: {
					shadeIntensity: 1,
					inverseColors: false,
					opacityFrom: 0.5,
					opacityTo: 0,
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
				tooltip: {
					enabled: false
				}
			},
			tooltip: {
				shared: false
			}
		};
		mainChart = new ApexCharts.default(chartContainer, options);
		mainChart.render();
	}

	async function showDayDetails(day: Date) {
		showLoadingSpinner = true;
		const res = await fetch(`/admin/new/analytics/${day.valueOf()}`, {
			method: 'GET',
			credentials: 'same-origin'
		});
		const resData: DayAnalyticsGetResType = await res.json();
		if (resData.success === true) {
			await createDayChart(resData.data);
			showLoadingSpinner = false;
		}
		showLoadingSpinner = false;
	}

	async function createDayChart(
		data: {
			sequenceName: string;
			hits: number;
		}[]
	) {
		if (dayChart === undefined) {
			const ApexCharts = await import('apexcharts');
			var options: ApexOptions = {
				theme: {
					mode: 'dark'
				},
				colors: ['#6ab03e'],
				series: [
					{
						name: 'Image Hits',
						data: data.map((a) => {
							return a.hits;
						})
					}
				],
				chart: {
					type: 'bar',
					height: Math.max(data.length * 30, 200)
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
					categories: data.map((a) => {
						return a.sequenceName;
					})
				}
			};

			dayChart = new ApexCharts.default(dayChartContainer, options);
			dayChart.render();
		} else {
			dayChart.updateSeries(
				[
					{
						name: 'Image Hits',
						data: data.map((a) => {
							return a.hits;
						})
					}
				],
				true
			);
			dayChart.updateOptions(
				{
					chart: { height: Math.max(data.length * 30, 200) },
					xaxis: {
						categories: data.map((a) => {
							return a.sequenceName;
						})
					}
				} as ApexOptions,
				true,
				true
			);
		}
	}
</script>

<svelte:head>
	<title>TrailView Analytics</title>
</svelte:head>

<div class="px-5 mt-3 h-100 w-100 overflow-y-auto">
	<p>Click on the dots on the graph to see a detailed view of image hits per sequence</p>
	<h2 style="font-size:24px">Image Hits per Day</h2>
	<div bind:this={chartContainer} />
	{#if selectedDay !== undefined}
		<h2 transition:fly style="font-size:24px">
			Image Hits per Sequence on {selectedDay.toLocaleDateString()}
			{#if showLoadingSpinner}<span transition:scale class="spinner-border"></span>{/if}
		</h2>
	{/if}
	<div bind:this={dayChartContainer} />
</div>

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
