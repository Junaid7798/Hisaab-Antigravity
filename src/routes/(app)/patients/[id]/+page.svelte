<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { getPatient, getInvoicesByPatient, getPaymentsByPatient, createPayment, updateInvoiceStatus, getPaymentTotalForInvoice } from '$lib/db/crud';
	import { formatINR, formatINRCompact } from '$lib/utils/currency';
	import { formatDate, today } from '$lib/utils/helpers';
	import { activeTerminology } from '$lib/stores/session';
	import { toast } from '$lib/stores/toast';
	import type { Patient, Invoice, Payment } from '$lib/db/index';

	let patient = $state<Patient | null>(null);
	let invoices = $state<Invoice[]>([]);
	let payments = $state<Payment[]>([]);
	let loading = $state(true);

	let totalBilled = $derived(invoices.reduce((s, i) => s + i.grand_total, 0));
	let totalPaid = $derived(payments.reduce((s, p) => s + p.amount, 0));
	let outstanding = $derived(totalBilled - totalPaid);

	let showPaymentModal = $state(false);
	let newPaymentAmount = $state('');
	let newPaymentDate = $state(today());
	let newPaymentMethod = $state('CASH');
	let newPaymentRef = $state('');

	async function loadLedger() {
		const id = $page.params.id as string;
		if (!id) return;
		patient = (await getPatient(id)) || null;
		if (patient) {
			invoices = await getInvoicesByPatient(patient.id);
			payments = await getPaymentsByPatient(patient.id);
		}
	}

	onMount(async () => {
		await loadLedger();
		loading = false;
	});

	let timeline = $derived.by(() => {
		const items: { type: 'invoice' | 'payment'; date: string; amount: number; id: string; ref: string }[] = [];
		invoices.forEach(i => items.push({ type: 'invoice', date: i.issue_date, amount: i.grand_total, id: i.id, ref: i.invoice_number }));
		payments.forEach(p => items.push({ type: 'payment', date: p.payment_date, amount: p.amount, id: p.id, ref: p.method }));
		
		return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	});

	async function handleRecordPayment() {
		if (!patient) return;
		const amt = Math.round(Number(newPaymentAmount) * 100);
		if (amt <= 0) return;

		await createPayment(patient.business_id, {
			patient_id: patient.id,
			amount: amt,
			payment_date: newPaymentDate,
			method: newPaymentMethod as any,
			reference: newPaymentRef
		});

		// Smart invoice status update: check ACTUAL per-invoice outstanding
		const unpaidInvoices = invoices
			.filter(i => i.status !== 'PAID')
			.sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());

		let remainingAmt = amt;
		for (const inv of unpaidInvoices) {
			if (remainingAmt <= 0) break;
			const alreadyPaid = await getPaymentTotalForInvoice(inv.id);
			const invoiceRemaining = inv.grand_total - alreadyPaid;
			
			if (invoiceRemaining <= 0) continue; // already settled
			
			if (remainingAmt >= invoiceRemaining) {
				await updateInvoiceStatus(inv.id, 'PAID');
				remainingAmt -= invoiceRemaining;
			} else {
				await updateInvoiceStatus(inv.id, 'PARTIAL');
				remainingAmt = 0;
			}
		}

		toast.success('Payment recorded successfully');
		showPaymentModal = false;
		
		// Reset form
		newPaymentAmount = '';
		newPaymentRef = '';
		
		await loadLedger();
	}
</script>

<svelte:head>
	<title>{patient?.name || $activeTerminology.person} | Hisaab</title>
</svelte:head>

