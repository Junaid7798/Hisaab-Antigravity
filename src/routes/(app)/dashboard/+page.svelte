<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { getBusiness, getDashboardData } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
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
<div class="mb-6 lg:mb-10">
	<h2 class="text-2xl lg:text-3xl font-headline font-bold text-on-surface">{$_('dashboard.overview', { default: 'Dashboard Overview' })}</h2>
	<p class="text-on-surface-variant font-body mt-1 text-sm lg:text-base">
		{#if businessName}{$_('dashboard.financial_perf', { default: 'Financial performance for' })} {businessName}{:else}{$_('dashboard.welcome', { default: 'Welcome to Hisaab' })}{/if}
	</p>
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
<div class="grid grid-cols-12 gap-6 mb-10">
	<!-- Revenue -->
	<div in:fly={{ y: 20, duration: 400, delay: 50, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-primary text-white p-5 lg:p-6 rounded-2xl shadow-xl shadow-primary/10 relative overflow-hidden">
		<div class="relative z-10">
			<p class="text-xs font-label uppercase tracking-widest text-primary-fixed-dim opacity-80">{$_('dashboard.total_revenue', { default: 'Total Revenue' })}</p>
			<h3 class="text-3xl lg:text-4xl font-headline font-extrabold mt-2 leading-none">{formatINRCompact(revenue)}</h3>
			<div class="mt-3 flex items-center gap-2 text-sm text-primary-fixed">
				{#if revenueChange !== null}
					{#if revenueChange >= 0}
						<span class="material-symbols-outlined text-base">trending_up</span>
						<span>+{revenueChange.toFixed(1)}% vs last month</span>
					{:else}
						<span class="material-symbols-outlined text-base text-error">trending_down</span>
						<span class="text-error">{revenueChange.toFixed(1)}% vs last month</span>
					{/if}
				{:else}
					<span class="material-symbols-outlined text-base">trending_up</span>
					<span>{$_('dashboard.all_time', { default: 'All time' })}</span>
				{/if}
			</div>
		</div>
		<div class="absolute -right-4 -bottom-4 opacity-10">
			<span class="material-symbols-outlined text-[100px] lg:text-[120px]">payments</span>
		</div>
	</div>

	<!-- Outstanding -->
	<div in:fly={{ y: 20, duration: 400, delay: 150, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-5 lg:p-6 rounded-2xl shadow-sm border border-outline-variant/10">
		<p class="text-xs font-label uppercase tracking-widest text-on-surface-variant">{$_('dashboard.outstanding', { default: 'Outstanding Payments' })}</p>
		<h3 class="text-3xl lg:text-4xl font-headline font-extrabold mt-2 text-error leading-none">{formatINRCompact(outstanding)}</h3>
		<div class="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
			<span class="material-symbols-outlined text-base">schedule</span>
			<span>{$_('dashboard.unpaid_invoices', { default: 'Unpaid invoices' })}</span>
		</div>
	</div>

	<!-- Patients -->
	<div in:fly={{ y: 20, duration: 400, delay: 250, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-5 lg:p-6 rounded-2xl shadow-sm border border-outline-variant/10">
		<p class="text-xs font-label uppercase tracking-widest text-on-surface-variant">{$_('dashboard.total_patients', { default: `Total ${$activeTerminology.people}` })}</p>
		<h3 class="text-3xl lg:text-4xl font-headline font-extrabold mt-2 text-secondary leading-none">{patientCount}</h3>
		<div class="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
			<span class="material-symbols-outlined text-base">group</span>
			<span>{$_('dashboard.registered_patients', { default: `Registered ${$activeTerminology.people.toLowerCase()}` })}</span>
		</div>
	</div>
</div>

	<!-- Smart Nudges -->
	{#if longOverdueCount > 0 || slowMovingProducts.length > 0 || lowStockProducts.length > 0 || pendingLeaveCount > 0}
		<div class="mb-10">
			<h4 class="font-headline font-bold text-xl mb-4">Smart Alerts</h4>
			<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

				<!-- Long overdue customers (>30 days) -->
				{#if longOverdueCount > 0}
					<a href="/invoices" class="group bg-error-container/70 border border-error/20 rounded-xl p-4 flex items-start gap-3 hover:bg-error-container transition-colors">
						<span class="material-symbols-outlined text-error text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">alarm</span>
						<div>
							<p class="font-bold text-sm text-on-error-container">{longOverdueCount} overdue 30+ days</p>
							<p class="text-xs text-error/80 mt-0.5">Total: {formatINRCompact(longOverdueAmount)}</p>
							<p class="text-[11px] text-error font-semibold mt-2 flex items-center gap-0.5 group-hover:underline">Collect now <span class="material-symbols-outlined text-[13px]">arrow_forward</span></p>
						</div>
					</a>
				{:else if overdueInvoices.length > 0}
					<a href="/invoices" class="group bg-error-container/40 border border-error/10 rounded-xl p-4 flex items-start gap-3 hover:bg-error-container/70 transition-colors">
						<span class="material-symbols-outlined text-error text-xl mt-0.5 shrink-0">warning</span>
						<div>
							<p class="font-bold text-sm text-on-surface">{overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}</p>
							<p class="text-xs text-on-surface-variant mt-0.5">Follow up with customers</p>
							<p class="text-[11px] text-error font-semibold mt-2 flex items-center gap-0.5 group-hover:underline">View invoices <span class="material-symbols-outlined text-[13px]">arrow_forward</span></p>
						</div>
					</a>
				{/if}

				<!-- Slow-moving products -->
				{#if slowMovingProducts.length > 0}
					<a href="/inventory" class="group bg-tertiary-container/40 border border-tertiary/10 rounded-xl p-4 flex items-start gap-3 hover:bg-tertiary-container/70 transition-colors">
						<span class="material-symbols-outlined text-tertiary text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">trending_down</span>
						<div>
							<p class="font-bold text-sm text-on-surface">{slowMovingProducts.length} slow-moving item{slowMovingProducts.length > 1 ? 's' : ''}</p>
							<p class="text-xs text-on-surface-variant mt-0.5 truncate">{slowMovingProducts.slice(0,2).map(p => p.name).join(', ')}{slowMovingProducts.length > 2 ? '…' : ''}</p>
							<p class="text-[11px] text-tertiary font-semibold mt-2 flex items-center gap-0.5 group-hover:underline">Review stock <span class="material-symbols-outlined text-[13px]">arrow_forward</span></p>
						</div>
					</a>
				{/if}

				<!-- Low stock -->
				{#if lowStockProducts.length > 0}
					<a href="/inventory" class="group bg-primary-container/30 border border-primary/10 rounded-xl p-4 flex items-start gap-3 hover:bg-primary-container/50 transition-colors">
						<span class="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">inventory_2</span>
						<div>
							<p class="font-bold text-sm text-on-surface">{lowStockProducts.length} low stock item{lowStockProducts.length > 1 ? 's' : ''}</p>
							<p class="text-xs text-on-surface-variant mt-0.5">Reorder soon to avoid stockout</p>
							<p class="text-[11px] text-primary font-semibold mt-2 flex items-center gap-0.5 group-hover:underline">View inventory <span class="material-symbols-outlined text-[13px]">arrow_forward</span></p>
						</div>
					</a>
				{/if}

				<!-- Pending leave approvals -->
				{#if pendingLeaveCount > 0}
					<a href="/attendance" class="group bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex items-start gap-3 hover:bg-surface-container-high transition-colors">
						<span class="material-symbols-outlined text-on-surface-variant text-xl mt-0.5 shrink-0" style="font-variation-settings:'FILL' 1">pending_actions</span>
						<div>
							<p class="font-bold text-sm text-on-surface">{pendingLeaveCount} leave request{pendingLeaveCount > 1 ? 's' : ''} pending</p>
							<p class="text-xs text-on-surface-variant mt-0.5">Staff waiting for approval</p>
							<p class="text-[11px] text-on-surface-variant font-semibold mt-2 flex items-center gap-0.5 group-hover:underline">Approve now <span class="material-symbols-outlined text-[13px]">arrow_forward</span></p>
						</div>
					</a>
				{/if}

			</div>
		</div>
	{/if}

	<!-- Recent Invoices -->
<div class="grid grid-cols-12 gap-6">
	<div in:fade={{ duration: 400, delay: 350 }} class="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
		<div class="p-6 border-b border-surface-container flex justify-between items-center">
			<h4 class="font-headline font-bold text-xl">{$_('dashboard.recent_invoices', { default: `Recent ${$activeTerminology.action}` })}</h4>
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
			<div class="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
				<table class="w-full text-left whitespace-nowrap">
					<thead>
						<tr class="bg-surface-container-low text-on-surface-variant">
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_patient', { default: $activeTerminology.person })}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_date', { default: 'Date' })}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_amount', { default: 'Amount' })}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_status', { default: 'Status' })}</th>
							<th class="px-6 py-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container-low">
						{#each recentInvoices as inv}
						<tr class="hover:bg-surface-container-low transition-colors cursor-pointer group" onclick={() => { window.location.href = `/invoices/${inv.id}`; }}>
							<td class="px-6 py-4">
								<div class="flex items-center gap-3">
									<PatientAvatar name={inv.patient_name} size="sm" />
									<div>
										<p class="text-sm font-semibold">{inv.patient_name}</p>
										<p class="text-[10px] text-on-surface-variant">{inv.invoice_number}</p>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 text-sm text-on-surface-variant">{formatDate(inv.issue_date)}</td>
							<td class="px-6 py-4 text-sm font-bold text-on-surface">{formatINR(inv.grand_total)}</td>
							<td class="px-6 py-4">
								<StatusChip status={inv.status} />
							</td>
							<td class="px-6 py-4 text-right">
								<a href="/invoices/{inv.id}" class="text-primary text-sm font-semibold hover:underline flex items-center justify-end gap-1">
									{$_('patients.view', { default: 'View' })} <span class="material-symbols-outlined text-xs">chevron_right</span>
								</a>
							</td>
						</tr>
					{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Quick Actions Sidebar -->
	<div class="col-span-12 lg:col-span-4 space-y-5">
		<!-- Quick Actions -->
		<div in:fly={{ x: 20, duration: 400, delay: 450, easing: cubicOut }} class="bg-surface-container-high p-5 lg:p-6 rounded-2xl">
			<h5 class="font-headline font-bold text-base lg:text-lg mb-4">{$_('dashboard.quick_actions', { default: 'Quick Actions' })}</h5>
			<div class="space-y-2.5">
				<a href="/invoices/new" class="min-h-[56px] px-3 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">add_circle</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.new_invoice', { default: `New ${$activeTerminology.document}` })}</p>
						<p class="text-xs text-on-surface-variant mt-0.5">{$_('dashboard.new_invoice_desc', { default: 'Create GST bill' })}</p>
					</div>
				</a>
				<a href="/patients" class="min-h-[56px] px-3 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">person_add</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.add_patient', { default: `Add ${$activeTerminology.person}` })}</p>
						<p class="text-xs text-on-surface-variant mt-0.5">{$_('dashboard.add_patient_desc', { default: `Register new ${$activeTerminology.person.toLowerCase()}` })}</p>
					</div>
				</a>
				<a href="/expenses" class="min-h-[56px] px-3 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-10 h-10 shrink-0 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">post_add</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">{$_('actions.log_expense', { default: 'Log Expense' })}</p>
						<p class="text-xs text-on-surface-variant mt-0.5">{$_('dashboard.log_expense_desc', { default: 'Track spending' })}</p>
					</div>
				</a>
				<a href="/attendance" class="min-h-[56px] px-3 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">fingerprint</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">Mark Attendance</p>
						<p class="text-xs text-on-surface-variant mt-0.5">Staff attendance log</p>
					</div>
				</a>
				<a href="/loans" class="min-h-[56px] px-3 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 active:scale-[0.98] transition-all">
					<div class="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">account_balance</span>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold leading-tight">Loans & EMI</p>
						<p class="text-xs text-on-surface-variant mt-0.5">Track repayments</p>
					</div>
				</a>
			</div>
		</div>

		<!-- Help Card -->
		<div in:fly={{ x: 20, duration: 400, delay: 550, easing: cubicOut }} class="relative bg-tertiary-container text-white p-5 lg:p-6 rounded-2xl overflow-hidden min-h-[130px] flex flex-col justify-end">
			<div class="absolute -right-4 -top-4 opacity-10">
				<span class="material-symbols-outlined text-[80px]">support_agent</span>
			</div>
			<div class="relative z-10">
				<h6 class="font-headline font-bold text-base lg:text-lg">{$_('dashboard.need_help', { default: 'Need Help?' })}</h6>
				<p class="text-sm opacity-80 mb-3">{$_('dashboard.help_desc', { default: 'Check our guides for GST billing and setup.' })}</p>
				<a href="/help" class="bg-surface-container-lowest text-tertiary px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-surface-variant transition-colors inline-flex items-center min-h-[40px]">{$_('dashboard.get_support', { default: 'Get Support' })}</a>
			</div>
		</div>
	</div>
</div>
{/if}
