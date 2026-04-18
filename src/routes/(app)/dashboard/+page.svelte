<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { getBusiness, getDashboardData } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { topInsight, refreshInsights } from '$lib/stores/insights';
	import { formatINRCompact, formatINR } from '$lib/utils/currency';
	import { formatDate, timeAgo } from '$lib/utils/helpers';
	import { fly, fade } from 'svelte/transition';
	import { preferences } from '$lib/stores/preferences';
	import { cubicOut } from 'svelte/easing';

	let revenue = $state(0);
	let outstanding = $state(0);
	let patientCount = $state(0);
	let recentInvoices = $state<any[]>([]);
	let businessName = $state('');
	let loading = $state(true);
	let bannerDismissed = $state(false);

	let lowStockProducts = $state<any[]>([]);
	let overdueInvoices = $state<any[]>([]);
	let revenueChange = $state<number | null>(null);
	let slowMovingProducts = $state<any[]>([]);
	let pendingLeaveCount = $state(0);
	let longOverdueCount = $state(0);
	let longOverdueAmount = $state(0);

	async function loadDashboard(businessId: string) {
		loading = true;
		const [biz, data] = await Promise.all([
			getBusiness(businessId),
			getDashboardData(businessId)
		]);
		if (biz) businessName = biz.name;
		revenue = data.revenue;
		outstanding = data.outstanding;
		patientCount = data.patientCount;
		recentInvoices = data.recentInvoices;
		lowStockProducts = data.lowStock;
		overdueInvoices = data.overdueInvoices;
		revenueChange = data.revenueChangePercentage;
		slowMovingProducts = data.slowMovingProducts;
		pendingLeaveCount = data.pendingLeaveCount;
		longOverdueCount = data.longOverdueCount;
		longOverdueAmount = data.longOverdueAmount;
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadDashboard($activeBusinessId);
			refreshInsights($activeBusinessId);
			bannerDismissed = false;
		}
	});
	
	onMount(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'visible' && $activeBusinessId) {
				loadDashboard($activeBusinessId);
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	});
</script>

