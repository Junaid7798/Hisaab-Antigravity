<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getInvoices, getExpenses, getProducts, getPatients, getRevenueTotal, getExpenseTotal, getOutstandingTotal, getExpensesByMonth, getRevenueByMonth } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINR, formatINRCompact, toRupees } from '$lib/utils/currency';
	import { fly, fade } from 'svelte/transition';
	import type { Invoice, Expense, Product, Patient } from '$lib/db/index';

	let loading = $state(true);
	let revenue = $state(0);
	let expenses = $state(0);
	let outstanding = $state(0);
	let invoices = $state<Invoice[]>([]);
	let expenseList = $state<Expense[]>([]);
	let products = $state<Product[]>([]);
	let patients = $state<Patient[]>([]);
	let revenueByMonth = $state<{ label: string; value: number }[]>([]);
	let expensesByMonth = $state<{ label: string; value: number }[]>([]);

	// ─── Derived Intelligence Metrics ─────────────────────────────────────────
	let netProfit = $derived(revenue - expenses);
	let profitMargin = $derived(revenue > 0 ? ((netProfit / revenue) * 100) : 0);

	// Cash Flow Runway: months of expenses covered by current profit
	let avgMonthlyExpense = $derived.by(() => {
		const vals = expensesByMonth.map(e => e.value).filter(v => v > 0);
		return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
	});
	let cashRunwayMonths = $derived(avgMonthlyExpense > 0 ? Math.round(netProfit / avgMonthlyExpense) : Infinity);

	// Anomaly Detection: Is this month's expense > 2x average?
	let currentMonthExpense = $derived(expensesByMonth.length > 0 ? expensesByMonth[expensesByMonth.length - 1].value : 0);
	let expenseAnomaly = $derived(avgMonthlyExpense > 0 && currentMonthExpense > avgMonthlyExpense * 2);

	// Revenue Trend: comparing last 2 months
	let revenueTrend = $derived.by(() => {
		if (revenueByMonth.length < 2) return 'neutral';
		const last = revenueByMonth[revenueByMonth.length - 1].value;
		const prev = revenueByMonth[revenueByMonth.length - 2].value;
		if (prev === 0) return last > 0 ? 'up' : 'neutral';
		const pctChange = ((last - prev) / prev) * 100;
		if (pctChange > 5) return 'up';
		if (pctChange < -5) return 'down';
		return 'neutral';
	});
	let revenueTrendPct = $derived.by(() => {
		if (revenueByMonth.length < 2) return 0;
		const last = revenueByMonth[revenueByMonth.length - 1].value;
		const prev = revenueByMonth[revenueByMonth.length - 2].value;
		if (prev === 0) return last > 0 ? 100 : 0;
		return Math.round(((last - prev) / prev) * 100);
	});

	// Low Stock Alerts
	let lowStockItems = $derived(products.filter(p => !p.is_service && p.stock_quantity <= p.low_stock_threshold));

	// Top Customers by Revenue
	let topCustomers = $derived.by(() => {
		const map = new Map<string, { name: string; total: number }>();
		for (const inv of invoices) {
			if (inv.document_type !== 'INVOICE') continue;
			const pat = patients.find(p => p.id === inv.patient_id);
			const name = pat?.name || 'Unknown';
			const existing = map.get(inv.patient_id) || { name, total: 0 };
			existing.total += inv.grand_total;
			map.set(inv.patient_id, existing);
		}
		return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
	});

	// Overdue invoices
	let overdueInvoices = $derived.by(() => {
		const today = new Date().toISOString().split('T')[0];
		return invoices.filter(inv =>
			inv.document_type === 'INVOICE' &&
			inv.status !== 'PAID' &&
			inv.due_date &&
			inv.due_date < today
		);
	});

	// Average sale value
	let avgSaleValue = $derived.by(() => {
		const salesInvoices = invoices.filter(i => i.document_type === 'INVOICE');
		if (salesInvoices.length === 0) return 0;
		return salesInvoices.reduce((s, i) => s + i.grand_total, 0) / salesInvoices.length;
	});

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			revenue = await getRevenueTotal(biz.id);
			expenses = await getExpenseTotal(biz.id);
			outstanding = await getOutstandingTotal(biz.id);
			invoices = await getInvoices(biz.id);
			expenseList = await getExpenses(biz.id);
			products = await getProducts(biz.id);
			patients = await getPatients(biz.id);
			revenueByMonth = await getRevenueByMonth(biz.id, 6);
			expensesByMonth = await getExpensesByMonth(biz.id, 6);
		}
		loading = false;
	}

	function getHealthScore(): { score: number; label: string; color: string } {
		let score = 50; // baseline
		
		if (netProfit > 0) score += 15;
		if (profitMargin > 20) score += 10;
		if (cashRunwayMonths > 3) score += 10;
		if (overdueInvoices.length === 0) score += 10;
		if (lowStockItems.length === 0) score += 5;
		
		if (expenseAnomaly) score -= 15;
		if (overdueInvoices.length > 5) score -= 10;
		if (netProfit < 0) score -= 20;
		
		score = Math.max(0, Math.min(100, score));
		
		if (score >= 80) return { score, label: 'Excellent', color: 'text-emerald-400' };
		if (score >= 60) return { score, label: 'Good', color: 'text-blue-400' };
		if (score >= 40) return { score, label: 'Fair', color: 'text-amber-400' };
		return { score, label: 'Needs Attention', color: 'text-red-400' };
	}

	let health = $derived(getHealthScore());
