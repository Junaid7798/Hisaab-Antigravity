<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getPatients, createInvoice, getProducts } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { calculateInvoiceTax, GST_RATES, type LineItem } from '$lib/utils/gst';
	import { formatINR, toPaise } from '$lib/utils/currency';
	import { generateInvoiceNumber } from '$lib/utils/invoice-number';
	import { today, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Patient, Product } from '$lib/db/index';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let patients = $state<Patient[]>([]);
	let products = $state<Product[]>([]);
	let businessId = $state('');
	let businessStateCode = $state('27');
	let invoiceCounter = $state(1);
	let loading = $state(true);
	let saving = $state(false);

	// Form state
	let selectedPatientId = $state('');
	let issueDate = $state(today());
	let placeOfSupply = $state('27');

	// Line items
	let items = $state<{ product_id: string | null; description: string; hsn_sac: string; quantity: string; rate: string; tax_rate: number }[]>([
		{ product_id: null, description: '', hsn_sac: '', quantity: '1', rate: '', tax_rate: 1800 }
	]);

	onMount(async () => {
		if ($activeBusinessId) {
			await loadEstimateContext($activeBusinessId);
		}
	});

	async function loadEstimateContext(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			businessStateCode = biz.state_code;
			placeOfSupply = biz.state_code;
			invoiceCounter = biz.invoice_counter; // Will use EST-1 instead of INV-1 format
			patients = await getPatients(biz.id);
			products = await getProducts(biz.id);
			
			const queryPatientId = $page.url.searchParams.get('patient_id');
			if (queryPatientId && patients.some(p => p.id === queryPatientId)) {
				selectedPatientId = queryPatientId;
			} else if (patients.length > 0) {
				selectedPatientId = patients[0].id;
			}
		}
		loading = false;
	}

	function addRow() {
		items = [...items, { product_id: null, description: '', hsn_sac: '', quantity: '1', rate: '', tax_rate: 1800 }];
	}

	function removeRow(index: number) {
		if (items.length <= 1) return;
		items = items.filter((_, i) => i !== index);
	}

	function handleProductSelect(index: number, value: string) {
		// Use setTimeout to let the datalist selection propagate
		setTimeout(() => {
			const currentValue = items[index].description;
			const product = products.find(p => p.name === currentValue || p.sku === currentValue);
			if (product) {
				items[index].product_id = product.id;
				items[index].description = product.name;
				items[index].hsn_sac = product.hsn_sac;
				items[index].rate = (product.selling_price / 100).toString();
				items[index].tax_rate = product.tax_rate;
			} else {
				items[index].product_id = null;
			}
		}, 0);
	}

	let taxSummary = $derived.by(() => {
		const lineItems: LineItem[] = items.map((it) => ({
			description: it.description,
			hsn_sac: it.hsn_sac,
			quantity: Math.round(parseFloat(it.quantity || '0') * 100),
			rate: toPaise(parseFloat(it.rate || '0')),
			tax_rate: it.tax_rate
		}));
		return calculateInvoiceTax(lineItems, businessStateCode, placeOfSupply);
	});

	// For Estimates, modify the generateInvoiceNumber to prefix EST
	let invoiceNumber = $derived(generateInvoiceNumber(invoiceCounter).replace('INV', 'EST'));

	async function handleSubmit() {
		if (!selectedPatientId || !businessId) return;
		if (items.every((it) => !it.description.trim() || !it.rate)) return;
		saving = true;

		try {
			const lineItems = items.map((it) => ({
				description: it.description,
				hsn_sac: it.hsn_sac,
				quantity: Math.round(parseFloat(it.quantity || '0') * 100),
				rate: toPaise(parseFloat(it.rate || '0')),
				tax_rate: it.tax_rate,
				amount: Math.round(toPaise(parseFloat(it.rate || '0')) * parseFloat(it.quantity || '0')),
				invoice_id: ''
			}));

			const invoice = await createInvoice(
				{
					business_id: businessId,
					patient_id: selectedPatientId,
					invoice_number: invoiceNumber,
					issue_date: issueDate,
					due_date: issueDate,
					tax_type: taxSummary.tax_type,
					subtotal: taxSummary.subtotal,
					total_tax: taxSummary.total_tax,
					grand_total: taxSummary.grand_total,
					cgst: taxSummary.total_cgst,
					sgst: taxSummary.total_sgst,
					igst: taxSummary.total_igst,
					status: 'UNPAID', // Estimates are inherently unpaid until converted
					document_type: 'ESTIMATE',
					notes: ''
				},
				lineItems
			);

			// NO STOCK DEDUCTION for Estimates
			// NO PAYMENT RECORDING for Estimates

			toast.success('Estimate created successfully');
			
			setTimeout(() => {
				goto(`/invoices/${invoice.id}`);
			}, 300);
		} catch (err) {
			console.error('Failed to save estimate:', err);
			toast.error('Failed to create estimate');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create Estimate | Hisaab</title>
</svelte:head>

<div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
	<div>
		<h2 class="text-3xl font-headline font-bold text-on-surface tracking-tight">New Estimate</h2>
		<p class="text-on-surface-variant font-body mt-1">Provide a quotation to your {$activeTerminology.person.toLowerCase()}</p>
	</div>
	<!-- Desktop Actions -->
	<div class="hidden lg:flex gap-3">
		<button onclick={() => goto('/dashboard')} class="px-6 py-2.5 rounded-lg border border-outline-variant font-headline font-semibold text-sm hover:bg-surface-container-low transition-colors">
			Cancel
		</button>
		<button onclick={handleSubmit} disabled={saving} class="px-6 py-2.5 rounded-lg bg-linear-to-br from-tertiary to-tertiary-container text-on-tertiary font-headline font-bold text-sm shadow-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all active:scale-95">
			<span class="material-symbols-outlined text-sm">save</span>
			{saving ? 'Saving...' : 'Save Estimate'}
		</button>
	</div>
</div>

{#if patients.length === 0 && !loading}
	<EmptyState
		icon="person_add"
		title={`No ${$activeTerminology.people.toLowerCase()} found`}
		description={`Add a ${$activeTerminology.person.toLowerCase()} first to create an estimate.`}
		actionLabel={`Add ${$activeTerminology.person}`}
		actionHref="/patients"
	/>
{:else}
	<div class="grid grid-cols-12 gap-8">
		<!-- Main Form -->
		<div class="col-span-12 lg:col-span-8 space-y-8">
			<!-- Patient Info -->
			<div class="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
				<h3 class="font-headline font-bold text-lg mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">person</span>
					{$activeTerminology.person} Info
				</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<Select
						label={`Select ${$activeTerminology.person}`}
						bind:value={selectedPatientId}
						options={patients.map(p => ({ value: p.id, label: `${p.name} (${p.phone || 'No phone'})` }))}
					/>
					<Input
						label="Estimate Date"
						bind:value={issueDate}
						type="date"
					/>
					<Select
						label="Place of Supply"
						bind:value={placeOfSupply}
						options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
					/>
					<Input
						label="Estimate Number"
						value={invoiceNumber}
						disabled
					/>
				</div>
			</div>

			<!-- Line Items -->
			<div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
				<div class="p-6 border-b border-surface-container">
					<h3 class="font-headline font-bold text-lg flex items-center gap-2">
						<span class="material-symbols-outlined text-primary">receipt_long</span>
						Quotation Items
					</h3>
				</div>
				<div class="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
					<table class="w-full text-left whitespace-nowrap min-w-[600px]">
						<thead class="bg-surface-container-low">
							<tr>
								<th class="px-6 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">Description</th>
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">HSN/SAC</th>
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-center">Qty</th>
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-right">Rate</th>
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-center">Tax %</th>
								<th class="px-6 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-right">Total</th>
								<th class="px-2 py-4"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container-low">
							{#each items as item, i}
								{@const lineTotal = taxSummary.line_breakdowns[i]?.line_total || 0}
								{@const product = item.product_id ? products.find(p => p.id === item.product_id) : null}
								<tr class="hover:bg-surface-container-low transition-colors">
									<td class="px-6 py-4 relative">
										<input 
											bind:value={item.description} 
											oninput={() => handleProductSelect(i, item.description)}
											list="products-list-{i}"
											type="text" 
											placeholder="Item or service name" 
											class="bg-transparent border-none p-0 text-sm focus:ring-0 w-full font-medium" 
										/>
										<datalist id="products-list-{i}">
											{#each products as product}
												<option value={product.name}>{product.sku ? `SKU: ${product.sku} - ` : ''}₹{product.selling_price / 100}</option>
											{/each}
										</datalist>
										{#if product && !product.is_service}
											<span class="text-[10px] {product.stock_quantity <= product.low_stock_threshold ? 'text-error' : 'text-on-surface-variant'}">
												{product.stock_quantity / 100} {product.unit} in stock
											</span>
										{/if}
									</td>
									<td class="px-4 py-4">
										<input bind:value={item.hsn_sac} type="text" placeholder="999311" class="bg-transparent border-none p-0 text-xs focus:ring-0 w-20 text-on-surface-variant" />
									</td>
									<td class="px-4 py-4">
										<input bind:value={item.quantity} type="number" min="1" step="1" class="bg-transparent border-none p-0 text-sm focus:ring-0 w-12 text-center" />
									</td>
									<td class="px-4 py-4 text-right">
										<input bind:value={item.rate} type="number" min="0" step="0.01" placeholder="0.00" class="bg-transparent border-none p-0 text-sm focus:ring-0 w-24 text-right" />
									</td>
									<td class="px-4 py-4">
										<select bind:value={item.tax_rate} class="bg-transparent border-none p-0 text-xs focus:ring-0 w-16 mx-auto block text-center">
											{#each GST_RATES as r}
												<option value={r.value}>{r.label}</option>
											{/each}
										</select>
									</td>
									<td class="px-6 py-4 text-right font-semibold text-sm">{formatINR(lineTotal)}</td>
									<td class="px-2 py-4">
										{#if items.length > 1}
											<button onclick={() => removeRow(i)} class="text-on-surface-variant/50 hover:text-error transition-colors">
												<span class="material-symbols-outlined text-sm">close</span>
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="p-4 bg-surface-container-low/50">
					<button onclick={addRow} class="text-primary text-xs font-headline font-bold flex items-center gap-1 hover:underline">
						<span class="material-symbols-outlined text-sm">add_circle</span>
						Add Line Item
					</button>
				</div>
			</div>
		</div>

		<!-- Summary -->
		<div class="col-span-12 lg:col-span-4 space-y-6">
			<!-- Billing Summary -->
			<div class="bg-tertiary text-on-tertiary rounded-xl p-8 shadow-xl overflow-hidden relative">
				<div class="absolute -right-10 -top-10 opacity-10">
					<span class="material-symbols-outlined text-[160px]">description</span>
				</div>
				<h3 class="text-[11px] font-label font-bold uppercase tracking-[0.2em] opacity-80 mb-8">Estimate Summary</h3>
				<div class="space-y-4">
					<div class="flex justify-between items-center text-sm">
						<span class="opacity-70 font-body">Subtotal</span>
						<span class="font-headline font-semibold">{formatINR(taxSummary.subtotal)}</span>
					</div>
					<div class="pt-4 border-t border-white/10 space-y-3">
						{#if taxSummary.tax_type === 'INTRA_STATE'}
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">CGST</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_cgst)}</span>
							</div>
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">SGST</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_sgst)}</span>
							</div>
						{:else if taxSummary.tax_type === 'INTER_STATE'}
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">IGST</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_igst)}</span>
							</div>
						{/if}
					</div>
					<div class="flex justify-between items-center text-sm pt-4">
						<span class="opacity-70 font-body">Total Tax</span>
						<span class="font-headline font-semibold">{formatINR(taxSummary.total_tax)}</span>
					</div>
					<div class="pt-8 flex justify-between items-end">
						<div>
							<p class="text-[10px] font-label font-bold uppercase tracking-widest opacity-60">Estimated Total</p>
							<p class="text-4xl font-headline font-extrabold tracking-tighter">{formatINR(taxSummary.grand_total)}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Tax Info -->
			<div class="bg-tertiary-fixed rounded-xl p-6 text-on-tertiary-fixed">
				<div class="flex items-start gap-3">
					<span class="material-symbols-outlined">info</span>
					<div class="space-y-1">
						<p class="text-xs font-headline font-bold">Estimate Note</p>
						<p class="text-[11px] leading-relaxed opacity-80">
							This is a non-binding quotation. It does not affect inventory stock or revenue metrics until explicitly converted into a standard Invoice.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Mobile Sticky Action Bar -->
	<div class="fixed bottom-0 left-0 right-0 p-4 bg-surface-container-lowest border-t border-outline-variant/20 z-30 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3">
		<button onclick={() => goto('/dashboard')} class="flex-1 py-3.5 rounded-xl border border-outline-variant font-headline font-semibold text-[15px] hover:bg-surface-container-low transition-colors active:scale-95 bg-surface-container-lowest">
			Cancel
		</button>
		<button onclick={handleSubmit} disabled={saving} class="flex-[2] py-3.5 rounded-xl bg-linear-to-br from-tertiary to-tertiary-container text-on-tertiary font-headline font-bold text-[15px] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
			<span class="material-symbols-outlined text-base">save</span>
			{saving ? 'Saving...' : 'Save Estimate'}
		</button>
	</div>
{/if}