{#if !patient && !loading}
	<EmptyState icon="person_off" title={`${$activeTerminology.person} not found`} description={`The requested ${$activeTerminology.person.toLowerCase()} could not be found.`} actionLabel={`Back to ${$activeTerminology.people}`} actionHref="/patients" />
{:else if patient}
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center gap-6 mb-10">
		<div class="flex items-center gap-6">
			<PatientAvatar name={patient.name} size="lg" />
			<div>
				<h1 class="text-3xl font-headline font-extrabold text-on-surface">{patient.name}</h1>
				<p class="text-on-surface-variant text-sm mt-1">{patient.phone || 'No Phone'} • {patient.address || 'No Address'}</p>
			</div>
		</div>
		<div class="md:ml-auto w-full md:w-auto mt-2 md:mt-0 flex gap-3">
			<a href="/invoices/new?patient_id={patient.id}" class="w-full md:w-auto px-5 py-3 md:py-2.5 bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
				<span class="material-symbols-outlined text-sm">add</span>
				New {$activeTerminology.document}
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
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Billed</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{formatINRCompact(totalBilled)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Paid</p>
			<p class="text-2xl font-headline font-bold text-secondary">{formatINRCompact(totalPaid)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Outstanding Balance</p>
			<p class="text-2xl font-headline font-bold {outstanding > 0 ? 'text-error' : 'text-primary'}">{formatINRCompact(outstanding)}</p>
		</div>
	</div>

	<!-- Ledger View -->
	<div class="bg-surface-container-lowest rounded-xl overflow-hidden mb-10">
		<div class="p-6 border-b border-surface-container">
			<h3 class="font-headline font-bold text-xl">Ledger & Timeline</h3>
		</div>

		{#if timeline.length === 0}
			<EmptyState icon="history" title="No history" description="No invoices or payments recorded yet." />
		{:else}
			<div class="p-6">
				<div class="relative border-l-2 border-outline-variant/30 ml-4 pl-6 space-y-8">
					{#each timeline as item}
						<div class="relative">
							<!-- Timeline Dot -->
							<div class="absolute -left-[33px] top-1 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-surface {item.type === 'invoice' ? 'border-2 border-on-surface-variant text-on-surface-variant' : 'border-2 border-primary bg-primary text-on-primary'} shadow-sm">
								<span class="material-symbols-outlined text-[12px]">{item.type === 'invoice' ? 'receipt_long' : 'payments'}</span>
							</div>

							<div>
								<div class="flex items-center justify-between mb-1">
									<h4 class="font-bold text-sm text-on-surface flex items-center gap-2">
										{#if item.type === 'invoice'}
											{$activeTerminology.document} Billed ({item.ref})
										{:else}
											Payment Received ({item.ref})
										{/if}
									</h4>
									<span class="font-bold font-headline {item.type === 'payment' ? 'text-primary' : 'text-on-surface'}">
										{item.type === 'payment' ? '+' : ''}{formatINR(item.amount)}
									</span>
								</div>
								<p class="text-xs text-on-surface-variant">{formatDate(item.date)}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Record Payment Modal -->
	<Modal show={showPaymentModal} title="Record Payment" onclose={() => showPaymentModal = false}>
		<form class="p-6 overflow-y-auto max-h-[80vh]" onsubmit={(e) => { e.preventDefault(); handleRecordPayment(); }}>
			<div class="space-y-6">
				{#if outstanding > 0}
					<div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
						<span class="text-sm font-bold text-on-surface-variant">Outstanding Balance</span>
						<span class="text-lg font-headline font-extrabold text-primary">{formatINR(outstanding)}</span>
					</div>
				{/if}

				<Input
					label="Amount Received (₹)"
					bind:value={newPaymentAmount}
					required
					type="number"
					step="0.01"
					min="1"
				/>
				
				<div class="grid grid-cols-2 gap-4">
					<Input
						label="Payment Date"
						bind:value={newPaymentDate}
						required
						type="date"
					/>
					<Select
						label="Payment Method"
						bind:value={newPaymentMethod}
						options={[
							{ value: 'CASH', label: 'Cash' },
							{ value: 'UPI', label: 'UPI' },
							{ value: 'CARD', label: 'Card' },
							{ value: 'BANK_TRANSFER', label: 'Bank Transfer' },
							{ value: 'OTHER', label: 'Other / Cheque' }
						]}
					/>
				</div>

				<Input
					label="Reference / UTR (Optional)"
					bind:value={newPaymentRef}
					placeholder="UPI Ref, Cheque No, etc."
				/>

				<div class="flex justify-end gap-3 pt-6 border-t border-outline-variant/20">
					<button type="button" onclick={() => showPaymentModal = false} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm hover:bg-surface-container rounded-lg">Cancel</button>
					<button type="submit" class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md">
						Save Payment
					</button>
				</div>
			</div>
		</form>
	</Modal>
{/if}
