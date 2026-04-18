<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getPatients, createInvoice, getProducts, updateProduct, createPayment } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { calculateInvoiceTax, GST_RATES, type LineItem } from '$lib/utils/gst';
	import { formatINR, toPaise, toRupees } from '$lib/utils/currency';
	import { generateInvoiceNumber } from '$lib/utils/invoice-number';
	import { today, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { getGSTEnabled } from '$lib/utils/business-features';
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
	let taxRegistrationType = $state('unregistered');
	let showGST = $state(true);
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

	// Options
	let markPaid = $state(true);
	let amountReceived = $state('');

	let paymentTerms = $state('0'); // 0 = Due on Receipt, 7 = Net 7, 15 = Net 15, 30 = Net 30

	onMount(async () => {
		if ($activeBusinessId) {
			await loadInvoiceContext($activeBusinessId);
		}
	});

	async function loadInvoiceContext(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			businessStateCode = biz.state_code;
			placeOfSupply = biz.state_code;
			invoiceCounter = biz.invoice_counter;
			taxRegistrationType = biz.tax_registration_type || 'unregistered';
			showGST = getGSTEnabled(biz.business_category, taxRegistrationType);
			patients = await getPatients(biz.id);
			products = await getProducts(biz.id);
			
			// Pre-select patient from URL query param
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
		// Use setTimeout to let the datalist selection propagate to the bound value
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

	// Compute tax summary reactively
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

	let invoiceNumber = $derived(generateInvoiceNumber(invoiceCounter));

	let selectedPatient = $derived(patients.find((p) => p.id === selectedPatientId));

	async function handleSubmit() {
		if (!selectedPatientId || !businessId) return;
		if (items.every((it) => !it.description.trim() || !it.rate)) return;

		// Check stock limits before proceeding
		let stockWarnings = [];
		for (const item of items) {
			if (item.product_id) {
				const product = products.find(p => p.id === item.product_id);
				if (product && !product.is_service) {
					const reqQty = Math.round(parseFloat(item.quantity || '0') * 100);
					if (reqQty > product.stock_quantity) {
						stockWarnings.push(`- ${product.name} has only ${product.stock_quantity / 100} in stock (requested ${reqQty / 100}).`);
					}
				}
			}
		}
		
		if (stockWarnings.length > 0) {
			const proceed = confirm('Low Stock Warning:\n' + stockWarnings.join('\n') + '\n\nDo you want to proceed anyway?');
			if (!proceed) return;
		}

		saving = true;

		try {
			const lineItems = items.map((it) => ({
				description: it.description,
				hsn_sac: it.hsn_sac,
				quantity: Math.round(parseFloat(it.quantity || '0') * 100),
				rate: toPaise(parseFloat(it.rate || '0')),
				tax_rate: it.tax_rate,
				amount: Math.round(toPaise(parseFloat(it.rate || '0')) * parseFloat(it.quantity || '0')),
				invoice_id: '' // will be set in createInvoice
			}));

			// Calculate payment amount & status
			let paymentAmount = 0;
			let invStatus = 'PENDING';
			
			if (markPaid) {
				paymentAmount = taxSummary.grand_total;
				invStatus = 'PAID';
			} else {
				const amt = parseFloat(amountReceived || '0');
				if (amt > 0) {
					paymentAmount = toPaise(amt);
					if (paymentAmount >= taxSummary.grand_total) {
						invStatus = 'PAID';
					} else {
						invStatus = 'PARTIAL';
					}
				}
			}

			// Calculate Due Date based on Payment Terms
			let computedDueDate = new Date(issueDate);
			const addDays = parseInt(paymentTerms, 10);
			computedDueDate.setDate(computedDueDate.getDate() + addDays);
			const finalDueDate = computedDueDate.toISOString().split('T')[0];

			const invoice = await createInvoice(
				{
					business_id: businessId,
					patient_id: selectedPatientId,
					invoice_number: invoiceNumber,
					issue_date: issueDate,
					due_date: finalDueDate,
					tax_type: taxSummary.tax_type,
					subtotal: taxSummary.subtotal,
					total_tax: taxSummary.total_tax,
					grand_total: taxSummary.grand_total,
					cgst: taxSummary.total_cgst,
					sgst: taxSummary.total_sgst,
					igst: taxSummary.total_igst,
					status: invStatus as any,
					notes: ''
				},
				lineItems
			);

			if (paymentAmount > 0) {
				await createPayment(businessId, {
					patient_id: selectedPatientId,
					invoice_id: invoice.id,
					amount: paymentAmount,
					payment_date: issueDate,
					method: 'CASH',
					reference: markPaid ? 'Auto-marked Paid on Creation' : 'Partial Payment'
				});
			}

			// Deduct inventory stock (with negative guard)
			for (const item of items) {
				if (item.product_id) {
					const product = products.find(p => p.id === item.product_id);
					if (product && !product.is_service) {
						const deduction = Math.round(parseFloat(item.quantity || '0') * 100);
						const newStock = Math.max(0, product.stock_quantity - deduction);
						await updateProduct(product.id, {
							stock_quantity: newStock
						});
					}
				}
			}

			toast.success($_('toast.invoice_created', { default: 'Invoice created successfully' }));
			
			setTimeout(() => {
				goto('/dashboard');
			}, 300);
		} catch (err) {
			console.error('Failed to save invoice:', err);
			toast.error($_('toast.invoice_failed', { default: 'Failed to create invoice' }));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create {$activeTerminology.document} | Hisaab</title>
</svelte:head>

<div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
	<div>
		<h2 class="text-3xl font-headline font-bold text-on-surface tracking-tight">{$_('invoices.title', { default: `New ${$activeTerminology.document}` })}</h2>
		<p class="text-on-surface-variant font-body mt-1">{$_('invoices.subtitle', { default: 'Create a new GST-compliant bill' })}</p>
	</div>
	<!-- Desktop Actions -->
	<div class="hidden lg:flex gap-3">
		<button onclick={() => goto('/dashboard')} class="px-6 py-2.5 rounded-lg border border-outline-variant font-headline font-semibold text-sm hover:bg-surface-container-low transition-colors">
			{$_('invoices.btn_cancel', { default: 'Cancel' })}
		</button>
		<button onclick={handleSubmit} disabled={saving} class="px-6 py-2.5 rounded-lg bg-linear-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all active:scale-95">
			<span class="material-symbols-outlined text-sm">save</span>
			{saving ? $_('invoices.btn_saving', { default: 'Saving...' }) : $_('invoices.btn_save', { default: 'Save & Print' })}
		</button>
	</div>
</div>

{#if patients.length === 0 && !loading}
	<EmptyState
		icon="person_add"
		title={$_('invoices.no_patients', { default: `No ${$activeTerminology.people.toLowerCase()} found` })}
		description={$_('invoices.no_patients_desc', { default: `Add a ${$activeTerminology.person.toLowerCase()} first to create a ${$activeTerminology.document.toLowerCase()}.` })}
		actionLabel={$_('invoices.add_patient', { default: `Add ${$activeTerminology.person}` })}
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
						label={$_('invoices.billing_date', { default: 'Billing Date' })}
						bind:value={issueDate}
						type="date"
					/>
					<Select
						label="Payment Terms"
						bind:value={paymentTerms}
						options={[
							{ value: '0', label: 'Due on Receipt' },
							{ value: '7', label: 'Net 7' },
							{ value: '15', label: 'Net 15' },
							{ value: '30', label: 'Net 30' }
						]}
					/>
					<Select
						label={$_('invoices.place_of_supply', { default: 'Place of Supply' })}
						bind:value={placeOfSupply}
						options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
					/>
					<Input
						label={$_('invoices.invoice_num', { default: 'Invoice Number' })}
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
						{$_('invoices.itemized_billing', { default: 'Itemized Billing' })}
					</h3>
				</div>
				<div class="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
					<table class="w-full text-left whitespace-nowrap min-w-[600px]">
						<thead class="bg-surface-container-low">
							<tr>
								<th class="px-6 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">{$_('invoices.table_desc', { default: 'Description' })}</th>
								{#if showGST}
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">{$_('invoices.table_hsn', { default: 'HSN/SAC' })}</th>
								{/if}
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-center">{$_('invoices.table_qty', { default: 'Qty' })}</th>
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-right">{$_('invoices.table_rate', { default: 'Rate' })}</th>
								{#if showGST}
								<th class="px-4 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-center">{$_('invoices.table_tax', { default: 'Tax %' })}</th>
								{/if}
								<th class="px-6 py-4 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest text-right">{$_('invoices.table_total', { default: 'Total' })}</th>
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
											placeholder={$_('invoices.placeholder_desc', { default: 'Item or service name' })} 
											class="bg-transparent border-none p-0 text-base focus:ring-0 w-full font-medium" 
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
									{#if showGST}
									<td class="px-4 py-4">
										<input bind:value={item.hsn_sac} type="text" placeholder="999311" class="bg-transparent border-none p-0 text-xs focus:ring-0 w-20 text-on-surface-variant" />
									</td>
									{/if}
									<td class="px-4 py-4">
										<input bind:value={item.quantity} type="number" min="1" step="1" class="bg-transparent border-none p-0 text-base focus:ring-0 w-12 text-center" />
									</td>
									<td class="px-4 py-4 text-right">
										<input bind:value={item.rate} type="number" min="0" step="0.01" placeholder="0.00" class="bg-transparent border-none p-0 text-base focus:ring-0 w-24 text-right" />
									</td>
									{#if showGST}
									<td class="px-4 py-4">
										<select bind:value={item.tax_rate} class="bg-transparent border-none p-0 text-xs focus:ring-0 w-16 mx-auto block text-center">
											{#each GST_RATES as r}
												<option value={r.value}>{r.label}</option>
											{/each}
										</select>
									</td>
									{/if}
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
						{$_('invoices.add_row', { default: 'Add Line Item' })}
					</button>
				</div>
			</div>
		</div>

		<!-- Summary -->
		<div class="col-span-12 lg:col-span-4 space-y-6">
			<!-- Billing Summary -->
			<div class="bg-primary text-on-primary rounded-xl p-8 shadow-xl overflow-hidden relative">
				<div class="absolute -right-10 -top-10 opacity-10">
					<span class="material-symbols-outlined text-[160px]">receipt_long</span>
				</div>
				<h3 class="text-[11px] font-label font-bold uppercase tracking-[0.2em] opacity-80 mb-8">{$_('invoices.billing_summary', { default: 'Billing Summary' })}</h3>
				<div class="space-y-4">
					<div class="flex justify-between items-center text-sm">
						<span class="opacity-70 font-body">{$_('invoices.subtotal', { default: 'Subtotal' })}</span>
						<span class="font-headline font-semibold">{formatINR(taxSummary.subtotal)}</span>
					</div>
					{#if showGST}
					<div class="pt-4 border-t border-white/10 space-y-3">
						{#if taxSummary.tax_type === 'INTRA_STATE'}
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">{$_('invoices.cgst', { default: 'CGST' })}</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_cgst)}</span>
							</div>
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">{$_('invoices.sgst', { default: 'SGST' })}</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_sgst)}</span>
							</div>
						{:else if taxSummary.tax_type === 'INTER_STATE'}
							<div class="flex justify-between items-center text-xs">
								<span class="opacity-70 font-body italic">{$_('invoices.igst', { default: 'IGST' })}</span>
								<span class="font-headline font-medium">{formatINR(taxSummary.total_igst)}</span>
							</div>
						{/if}
					</div>
					<div class="flex justify-between items-center text-sm pt-4">
						<span class="opacity-70 font-body">{$_('invoices.total_tax', { default: 'Total Tax' })}</span>
						<span class="font-headline font-semibold">{formatINR(taxSummary.total_tax)}</span>
					</div>
					{/if}
					<div class="pt-8 flex justify-between items-end">
						<div>
							<p class="text-[10px] font-label font-bold uppercase tracking-widest opacity-60">{$_('invoices.grand_total', { default: 'Grand Total' })}</p>
							<p class="text-4xl font-headline font-extrabold tracking-tighter">{formatINR(taxSummary.grand_total)}</p>
						</div>
						<div class="bg-white/10 p-2 rounded-lg">
							<span class="material-symbols-outlined text-3xl">verified</span>
						</div>
					</div>
				</div>
			</div>

			{#if showGST}
			<!-- Tax Info -->
			<div class="bg-tertiary-fixed rounded-xl p-6 text-on-tertiary-fixed">
				<div class="flex items-start gap-3">
					<span class="material-symbols-outlined">info</span>
					<div class="space-y-1">
						<p class="text-xs font-headline font-bold">{$_('invoices.gst_note', { default: 'GST Information' })}</p>
						<p class="text-[11px] leading-relaxed opacity-80">
							{#if taxSummary.tax_type === 'INTRA_STATE'}
								{$_('invoices.gst_intra', { default: 'Same-state supply: CGST + SGST applied.' })}
							{:else if taxSummary.tax_type === 'INTER_STATE'}
								{$_('invoices.gst_inter', { default: 'Inter-state supply: IGST applied.' })}
							{:else}
								{$_('invoices.gst_exempt', { default: 'Tax-exempt supply.' })}
							{/if}
						</p>
					</div>
				</div>
			</div>
			{/if}

			<!-- Options -->
			<fieldset class="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 flex flex-col gap-2 mb-20 lg:mb-0">
				<legend class="text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest px-2 mb-1">{$_('invoices.options', { default: 'Options' })}</legend>
				<label class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors">
					<input type="checkbox" bind:checked={markPaid} class="rounded text-primary focus:ring-primary h-4 w-4" />
					<span class="text-sm font-medium">{$_('invoices.mark_paid', { default: 'Mark as Paid' })}</span>
				</label>
				{#if !markPaid}
					<div class="px-3 pb-3">
						<Input
							label="Amount Received (Optional)"
							bind:value={amountReceived}
							type="number"
							min="0"
							step="0.01"
						/>
					</div>
				{/if}
			</fieldset>
		</div>
	</div>

	<!-- Mobile Sticky Action Bar -->
	<div class="fixed bottom-0 left-0 right-0 p-4 bg-surface-container-lowest border-t border-outline-variant/20 z-30 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3">
		<button onclick={() => goto('/dashboard')} class="flex-1 py-3.5 rounded-xl border border-outline-variant font-headline font-semibold text-[15px] hover:bg-surface-container-low transition-colors active:scale-95 bg-surface-container-lowest">
			{$_('invoices.btn_cancel', { default: 'Cancel' })}
		</button>
		<button onclick={handleSubmit} disabled={saving} class="flex-[2] py-3.5 rounded-xl bg-linear-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-[15px] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
			<span class="material-symbols-outlined text-base">save</span>
			{saving ? $_('invoices.btn_saving', { default: 'Saving...' }) : $_('invoices.btn_save', { default: 'Save & Print' })}
		</button>
	</div>
{/if}
