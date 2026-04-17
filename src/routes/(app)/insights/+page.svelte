<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { insights, insightsLoading, refreshInsights, invalidateInsights } from '$lib/stores/insights';
	import { activeBusinessId } from '$lib/stores/session';
	import type { Insight } from '$lib/utils/insights';

	let invoiceCount = $state(0);

	$effect(() => {
		if ($activeBusinessId) {
			refreshInsights($activeBusinessId);
		}
	});

	// Color mapping by insight type
	function cardStyle(type: Insight['type']): { bg: string; border: string; text: string; icon: string } {
		switch (type) {
			case 'danger':
				return { bg: 'bg-error-container/70', border: 'border-error/20', text: 'text-error', icon: 'text-error' };
			case 'warning':
				return { bg: 'bg-tertiary-container/50', border: 'border-tertiary/20', text: 'text-tertiary', icon: 'text-tertiary' };
			case 'success':
				return { bg: 'bg-secondary-container/60', border: 'border-secondary/20', text: 'text-secondary', icon: 'text-secondary' };
			case 'achievement':
				return { bg: 'bg-primary-container/50', border: 'border-primary/20', text: 'text-primary', icon: 'text-primary' };
			default:
				return { bg: 'bg-surface-container', border: 'border-outline-variant/30', text: 'text-on-surface-variant', icon: 'text-primary' };
		}
	}

	const categories: { key: string; label: string; icon: string; ids: string[] }[] = [
		{
			key: 'collection',
			label: 'Collection & Overdue',
			icon: 'payments',
			ids: ['collection_60plus', 'collection_30_60', 'overdue_invoices', 'excellent_collection', 'good_collection', 'projected_inflow']
		},
		{
			key: 'customer',
			label: 'Customer Health',
			icon: 'group',
			ids: ['churn_risk', 'loyal_customers', 'new_customers', 'inactive', 'low_ticket']
		},
		{
			key: 'cashflow',
			label: 'Cash Flow',
			icon: 'account_balance_wallet',
			ids: ['loss', 'low_margin', 'good_margin', 'high_margin', 'revenue_spike', 'revenue_decline', 'expense_concern', 'seasonal_up']
		},
		{
			key: 'inventory',
			label: 'Inventory',
			icon: 'inventory_2',
			ids: ['stockout_imminent', 'low_stock', 'overstocked']
		}
	];

	function insightsForCategory(ids: string[]): Insight[] {
		return $insights.filter(i => ids.includes(i.id));
	}
</script>

<svelte:head>
	<title>Business Insights | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="mb-6 lg:mb-8 flex items-start justify-between">
	<div>
		<h2 class="text-2xl lg:text-3xl font-headline font-bold text-on-surface">Business Insights</h2>
		<p class="text-on-surface-variant font-body mt-1 text-sm">
			Smart alerts based on your data — updated every time you open this page
		</p>
	</div>
	<button
		onclick={() => { invalidateInsights(); if ($activeBusinessId) refreshInsights($activeBusinessId); }}
		class="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-xl text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all"
		title="Refresh insights"
	>
		<span class="material-symbols-outlined text-base {$insightsLoading ? 'animate-spin' : ''}">refresh</span>
		<span class="hidden sm:inline">Refresh</span>
	</button>
</div>

{#if $insightsLoading}
	<!-- Loading skeleton -->
	<div class="space-y-6">
		{#each [1,2,3,4] as _}
			<div class="animate-pulse">
				<div class="h-5 w-40 bg-surface-container rounded-lg mb-3"></div>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="h-24 bg-surface-container rounded-xl"></div>
					<div class="h-24 bg-surface-container rounded-xl"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if $insights.length === 0}
	<EmptyState
		icon="tips_and_updates"
		title="No insights yet"
		description="Add more invoices and transactions to start seeing smart business alerts."
	/>
{:else}
	<div class="space-y-8">
		{#each categories as cat}
			{@const catInsights = insightsForCategory(cat.ids)}
			{#if catInsights.length > 0}
				<section>
					<div class="flex items-center gap-2 mb-3">
						<span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings:'FILL' 1">{cat.icon}</span>
						<h3 class="text-base font-headline font-bold text-on-surface">{cat.label}</h3>
						<span class="px-2 py-0.5 bg-surface-container rounded-full text-[11px] font-bold text-on-surface-variant">{catInsights.length}</span>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
						{#each catInsights as insight}
							{@const style = cardStyle(insight.type)}
							<div class="{style.bg} border {style.border} rounded-xl p-4 flex items-start gap-3">
								<span class="material-symbols-outlined {style.icon} text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">{insight.icon}</span>
								<div class="flex-1 min-w-0">
									<p class="font-bold text-sm text-on-surface leading-tight">{insight.title}</p>
									<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">{insight.description}</p>
									{#if insight.action}
										<a href={insight.action.href} class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-2 hover:underline">
											{insight.action.label}
											<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
										</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}

		<!-- Any uncategorised insights -->
		{#if $insights.filter(i => !categories.flatMap(c => c.ids).includes(i.id)).length > 0}
		{@const uncategorised = $insights.filter(i => !categories.flatMap(c => c.ids).includes(i.id))}
			<section>
				<div class="flex items-center gap-2 mb-3">
					<span class="material-symbols-outlined text-primary text-xl">auto_awesome</span>
					<h3 class="text-base font-headline font-bold text-on-surface">More Insights</h3>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
					{#each uncategorised as insight}
						{@const style = cardStyle(insight.type)}
						<div class="{style.bg} border {style.border} rounded-xl p-4 flex items-start gap-3">
							<span class="material-symbols-outlined {style.icon} text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">{insight.icon}</span>
							<div class="flex-1 min-w-0">
								<p class="font-bold text-sm text-on-surface leading-tight">{insight.title}</p>
								<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">{insight.description}</p>
								{#if insight.action}
									<a href={insight.action.href} class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-2 hover:underline">
										{insight.action.label}
										<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}
