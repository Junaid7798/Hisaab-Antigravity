<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getInvoice, getInvoiceItems, getPatient, updateProduct, getProducts, createInvoice } from '$lib/db/crud';
	import { formatINR } from '$lib/utils/currency';
	import { today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Invoice, InvoiceItem, Patient, Product } from '$lib/db/index';
	import { generateId } from '$lib/utils/helpers';

	let invoice = $state<Invoice | null>(null);
	let originalItems = $state<InvoiceItem[]>([]);
	let patient = $state<Patient | null>(null);
	let products = $state<Product[]>([]);
	
	let returnItems = $state<{ item: InvoiceItem; returnQty: number }[]>([]);
	let returnDate = $state(today());
	let refundMethod = $state('CASH');
	let returnNotes = $state('');
	
	let saving = $state(false);
	let loading = $state(true);

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;

		const inv = await getInvoice(id);
		if (inv) {
			invoice = inv;
			originalItems = await getInvoiceItems(inv.id);
			patient = await getPatient(inv.patient_id) || null;
			products = await getProducts(inv.business_id);
			
			// Initialize return quantities to 0
			returnItems = originalItems.map(item => ({
				item,
				returnQty: 0
			}));
		}
		loading = false;
	});

	let totalRefund = $derived.by(() => {
		return returnItems.reduce((sum, { item, returnQty }) => {
			const qtyStr = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0;
			// amount is total for the original quantity, so we find rate * returnQty + tax
			const rate = item.rate; // stored in paise
			const gross = rate * returnQty;
			// Add tax
			const taxAmt = gross * (item.tax_rate / 10000); // tax_rate is x100 (1800 -> 18%)
			return sum + gross + taxAmt;
		}, 0);
	});

	async function handleSubmit() {
		if (!invoice || !patient) return;
		const hasReturns = returnItems.some(r => r.returnQty > 0);
		if (!hasReturns) {
			toast.error('Select at least one item to return');
			return;
		}

		saving = true;

		try {
			// 1. Create CREDIT_NOTE document
			const creditItems = returnItems
				.filter(r => r.returnQty > 0)
				.map(r => ({
					description: `Returned: ${r.item.description}`,
					hsn_sac: r.item.hsn_sac,
					quantity: Math.round(r.returnQty * 100), // match standard system
					rate: r.item.rate,
					tax_rate: r.item.tax_rate,
					amount: Math.round(r.item.rate * r.returnQty),
					invoice_id: ''
				}));

			// Calculate Taxes for Credit Note
			let subtotal = 0;
			let total_tax = 0;
			let cgst = 0;
			let sgst = 0;
			let igst = 0;

			creditItems.forEach(ci => {
				subtotal += ci.amount;
				const taxAmount = (ci.amount * ci.tax_rate) / 10000;
				total_tax += taxAmount;
				if (invoice?.tax_type === 'INTRA_STATE') {
					cgst += taxAmount / 2;
					sgst += taxAmount / 2;
				} else if (invoice?.tax_type === 'INTER_STATE') {
					igst += taxAmount;
				}
			});

			const grand_total = Math.round(subtotal + total_tax);

			const creditNote = await createInvoice({
				business_id: invoice.business_id,
				patient_id: invoice.patient_id,
				invoice_number: `CN-${invoice.invoice_number}`,
				issue_date: returnDate,
				due_date: returnDate,
				tax_type: invoice.tax_type,
				subtotal,
				total_tax,
				grand_total,
				cgst,
				sgst,
				igst,
				status: 'PAID', // A Credit Note itself doesn't need to be paid usually, it marks a finalized refund
				document_type: 'CREDIT_NOTE',
				linked_invoice_id: invoice.id,
				notes: returnNotes
			}, creditItems);

			// 2. Re-increment stock
			for (const r of returnItems) {
				if (r.returnQty > 0) {
					// Identify product mapping by description or hsn as best effort matching since item might strictly just have description initially, but if it has product_id:
					// Our older system doesn't explicitly guarantee product_id on `invoice_items` strictly. Let's lookup via name
					const product = products.find(p => p.name === r.item.description);
					if (product && !product.is_service) {
						const refundQuantity = Math.round(r.returnQty * 100);
						await updateProduct(product.id, {
							stock_quantity: product.stock_quantity + refundQuantity
						});
					}
				}
			}

			toast.success('Credit Note created and stock returned.');
			setTimeout(() => {
				goto(`/invoices/${creditNote.id}`);
			}, 300);

		} catch (err) {
			console.error(err);
			toast.error('Failed to process return');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create Credit Note | Hisaab</title>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-64">
		<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
	</div>
{:else if invoice}
	<div class="max-w-4xl mx-auto space-y-8 pb-32">
		<div>
			<h2 class="text-3xl font-headline font-bold text-on-surface tracking-tight">Issue Credit Note</h2>
			<p class="text-on-surface-variant font-body mt-1">Refunding against Invoice: <span class="font-bold">{invoice.invoice_number}</span></p>
		</div>

		<div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
			<h3 class="font-headline font-bold text-lg mb-6 flex items-center gap-2">
				<span class="material-symbols-outlined text-error">assignment_return</span>
				Select Items to Return
			</h3>

			<div class="overflow-x-auto">
				<table class="w-full text-left whitespace-nowrap">
					<thead class="bg-surface-container-low">
						<tr>
							<th class="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase">Item</th>
							<th class="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase text-right">Invoiced Qty</th>
							<th class="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase text-right">Rate</th>
							<th class="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase text-center w-32">Return Qty</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container-low">
						{#each returnItems as r, i}
							{@const maxQty = typeof r.item.quantity === 'number' ? r.item.quantity / 100 : Number(r.item.quantity)}
							<tr>
								<td class="px-4 py-3 font-medium text-sm">{r.item.description}</td>
								<td class="px-4 py-3 text-right text-sm">{maxQty}</td>
								<td class="px-4 py-3 text-right text-sm">{formatINR(r.item.rate)}</td>
								<td class="px-4 py-3">
									<input 
										type="number" 
										bind:value={r.returnQty} 
										min="0" 
										max={maxQty} 
										step="1"
										class="w-full text-center rounded-lg border-outline-variant/30 text-sm py-1.5 focus:ring-primary focus:border-primary"
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
				<h3 class="font-headline font-bold text-lg mb-4">Refund Details</h3>
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Date</label>
							<input type="date" bind:value={returnDate} class="w-full rounded-lg border-outline-variant/30 text-sm focus:ring-primary" />
						</div>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Reason / Notes</label>
						<textarea bind:value={returnNotes} rows="2" class="w-full rounded-lg border-outline-variant/30 text-sm focus:ring-primary placeholder:text-on-surface-variant/40" placeholder="e.g. Returned due to damage"></textarea>
					</div>
				</div>
			</div>

			<div class="bg-error/10 text-error rounded-xl p-8 shadow-sm">
				<h3 class="text-[11px] font-label font-bold uppercase tracking-[0.2em] opacity-80 mb-6">Refund Summary</h3>
				<div class="pt-4 border-t border-error/20 flex justify-between items-end">
					<div>
						<p class="text-[10px] font-label font-bold uppercase tracking-widest opacity-80">Total to Refund</p>
						<p class="text-4xl font-headline font-extrabold tracking-tighter">{formatINR(Math.round(totalRefund))}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Action Bar -->
	<div class="fixed bottom-0 left-0 right-0 p-4 bg-surface-container-lowest border-t border-outline-variant/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 flex justify-center">
		<div class="max-w-4xl w-full flex justify-between gap-4">
			<button onclick={() => goto(`/invoices/${invoice?.id}`)} class="px-6 py-3 rounded-xl border border-outline-variant font-headline font-semibold text-[15px] hover:bg-surface-container-low transition-colors">
				Cancel
			</button>
			<button onclick={handleSubmit} disabled={saving || totalRefund <= 0} class="px-8 py-3 rounded-xl bg-error text-white font-headline font-bold text-[15px] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
				<span class="material-symbols-outlined text-base">assignment_return</span>
				{saving ? 'Processing...' : 'Issue Credit Note'}
			</button>
		</div>
	</div>
{/if}
