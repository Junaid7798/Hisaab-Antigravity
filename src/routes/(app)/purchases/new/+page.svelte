<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getSuppliers, createPurchaseOrder, getProducts, updateProduct, createPurchasePayment } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { calculateInvoiceTax, GST_RATES, type LineItem } from '$lib/utils/gst';
	import { formatINR, toPaise, toRupees } from '$lib/utils/currency';
	import { today, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Supplier, Product } from '$lib/db/index';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let suppliers = $state<Supplier[]>([]);
	let products = $state<Product[]>([]);
	let businessId = $state('');
	let businessStateCode = $state('27');
	let loading = $state(true);
	let saving = $state(false);

	// Form state
	let selectedSupplierId = $state('');
	let issueDate = $state(today());
	let poNumber = $state(`PO-${Date.now()}`);
	let placeOfSupply = $state('27');

	// Line items
	let items = $state<{ product_id: string | null; description: string; hsn_sac: string; quantity: string; rate: string; tax_rate: number }[]>([
		{ product_id: null, description: '', hsn_sac: '', quantity: '1', rate: '', tax_rate: 1800 }
	]);

	// Options
	let markReceived = $state(false);

	onMount(async () => {
		if ($activeBusinessId) {
			await loadPOContext($activeBusinessId);
		}
	});

	async function loadPOContext(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			businessStateCode = biz.state_code;
			suppliers = await getSuppliers(biz.id);
			products = await getProducts(biz.id);
			
			const querySupplierId = $page.url.searchParams.get('supplier_id');
			if (querySupplierId && suppliers.some(s => s.id === querySupplierId)) {
				selectedSupplierId = querySupplierId;
			} else if (suppliers.length > 0) {
				selectedSupplierId = suppliers[0].id;
			}

			// Pre-select supplier state
			const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);
			if (currentSupplier) placeOfSupply = currentSupplier.state_code;
		}
		loading = false;
	}

	$effect(() => {
		const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);
		if (currentSupplier) {
			placeOfSupply = currentSupplier.state_code;
		}
	});

	function addRow() {
		items = [...items, { product_id: null, description: '', hsn_sac: '', quantity: '1', rate: '', tax_rate: 1800 }];
	}

	function removeRow(index: number) {
		if (items.length <= 1) return;
		items = items.filter((_, i) => i !== index);
	}

	function handleProductSelect(index: number, value: string) {
		setTimeout(() => {
			const currentValue = items[index].description;
			const product = products.find(p => p.name === currentValue || p.sku === currentValue);
			if (product) {
				items[index].product_id = product.id;
				items[index].description = product.name;
				items[index].hsn_sac = product.hsn_sac;
				// Pre-fill with purchase price if you have one, else fallback to 0. Let user enter manually for PO.
				items[index].rate = items[index].rate || '0';
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

	async function handleSubmit() {
		if (!selectedSupplierId || !businessId) return;
		if (items.every((it) => !it.description.trim() || !it.rate)) return;
		saving = true;

		try {
			const lineItems = items.map((it) => ({
				description: it.description,
				hsn_sac: it.hsn_sac,
				quantity: Math.round(parseFloat(it.quantity || '0') * 100) / 100, // keep as standard number for PO items
				rate: toPaise(parseFloat(it.rate || '0')),
				tax_rate: it.tax_rate,
				amount: Math.round(toPaise(parseFloat(it.rate || '0')) * parseFloat(it.quantity || '0')),
				product_id: it.product_id
			}));

			await createPurchaseOrder(
				{
					supplier_id: selectedSupplierId,
					po_number: poNumber,
					issue_date: issueDate,
					tax_type: taxSummary.tax_type,
					subtotal: taxSummary.subtotal,
					total_tax: taxSummary.total_tax,
					grand_total: taxSummary.grand_total,
					cgst: taxSummary.total_cgst,
					sgst: taxSummary.total_sgst,
					igst: taxSummary.total_igst,
					status: markReceived ? 'RECEIVED' : 'ISSUED', // RECEIVED auto-increments stock via crud.ts
					notes: ''
				},
				lineItems,
				businessId
			);

			toast.success(markReceived ? 'PO created & Stock updated' : 'Purchase Order created');
			
			setTimeout(() => {
				goto(`/suppliers/${selectedSupplierId}`);
			}, 300);
		} catch (err) {
			console.error('Failed to save PO:', err);
			toast.error('Failed to create purchase order');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Purchase Order | Hisaab</title>
</svelte:head>

<div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
	<div>
		<h2 class="text-3xl font-headline font-bold text-on-surface tracking-tight">New Purchase Order</h2>
		<p class="text-on-surface-variant font-body mt-1">Record purchases from suppliers and update stock.</p>
	</div>
	<!-- Desktop Actions -->
	<div class="hidden lg:flex gap-3">
		<button onclick={() => goto('/suppliers')} class="px-6 py-2.5 rounded-lg border border-outline-variant font-headline font-semibold text-sm hover:bg-surface-container-low transition-colors">
			Cancel
		</button>
		<button onclick={handleSubmit} disabled={saving} class="px-6 py-2.5 rounded-lg bg-linear-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm shadow-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all active:scale-95">
			<span class="material-symbols-outlined text-sm">save</span>
			{saving ? 'Saving...' : 'Save PO'}
		</button>
	</div>
</div>

{#if suppliers.length === 0 && !loading}
	<EmptyState
		icon="person_add"
		title="No suppliers found"
		description="Add a supplier first to create a purchase order."
		actionLabel="Add Supplier"
		actionHref="/suppliers"
	/>
{:else}
	<div class="grid grid-cols-12 gap-8">
		<!-- Main Form -->
		<div class="col-span-12 lg:col-span-8 space-y-8">
			<!-- Supplier Info -->
			<div class="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
				<h3 class="font-headline font-bold text-lg mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">local_shipping</span>
					Supplier Details
				</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<Select
						label="Select Supplier"
						bind:value={selectedSupplierId}
						options={suppliers.map(s => ({ value: s.id, label: s.name }))}
					/>
					<Input
						label="PO Number"
						bind:value={poNumber}
					/>
					<Input
						label="Issue Date"
						bind:value={issueDate}
						type="date"
					/>
					<Select
						label="Selected State of Supply"
						bind:value={placeOfSupply}
						options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
						disabled
					/>
				</div>
			</div>

			<!-- Line Items -->
			<div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
				<div class="p-6 border-b border-surface-container">
					<h3 class="font-headline font-bold text-lg flex items-center gap-2">
						<span class="material-symbols-outlined text-primary">list_alt</span>
						Items
					</h3>
				</div>
				<div class="p-6">
					<!-- Datalist for products -->
					<datalist id="products-list">
						{#each products as product}
							<option value={product.name}>{product.sku ? `SKU: ${product.sku}` : ''}</option>
						{/each}
					</datalist>

					<!-- Header Row (Desktop) -->
					<div class="hidden md:grid grid-cols-12 gap-4 mb-3 px-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
						<div class="col-span-4">Item Details</div>
						<div class="col-span-2">HSN/SAC</div>
						<div class="col-span-2">Qty</div>
						<div class="col-span-2">Rate (₹)</div>
						<div class="col-span-1">Tax</div>
						<div class="col-span-1 border-hidden"></div>
					</div>

					<div class="space-y-4 md:space-y-2">
						{#each items as item, i}
							<div class="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center p-4 md:p-2 bg-surface md:bg-transparent rounded-xl border border-outline-variant/20 md:border-transparent">
								<div class="w-full md:col-span-4 relative group">
									<p class="md:hidden text-xs font-bold text-on-surface-variant mb-1 uppercase">Item Name</p>
									<input
										list="products-list"
										bind:value={item.description}
										oninput={(e) => handleProductSelect(i, (e.target as HTMLInputElement).value)}
										class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
										placeholder="Search or type..."
									/>
									{#if item.product_id}
										<div class="absolute right-2 top-2 md:top-1/2 md:-translate-y-1/2 flex items-center justify-center w-5 h-5 bg-primary/10 rounded-full" title="Linked to Inventory">
											<span class="material-symbols-outlined text-[12px] font-bold text-primary">check</span>
										</div>
									{/if}
								</div>
								<div class="w-full md:col-span-2 flex gap-3 md:block">
									<div class="w-full">
										<p class="md:hidden text-xs font-bold text-on-surface-variant mb-1 uppercase">HSN/SAC</p>
										<input
											type="text"
											bind:value={item.hsn_sac}
											class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
											placeholder="Optional"
										/>
									</div>
								</div>
								<div class="w-full md:col-span-2 flex gap-3 md:block">
									<div class="w-full">
										<p class="md:hidden text-xs font-bold text-on-surface-variant mb-1 uppercase">Quantity</p>
										<input
											type="number"
											bind:value={item.quantity}
											min="0.01"
											step="0.01"
											class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
										/>
									</div>
								</div>
								<div class="w-full md:col-span-2">
									<p class="md:hidden text-xs font-bold text-on-surface-variant mb-1 uppercase">Rate (₹)</p>
									<input
										type="number"
										bind:value={item.rate}
										placeholder="0.00"
										step="0.01"
										class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
									/>
								</div>
								<div class="w-full md:col-span-1">
									<p class="md:hidden text-xs font-bold text-on-surface-variant mb-1 uppercase">Tax</p>
									<select
										bind:value={item.tax_rate}
										class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/50 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-primary transition-colors appearance-none"
									>
										{#each GST_RATES as rate}
											<option value={rate.value}>{rate.label}</option>
										{/each}
									</select>
								</div>
								<div class="w-full md:col-span-1 flex justify-end md:justify-center mt-2 md:mt-0">
									<button
										onclick={() => removeRow(i)}
										class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
										disabled={items.length <= 1}
										title="Remove item"
									>
										<span class="material-symbols-outlined text-[20px]">delete</span>
									</button>
								</div>
							</div>
						{/each}
					</div>

					<button
						onclick={addRow}
						class="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors px-2 py-2 rounded-lg hover:bg-primary/5"
					>
						<span class="material-symbols-outlined text-[20px]">add_circle</span>
						Add Another Item
					</button>
				</div>
			</div>
			
			<!-- Bottom options -->
			<div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
				<label class="flex items-center gap-3 cursor-pointer group">
					<div class="relative w-6 h-6 flex items-center justify-center">
						<input type="checkbox" bind:checked={markReceived} class="peer appearance-none w-5 h-5 border-2 border-outline rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 checked:bg-primary checked:border-primary transition-all cursor-pointer" />
						<span class="material-symbols-outlined absolute text-on-primary text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity font-bold">check</span>
					</div>
					<div>
						<span class="text-sm font-bold text-on-surface block group-hover:text-primary transition-colors">Mark PO as Received</span>
						<span class="text-xs text-on-surface-variant">This will instantly add the purchased quantities to your inventory.</span>
					</div>
				</label>
			</div>
			
			<!-- Mobile Actions duplicated at bottom for convenience -->
			<div class="lg:hidden flex flex-col gap-3">
				<button onclick={handleSubmit} disabled={saving} class="w-full py-3.5 rounded-xl bg-linear-to-br from-primary to-primary-container text-on-primary font-headline font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
					<span class="material-symbols-outlined text-sm">save</span>
					{saving ? 'Saving...' : 'Save PO'}
				</button>
				<button onclick={() => goto('/suppliers')} class="w-full py-3.5 rounded-xl border border-outline-variant font-headline font-semibold text-on-surface hover:bg-surface-container-low active:bg-surface-container">
					Cancel
				</button>
			</div>
		</div>

		<!-- Sidebar (Summary) -->
		<div class="col-span-12 lg:col-span-4">
			<div class="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 sticky top-24 overflow-hidden">
				<div class="p-6 bg-linear-to-br from-surface to-surface-container-low border-b border-outline-variant/20">
					<h3 class="font-headline font-black text-xl text-on-surface">Purchase Summary</h3>
				</div>
				
				<div class="p-6 space-y-4 font-body">
					<div class="flex justify-between items-center text-sm">
						<span class="text-on-surface-variant">Tax Type</span>
						<span class="font-semibold px-2 py-0.5 bg-surface-variant/30 rounded text-xs">{taxSummary.tax_type.replace('_', ' ')}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-on-surface-variant">Subtotal</span>
						<span class="font-bold">{formatINR(taxSummary.subtotal)}</span>
					</div>

					{#if taxSummary.tax_type === 'INTRA_STATE'}
						<div class="flex justify-between items-center text-sm">
							<span class="text-on-surface-variant">CGST</span>
							<span class="font-bold">{formatINR(taxSummary.total_cgst)}</span>
						</div>
						<div class="flex justify-between items-center text-sm">
							<span class="text-on-surface-variant">SGST</span>
							<span class="font-bold">{formatINR(taxSummary.total_sgst)}</span>
						</div>
					{:else if taxSummary.tax_type === 'INTER_STATE'}
						<div class="flex justify-between items-center text-sm">
							<span class="text-on-surface-variant">IGST</span>
							<span class="font-bold">{formatINR(taxSummary.total_igst)}</span>
						</div>
					{/if}

					<div class="border-t border-outline-variant/30 pt-4 mt-2">
						<div class="flex justify-between items-center">
							<span class="font-headline font-bold text-on-surface">Purchase Total</span>
							<span class="font-headline font-black text-2xl text-primary tracking-tight">
								{formatINR(taxSummary.grand_total)}
							</span>
						</div>
					</div>
				</div>
				<div class="bg-surface-variant/20 p-4 text-xs text-on-surface-variant text-center border-t border-outline-variant/10">
					All totals are calculated based on item tax rates and supply state.
				</div>
			</div>
		</div>
	</div>
{/if}
