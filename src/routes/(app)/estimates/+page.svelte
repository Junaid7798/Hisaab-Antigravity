<script lang="ts">
	import { getInvoices, getPatients, convertEstimateToInvoice } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import type { Invoice, Patient } from '$lib/db/index';

	let estimates = $state<Invoice[]>([]);
	let patients = $state<Patient[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let convertingId = $state<string | null>(null);

	async function loadData(bizId: string) {
		loading = true;
		const [all, pats] = await Promise.all([
			getInvoices(bizId),
			getPatients(bizId)
		]);
		estimates = all.filter(i => i.document_type === 'ESTIMATE');
		patients = pats;
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	function patientName(patientId: string) {
		return patients.find(p => p.id === patientId)?.name || '—';
	}

	let filtered = $derived(
		searchQuery
			? estimates.filter(e =>
					e.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
					patientName(e.patient_id).toLowerCase().includes(searchQuery.toLowerCase())
				)
			: estimates
	);

	let totalValue = $derived(filtered.reduce((s, e) => s + e.grand_total, 0));
	let pendingCount = $derived(estimates.filter(e => e.status === 'UNPAID').length);

	async function handleConvert(estimateId: string) {
		convertingId = estimateId;
		try {
			const invoice = await convertEstimateToInvoice(estimateId);
			toast.success('Estimate converted to invoice');
			if ($activeBusinessId) await loadData($activeBusinessId);
			// Navigate to the new invoice
			window.location.href = `/invoices/${invoice.id}`;
		} catch (e) {
			toast.error('Failed to convert estimate');
		} finally {
			convertingId = null;
		}
	}
</script>

<svelte:head>
	<title>Estimates | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-lg lg:text-2xl font-headline font-extrabold text-on-surface tracking-tight">Estimates</h1>
		<p class="text-on-surface-variant mt-0.5 text-xs lg:text-sm">Quotes for {$activeTerminology.people.toLowerCase()}.</p>
	</div>
	<a
		href="/estimates/new"
		class="shrink-0 flex items-center gap-1.5 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all px-3.5 py-2 text-sm"
	>
		<span class="material-symbols-outlined text-lg">add</span>
		<span class="hidden sm:inline">New Estimate</span>
		<span class="sm:hidden">New</span>
	</a>
</div>

<!-- Stats — horizontal scroll on mobile -->
{#if !loading}
	<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-6">
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest p-3 lg:p-5 rounded-xl border border-outline-variant/15">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
			<p class="text-xl font-headline font-bold text-on-surface">{estimates.length}</p>
		</div>
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest p-3 lg:p-5 rounded-xl border border-outline-variant/15">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pending</p>
			<p class="text-xl font-headline font-bold text-primary">{pendingCount}</p>
		</div>
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest p-3 lg:p-5 rounded-xl border border-outline-variant/15">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Value</p>
			<p class="text-xl font-headline font-bold text-on-surface">{formatINRCompact(totalValue)}</p>
		</div>
	</div>
{/if}

<!-- Search -->
<div class="mb-4">
	<Input bind:value={searchQuery} placeholder="Search by estimate # or customer..." icon="search" />
</div>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<span class="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
	</div>
{:else if filtered.length === 0}
	<EmptyState
		icon="description"
		title={searchQuery ? 'No estimates match your search' : 'No estimates yet'}
		description={searchQuery ? 'Try a different search term.' : 'Create your first estimate or proforma quote for a customer.'}
		actionLabel="Create Estimate"
		actionHref="/estimates/new"
	/>
{:else}
	<div class="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm">
		<!-- Mobile list -->
		<div class="md:hidden divide-y divide-outline-variant/10">
			{#each filtered as estimate}
				<div class="flex items-center gap-3 px-4 py-3.5 min-h-[64px]">
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between gap-2 mb-1">
							<span class="text-[13px] font-bold text-on-surface font-mono truncate">{estimate.invoice_number}</span>
							<span class="text-sm font-bold text-on-surface shrink-0">{formatINRCompact(estimate.grand_total)}</span>
						</div>
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs text-on-surface-variant truncate">{patientName(estimate.patient_id)}</span>
							<StatusChip status={estimate.status} />
						</div>
						<div class="flex items-center gap-2 mt-2">
							<a href="/invoices/{estimate.id}" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface-variant">View</a>
							{#if estimate.status !== 'PAID'}
								<button onclick={() => handleConvert(estimate.id)} disabled={convertingId === estimate.id} class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary disabled:opacity-50">
									{convertingId === estimate.id ? 'Converting...' : 'Convert →'}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
		<!-- Desktop table -->
		<div class="hidden md:block overflow-x-auto">
			<table class="w-full border-collapse whitespace-nowrap">
				<thead>
					<tr class="bg-surface-container-low/30">
						<th class="px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estimate #</th>
						<th class="px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$activeTerminology.person}</th>
						<th class="px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
						<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount</th>
						<th class="px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
						<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-outline-variant/10">
					{#each filtered as estimate}
						<tr class="hover:bg-surface-container-low/30 transition-colors">
							<td class="px-6 py-4 font-mono text-sm text-on-surface font-semibold">{estimate.invoice_number}</td>
							<td class="px-6 py-4 text-sm text-on-surface">{patientName(estimate.patient_id)}</td>
							<td class="px-6 py-4 text-sm text-on-surface-variant">{formatDate(estimate.issue_date)}</td>
							<td class="px-6 py-4 text-right text-sm font-bold text-on-surface">{formatINRCompact(estimate.grand_total)}</td>
							<td class="px-6 py-4"><StatusChip status={estimate.status} /></td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-2">
									<a href="/invoices/{estimate.id}" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-all">View</a>
									{#if estimate.status !== 'PAID'}
										<button onclick={() => handleConvert(estimate.id)} disabled={convertingId === estimate.id} class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50">
											{convertingId === estimate.id ? 'Converting...' : 'Convert →'}
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
