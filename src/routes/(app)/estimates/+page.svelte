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
<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
	<div>
		<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Estimates</h1>
		<p class="text-on-surface-variant mt-1 text-sm">Proforma quotes and estimates for {$activeTerminology.people.toLowerCase()}.</p>
	</div>
	<a
		href="/estimates/new"
		class="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-all"
	>
		<span class="material-symbols-outlined text-sm">add</span>
		New Estimate
	</a>
</div>

<!-- Stats -->
{#if !loading}
	<div class="grid grid-cols-3 gap-4 mb-8">
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Estimates</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{estimates.length}</p>
		</div>
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pending Approval</p>
			<p class="text-2xl font-headline font-bold text-primary">{pendingCount}</p>
		</div>
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Value</p>
			<p class="text-xl font-headline font-bold text-on-surface">{formatINRCompact(totalValue)}</p>
		</div>
	</div>
{/if}

<!-- Search -->
<div class="mb-6 max-w-md">
	<Input
		bind:value={searchQuery}
		placeholder="Search by estimate # or customer..."
		icon="search"
	/>
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
		<div class="overflow-x-auto">
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
							<td class="px-6 py-4">
								<StatusChip status={estimate.status} />
							</td>
							<td class="px-6 py-4 text-right">
								<div class="flex items-center justify-end gap-2">
									<a
										href="/invoices/{estimate.id}"
										class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-all"
									>
										View
									</a>
									{#if estimate.status !== 'PAID'}
										<button
											onclick={() => handleConvert(estimate.id)}
											disabled={convertingId === estimate.id}
											class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50"
											title="Convert to Invoice"
										>
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
