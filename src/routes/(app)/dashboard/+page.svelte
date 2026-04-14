<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { getBusiness, getRevenueTotal, getOutstandingTotal, countPatients, getRecentInvoices, getDashboardAlerts } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact, formatINR } from '$lib/utils/currency';
	import { formatDate, timeAgo } from '$lib/utils/helpers';
	import { fly, fade } from 'svelte/transition';
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

	async function loadDashboard(businessId: string) {
		loading = true;
		const biz = await getBusiness(businessId);
		if (biz) {
			businessName = biz.name;
			revenue = await getRevenueTotal(biz.id);
			outstanding = await getOutstandingTotal(biz.id);
			patientCount = await countPatients(biz.id);
			recentInvoices = await getRecentInvoices(biz.id, 5);

			const alerts = await getDashboardAlerts(biz.id);
			lowStockProducts = alerts.lowStock;
			overdueInvoices = alerts.overdueInvoices;
			revenueChange = alerts.revenueChangePercentage;
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadDashboard($activeBusinessId);
		}
	});
</script>

<svelte:head>
	<title>Dashboard | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="mb-10">
	<h2 class="text-3xl font-headline font-bold text-on-surface">{$_('dashboard.overview', { default: 'Dashboard Overview' })}</h2>
	<p class="text-on-surface-variant font-body mt-1">
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
	<div in:fly={{ y: 20, duration: 400, delay: 50, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-primary text-white p-6 rounded-xl shadow-xl shadow-primary/10 relative overflow-hidden">
		<div class="relative z-10">
			<p class="text-xs font-label uppercase tracking-widest text-primary-fixed-dim opacity-80">{$_('dashboard.total_revenue', { default: 'Total Revenue' })}</p>
			<h3 class="text-4xl font-headline font-extrabold mt-2">{formatINRCompact(revenue)}</h3>
			<div class="mt-4 flex items-center gap-2 text-sm text-primary-fixed">
				{#if revenueChange !== null}
					{#if revenueChange >= 0}
						<span class="material-symbols-outlined text-sm">trending_up</span>
						<span>+{revenueChange.toFixed(1)}% vs last month</span>
					{:else}
						<span class="material-symbols-outlined text-sm text-error">trending_down</span>
						<span class="text-error">{revenueChange.toFixed(1)}% vs last month</span>
					{/if}
				{:else}
					<span class="material-symbols-outlined text-sm">trending_up</span>
					<span>{$_('dashboard.all_time', { default: 'All time' })}</span>
				{/if}
			</div>
		</div>
		<div class="absolute -right-4 -bottom-4 opacity-10">
			<span class="material-symbols-outlined text-[120px]">payments</span>
		</div>
	</div>

	<!-- Outstanding -->
	<div in:fly={{ y: 20, duration: 400, delay: 150, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
		<p class="text-xs font-label uppercase tracking-widest text-on-surface-variant">{$_('dashboard.outstanding', { default: 'Outstanding Payments' })}</p>
		<h3 class="text-4xl font-headline font-extrabold mt-2 text-error">{formatINRCompact(outstanding)}</h3>
		<div class="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
			<span class="material-symbols-outlined text-sm">schedule</span>
			<span>{$_('dashboard.unpaid_invoices', { default: 'Unpaid invoices' })}</span>
		</div>
	</div>

	<!-- Patients -->
	<div in:fly={{ y: 20, duration: 400, delay: 250, easing: cubicOut }} class="col-span-12 md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
		<p class="text-xs font-label uppercase tracking-widest text-on-surface-variant">{$_('dashboard.total_patients', { default: `Total ${$activeTerminology.people}` })}</p>
		<h3 class="text-4xl font-headline font-extrabold mt-2 text-secondary">{patientCount}</h3>
		<div class="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
			<span class="material-symbols-outlined text-sm">group</span>
			<span>{$_('dashboard.registered_patients', { default: `Registered ${$activeTerminology.people.toLowerCase()}` })}</span>
		</div>
	</div>
</div>

	<!-- Smart Alerts -->
	{#if lowStockProducts.length > 0 || overdueInvoices.length > 0}
		<div class="col-span-12 mb-10 space-y-4">
			<h4 class="font-headline font-bold text-xl mb-4">Smart Alerts</h4>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#if overdueInvoices.length > 0}
					<div class="bg-error-container text-on-error-container p-4 rounded-xl flex items-start gap-4 shadow-sm border border-error/20">
						<span class="material-symbols-outlined text-error mt-0.5">warning</span>
						<div class="flex-1">
							<p class="font-headline font-bold text-sm">Overdue Invoices</p>
							<p class="text-sm opacity-80 mb-2">{overdueInvoices.length} {overdueInvoices.length === 1 ? 'invoice is' : 'invoices are'} past their due date.</p>
							<a href="/invoices" class="text-xs font-bold text-error flex items-center gap-1 hover:underline">View Invoices <span class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
						</div>
					</div>
				{/if}
				{#if lowStockProducts.length > 0}
					<div class="bg-amber-50 text-amber-900 p-4 rounded-xl flex items-start gap-4 shadow-sm border border-amber-200">
						<span class="material-symbols-outlined text-amber-600 mt-0.5">inventory</span>
						<div class="flex-1">
							<p class="font-headline font-bold text-sm">Low Stock Alert</p>
							<p class="text-sm opacity-80 mb-2">{lowStockProducts.length} {lowStockProducts.length === 1 ? 'product is' : 'products are'} low on stock.</p>
							<a href="/inventory" class="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline">View Inventory <span class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
						</div>
					</div>
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
	<div class="col-span-12 lg:col-span-4 space-y-6">
		<!-- Quick Actions -->
		<div in:fly={{ x: 20, duration: 400, delay: 450, easing: cubicOut }} class="bg-surface-container-high p-6 rounded-xl">
			<h5 class="font-headline font-bold text-lg mb-4">{$_('dashboard.quick_actions', { default: 'Quick Actions' })}</h5>
			<div class="space-y-3">
				<a href="/invoices/new" class="p-3 bg-surface-container-lowest rounded-lg flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
					<div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">add_circle</span>
					</div>
					<div>
						<p class="text-sm font-semibold">{$_('actions.new_invoice', { default: `New ${$activeTerminology.document}` })}</p>
						<p class="text-[10px] text-on-surface-variant">{$_('dashboard.new_invoice_desc', { default: 'Create GST bill' })}</p>
					</div>
				</a>
				<a href="/patients" class="p-3 bg-surface-container-lowest rounded-lg flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
					<div class="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">person_add</span>
					</div>
					<div>
						<p class="text-sm font-semibold">{$_('actions.add_patient', { default: `Add ${$activeTerminology.person}` })}</p>
						<p class="text-[10px] text-on-surface-variant">{$_('dashboard.add_patient_desc', { default: `Register new ${$activeTerminology.person.toLowerCase()}` })}</p>
					</div>
				</a>
				<a href="/expenses" class="p-3 bg-surface-container-lowest rounded-lg flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
					<div class="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">post_add</span>
					</div>
					<div>
						<p class="text-sm font-semibold">{$_('actions.log_expense', { default: 'Log Expense' })}</p>
						<p class="text-[10px] text-on-surface-variant">{$_('dashboard.log_expense_desc', { default: 'Track spending' })}</p>
					</div>
				</a>
			</div>
		</div>

		<!-- Help Card -->
		<div in:fly={{ x: 20, duration: 400, delay: 550, easing: cubicOut }} class="relative bg-tertiary-container text-white p-6 rounded-xl overflow-hidden min-h-[140px] flex flex-col justify-end">
			<div class="absolute -right-4 -top-4 opacity-10">
				<span class="material-symbols-outlined text-[80px]">support_agent</span>
			</div>
			<div class="relative z-10">
				<h6 class="font-headline font-bold text-lg">{$_('dashboard.need_help', { default: 'Need Help?' })}</h6>
				<p class="text-sm opacity-80 mb-4">{$_('dashboard.help_desc', { default: 'Check our guides for GST billing and setup.' })}</p>
				<a href="/help" class="bg-surface-container-lowest text-tertiary px-4 py-2 rounded-lg text-xs font-bold hover:bg-surface-variant transition-colors inline-block">{$_('dashboard.get_support', { default: 'Get Support' })}</a>
			</div>
		</div>
	</div>
</div>
{/if}
