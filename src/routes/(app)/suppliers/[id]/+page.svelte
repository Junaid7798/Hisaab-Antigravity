<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getSupplier, getPurchaseOrdersBySupplier, getPurchasePaymentsBySupplier, createPurchasePayment } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINR, formatINRCompact } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Supplier, PurchaseOrder, PurchasePayment } from '$lib/db/index';

	let supplierId = $derived($page.params.id);
	let supplier = $state<Supplier | null>(null);
	let poList = $state<PurchaseOrder[]>([]);
	let paymentList = $state<PurchasePayment[]>([]);
	let loading = $state(true);
	
	let showPaymentModal = $state(false);
	let paymentAmount = $state('');
	let paymentMethod = $state<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
	let paymentReference = $state('');

	// Stats
	let totalPurchased = $derived(poList.reduce((sum, po) => sum + po.grand_total, 0));
	let totalPaid = $derived(paymentList.reduce((sum, p) => sum + p.amount, 0));
	let outstanding = $derived(totalPurchased - totalPaid);

	// Timeline
	let timeline = $derived([...poList, ...paymentList].sort((a, b) => {
		const dateA = new Date('payment_date' in a ? a.payment_date : a.issue_date).getTime();
		const dateB = new Date('payment_date' in b ? b.payment_date : b.issue_date).getTime();
		return dateB - dateA; // Descending
	}));

	async function loadSupplier() {
		if (!supplierId) return;
		loading = true;
		supplier = (await getSupplier(supplierId)) || null;
		if (supplier) {
			poList = await getPurchaseOrdersBySupplier(supplier.id);
			paymentList = await getPurchasePaymentsBySupplier(supplier.id);
		}
		loading = false;
	}

	$effect(() => {
		if (supplierId) {
			loadSupplier();
		}
	});

	async function handleRecordPayment() {
		if (!supplierId || !$activeBusinessId) return;
		const amount = parseFloat(paymentAmount) * 100;
		if (isNaN(amount) || amount <= 0) return;

		await createPurchasePayment({
			supplier_id: supplierId,
			amount,
			method: paymentMethod,
			reference: paymentReference,
			payment_date: new Date().toISOString().split('T')[0]
		}, $activeBusinessId);

		toast.success('Payment recorded successfully');
		showPaymentModal = false;
		paymentAmount = '';
		paymentReference = '';
		paymentMethod = 'CASH';
		
		await loadSupplier();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'RECEIVED': return 'bg-success/20 text-success border border-success/30';
			case 'ISSUED': return 'bg-secondary/20 text-secondary border border-secondary/30';
			case 'CANCELLED': return 'bg-error/20 text-error border border-error/30';
			default: return 'bg-surface-variant text-on-surface-variant border border-outline-variant/30';
		}
	}
</script>

<svelte:head>
	<title>{supplier?.name || 'Supplier'} | Hisaab</title>
</svelte:head>

