<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';
	import type { GetResType as DayAnalyticsGetResType } from './[beginDate]/[endDate]/+server';
	import type ApexCharts from 'apexcharts';
	import { fly, scale } from 'svelte/transition';
	import { localDateTimeString } from '$lib/util';

	export let data: PageData;

	let chartContainer: HTMLDivElement;
	let mainChart: ApexCharts | undefined;

	let rangeChartContainer: HTMLDivElement;
	let rangeChart: ApexCharts | undefined;
	let showLoadingSpinner = false;
	let selectedRange: { min: Date; max: Date } | undefined;

	$: if (selectedRange) {
		(async () => {
			await showRangeDetails();
		})();
	}

	onMount(async () => {
		await createMainChart();
		await showRangeDetails();
	});

	onDestroy(() => {
		mainChart?.destroy();
		rangeChart?.destroy();
	});

	async function createMainChart() {
		const ApexCharts = await import('apexcharts');

		const min = data.hitsPerDay.at(0);
		const max = data.hitsPerDay.at(data.hitsPerDay.length - 1);
		if (min !== undefined && max !== undefined) {
			selectedRange = {
				min: new Date(min[0]),
				max: new Date(max[0])
			};
		}

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
					autoSelected: 'zoom',
					tools: {
						pan: false
					}
				},
				events: {
					zoomed(chart, options: { xaxis: { min: number | undefined; max: number | undefined } }) {
						// x-axis is undefined when fully zoomed out
						let minDate: Date | undefined;
						let maxDate: Date | undefined;
						if (options.xaxis.min !== undefined && options.xaxis.max !== undefined) {
							selectedRange = {
								min: new Date(options.xaxis.min),
								max: new Date(options.xaxis.max)
							};
						} else {
							const min = data.hitsPerDay.at(0);
							const max = data.hitsPerDay.at(data.hitsPerDay.length - 1);
							if (min !== undefined && max !== undefined) {
								selectedRange = {
									min: new Date(min[0]),
									max: new Date(max[0])
								};
							}
						}
						if (minDate !== undefined && maxDate !== undefined) {
							console.log(localDateTimeString(minDate), localDateTimeString(maxDate));
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
		mainChart = new ApexCharts.default(chartContainer, options);
		mainChart.render();
	}

	async function showRangeDetails() {
		if (selectedRange === undefined) {
			return;
		}
		showLoadingSpinner = true;
		const res = await fetch(
			`/admin/analytics/${selectedRange.min.valueOf()}/${selectedRange.max.valueOf()}`,
			{
				method: 'GET',
				credentials: 'same-origin'
			}
		);
		const resData: DayAnalyticsGetResType = await res.json();
		if (resData.success === true) {
			await createRangeChart(resData.data);
			showLoadingSpinner = false;
		}
		showLoadingSpinner = false;
	}

	async function createRangeChart(
		data: {
			sequenceName: string;
			hits: number;
		}[]
	) {
		if (rangeChart === undefined) {
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

			rangeChart = new ApexCharts.default(rangeChartContainer, options);
			rangeChart.render();
		} else {
			rangeChart.updateSeries(
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
			rangeChart.updateOptions(
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
	<p>Select a range from the top chart to see a detailed breakdown for that selected range</p>
	<h2 style="font-size:24px">Image Hits per Day</h2>
	<div bind:this={chartContainer} />
	{#if selectedRange !== undefined}
		<h2 transition:fly style="font-size:24px">
			Image Hits per Sequence for {localDateTimeString(selectedRange.min)} - {localDateTimeString(
				selectedRange.max
			)}
			{#if showLoadingSpinner}<span transition:scale class="spinner-border"></span>{/if}
		</h2>
	{/if}
	<div bind:this={rangeChartContainer} />
</div>

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
