<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { getInvoice, getInvoiceItems, getPatient, getBusiness, updateInvoiceStatus, getPaymentsByInvoice, createPayment, convertEstimateToInvoice } from '$lib/db/crud';
	import { formatINR } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES, today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { activeTerminology } from '$lib/stores/session';
	import type { Invoice, InvoiceItem, Patient, Business, Payment } from '$lib/db/index';

	let invoice = $state<Invoice | null>(null);
	let items = $state<InvoiceItem[]>([]);
	let patient = $state<Patient | null>(null);
	let business = $state<Business | null>(null);
	let payments = $state<Payment[]>([]);
	let loading = $state(true);
	let generatingPdf = $state(false);

	let totalPaid = $derived(payments.reduce((s, p) => s + p.amount, 0));
	let outstanding = $derived(invoice ? invoice.grand_total - totalPaid : 0);

	let showPaymentModal = $state(false);
	let newPaymentAmount = $state('');
	let newPaymentDate = $state(today());
	let newPaymentMethod = $state('CASH');
	let newPaymentRef = $state('');

	function getStateName(code: string): string {
		return INDIAN_STATES.find(s => s.code === code)?.name || code;
	}

	async function loadInvoiceData() {
		const id = $page.params.id as string;
		if (!id) return;
		const inv = await getInvoice(id);
		if (inv) {
			invoice = inv;
			items = await getInvoiceItems(inv.id);
			patient = (await getPatient(inv.patient_id)) || null;
			business = (await getBusiness(inv.business_id)) || null;
			payments = await getPaymentsByInvoice(inv.id);
			
			// pre-fill amount with outstanding
			if (invoice) {
				const diff = invoice.grand_total - payments.reduce((s, p) => s + p.amount, 0);
				newPaymentAmount = diff > 0 ? (diff / 100).toString() : '';
			}
		}
	}

	onMount(async () => {
		await loadInvoiceData();
		loading = false;
	});

	async function handleRecordPayment() {
		if (!invoice || !business) return;
		const amt = Math.round(Number(newPaymentAmount) * 100);
		if (amt <= 0) return;

		await createPayment(business.id, {
			patient_id: invoice.patient_id,
			invoice_id: invoice.id,
			amount: amt,
			payment_date: newPaymentDate,
			method: newPaymentMethod as any,
			reference: newPaymentRef
		});

		const newTotalPaid = totalPaid + amt;
		let newStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
		
		if (newTotalPaid >= invoice.grand_total) {
			newStatus = 'PAID';
		} else if (newTotalPaid > 0) {
			newStatus = 'PARTIAL';
		}

		await updateInvoiceStatus(invoice.id, newStatus);
		invoice = { ...invoice, status: newStatus };

		toast.success('Payment recorded successfully');
		showPaymentModal = false;
		newPaymentRef = '';
		
		await loadInvoiceData();
	}

	async function handleConvertEstimate() {
		if (!invoice) return;
		try {
			loading = true;
			const newInvoice = await convertEstimateToInvoice(invoice.id);
			toast.success('Estimate converted to Invoice successfully');
			// Navigate to the newly created invoice
			window.location.href = `/invoices/${newInvoice.id}`;
		} catch (err: any) {
			console.error(err);
			toast.error('Failed to convert estimate: ' + err.message);
			loading = false;
		}
	}

	function handlePrint() {
		window.print();
	}

	async function handleDownloadPdf() {
		generatingPdf = true;
		try {
			const html2canvas = (await import('html2canvas')).default;
			const { jsPDF } = await import('jspdf');

			const el = document.getElementById('invoice-printable');
			if (!el) return;

			const canvas = await html2canvas(el, {
				scale: 2,
				useCORS: true,
				backgroundColor: '#ffffff'
			});

			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = pageWidth - 20;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;

			let heightLeft = imgHeight;
			let position = 10;

			pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;

			while (heightLeft > 0) {
				position = heightLeft - imgHeight + 10;
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			pdf.save(`${invoice?.invoice_number || 'invoice'}.pdf`);
			toast.success($_('toast.pdf_downloaded', { default: 'PDF downloaded successfully' }));
		} catch (err) {
			console.error(err);
			toast.error($_('toast.pdf_fail', { default: 'Failed to generate PDF' }));
		}
		generatingPdf = false;
	}

	async function handleShare() {
		if (!invoice) return;
		const text = `Invoice ${invoice.invoice_number} from ${business?.name} for ${formatINR(invoice.grand_total)}\nDue: ${formatDate(invoice.issue_date)}`;
		if (navigator.share) {
			try {
				await navigator.share({
					title: `Invoice ${invoice.invoice_number}`,
					text: text,
					url: window.location.href // Since it's a PWA, URL won't work perfectly unless hosted, but it's okay standard fallback
				});
			} catch (err) {
				console.error('Error sharing:', err);
			}
		} else {
			// Fallback copy to clipboard
			try {
				await navigator.clipboard.writeText(text);
				toast.success('Invoice details copied to clipboard');
			} catch (e) {
				toast.error('Sharing not supported on this device');
			}
		}
	}

	function handleWhatsApp() {
		if (!invoice || !patient?.phone) {
			toast.error(`${$activeTerminology.person} phone number missing`);
			return;
		}
		const text = `Hello ${patient.name},%0A%0AHere are your invoice details from *${business?.name}*:%0A%0A*Invoice:* ${invoice.invoice_number}%0A*Amount:* ${formatINR(invoice.grand_total)}%0A*Date:* ${formatDate(invoice.issue_date)}%0A%0AThank you!`;
		window.open(`https://wa.me/${patient.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
	}
</script>

<svelte:head>
	<title>{invoice?.invoice_number || 'Invoice'} | Hisaab</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
	</div>
{:else if !invoice}
	<EmptyState
		icon="receipt_long"
		title={$_('invoices.not_found', { default: 'Invoice not found' })}
		description={$_('invoices.not_found_desc', { default: 'The requested invoice could not be found.' })}
		actionLabel={$_('nav.dashboard', { default: 'Go to Dashboard' })}
		actionHref="/dashboard"
	/>
{:else}
	<!-- Action Bar (hidden in print) -->
	<div class="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8" in:fade={{ duration: 300 }}>
		<div class="flex items-center gap-4">
			<a href="/dashboard" class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
				<span class="material-symbols-outlined text-sm">arrow_back</span>
			</a>
			<div>
				<h1 class="text-2xl font-headline font-extrabold text-on-surface tracking-tight">{invoice.invoice_number}</h1>
				<p class="text-sm text-on-surface-variant">{$_('invoices.issued', { default: 'Issued' })} {formatDate(invoice.issue_date)}</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			{#if invoice.document_type === 'ESTIMATE'}
				<button onclick={handleConvertEstimate} class="px-5 py-2.5 bg-tertiary text-on-tertiary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">transform</span>
					Convert to Invoice
				</button>
			{:else if invoice.status !== 'PAID' && invoice.document_type !== 'CREDIT_NOTE'}
				<button onclick={() => showPaymentModal = true} class="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">payments</span>
					Record Payment
				</button>
			{/if}
			{#if invoice.status !== 'PAID' && invoice.document_type !== 'CREDIT_NOTE'}
				<a href="/invoices/{invoice.id}/edit" class="px-5 py-2.5 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-[0.98] flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">edit</span>
					Edit
				</a>
			{/if}
			{#if invoice.document_type === 'INVOICE'}
				<a href="/invoices/{invoice.id}/return" class="px-5 py-2.5 bg-error/10 text-error rounded-xl font-bold text-sm hover:bg-error/20 transition-all active:scale-[0.98] flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">assignment_return</span>
					Return / Refund
				</a>
			{/if}
			<button onclick={handleWhatsApp} class="px-5 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm border border-secondary/30 hover:bg-secondary-container/80 transition-all active:scale-[0.98] flex items-center gap-2">
				<span class="material-symbols-outlined text-sm">chat</span>
				WhatsApp
			</button>
			<button onclick={handleShare} class="px-5 py-2.5 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-[0.98] flex items-center gap-2">
				<span class="material-symbols-outlined text-sm">share</span>
				Share
			</button>
			<button onclick={handlePrint} class="px-5 py-2.5 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-[0.98] flex items-center gap-2">
				<span class="material-symbols-outlined text-sm">print</span>
				{$_('invoices.print', { default: 'Print' })}
			</button>
			<button onclick={handleDownloadPdf} disabled={generatingPdf} class="px-5 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50">
				<span class="material-symbols-outlined text-sm">{generatingPdf ? 'hourglass_empty' : 'picture_as_pdf'}</span>
				{generatingPdf ? $_('invoices.generating', { default: 'Generating...' }) : $_('invoices.download_pdf', { default: 'Download PDF' })}
			</button>
		</div>
	</div>

	<!-- Printable Invoice Document -->
	<div id="invoice-printable" class="bg-white text-gray-900 max-w-4xl mx-auto rounded-2xl print:rounded-none shadow-lg print:shadow-none overflow-hidden" in:fly={{ y: 20, duration: 400, easing: cubicOut }}>
		<!-- Header -->
		<div class="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-8 py-8 print:px-6 print:py-4">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-2xl font-extrabold tracking-tight print:text-xl">{business?.name || 'Business'}</h2>
					{#if business?.gstin}
						<p class="text-gray-400 text-xs mt-1 font-mono">GSTIN: {business.gstin}</p>
					{/if}
					{#if business?.address}
						<p class="text-gray-400 text-xs mt-0.5">{business.address}</p>
					{/if}
					{#if business?.phone || business?.email}
						<p class="text-gray-400 text-xs mt-0.5">{[business.phone, business.email].filter(Boolean).join(' • ')}</p>
					{/if}
				</div>
				<div class="text-right">
					<span class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest {invoice.document_type === 'ESTIMATE' ? 'bg-info-container/50 text-info' : invoice.status === 'PAID' ? 'bg-success-container/50 text-success' : invoice.status === 'PARTIAL' ? 'bg-warning-container/50 text-warning' : 'bg-error-container/50 text-error'}">
						{invoice.document_type === 'ESTIMATE' ? 'ESTIMATE' : invoice.status}
					</span>
					<p class="text-white text-xl font-extrabold mt-3">{invoice.invoice_number}</p>
					<p class="text-gray-400 text-xs mt-1">{$_('invoices.issued', { default: 'Issued' })}: {formatDate(invoice.issue_date)}</p>
					{#if invoice.due_date}
						<p class="text-gray-400 text-xs">{$_('invoices.due', { default: 'Due' })}: {formatDate(invoice.due_date)}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Bill To -->
		<div class="px-8 py-6 print:px-6 print:py-4 border-b border-gray-100">
			<p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{$_('invoices.bill_to', { default: 'Bill To' })}</p>
			{#if patient}
				<p class="text-base font-bold text-gray-900">{patient.name}</p>
				{#if patient.phone}<p class="text-sm text-gray-500">{patient.phone}</p>{/if}
				{#if patient.address}<p class="text-sm text-gray-500">{patient.address}</p>{/if}
				<p class="text-sm text-gray-500">{$_('invoices.state', { default: 'State' })}: {getStateName(patient.state_code)} ({patient.state_code})</p>
			{/if}
		</div>

		<!-- Line Items Table -->
		<div class="px-8 py-6 print:px-6 print:py-4">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b-2 border-gray-200">
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{$_('invoices.col_desc', { default: 'Description' })}</th>
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">HSN/SAC</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{$_('invoices.col_qty', { default: 'Qty' })}</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{$_('invoices.col_rate', { default: 'Rate' })}</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{$_('invoices.col_tax', { default: 'Tax %' })}</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{$_('invoices.col_amount', { default: 'Amount' })}</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item, i}
						<tr class="border-b border-gray-100">
							<td class="py-3 text-gray-400">{i + 1}</td>
							<td class="py-3 font-medium text-gray-900">{item.description}</td>
							<td class="py-3 text-gray-500 font-mono text-xs">{item.hsn_sac || '—'}</td>
							<td class="py-3 text-right text-gray-700">{item.quantity}</td>
							<td class="py-3 text-right text-gray-700">{formatINR(item.rate)}</td>
							<td class="py-3 text-right text-gray-500">{(item.tax_rate / 100).toFixed(1)}%</td>
							<td class="py-3 text-right font-semibold text-gray-900">{formatINR(item.amount)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Totals -->
		<div class="px-8 pb-8 print:px-6 print:pb-4">
			<div class="flex justify-end">
				<div class="w-72 space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-gray-500">{$_('invoices.subtotal', { default: 'Subtotal' })}</span>
						<span class="font-medium">{formatINR(invoice.subtotal)}</span>
					</div>
					{#if invoice.tax_type === 'INTRA_STATE'}
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">CGST</span>
							<span class="font-medium">{formatINR(invoice.cgst)}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">SGST</span>
							<span class="font-medium">{formatINR(invoice.sgst)}</span>
						</div>
					{:else if invoice.tax_type === 'INTER_STATE'}
						<div class="flex justify-between text-sm">
							<span class="text-gray-500">IGST</span>
							<span class="font-medium">{formatINR(invoice.igst)}</span>
						</div>
					{/if}
					<div class="border-t-2 border-gray-900 pt-3 mt-3 flex justify-between">
						<span class="text-base font-extrabold text-gray-900">{$_('invoices.grand_total', { default: 'Grand Total' })}</span>
						<span class="text-xl font-extrabold text-gray-900">{formatINR(invoice.grand_total)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		{#if invoice.notes}
			<div class="px-8 py-4 print:px-6 bg-gray-50 border-t border-gray-100">
				<p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{$_('invoices.notes', { default: 'Notes' })}</p>
				<p class="text-sm text-gray-600">{invoice.notes}</p>
			</div>
		{/if}

		<div class="px-8 py-4 print:px-6 bg-gray-50 border-t border-gray-100 text-center">
			<p class="text-[10px] text-gray-400">{$_('invoices.generated_by', { default: 'Generated by Hisaab — Modern Business Platform' })}</p>
		</div>
	</div>

	<!-- Record Payment Modal -->
	<Modal show={showPaymentModal} title="Record Payment" onclose={() => showPaymentModal = false}>
		<form class="p-6 overflow-y-auto max-h-[80vh]" onsubmit={(e) => { e.preventDefault(); handleRecordPayment(); }}>
			<div class="space-y-6">
				<div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center mb-6">
					<span class="text-sm font-bold text-on-surface-variant">Outstanding Balance</span>
					<span class="text-lg font-headline font-extrabold text-primary">{formatINR(outstanding)}</span>
				</div>

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

<style>
	@media print {
		:global(body) {
			background: white !important;
		}
		:global(.print\:hidden),
		:global(nav),
		:global(aside),
		:global(header) {
			display: none !important;
		}
	}
</style>