{#if !supplier && !loading}
	<EmptyState icon="local_shipping" title="Supplier not found" description="The requested supplier could not be found." actionLabel="Back to Suppliers" actionHref="/suppliers" />
{:else if supplier}
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center gap-6 mb-10">
		<div class="flex items-center gap-6">
			<PatientAvatar name={supplier.name} size="lg" />
			<div>
				<h1 class="text-3xl font-headline font-extrabold text-on-surface">{supplier.name}</h1>
				<p class="text-on-surface-variant text-sm mt-1">{supplier.phone || 'No Phone'} • {supplier.gstin || 'No GSTIN'}</p>
			</div>
		</div>
		<div class="md:ml-auto w-full md:w-auto mt-2 md:mt-0 flex gap-3">
			<a href="/purchases/new?supplier_id={supplier.id}" class="w-full md:w-auto px-5 py-3 md:py-2.5 bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
				<span class="material-symbols-outlined text-sm">add</span>
				New PO
			</a>
			<button onclick={() => showPaymentModal = true} class="w-full md:w-auto px-5 py-3 md:py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2">
				<span class="material-symbols-outlined text-sm">payments</span>
				Record Payment
			</button>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Purchased</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{formatINRCompact(totalPurchased)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Paid</p>
			<p class="text-2xl font-headline font-bold text-secondary">{formatINRCompact(totalPaid)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Outstanding Payable</p>
			<p class="text-2xl font-headline font-bold {outstanding > 0 ? 'text-error' : 'text-success'}">{formatINRCompact(outstanding)}</p>
		</div>
	</div>

	<h2 class="text-lg font-bold text-on-surface mb-6">Activity Ledger</h2>

	<!-- Activity Timeline -->
	{#if timeline.length === 0}
		<EmptyState icon="history" title="No activity yet" description="Purchase orders and payments will appear here." />
	{:else}
		<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead class="bg-surface-container-low/30 border-b border-outline-variant/15">
						<tr>
							<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
							<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
							<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reference/No.</th>
							<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status/Method</th>
							<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each timeline as item}
							<tr class="border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors">
								<td class="px-6 py-4 text-sm text-on-surface">
									{formatDate('payment_date' in item ? item.payment_date : item.issue_date)}
								</td>
								<td class="px-6 py-4">
									{#if 'payment_date' in item}
										<div class="flex items-center gap-2 text-sm font-semibold text-secondary">
											<span class="material-symbols-outlined text-base">payments</span> Payment Out
										</div>
									{:else}
										<div class="flex items-center gap-2 text-sm font-semibold text-on-surface">
											<span class="material-symbols-outlined text-base">receipt_long</span> Purchase Order
										</div>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm font-medium text-on-surface-variant">
									{#if 'payment_date' in item}
										{item.reference || '—'}
									{:else}
										<a href="/purchases/{item.id}" class="text-primary hover:underline">{item.po_number}</a>
									{/if}
								</td>
								<td class="px-6 py-4">
									{#if 'payment_date' in item}
										<span class="text-xs font-bold text-on-surface-variant px-2 py-1 bg-surface border border-outline-variant/20 rounded capitalize">{item.method.toLowerCase()}</span>
									{:else}
										<span class="text-[10px] font-extrabold px-2.5 py-1 rounded border {getStatusColor(item.status)}">
											{item.status}
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-right font-bold {'payment_date' in item ? 'text-secondary' : 'text-on-surface'}">
									{'payment_date' in item ? '-' : ''}{formatINR('payment_date' in item ? item.amount : item.grand_total)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
{/if}

<!-- Record Payment Modal -->
<Modal show={showPaymentModal} title="Record Payment to Supplier" onclose={() => showPaymentModal = false}>
	<form class="p-6 space-y-4" onsubmit={(e) => { e.preventDefault(); handleRecordPayment(); }}>
		<div class="bg-secondary-container/30 border border-secondary/20 p-4 rounded-xl flex items-center justify-between mb-2">
			<div>
				<p class="text-xs font-bold text-secondary uppercase tracking-wider mb-0.5">Outstanding Balance</p>
				<p class="text-lg font-bold text-on-surface">{formatINR(outstanding)}</p>
			</div>
			<div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
				<span class="material-symbols-outlined">payments</span>
			</div>
		</div>

		<Input label="Amount Paid (₹)" bind:value={paymentAmount} placeholder="e.g. 5000" type="number" step="0.01" min="0" max={outstanding / 100} required />
		
		<div class="grid grid-cols-2 gap-4">
			<Select label="Payment Method" bind:value={paymentMethod} options={[
				{ value: 'CASH', label: 'Cash' },
				{ value: 'UPI', label: 'UPI' },
				{ value: 'BANK_TRANSFER', label: 'Bank Transfer' },
				{ value: 'CARD', label: 'Card' },
				{ value: 'OTHER', label: 'Other/Cheque' }
			]} />
			<Input label="Reference No (Optional)" bind:value={paymentReference} placeholder="UTR / Cheque No." />
		</div>

		<div class="flex justify-end gap-3 mt-6">
			<button type="button" class="px-5 py-2.5 text-on-surface-variant font-semibold hover:bg-surface-variant/20 rounded-lg transition-colors" onclick={() => (showPaymentModal = false)}>
				Cancel
			</button>
			<button type="submit" class="px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50" disabled={!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0}>
				Record Payment
			</button>
		</div>
	</form>
</Modal>