<svelte:head>
	<title>Dashboard | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="mb-3 lg:mb-8 flex items-center justify-between">
	<div>
		<h2 class="text-base font-headline font-bold text-on-surface lg:text-2xl">{businessName || 'Dashboard'}</h2>
		<p class="text-on-surface-variant text-xs mt-0.5 lg:text-sm">
			{#if businessName}Financial performance{:else}Welcome to Hisaab{/if}
		</p>
	</div>
	<a href="/invoices/new" class="shrink-0 flex items-center gap-1.5 bg-primary text-on-primary rounded-xl font-bold shadow-md shadow-primary/20 px-3 py-2 text-sm active:scale-95 transition-all lg:hidden">
		<span class="material-symbols-outlined text-base">add</span>
		New
	</a>
</div>

<!-- Metrics -->
{#if loading}
	<div class="grid grid-cols-12 gap-6 mb-10">
		{#each [0,1,2] as _}
			<div class="col-span-12 sm:col-span-6 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
				<Skeleton width="60%" height="0.75rem" class="mb-4" />
				<Skeleton width="45%" height="2rem" />
			</div>
		{/each}
	</div>
	<div class="grid grid-cols-12 gap-6">
		<div class="col-span-12 lg:col-span-8 bg-surface-container-lowest p-6 rounded-xl">
			<Skeleton width="30%" height="1.25rem" class="mb-6" />
			{#each [0,1,2,3] as _}
				<div class="flex items-center gap-4 py-4">
					<Skeleton width="2.5rem" height="2.5rem" rounded="rounded-full" />
					<div class="flex-1">
						<Skeleton width="50%" height="0.875rem" class="mb-2" />
						<Skeleton width="30%" height="0.625rem" />
					</div>
					<Skeleton width="4rem" height="0.875rem" />
				</div>
			{/each}
		</div>
		<div class="col-span-12 lg:col-span-4 space-y-6">
			<div class="bg-surface-container-high p-6 rounded-xl">
				<Skeleton width="40%" height="1.125rem" class="mb-4" />
				{#each [0,1,2] as _}
					<div class="flex items-center gap-3 py-3">
						<Skeleton width="2.5rem" height="2.5rem" rounded="rounded-full" />
						<div class="flex-1">
							<Skeleton width="70%" height="0.75rem" class="mb-2" />
							<Skeleton width="45%" height="0.5rem" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else}
<!-- Stats: 3-column grid, all visible at once -->
<div class="grid grid-cols-3 gap-2 mb-4 lg:gap-4 lg:mb-8">

	<!-- Revenue -->
	<div in:fly={{ y: 16, duration: 350, delay: 50, easing: cubicOut }}
		class="relative overflow-hidden rounded-xl p-3 lg:p-6"
		style="background: linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #1e40af) 100%); box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent);">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-white/80 text-sm lg:text-base" style="font-variation-settings:'FILL' 1">payments</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">Revenue</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold leading-none text-white">{formatINRCompact(revenue)}</h3>
		{#if revenueChange !== null}
			<p class="text-[10px] text-white/80 mt-1 flex items-center gap-0.5">
				<span class="material-symbols-outlined text-xs" style="font-variation-settings:'FILL' 1">{revenueChange >= 0 ? 'trending_up' : 'trending_down'}</span>
				<span class="hidden sm:inline">{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%</span>
			</p>
		{/if}
	</div>

	<!-- Outstanding -->
	<div in:fly={{ y: 16, duration: 350, delay: 130, easing: cubicOut }}
		class="bg-surface-container-lowest rounded-xl p-3 lg:p-6 relative overflow-hidden border border-outline-variant/20">
		<div class="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-error opacity-70"></div>
		<div class="flex items-center gap-1 mb-1 pl-2">
			<span class="material-symbols-outlined text-error text-sm lg:text-base" style="font-variation-settings:'FILL' 1">schedule</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">Due</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold text-error leading-none pl-2">{formatINRCompact(outstanding)}</h3>
		<p class="text-[10px] text-on-surface-variant pl-2 mt-1 hidden sm:block">Unpaid</p>
	</div>

	<!-- Customers -->
	<div in:fly={{ y: 16, duration: 350, delay: 210, easing: cubicOut }}
		class="bg-surface-container-lowest rounded-xl p-3 lg:p-6 relative overflow-hidden border border-outline-variant/20">
		<div class="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-secondary opacity-70"></div>
		<div class="flex items-center gap-1 mb-1 pl-2">
			<span class="material-symbols-outlined text-secondary text-sm lg:text-base" style="font-variation-settings:'FILL' 1">group</span>
			<p class="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">{$activeTerminology.people}</p>
		</div>
		<h3 class="text-base lg:text-3xl font-headline font-extrabold text-secondary leading-none pl-2">{patientCount}</h3>
		<p class="text-[10px] text-on-surface-variant pl-2 mt-1 hidden sm:block">Registered</p>
	</div>
</div>

	<!-- Top Insight Banner -->
	{#if $topInsight && !bannerDismissed}
		{@const isError = $topInsight.type === 'danger'}
		<div class="mb-6 {isError ? 'bg-error-container/70 border-error/20' : 'bg-tertiary-container/50 border-tertiary/20'} border rounded-xl p-4 flex items-start gap-3">
			<span class="material-symbols-outlined {isError ? 'text-error' : 'text-tertiary'} text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">{$topInsight.icon}</span>
			<div class="flex-1 min-w-0">
				<p class="font-bold text-sm text-on-surface">{$topInsight.title}</p>
				<p class="text-xs text-on-surface-variant mt-0.5">{$topInsight.description}</p>
				{#if $topInsight.action}
					<a href={$topInsight.action.href} class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-1.5 hover:underline">
						{$topInsight.action.label}
						<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
					</a>
				{/if}
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<a href="/insights" class="text-[11px] font-bold text-primary whitespace-nowrap">All Insights →</a>
				<button onclick={() => bannerDismissed = true} class="p-1 rounded-lg hover:bg-black/10 transition-colors" aria-label="Dismiss">
					<span class="material-symbols-outlined text-base text-on-surface-variant">close</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Smart Nudges -->
	{#if longOverdueCount > 0 || slowMovingProducts.length > 0 || lowStockProducts.length > 0 || pendingLeaveCount > 0}
		<div class="mb-4 lg:mb-10">
			<h4 class="font-headline font-bold text-sm lg:text-xl mb-2 lg:mb-3">Alerts</h4>
			<div class="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-none lg:grid lg:grid-cols-2 xl:grid-cols-4 lg:mx-0 lg:px-0">

				{#if longOverdueCount > 0}
					<a href="/invoices" class="shrink-0 w-48 lg:w-auto group bg-error-container/70 border border-error/20 rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all">
						<span class="material-symbols-outlined text-error text-lg shrink-0" style="font-variation-settings:'FILL' 1">alarm</span>
						<div class="min-w-0">
							<p class="font-bold text-sm text-on-error-container leading-tight">{longOverdueCount} overdue 30+d</p>
							<p class="text-xs text-error/80">{formatINRCompact(longOverdueAmount)}</p>
						</div>
					</a>
				{:else if overdueInvoices.length > 0}
					<a href="/invoices" class="shrink-0 w-48 lg:w-auto group bg-error-container/40 border border-error/10 rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all">
						<span class="material-symbols-outlined text-error text-lg shrink-0">warning</span>
						<div class="min-w-0">
							<p class="font-bold text-sm text-on-surface leading-tight">{overdueInvoices.length} overdue</p>
							<p class="text-xs text-on-surface-variant">Follow up</p>
						</div>
					</a>
				{/if}

				{#if slowMovingProducts.length > 0}
					<a href="/inventory" class="shrink-0 w-48 lg:w-auto group bg-tertiary-container/40 border border-tertiary/10 rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all">
						<span class="material-symbols-outlined text-tertiary text-lg shrink-0" style="font-variation-settings:'FILL' 1">trending_down</span>
						<div class="min-w-0">
							<p class="font-bold text-sm text-on-surface leading-tight">{slowMovingProducts.length} slow items</p>
							<p class="text-xs text-on-surface-variant truncate">{slowMovingProducts[0]?.name}</p>
						</div>
					</a>
				{/if}

				{#if lowStockProducts.length > 0}
					<a href="/inventory" class="shrink-0 w-48 lg:w-auto group bg-primary-container/30 border border-primary/10 rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all">
						<span class="material-symbols-outlined text-primary text-lg shrink-0" style="font-variation-settings:'FILL' 1">inventory_2</span>
						<div class="min-w-0">
							<p class="font-bold text-sm text-on-surface leading-tight">{lowStockProducts.length} low stock</p>
							<p class="text-xs text-on-surface-variant">Reorder soon</p>
						</div>
					</a>
				{/if}

				{#if pendingLeaveCount > 0}
					<a href="/staff" class="shrink-0 w-48 lg:w-auto group bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all">
						<span class="material-symbols-outlined text-on-surface-variant text-lg shrink-0" style="font-variation-settings:'FILL' 1">pending_actions</span>
						<div class="min-w-0">
							<p class="font-bold text-sm text-on-surface leading-tight">{pendingLeaveCount} leave pending</p>
							<p class="text-xs text-on-surface-variant">Needs approval</p>
						</div>
					</a>
				{/if}

			</div>
		</div>
	{/if}

	<!-- Recent Invoices -->
<div class="grid grid-cols-12 gap-4 lg:gap-6">
	<div in:fade={{ duration: 400, delay: 350 }} class="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
		<div class="px-4 py-3 lg:p-6 border-b border-surface-container flex justify-between items-center">
			<h4 class="font-headline font-bold text-base lg:text-xl">{$_('dashboard.recent_invoices', { default: `Recent ${$activeTerminology.action}` })}</h4>
			<a href="/invoices/new" class="text-primary text-sm font-semibold hover:underline">{$_('dashboard.create_new', { default: 'Create New' })}</a>
		</div>

		{#if recentInvoices.length === 0}
			<EmptyState
				icon="receipt_long"
				title={$_('dashboard.no_invoices', { default: `No ${$activeTerminology.document.toLowerCase()}s yet` })}
				description={$_('dashboard.no_invoices_desc', { default: `Create your first ${$activeTerminology.document.toLowerCase()} to start tracking revenue.` })}
				actionLabel={$_('dashboard.create_invoice', { default: `Create ${$activeTerminology.document}` })}
				actionHref="/invoices/new"
			/>
		{:else}
			<div class="divide-y divide-surface-container-low">
				{#each recentInvoices as inv}
					<a href="/invoices/{inv.id}" class="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-surface-container-low active:bg-surface-container transition-colors">
						<PatientAvatar name={inv.patient_name} size="sm" />
						<div class="flex-1 min-w-0">
							<p class="text-sm font-semibold text-on-surface truncate">{inv.patient_name}</p>
							<p class="text-xs text-on-surface-variant">{inv.invoice_number} · {formatDate(inv.issue_date)}</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="text-sm font-bold text-on-surface">{formatINR(inv.grand_total)}</p>
							<StatusChip status={inv.status} />
						</div>
						<span class="material-symbols-outlined text-on-surface-variant/40 text-lg shrink-0">chevron_right</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Quick Actions Sidebar — hidden on mobile (already have FAB + bottom nav) -->
	<div class="hidden lg:block col-span-12 lg:col-span-4 space-y-3 lg:space-y-5">
		<!-- Quick Actions -->
		<div in:fly={{ x: 20, duration: 400, delay: 450, easing: cubicOut }} class="bg-surface-container-high p-4 lg:p-6 rounded-2xl">
			<h5 class="font-headline font-bold text-sm lg:text-lg mb-3">{$_('dashboard.quick_actions', { default: 'Quick Actions' })}</h5>
			<div class="space-y-1.5 lg:space-y-2.5">
				<a href="/invoices/new" class="min-h-[48px] lg:min-h-[56px] px-3 py-2 lg:py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-lg lg:text-xl">add_circle</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.new_invoice', { default: `New ${$activeTerminology.document}` })}</p>
						<p class="text-[11px] text-on-surface-variant">{$_('dashboard.new_invoice_desc', { default: 'Create GST bill' })}</p>
					</div>
				</a>
				<a href="/patients" class="min-h-[48px] lg:min-h-[56px] px-3 py-2 lg:py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
						<span class="material-symbols-outlined text-lg lg:text-xl">person_add</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.add_patient', { default: `Add ${$activeTerminology.person}` })}</p>
						<p class="text-[11px] text-on-surface-variant">{$_('dashboard.add_patient_desc', { default: `Register new ${$activeTerminology.person.toLowerCase()}` })}</p>
					</div>
				</a>
				<a href="/expenses" class="min-h-[48px] lg:min-h-[56px] px-3 py-2 lg:py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
						<span class="material-symbols-outlined text-lg lg:text-xl">post_add</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.log_expense', { default: 'Log Expense' })}</p>
						<p class="text-[11px] text-on-surface-variant">{$_('dashboard.log_expense_desc', { default: 'Track spending' })}</p>
					</div>
				</a>
				<a href="/loans" class="min-h-[48px] lg:min-h-[56px] px-3 py-2 lg:py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-lg lg:text-xl">account_balance</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">Loans & EMI</p>
						<p class="text-[11px] text-on-surface-variant">Track repayments</p>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>
{/if}
