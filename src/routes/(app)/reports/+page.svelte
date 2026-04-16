<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getRevenueTotal, getExpenseTotal, getOutstandingTotal, getExpensesByCategory, getRevenueByMonth, getExpensesByMonth } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINRCompact, toRupees } from '$lib/utils/currency';
	import { getCachedInvoices, getCachedExpenses } from '$lib/utils/cache';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Chart, registerables } from 'chart.js';
	import { exportInvoicesToCSV, exportExpensesToCSV, exportPaymentsToCSV, exportProductsToCSV, exportCustomersToCSV, triggerDownload } from '$lib/utils/export';

	Chart.register(...registerables);

	async function handleExportInvoices() {
		if (!$activeBusinessId) return;
		const csv = await exportInvoicesToCSV($activeBusinessId);
		triggerDownload(csv, `invoices_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	async function handleExportExpenses() {
		if (!$activeBusinessId) return;
		const csv = await exportExpensesToCSV($activeBusinessId);
		triggerDownload(csv, `expenses_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	async function handleExportPayments() {
		if (!$activeBusinessId) return;
		const csv = await exportPaymentsToCSV($activeBusinessId);
		triggerDownload(csv, `payments_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	async function handleExportProducts() {
		if (!$activeBusinessId) return;
		const csv = await exportProductsToCSV($activeBusinessId);
		triggerDownload(csv, `products_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	async function handleExportCustomers() {
		if (!$activeBusinessId) return;
		const csv = await exportCustomersToCSV($activeBusinessId);
		triggerDownload(csv, `customers_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	let revenue = $state(0);
	let expenses = $state(0);
	let outstanding = $state(0);
	let invoiceCount = $state(0);
	let categoryBreakdown = $state<Record<string, number>>({});
	let revenueByMonth = $state<{ label: string; value: number }[]>([]);
	let expensesByMonth = $state<{ label: string; value: number }[]>([]);
	let loading = $state(true);
	let mounted = $state(false);

	let lineChartCanvas = $state<HTMLCanvasElement | null>(null);
	let doughnutChartCanvas = $state<HTMLCanvasElement | null>(null);
	let lineChart: Chart | null = null;
	let doughnutChart: Chart | null = null;

	let netProfit = $derived(revenue - expenses);

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	const CHART_COLORS = [
		'#6750A4', // primary
		'#625B71', // secondary
		'#7D5260', // tertiary
		'#B3261E', // error
		'#386A7A', // teal accent
		'#8B5CF6', // violet
		'#F59E0B', // amber
		'#10B981', // emerald
		'#EC4899', // pink
	];

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			revenue = await getRevenueTotal(biz.id);
			expenses = await getExpenseTotal(biz.id);
			outstanding = await getOutstandingTotal(biz.id);
			const invs = await getCachedInvoices(biz.id);
			invoiceCount = invs.length;
			categoryBreakdown = await getExpensesByCategory(biz.id);
			revenueByMonth = await getRevenueByMonth(biz.id, 12);
			expensesByMonth = await getExpensesByMonth(biz.id, 12);
		}
		loading = false;
		setTimeout(() => {
			mounted = true;
			renderLineChart();
			renderDoughnutChart();
		}, 150);
	}

	function renderLineChart() {
		if (!lineChartCanvas) return;
		if (lineChart) lineChart.destroy();

		const ctx = lineChartCanvas.getContext('2d');
		if (!ctx) return;

		// Create gradient fill
		const gradient = ctx.createLinearGradient(0, 0, 0, 300);
		gradient.addColorStop(0, 'rgba(103, 80, 164, 0.25)');
		gradient.addColorStop(1, 'rgba(103, 80, 164, 0.00)');

		const expGradient = ctx.createLinearGradient(0, 0, 0, 300);
		expGradient.addColorStop(0, 'rgba(179, 38, 30, 0.15)');
		expGradient.addColorStop(1, 'rgba(179, 38, 30, 0.00)');

		lineChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: revenueByMonth.map(r => r.label),
				datasets: [
					{
						label: 'Revenue',
						data: revenueByMonth.map(r => toRupees(r.value)),
						borderColor: '#6750A4',
						backgroundColor: gradient,
						borderWidth: 2.5,
						fill: true,
						tension: 0.4,
						pointRadius: 4,
						pointBackgroundColor: '#6750A4',
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
						pointHoverRadius: 6,
					},
					{
						label: 'Expenses',
						data: expensesByMonth.map(e => toRupees(e.value)),
						borderColor: '#B3261E',
						backgroundColor: expGradient,
						borderWidth: 2,
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointBackgroundColor: '#B3261E',
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
						pointHoverRadius: 5,
						borderDash: [5, 3],
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					legend: {
						display: true,
						position: 'top',
						align: 'end',
						labels: {
							boxWidth: 12,
							boxHeight: 12,
							useBorderRadius: true,
							borderRadius: 3,
							padding: 20,
							font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const },
							color: '#49454F'
						}
					},
					tooltip: {
						backgroundColor: '#1C1B1F',
						titleFont: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const },
						bodyFont: { family: "'Inter', sans-serif", size: 11 },
						padding: 12,
						cornerRadius: 10,
						displayColors: true,
						callbacks: {
							label: (ctx: any) => ` ₹${ctx.parsed.y.toLocaleString('en-IN')}`
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							font: { family: "'Inter', sans-serif", size: 10, weight: 'bold' as const },
							color: '#79747E',
							maxRotation: 0
						},
						border: { display: false }
					},
					y: {
						grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false },
						ticks: {
							font: { family: "'Inter', sans-serif", size: 10 },
							color: '#79747E',
							padding: 8,
							callback: (v: any) => `₹${(v / 1000).toFixed(0)}k`
						},
						border: { display: false, dash: [4, 4] },
						beginAtZero: true
					}
				}
			}
		});
	}

	function renderDoughnutChart() {
		if (!doughnutChartCanvas) return;
		if (doughnutChart) doughnutChart.destroy();

		const ctx = doughnutChartCanvas.getContext('2d');
		if (!ctx) return;

		const categories = Object.keys(categoryBreakdown);
		const values = Object.values(categoryBreakdown).map(v => toRupees(v));

		if (categories.length === 0) return;

		doughnutChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: categories,
				datasets: [{
					data: values,
					backgroundColor: CHART_COLORS.slice(0, categories.length),
					borderWidth: 0,
					hoverOffset: 8,
					borderRadius: 4,
					spacing: 3,
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '68%',
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							boxWidth: 10,
							boxHeight: 10,
							useBorderRadius: true,
							borderRadius: 2,
							padding: 16,
							font: { family: "'Inter', sans-serif", size: 11, weight: 'normal' as const },
							color: '#49454F'
						}
					},
					tooltip: {
						backgroundColor: '#1C1B1F',
						titleFont: { family: "'Inter', sans-serif", size: 12, weight: 'bold' as const },
						bodyFont: { family: "'Inter', sans-serif", size: 11 },
						padding: 12,
						cornerRadius: 10,
						callbacks: {
							label: (ctx: any) => ` ₹${ctx.parsed.toLocaleString('en-IN')}`
						}
					}
				}
			}
		});
	}
</script>

<svelte:head>
	<title>Reports | Hisaab</title>
</svelte:head>

<div class="mb-8 md:mb-10">
	<h2 class="text-3xl font-headline font-bold text-on-surface">{$_('reports.title')}</h2>
	<p class="text-on-surface-variant font-body mt-1">{$_('reports.subtitle')}</p>
</div>
<div class="flex flex-wrap gap-2">
	<button onclick={handleExportInvoices} class="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors flex items-center gap-1.5">
		<span class="material-symbols-outlined text-sm">receipt_long</span>
		Invoices
	</button>
	<button onclick={handleExportExpenses} class="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors flex items-center gap-1.5">
		<span class="material-symbols-outlined text-sm">payments</span>
		Expenses
	</button>
	<button onclick={handleExportPayments} class="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors flex items-center gap-1.5">
		<span class="material-symbols-outlined text-sm">account_balance</span>
		Payments
	</button>
	<button onclick={handleExportProducts} class="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors flex items-center gap-1.5">
		<span class="material-symbols-outlined text-sm">inventory_2</span>
		Products
	</button>
	<button onclick={handleExportCustomers} class="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors flex items-center gap-1.5">
		<span class="material-symbols-outlined text-sm">people</span>
		Customers
	</button>
</div>
<div class="grid grid-cols-12 gap-6 mb-6">
	<div in:fly={{ y: 20, duration: 400, delay: 150, easing: cubicOut }} class="col-span-6 md:col-span-3 bg-surface-container-lowest p-5 lg:p-6 rounded-xl shadow-sm border border-outline-variant/20">
		<p class="text-[11px] lg:text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">{$_('reports.expenses')}</p>
		<h3 class="text-2xl font-headline font-extrabold text-error">{formatINRCompact(expenses)}</h3>
	</div>
	<div in:fly={{ y: 20, duration: 400, delay: 250, easing: cubicOut }} class="col-span-6 md:col-span-3 bg-surface-container-lowest p-5 lg:p-6 rounded-xl shadow-sm border border-outline-variant/20">
		<p class="text-[11px] lg:text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">{$_('reports.net_profit')}</p>
		<h3 class="text-2xl font-headline font-extrabold {netProfit >= 0 ? 'text-secondary' : 'text-error'}">{formatINRCompact(netProfit)}</h3>
	</div>
	<div in:fly={{ y: 20, duration: 400, delay: 350, easing: cubicOut }} class="col-span-6 md:col-span-3 bg-surface-container-lowest p-5 lg:p-6 rounded-xl shadow-sm border border-outline-variant/20">
		<p class="text-[11px] lg:text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">{$_('reports.outstanding')}</p>
		<h3 class="text-2xl font-headline font-extrabold text-tertiary">{formatINRCompact(outstanding)}</h3>
	</div>
</div>

<!-- Charts -->
<div class="grid grid-cols-12 gap-6 mb-10">
	<!-- Revenue vs Expenses Line Chart -->
	<div in:fly={{ y: 20, duration: 400, delay: 450, easing: cubicOut }} class="col-span-12 lg:col-span-7 bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/10">
		<div class="flex items-center justify-between mb-6">
			<h4 class="font-headline font-bold text-lg">{$_('reports.revenue_trend', { default: 'Revenue vs Expenses' })}</h4>
			<span class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider bg-surface-container-high px-3 py-1 rounded-full">{$_('reports.last_12_months', { default: 'Last 12 Months' })}</span>
		</div>
		<div class="relative h-72">
			<canvas bind:this={lineChartCanvas}></canvas>
		</div>
	</div>

	<!-- Expense Breakdown Doughnut -->
	<div in:fly={{ y: 20, duration: 400, delay: 550, easing: cubicOut }} class="col-span-12 lg:col-span-5 bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/10">
		<div class="flex items-center justify-between mb-6">
			<h4 class="font-headline font-bold text-lg">{$_('reports.expense_breakdown')}</h4>
		</div>
		{#if Object.keys(categoryBreakdown).length === 0}
			<div class="flex flex-col items-center justify-center h-64 text-center">
				<span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">pie_chart</span>
				<p class="text-sm text-on-surface-variant">{$_('reports.no_data')}</p>
			</div>
		{:else}
			<div class="relative h-72">
				<canvas bind:this={doughnutChartCanvas}></canvas>
			</div>
		{/if}
	</div>
</div>

<!-- Volume & Quick Stats -->
<div class="grid grid-cols-12 gap-6">
	<div in:fly={{ y: 20, duration: 400, delay: 650, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
		<div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
			<span class="material-symbols-outlined text-3xl text-primary">receipt_long</span>
		</div>
		<p class="text-4xl font-headline font-extrabold text-on-surface">{invoiceCount}</p>
		<p class="text-xs text-on-surface-variant mt-2 font-semibold uppercase tracking-wider">{$_('reports.total_invoices')}</p>
	</div>
	<div in:fly={{ y: 20, duration: 400, delay: 750, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
		<div class="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
			<span class="material-symbols-outlined text-3xl text-secondary">trending_up</span>
		</div>
		<p class="text-4xl font-headline font-extrabold text-on-surface">{revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0}%</p>
		<p class="text-xs text-on-surface-variant mt-2 font-semibold uppercase tracking-wider">{$_('reports.profit_margin', { default: 'Profit Margin' })}</p>
	</div>
	<div in:fly={{ y: 20, duration: 400, delay: 850, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
		<div class="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center mb-4">
			<span class="material-symbols-outlined text-3xl text-on-tertiary-fixed-variant">avg_pace</span>
		</div>
		<p class="text-4xl font-headline font-extrabold text-on-surface">{invoiceCount > 0 ? formatINRCompact(Math.round(revenue / invoiceCount)) : '₹0'}</p>
		<p class="text-xs text-on-surface-variant mt-2 font-semibold uppercase tracking-wider">{$_('reports.avg_invoice', { default: 'Avg. Invoice Value' })}</p>
	</div>
</div>
