<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getPurchaseOrder, getPurchaseOrderItems, getSupplier, getBusiness, updatePurchaseOrderStatus } from '$lib/db/crud';
	import { formatINR } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { PurchaseOrder, PurchaseOrderItem, Supplier, Business } from '$lib/db/index';

	let po = $state<PurchaseOrder | null>(null);
	let items = $state<PurchaseOrderItem[]>([]);
	let supplier = $state<Supplier | null>(null);
	let business = $state<Business | null>(null);
	let loading = $state(true);
	let generatingPdf = $state(false);

	let showConfirmReceive = $state(false);
	let statusUpdating = $state(false);

	function getStateName(code: string): string {
		return INDIAN_STATES.find(s => s.code === code)?.name || code;
	}

	async function loadPOData() {
		const id = $page.params.id as string;
		if (!id) return;
		const order = await getPurchaseOrder(id);
		if (order) {
			po = order;
			items = await getPurchaseOrderItems(order.id);
			supplier = (await getSupplier(order.supplier_id)) || null;
			business = (await getBusiness(order.business_id)) || null;
		}
	}

	onMount(async () => {
		await loadPOData();
		loading = false;
	});

	async function handleMarkReceived() {
		if (!po) return;
		statusUpdating = true;
		try {
			await updatePurchaseOrderStatus(po.id, 'RECEIVED');
			toast.success('PO Marked as Received. Stock updated.');
			showConfirmReceive = false;
			await loadPOData();
		} catch (err) {
			toast.error('Failed to update status');
		} finally {
			statusUpdating = false;
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

			const el = document.getElementById('po-printable');
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

			pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
			pdf.save(`${po?.po_number || 'PO'}.pdf`);
			toast.success('PDF downloaded successfully');
		} catch (err) {
			console.error(err);
			toast.error('Failed to generate PDF');
		}
		generatingPdf = false;
	}
</script>

