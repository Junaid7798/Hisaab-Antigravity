<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { getInvoices, getPatients } from '$lib/db/crud';
	import { insights } from '$lib/stores/insights';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/helpers';
	import Input from '$lib/components/Input.svelte';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { Invoice, Patient } from '$lib/db/index';

	let invoices = $state<Invoice[]>([]);
	let patients = $state<Patient[]>([]);
	let loading = $state(true);

	// Filters
	let searchQuery = $state('');
	let statusFilter = $state<'ALL' | 'UNPAID' | 'PAID' | 'PARTIAL'>('ALL');

	async function loadData(bizId: string) {
		loading = true;
		invoices = await getInvoices(bizId);
		patients = await getPatients(bizId);
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	let combinedInvoices = $derived(
		invoices.map(inv => {
			const patient = patients.find(p => p.id === inv.patient_id);
			return {
				...inv,
				patientName: patient ? patient.name : 'Unknown'
			};
		}).sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
	);

	let filteredInvoices = $derived(
		combinedInvoices.filter(inv => {
			const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
			const matchSearch = searchQuery === '' || 
				inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
				inv.patientName.toLowerCase().includes(searchQuery.toLowerCase());
			return matchStatus && matchSearch;
		})
	);

	let totalAmount = $derived(filteredInvoices.reduce((sum, inv) => sum + inv.grand_total, 0));
	let totalUnpaid = $derived(filteredInvoices.filter(i => i.status !== 'PAID').reduce((sum, inv) => sum + inv.grand_total, 0));

	// Pagination
	const PAGE_SIZE = 20;
	let currentPage = $state(1);
	let totalPages = $derived(Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE)));
	let paginatedInvoices = $derived(
		filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);
	$effect(() => {
		searchQuery; statusFilter;
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>{$_('invoices.list_title', { default: 'Invoices' })} | Hisaab</title>
</svelte:head>

<!-- Alert banner -->
{#if $insights.find(i => i.id === 'collection_60plus' || i.id === 'collection_30_60' || i.id === 'overdue_invoices')}
	{@const collectionAlert = $insights.find(i => i.id === 'collection_60plus' || i.id === 'collection_30_60' || i.id === 'overdue_invoices')!}
	<div class="mb-3 {collectionAlert.type === 'danger' ? 'bg-error-container/60 border-error/20' : 'bg-tertiary-container/50 border-tertiary/20'} border rounded-xl p-2.5 flex items-center gap-2.5">
		<span class="material-symbols-outlined {collectionAlert.type === 'danger' ? 'text-error' : 'text-tertiary'} text-base shrink-0" style="font-variation-settings:'FILL' 1">{collectionAlert.icon}</span>
		<p class="text-xs font-semibold text-on-surface flex-1 min-w-0 truncate">{collectionAlert.title}</p>
		<a href="/insights" class="text-xs font-bold text-primary whitespace-nowrap shrink-0">Details →</a>
	</div>
{/if}

<!-- Header: title + button inline -->
<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-lg font-headline font-bold text-on-surface lg:text-2xl">{$_('invoices.list_title', { default: 'Invoices' })}</h1>
		<p class="text-on-surface-variant text-xs lg:text-sm">Manage and track your billing</p>
	</div>
	<a href="/invoices/new" class="shrink-0 flex items-center gap-1.5 bg-primary text-on-primary rounded-xl font-bold shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all px-3.5 py-2 text-sm">
		<span class="material-symbols-outlined text-lg">add</span>
		<span class="hidden sm:inline">{$_('actions.new_invoice', { default: 'New Invoice' })}</span>
		<span class="sm:hidden">New</span>
	</a>
</div>

<!-- Stats — 3 compact pills -->
<div class="grid grid-cols-3 gap-2 mb-4">
	<div class="bg-surface-container-lowest px-3 py-2.5 rounded-xl border border-outline-variant/15">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total</p>
		<p class="text-lg font-headline font-bold text-on-surface">{filteredInvoices.length}</p>
	</div>
	<div class="bg-surface-container-lowest px-3 py-2.5 rounded-xl border border-outline-variant/15">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Value</p>
		<p class="text-lg font-headline font-bold text-secondary">{formatINRCompact(totalAmount)}</p>
	</div>
	<div class="bg-surface-container-lowest px-3 py-2.5 rounded-xl border border-outline-variant/15">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Due</p>
		<p class="text-lg font-headline font-bold text-error">{formatINRCompact(totalUnpaid)}</p>
	</div>
</div>

<!-- Search -->
<div class="mb-3">
	<Input bind:value={searchQuery} placeholder="Search invoice # or name..." icon="search" />
</div>

<!-- Status filter — pill tabs, not a select -->
<div class="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 scrollbar-none">
	{#each [['ALL','All'],['PAID','Paid'],['UNPAID','Unpaid'],['PARTIAL','Partial']] as [val, label]}
		<button
			onclick={() => statusFilter = val as typeof statusFilter}
			class="shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-all {statusFilter === val ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}"
		>{label}</button>
	{/each}
</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden w-full">
		{#if loading}
			<div class="h-64 flex items-center justify-center">
				<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">refresh</span>
			</div>
		{:else if filteredInvoices.length === 0}
			<div class="py-12">
				<EmptyState
					icon="receipt_long"
					title="No invoices found"
					description={searchQuery ? 'Try adjusting your search filters.' : 'Create your first invoice to get started.'}
				/>
			</div>
		{:else}
			<!-- Desktop Table -->
			<div class="hidden md:block overflow-x-auto">
				<table class="w-full text-left whitespace-nowrap min-w-[680px]">
					<thead>
						<tr class="bg-surface-container-low/50 border-b border-outline-variant/10">
							<th class="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Invoice #</th>
							<th class="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{$activeTerminology.person}</th>
							<th class="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Date</th>
							<th class="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
							<th class="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Amount</th>
							<th class="px-5 py-3.5 w-12"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-outline-variant/10">
						{#each paginatedInvoices as inv}
							<tr class="hover:bg-surface-container-low/40 transition-colors cursor-pointer h-14" onclick={() => window.location.href = `/invoices/${inv.id}`}>
								<td class="px-5 py-3">
									<span class="font-semibold text-[13px] text-on-surface font-mono">{inv.invoice_number}</span>
								</td>
								<td class="px-5 py-3">
									<span class="text-sm text-on-surface">{inv.patientName}</span>
								</td>
								<td class="px-5 py-3">
									<span class="text-sm text-on-surface-variant">{formatDate(inv.issue_date)}</span>
								</td>
								<td class="px-5 py-3">
									<StatusChip status={inv.status} />
								</td>
								<td class="px-5 py-3 text-right">
									<span class="font-bold text-sm text-on-surface">{formatINRCompact(inv.grand_total)}</span>
								</td>
								<td class="px-5 py-3 text-right">
									<button aria-label="View Invoice Details" class="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-2 rounded-lg inline-flex transition-colors" title="View details">
										<span class="material-symbols-outlined text-base">arrow_forward</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Cards — full-bleed tappable rows, min 64px tall -->
			<div class="md:hidden divide-y divide-outline-variant/10">
				{#each paginatedInvoices as inv}
					<a
						href="/invoices/{inv.id}"
						class="flex items-center gap-3 px-4 py-4 min-h-[68px] hover:bg-surface-container-low/40 active:bg-surface-container transition-colors"
					>
						<div class="grow min-w-0">
							<div class="flex items-start justify-between gap-2 mb-1">
								<span class="text-[13px] font-bold text-on-surface font-mono truncate">{inv.invoice_number}</span>
								<span class="text-base font-bold text-on-surface shrink-0">{formatINRCompact(inv.grand_total)}</span>
							</div>
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm text-on-surface-variant truncate">{inv.patientName}</span>
								<StatusChip status={inv.status} />
							</div>
							<span class="text-xs text-on-surface-variant/70 mt-1 block">{formatDate(inv.issue_date)}</span>
						</div>
						<span class="material-symbols-outlined text-on-surface-variant/50 text-xl shrink-0">chevron_right</span>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between px-4 lg:px-6 py-4 border-t border-outline-variant/10">
				<p class="text-xs text-on-surface-variant font-medium">
					{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
				</p>
				<div class="flex items-center gap-1">
					<button aria-label="Previous Page" disabled={currentPage <= 1} onclick={() => currentPage--} class="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-base">chevron_left</span>
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
						{#if pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)}
							<button onclick={() => currentPage = pg} class="w-9 h-9 rounded-lg text-xs font-bold transition-all {currentPage === pg ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}">
								{pg}
							</button>
						{:else if pg === currentPage - 2 || pg === currentPage + 2}
							<span class="text-on-surface-variant/50 text-xs px-1">…</span>
						{/if}
					{/each}
					<button aria-label="Next Page" disabled={currentPage >= totalPages} onclick={() => currentPage++} class="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-base">chevron_right</span>
					</button>
				</div>
			</div>
		{/if}
	</div>