</script>

<svelte:head>
	<title>Business Intelligence | Hisaab</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-96">
		<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
	</div>
{:else}
	<div class="max-w-7xl mx-auto space-y-8 pb-16" in:fade={{ duration: 300 }}>
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">{$_('analytics.title', { default: 'Business Intelligence' })}</h1>
				<p class="text-on-surface-variant font-body mt-1">{$_('analytics.subtitle', { default: 'AI-powered insights into your business performance' })}</p>
			</div>
			<div class="text-right">
				<div class="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">{$_('analytics.health_score', { default: 'Health Score' })}</div>
				<div class="text-4xl font-headline font-extrabold {health.color}">{health.score}</div>
				<div class="text-xs font-bold {health.color}">{health.label}</div>
			</div>
		</div>

		<!-- Smart Feed: Alerts & Notifications -->
		{#if expenseAnomaly || overdueInvoices.length > 0 || lowStockItems.length > 0}
			<div class="space-y-3" in:fly={{ y: 20, duration: 400 }}>
				<h2 class="text-sm font-label font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-amber-400">notifications_active</span>
					{$_('analytics.smart_alerts', { default: 'Smart Alerts' })}
				</h2>

				{#if expenseAnomaly}
					<div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
						<span class="material-symbols-outlined text-red-400 mt-0.5">warning</span>
						<div>
							<p class="font-bold text-sm text-red-400">{$_('analytics.expense_anomaly', { default: 'Expense Anomaly Detected' })}</p>
							<p class="text-xs text-on-surface-variant mt-0.5">This month's expenses ({formatINRCompact(toRupees(currentMonthExpense))}) are more than 2x your average ({formatINRCompact(toRupees(avgMonthlyExpense))}). Review your recent spending.</p>
						</div>
					</div>
				{/if}

				{#if overdueInvoices.length > 0}
					<div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
						<span class="material-symbols-outlined text-amber-400 mt-0.5">schedule</span>
						<div>
							<p class="font-bold text-sm text-amber-400">{overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}</p>
							<p class="text-xs text-on-surface-variant mt-0.5">Total overdue: {formatINR(overdueInvoices.reduce((s, i) => s + i.grand_total, 0))}. Follow up with clients to improve cash flow.</p>
						</div>
					</div>
				{/if}

				{#if lowStockItems.length > 0}
					<div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
						<span class="material-symbols-outlined text-blue-400 mt-0.5">inventory</span>
						<div>
							<p class="font-bold text-sm text-blue-400">{lowStockItems.length} Item{lowStockItems.length > 1 ? 's' : ''} Low on Stock</p>
							<p class="text-xs text-on-surface-variant mt-0.5">
								{lowStockItems.slice(0, 3).map(p => p.name).join(', ')}{lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
							</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- KPI Cards -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 100, duration: 400 }}>
				<p class="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant/60">Cash Runway</p>
				<p class="text-2xl font-headline font-extrabold text-on-surface mt-1">
					{cashRunwayMonths === Infinity ? '∞' : cashRunwayMonths}
					<span class="text-sm font-normal text-on-surface-variant">months</span>
				</p>
			</div>
			<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 150, duration: 400 }}>
				<p class="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant/60">Profit Margin</p>
				<p class="text-2xl font-headline font-extrabold {profitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'} mt-1">
					{profitMargin.toFixed(1)}%
				</p>
			</div>
			<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 200, duration: 400 }}>
				<p class="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant/60">Revenue Trend</p>
				<div class="flex items-center gap-2 mt-1">
					<span class="material-symbols-outlined text-xl {revenueTrend === 'up' ? 'text-emerald-400' : revenueTrend === 'down' ? 'text-red-400' : 'text-on-surface-variant'}">
						{revenueTrend === 'up' ? 'trending_up' : revenueTrend === 'down' ? 'trending_down' : 'trending_flat'}
					</span>
					<span class="text-2xl font-headline font-extrabold {revenueTrend === 'up' ? 'text-emerald-400' : revenueTrend === 'down' ? 'text-red-400' : 'text-on-surface-variant'}">
						{revenueTrendPct > 0 ? '+' : ''}{revenueTrendPct}%
					</span>
				</div>
			</div>
			<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 250, duration: 400 }}>
				<p class="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant/60">Avg Sale Value</p>
				<p class="text-2xl font-headline font-extrabold text-on-surface mt-1">{formatINR(avgSaleValue)}</p>
			</div>
		</div>

		<!-- Revenue Sparkline (text-based) -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Revenue by Month -->
			<div class="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 300, duration: 400 }}>
				<h3 class="text-sm font-label font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">6-Month Revenue</h3>
				<div class="space-y-2">
					{#each revenueByMonth as month}
						{@const maxVal = Math.max(...revenueByMonth.map(m => m.value), 1)}
						{@const pct = (month.value / maxVal) * 100}
						<div class="flex items-center gap-3">
							<span class="text-xs font-mono text-on-surface-variant w-14 shrink-0">{month.label}</span>
							<div class="flex-1 bg-surface-container-low rounded-full h-4 overflow-hidden">
								<div class="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500" style="width: {pct}%"></div>
							</div>
							<span class="text-xs font-bold text-on-surface w-20 text-right shrink-0">{formatINRCompact(toRupees(month.value))}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Expenses by Month -->
			<div class="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 350, duration: 400 }}>
				<h3 class="text-sm font-label font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">6-Month Expenses</h3>
				<div class="space-y-2">
					{#each expensesByMonth as month}
						{@const maxVal = Math.max(...expensesByMonth.map(m => m.value), 1)}
						{@const pct = (month.value / maxVal) * 100}
						<div class="flex items-center gap-3">
							<span class="text-xs font-mono text-on-surface-variant w-14 shrink-0">{month.label}</span>
							<div class="flex-1 bg-surface-container-low rounded-full h-4 overflow-hidden">
								<div class="h-full bg-gradient-to-r from-error/50 to-error rounded-full transition-all duration-500" style="width: {pct}%"></div>
							</div>
							<span class="text-xs font-bold text-on-surface w-20 text-right shrink-0">{formatINRCompact(toRupees(month.value))}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Top Customers & Low Stock -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Top Customers -->
			<div class="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 400, duration: 400 }}>
				<h3 class="text-sm font-label font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-primary">star</span>
					Top {$activeTerminology.people}
				</h3>
				{#if topCustomers.length === 0}
					<p class="text-sm text-on-surface-variant">No sales data yet.</p>
				{:else}
					<div class="divide-y divide-surface-container-low">
						{#each topCustomers as cust, i}
							<div class="flex items-center justify-between py-3">
								<div class="flex items-center gap-3">
									<div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
									<span class="text-sm font-medium">{cust.name}</span>
								</div>
								<span class="text-sm font-bold text-on-surface">{formatINR(cust.total)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Low Stock -->
			<div class="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm" in:fly={{ y: 20, delay: 450, duration: 400 }}>
				<h3 class="text-sm font-label font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-error">inventory_2</span>
					Low Stock Watchlist
				</h3>
				{#if lowStockItems.length === 0}
					<div class="text-center py-8">
						<span class="material-symbols-outlined text-4xl text-emerald-400 mb-2">verified</span>
						<p class="text-sm text-on-surface-variant">All items are well-stocked.</p>
					</div>
				{:else}
					<div class="divide-y divide-surface-container-low">
						{#each lowStockItems as item}
							{@const pct = Math.round((item.stock_quantity / Math.max(item.low_stock_threshold, 1)) * 100)}
							<div class="py-3 space-y-1.5">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">{item.name}</span>
									<span class="text-xs font-bold {pct <= 25 ? 'text-red-400' : 'text-amber-400'}">{(item.stock_quantity / 100).toFixed(0)} {item.unit}</span>
								</div>
								<div class="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
									<div class="h-full rounded-full transition-all {pct <= 25 ? 'bg-red-400' : 'bg-amber-400'}" style="width: {Math.min(pct, 100)}%"></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
