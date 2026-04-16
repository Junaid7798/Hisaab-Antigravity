<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { getInvoices, getPatients } from '$lib/db/crud';
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
	<title>{$_('invoices.title', { default: 'Invoices' })} | Hisaab</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-8">
		<div>
			<h1 class="text-3xl font-headline font-bold text-on-surface">{$_('invoices.title', { default: 'Invoices' })}</h1>
			<p class="text-on-surface-variant mt-1">Manage and track your billing</p>
		</div>
		<a
			href="/invoices/new"
			class="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
		>
			<span class="material-symbols-outlined">add</span>
			{$_('actions.new_invoice', { default: 'New Invoice' })}
		</a>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
		<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Invoices</p>
				<p class="text-2xl font-headline font-bold text-on-surface">{filteredInvoices.length}</p>
			</div>
			<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
				<span class="material-symbols-outlined">receipt_long</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Value</p>
				<p class="text-2xl font-headline font-bold text-secondary">{formatINRCompact(totalAmount)}</p>
			</div>
			<div class="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
				<span class="material-symbols-outlined">payments</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Outstanding</p>
				<p class="text-2xl font-headline font-bold text-error">{formatINRCompact(totalUnpaid)}</p>
			</div>
			<div class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
				<span class="material-symbols-outlined">account_balance_wallet</span>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-4 mb-6 relative z-10 w-full sm:max-w-3xl">
		<div class="flex-1 min-w-0">
			<Input
				bind:value={searchQuery}
				placeholder={`Search by invoice # or ${$activeTerminology.person.toLowerCase()} name...`}
				icon="search"
			/>
		</div>
		<div class="w-full sm:w-48 shrink-0 relative">
			<select
				bind:value={statusFilter}
				class="w-full h-[52px] bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 font-bold text-on-surface outline-none transition-colors cursor-pointer appearance-none"
			>
				<option value="ALL">All Status</option>
				<option value="PAID">Paid</option>
				<option value="UNPAID">Unpaid</option>
				<option value="PARTIAL">Partial</option>
			</select>
			<span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden w-full">
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
			<div class="px-4 lg:mx-0 lg:px-0">
				<!-- Desktop Table -->
				<table class="hidden md:table w-full text-left whitespace-nowrap min-w-[700px]">
					<thead>
						<tr class="bg-surface-container-low/50">
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Invoice #</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{$activeTerminology.person}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Date</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Amount</th>
							<th class="px-6 py-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container-low">
						{#each paginatedInvoices as inv}
							<tr class="hover:bg-surface-container-low transition-colors group cursor-pointer" onclick={() => window.location.href = `/invoices/${inv.id}`}>
								<td class="px-6 py-4">
									<span class="font-semibold text-on-surface">{inv.invoice_number}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-medium text-on-surface">{inv.patientName}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm text-on-surface-variant">{formatDate(inv.issue_date)}</span>
								</td>
								<td class="px-6 py-4">
									<StatusChip status={inv.status} />
								</td>
								<td class="px-6 py-4 text-right">
									<span class="font-bold text-on-surface">{formatINRCompact(inv.grand_total)}</span>
								</td>
								<td class="px-6 py-4 text-right">
									<button aria-label="View Invoice Details" class="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-2 rounded-full inline-flex transition-colors" title="View details">
										<span class="material-symbols-outlined text-sm">visibility</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- Mobile Cards -->
				<div class="md:hidden divide-y divide-surface-container-low">
					{#each paginatedInvoices as inv}
						<div class="py-4 hover:bg-surface-container-lowest/50 active:bg-surface-container cursor-pointer transition-colors" onclick={() => window.location.href = `/invoices/${inv.id}`}>
							<div class="flex items-start justify-between mb-2">
								<div>
									<h4 class="text-sm font-bold text-on-surface">{inv.invoice_number}</h4>
									<p class="text-sm font-medium text-on-surface-variant mt-0.5">{inv.patientName}</p>
								</div>
								<div class="text-right">
									<p class="text-base font-bold text-on-surface mb-1">{formatINRCompact(inv.grand_total)}</p>
									<StatusChip status={inv.status} />
								</div>
							</div>
							
							<div class="flex items-center justify-between text-xs text-on-surface-variant mt-3">
								<span>{formatDate(inv.issue_date)}</span>
								<button aria-label="View Invoice Details" class="flex items-center gap-1 text-primary font-bold">
									View Details <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
				</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between px-6 py-4 border-t border-surface-container-low">
				<p class="text-xs text-on-surface-variant font-medium">
					Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
				</p>
				<div class="flex items-center gap-1">
					<button aria-label="Previous Page" disabled={currentPage <= 1} onclick={() => currentPage--} class="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-sm">chevron_left</span>
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
						{#if pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)}
							<button onclick={() => currentPage = pg} class="w-8 h-8 rounded-lg text-xs font-bold transition-all {currentPage === pg ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}">
								{pg}
							</button>
						{:else if pg === currentPage - 2 || pg === currentPage + 2}
							<span class="text-on-surface-variant/50 text-xs px-1">…</span>
						{/if}
					{/each}
					<button aria-label="Next Page" disabled={currentPage >= totalPages} onclick={() => currentPage++} class="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-sm">chevron_right</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

