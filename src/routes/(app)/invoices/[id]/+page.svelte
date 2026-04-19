<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { buildWhatsAppInvoiceMessage } from '$lib/utils/whatsapp';
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
		if (!invoice || !business) return;
		generatingPdf = true;
		try {
			const { jsPDF } = await import('jspdf');
			const autoTable = (await import('jspdf-autotable')).default;

			const pdf = new jsPDF('p', 'mm', 'a4');
			const W = pdf.internal.pageSize.getWidth();
			let y = 0;

			// Header band
			pdf.setFillColor(30, 30, 30);
			pdf.rect(0, 0, W, 40, 'F');

			pdf.setTextColor(255, 255, 255);
			pdf.setFontSize(16);
			pdf.setFont('helvetica', 'bold');
			pdf.text(business.name || 'Business', 14, 14);

			if (business.gstin) {
				pdf.setFontSize(8);
				pdf.setFont('helvetica', 'normal');
				pdf.setTextColor(180, 180, 180);
				pdf.text(`GSTIN: ${business.gstin}`, 14, 20);
			}
			if (business.address) {
				pdf.setFontSize(8);
				pdf.setTextColor(180, 180, 180);
				pdf.text(business.address, 14, 25);
			}
			if (business.phone || business.email) {
				pdf.setFontSize(8);
				pdf.setTextColor(180, 180, 180);
				pdf.text([business.phone, business.email].filter(Boolean).join('  •  '), 14, 30);
			}

			// Invoice number & status (right side of header)
			pdf.setFontSize(12);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(255, 255, 255);
			pdf.text(invoice.invoice_number, W - 14, 14, { align: 'right' });
			pdf.setFontSize(8);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(180, 180, 180);
			pdf.text(`Issued: ${invoice.issue_date}`, W - 14, 20, { align: 'right' });
			if (invoice.due_date) pdf.text(`Due: ${invoice.due_date}`, W - 14, 25, { align: 'right' });
			pdf.text(invoice.document_type === 'ESTIMATE' ? 'ESTIMATE' : invoice.status, W - 14, 31, { align: 'right' });

			y = 48;

			// Bill To section
			pdf.setTextColor(120, 120, 120);
			pdf.setFontSize(8);
			pdf.setFont('helvetica', 'bold');
			pdf.text('BILL TO', 14, y);
			y += 5;
			if (patient) {
				pdf.setFont('helvetica', 'bold');
				pdf.setFontSize(11);
				pdf.setTextColor(30, 30, 30);
				pdf.text(patient.name, 14, y);
				y += 5;
				pdf.setFont('helvetica', 'normal');
				pdf.setFontSize(9);
				pdf.setTextColor(80, 80, 80);
				if (patient.phone) { pdf.text(patient.phone, 14, y); y += 4; }
				if (patient.address) { pdf.text(patient.address, 14, y); y += 4; }
			}
			y += 4;

			// Line items table
			const tableBody = items.map((item, i) => [
				i + 1,
				item.description,
				item.hsn_sac || '—',
				item.quantity,
				formatINR(item.rate),
				`${(item.tax_rate / 100).toFixed(1)}%`,
				formatINR(item.amount)
			]);

			autoTable(pdf, {
				startY: y,
				head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Tax%', 'Amount']],
				body: tableBody,
				theme: 'striped',
				headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
				bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
				columnStyles: {
					0: { cellWidth: 8 },
					3: { halign: 'right' },
					4: { halign: 'right' },
					5: { halign: 'right' },
					6: { halign: 'right', fontStyle: 'bold' }
				},
				margin: { left: 14, right: 14 }
			});

			// Totals block
			const afterTable = (pdf as any).lastAutoTable.finalY + 6;
			const totalsX = W - 80;
			let ty = afterTable;

			const addRow = (label: string, value: string, bold = false) => {
				pdf.setFontSize(9);
				pdf.setFont('helvetica', bold ? 'bold' : 'normal');
				pdf.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80);
				pdf.text(label, totalsX, ty);
				pdf.text(value, W - 14, ty, { align: 'right' });
				ty += 5;
			};

			addRow('Subtotal', formatINR(invoice.subtotal));
			if (invoice.tax_type === 'INTRA_STATE') {
				addRow('CGST', formatINR(invoice.cgst));
				addRow('SGST', formatINR(invoice.sgst));
			} else if (invoice.tax_type === 'INTER_STATE') {
				addRow('IGST', formatINR(invoice.igst));
			}
			pdf.setDrawColor(30, 30, 30);
			pdf.line(totalsX, ty, W - 14, ty);
			ty += 3;
			addRow('Grand Total', formatINR(invoice.grand_total), true);

			// Notes
			if (invoice.notes) {
				ty += 8;
				pdf.setFontSize(8);
				pdf.setFont('helvetica', 'bold');
				pdf.setTextColor(120, 120, 120);
				pdf.text('NOTES', 14, ty);
				ty += 4;
				pdf.setFont('helvetica', 'normal');
				pdf.setTextColor(60, 60, 60);
				pdf.text(invoice.notes, 14, ty);
			}

			// Footer
			const pageH = pdf.internal.pageSize.getHeight();
			pdf.setFontSize(7);
			pdf.setTextColor(160, 160, 160);
			pdf.setFont('helvetica', 'normal');
			pdf.text('Generated by Hisaab — Modern Business Platform', W / 2, pageH - 8, { align: 'center' });

			pdf.save(`${invoice.invoice_number}.pdf`);
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
		const msg = buildWhatsAppInvoiceMessage({
			customerName: patient.name,
			invoiceNumber: invoice.invoice_number,
			grandTotal: invoice.grand_total,
			issueDate: invoice.issue_date,
			dueDate: invoice.due_date || undefined,
			businessName: business?.name || '',
			businessPhone: business?.phone || undefined,
			upiId: business?.upi_id || undefined,
			locale: $locale || 'en'
		});
		const encoded = encodeURIComponent(msg);
		window.open(`https://wa.me/${patient.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
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
		<div class="bg-linear-to-br from-gray-900 to-gray-800 text-white px-8 py-8 print:px-6 print:py-4">
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
			margin: 0 !important;
			padding: 0 !important;
		}
		/* Hide all app chrome */
		:global(nav),
		:global(aside),
		:global(header),
		:global(.print\:hidden) {
			display: none !important;
		}
		/* Remove app layout margins so invoice fills the page */
		:global(main) {
			margin: 0 !important;
			padding: 0 !important;
		}
		/* Ensure the printable area fills the page */
		:global(#invoice-printable) {
			box-shadow: none !important;
			border-radius: 0 !important;
			max-width: 100% !important;
			page-break-inside: avoid;
		}
		/* Force dark header background to print */
		:global(#invoice-printable .bg-linear-to-br) {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
</style>