<svelte:head>
	<title>{po?.po_number || 'Purchase Order'} | Hisaab</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
	</div>
{:else if !po}
	<EmptyState
		icon="receipt_long"
		title="Purchase Order not found"
		description="The requested purchase order could not be found."
		actionLabel="Go to Dashboard"
		actionHref="/dashboard"
	/>
{:else}
	<!-- Action Bar (hidden in print) -->
	<div class="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8" in:fade={{ duration: 300 }}>
		<div class="flex items-center gap-4">
			<a href="/suppliers/{po.supplier_id}" class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
				<span class="material-symbols-outlined text-sm">arrow_back</span>
			</a>
			<div>
				<h1 class="text-2xl font-headline font-extrabold text-on-surface tracking-tight">{po.po_number}</h1>
				<p class="text-sm text-on-surface-variant">Issued {formatDate(po.issue_date)}</p>
			</div>
		</div>
		<div class="flex items-center gap-3">
			{#if po.status !== 'RECEIVED'}
				<button onclick={() => showConfirmReceive = true} class="px-5 py-2.5 bg-success text-on-success rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">inventory</span>
					Mark Received
				</button>
			{/if}
			<button onclick={handlePrint} class="px-5 py-2.5 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-[0.98] flex items-center gap-2">
				<span class="material-symbols-outlined text-sm">print</span>
				Print
			</button>
			<button onclick={handleDownloadPdf} disabled={generatingPdf} class="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50">
				<span class="material-symbols-outlined text-sm">{generatingPdf ? 'hourglass_empty' : 'picture_as_pdf'}</span>
				{generatingPdf ? 'Generating...' : 'Download PDF'}
			</button>
		</div>
	</div>

	<!-- Printable PO Document -->
	<div id="po-printable" class="bg-white text-gray-900 max-w-4xl mx-auto rounded-2xl print:rounded-none shadow-lg print:shadow-none overflow-hidden" in:fly={{ y: 20, duration: 400, easing: cubicOut }}>
		<!-- Header -->
		<div class="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white px-8 py-8 print:px-6 print:py-4">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-2xl font-extrabold tracking-tight print:text-xl">{business?.name || 'Business'}</h2>
					{#if business?.gstin}<p class="text-indigo-200 text-xs mt-1 font-mono">GSTIN: {business.gstin}</p>{/if}
					{#if business?.address}<p class="text-indigo-200 text-xs mt-0.5">{business.address}</p>{/if}
				</div>
				<div class="text-right">
					<span class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest {po.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
						{po.status}
					</span>
					<h1 class="text-white text-2xl font-extrabold mt-3 uppercase tracking-widest">PURCHASE ORDER</h1>
					<p class="text-indigo-200 text-sm mt-1">{po.po_number}</p>
					<p class="text-indigo-200 text-xs mt-1">Date: {formatDate(po.issue_date)}</p>
				</div>
			</div>
		</div>

		<!-- Supplier Info -->
		<div class="px-8 py-6 print:px-6 print:py-4 border-b border-gray-100">
			<p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">To (Supplier)</p>
			{#if supplier}
				<p class="text-base font-bold text-gray-900">{supplier.name}</p>
				{#if supplier.phone}<p class="text-sm text-gray-500">Ph: {supplier.phone}</p>{/if}
				{#if supplier.gstin}<p class="text-sm text-gray-500 font-mono mt-1">GSTIN: {supplier.gstin}</p>{/if}
				<p class="text-sm text-gray-500">State: {getStateName(supplier.state_code)} ({supplier.state_code})</p>
			{/if}
		</div>

		<!-- Line Items Table -->
		<div class="px-8 py-6 print:px-6 print:py-4">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b-2 border-gray-200">
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Description</th>
						<th class="text-left py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">HSN/SAC</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rate</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax %</th>
						<th class="text-right py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item, i}
						<tr class="border-b border-gray-100">
							<td class="py-3 text-gray-400">{i + 1}</td>
							<td class="py-3 font-medium text-gray-900">{item.description}</td>
							<td class="py-3 text-gray-500">{item.hsn_sac || '-'}</td>
							<td class="py-3 text-right font-medium text-gray-900">{item.quantity / 100}</td>
							<td class="py-3 text-right text-gray-500">{formatINR(item.rate)}</td>
							<td class="py-3 text-right text-gray-500">{item.tax_rate / 100}%</td>
							<td class="py-3 text-right font-bold text-gray-900">{formatINR(item.amount)}</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="flex justify-end mt-6 border-t border-gray-100 pt-6 mt-6">
				<div class="w-full max-w-sm ml-auto space-y-3">
					<div class="flex justify-between text-sm">
						<span class="text-gray-500 font-medium">Subtotal</span>
						<span class="text-gray-900 font-bold">{formatINR(po.subtotal)}</span>
					</div>

					{#if po.tax_type === 'INTRA_STATE'}
						<div class="flex justify-between text-sm">
							<span class="text-gray-500 font-medium">CGST</span>
							<span class="text-gray-900 font-bold">{formatINR(po.cgst)}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-500 font-medium">SGST</span>
							<span class="text-gray-900 font-bold">{formatINR(po.sgst)}</span>
						</div>
					{:else if po.tax_type === 'INTER_STATE'}
						<div class="flex justify-between text-sm">
							<span class="text-gray-500 font-medium">IGST</span>
							<span class="text-gray-900 font-bold">{formatINR(po.igst)}</span>
						</div>
					{/if}

					<div class="flex justify-between border-t border-gray-200 pt-3">
						<span class="text-base font-bold text-gray-900">Grand Total</span>
						<span class="text-xl font-black text-indigo-600">{formatINR(po.grand_total)}</span>
					</div>
				</div>
			</div>
			
			<div class="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
				This is a computer generated purchase order.
			</div>
		</div>
	</div>
{/if}

<Modal show={showConfirmReceive} title="Confirm Receipt" onclose={() => showConfirmReceive = false}>
	<div class="space-y-4 p-6">
		<div class="bg-success/10 text-success p-4 rounded-xl flex gap-3 text-sm font-semibold">
			<span class="material-symbols-outlined">info</span>
			<p>Marking this PO as Received will instantly add the quantities of these items to your inventory stock. This action will deduct stock if you later un-receive it.</p>
		</div>
		<p class="text-on-surface">Are you sure you have received these items from the supplier?</p>

		<div class="flex justify-end gap-3 mt-6">
			<button class="px-4 py-2 text-on-surface-variant font-semibold hover:bg-surface-variant/20 rounded-lg transition-colors" onclick={() => (showConfirmReceive = false)}>
				Cancel
			</button>
			<button class="px-5 py-2 bg-success text-on-success font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity" onclick={handleMarkReceived} disabled={statusUpdating}>
				{statusUpdating ? 'Updating...' : 'Yes, Confirm Receipt'}
			</button>
		</div>
	</div>
</Modal>
