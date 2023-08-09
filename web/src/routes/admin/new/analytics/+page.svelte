<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';
	import type { PageData } from './$types';
	import type { GetResType as DayAnalyticsGetResType } from './[dateValue]/+server';
	import type ApexCharts from 'apexcharts';

	export let data: PageData;

	let chartContainer: HTMLDivElement;
	let mainChart: ApexCharts | undefined;

	let dayChartContainer: HTMLDivElement;
	let dayChart: ApexCharts | undefined;

	onMount(async () => {
		await createMainChart();

		// const sequenceAnalyticsMap = new Map<string, number>();
		// data.analytics.forEach((a) => {
		// 	const val = sequenceAnalyticsMap.get(a.image.sequence.name);
		// 	if (val !== undefined) {
		// 		sequenceAnalyticsMap.set(a.image.sequence.name, val + a.count);
		// 	} else {
		// 		sequenceAnalyticsMap.set(a.image.sequence.name, a.count);
		// 	}
		// });

		// const sortedSequenceAnalytics = Array.from(sequenceAnalyticsMap.entries()).sort((a, b) => {
		// 	return b[1] - a[1];
		// });

		// var options: ApexOptions = {
		// 	theme: {
		// 		mode: 'dark'
		// 	},
		// 	colors: ['#6ab03e'],
		// 	series: [
		// 		{
		// 			name: 'Image Hits',
		// 			data: sortedSequenceAnalytics.map((a) => {
		// 				return a[1];
		// 			})
		// 		}
		// 	],
		// 	chart: {
		// 		type: 'bar',
		// 		height: 600
		// 	},
		// 	plotOptions: {
		// 		bar: {
		// 			borderRadius: 4,
		// 			horizontal: true
		// 		}
		// 	},
		// 	dataLabels: {
		// 		enabled: true
		// 	},
		// 	xaxis: {
		// 		categories: sortedSequenceAnalytics.map((a) => {
		// 			return a[0];
		// 		})
		// 	}
		// };

		// var chart = new ApexCharts.default(chartContainer, options);
		// chart.render();
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
				height: 350,
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
						const selectedDay = new Date(data.hitsPerDay[options.dataPointIndex as number][0]);
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
		const res = await fetch(`/admin/new/analytics/${day.valueOf()}`, {
			method: 'GET',
			credentials: 'same-origin'
		});
		const resData: DayAnalyticsGetResType = await res.json();
		if (resData.success === true) {
			createDayChart(resData.data);
		}
	}

	function createDayChart(
		data: {
			sequenceName: string;
			hits: number;
		}[]
	) {}
</script>

<svelte:head>
	<title>TrailView Analytics</title>
</svelte:head>

<div class="mt-3 container h-100">
	<h2 style="font-size:24px">Image Hits per Day</h2>
	<div bind:this={chartContainer} />
	<div bind:this={dayChartContainer} />
</div>

<style lang="scss">
	:global(.apexcharts-svg) {
		background-color: transparent !important;
	}
</style>
