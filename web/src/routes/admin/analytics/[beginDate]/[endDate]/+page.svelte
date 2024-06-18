<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';
	import type ApexCharts from 'apexcharts';
	import { fly, scale } from 'svelte/transition';
	import { localDateTimeString } from '$lib/util';
	import { afterNavigate, goto } from '$app/navigation';
	import urlJoin from 'url-join';

	export let data: PageData;

	let lineChartContainer: HTMLDivElement;
	let lineChart: ApexCharts | null = null;

	let barChartContainer: HTMLDivElement;
	let barChart: ApexCharts | null = null;

	let showLoadingSpinner = false;

	afterNavigate(() => {
		if (barChart !== null) {
			updateBarChart();
		}
	});

	onMount(async () => {
		await createLineChart();
		lineChart?.zoomX(data.selectedMinDate.valueOf(), data.selectedMaxDate.valueOf());
		await createBarChart();
		// await onRangeUpdate();
	});

	onDestroy(() => {
		lineChart?.destroy();
		barChart?.destroy();
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

	// 	lineChart?.zoomX(selectedRange.min.valueOf(), selectedRange.max.valueOf());
	// 	showLoadingSpinner = true;
	// 	const res = await fetch(
	// 		`/admin/analytics/${selectedRange.min.valueOf()}/${selectedRange.max.valueOf()}`,
	// 		{
	// 			method: 'GET',
	// 			credentials: 'same-origin'
	// 		}
	// 	);
	// 	const resData = await res.json();
	// 	if (resData.success === true) {
	// 		if (barChart === null) {
	// 			await createBarChart(resData.data);
	// 		} else {
	// 			await updateBarChart(resData.data);
	// 		}
	// 		showLoadingSpinner = false;
	// 	}
	// 	showLoadingSpinner = false;
	// }

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

	function gotoRange(range: DateRange) {
		goto(urlJoin('/admin/analytics', range.min.toISOString(), range.max.toISOString()), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
		// replaceState(urlJoin('/admin/analytics', range.min.toISOString(), range.max.toISOString()), '');
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
				updateRange({ min: data.minDate, max: data.maxDate });
				break;
			case 'Year':
				updateRange({ min: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), max: now });
				break;
			case '6-Month':
				updateRange({
					min: new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000),
					max: data.maxDate
				});
				break;
			case 'Month':
				updateRange({ min: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), max: data.maxDate });
				break;
			case 'Week':
				updateRange({ min: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), max: data.maxDate });
				break;
			case 'Day':
				updateRange({ min: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), max: data.maxDate });
				break;
		}
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
	<div bind:this={barChartContainer} />
</div>

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
