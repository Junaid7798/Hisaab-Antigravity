<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getBusiness, createProduct, updateProduct, countProducts, countLowStockProducts } from '$lib/db/crud';
	import { getCachedProducts } from '$lib/utils/cache';
	import { insights } from '$lib/stores/insights';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact, formatINR } from '$lib/utils/currency';
	import { toast } from '$lib/stores/toast';
	import type { Product } from '$lib/db/index';

	let products = $state<Product[]>([]);
	let businessId = $state('');
	let totalProducts = $state(0);
	let lowStockProducts = $state(0);
	let loading = $state(true);
	let showModal = $state(false);
	let searchQuery = $state('');
	let isEditing = $state(false);
	let editingId = $state<string | null>(null);

	// Form
	let newName = $state('');
	let newSku = $state('');
	let newHsn = $state('');
	let newUnit = $state('pcs');
	let newSellingPrice = $state('');
	let newPurchasePrice = $state('');
	let newTaxRate = $state('0');
	let newStockQuantity = $state('');
	let newLowStockThreshold = $state('10');
	let newIsService = $state(false);

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			products = await getCachedProducts(businessId);
			totalProducts = await countProducts(businessId);
			lowStockProducts = await countLowStockProducts(businessId);
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	function resetForm() {
		newName = '';
		newSku = '';
		newHsn = '';
		newUnit = 'pcs';
		newSellingPrice = '';
		newPurchasePrice = '';
		newTaxRate = '0';
		newStockQuantity = '';
		newLowStockThreshold = '10';
		newIsService = false;
		isEditing = false;
		editingId = null;
		showModal = false;
	}

	async function handleSaveProduct() {
		if (!newName.trim()) return;

		const productData = {
			name: newName.trim(),
			sku: newSku.trim(),
			hsn_sac: newHsn.trim(),
			unit: newUnit,
			selling_price: Math.round(Number(newSellingPrice) * 100) || 0,
			purchase_price: Math.round(Number(newPurchasePrice) * 100) || 0,
			tax_rate: Math.round(Number(newTaxRate) * 100) || 0,
			stock_quantity: Math.round(Number(newStockQuantity || 0) * 100),
			low_stock_threshold: Math.round(Number(newLowStockThreshold || 10) * 100),
			is_service: newIsService
		};

		if (isEditing && editingId) {
			await updateProduct(editingId, productData);
			toast.success(`${$activeTerminology.item} updated successfully`);
		} else {
			await createProduct(businessId, productData);
			toast.success(`${$activeTerminology.item} added successfully`);
		}
		
		resetForm();
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	function editProduct(p: Product) {
		isEditing = true;
		editingId = p.id;
		newName = p.name;
		newSku = p.sku;
		newHsn = p.hsn_sac;
		newUnit = p.unit;
		newSellingPrice = (p.selling_price / 100).toString();
		newPurchasePrice = (p.purchase_price / 100).toString();
		newTaxRate = (p.tax_rate / 100).toString();
		newStockQuantity = (p.stock_quantity / 100).toString();
		newLowStockThreshold = (p.low_stock_threshold / 100).toString();
		newIsService = p.is_service;
		showModal = true;
	}

	let filteredProducts = $derived(
		searchQuery
			? products.filter(
					(p) =>
						p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						p.sku.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: products
	);
</script>

<svelte:head>
	<title>{$activeTerminology.items} & Inventory | Hisaab</title>
</svelte:head>

<!-- Inventory Insight Alert -->
{#if $insights.find(i => i.id === 'stockout_imminent' || i.id === 'low_stock')}
	{@const stockAlert = $insights.find(i => i.id === 'stockout_imminent' || i.id === 'low_stock')!}
	<div class="mb-5 {stockAlert.type === 'danger' ? 'bg-error-container/60 border-error/20' : 'bg-tertiary-container/50 border-tertiary/20'} border rounded-xl p-3 flex items-center gap-3">
		<span class="material-symbols-outlined {stockAlert.type === 'danger' ? 'text-error' : 'text-tertiary'} text-lg shrink-0" style="font-variation-settings:'FILL' 1">{stockAlert.icon}</span>
		<div class="flex-1 min-w-0">
			<p class="text-sm font-bold text-on-surface">{stockAlert.title}</p>
			<p class="text-xs text-on-surface-variant">{stockAlert.description}</p>
		</div>
		<a href="/insights" class="text-xs font-bold text-primary whitespace-nowrap shrink-0">Details →</a>
	</div>
{/if}

<!-- Header -->
<div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
	<div>
		<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">{$activeTerminology.items} & Inventory</h1>
		<p class="text-on-surface-variant font-body mt-1">Manage your catalog, prices, and stock levels.</p>
	</div>
	<button
		onclick={() => { resetForm(); showModal = true; }}
		class="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold shadow-md inline-flex hover:opacity-90 transition-all active:scale-95"
	>
		<span class="material-symbols-outlined">add_circle</span>
		<span>Add {$activeTerminology.item}</span>
	</button>
</div>

<!-- Stats -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
	<div class="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/15 flex items-center justify-between shadow-sm">
		<div>
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total {$activeTerminology.items}</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{totalProducts.toLocaleString('en-IN')}</p>
		</div>
		<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary">
			<span class="material-symbols-outlined text-xl">inventory_2</span>
		</div>
	</div>
	<div class="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/15 flex items-center justify-between shadow-sm">
		<div>
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Low Stock</p>
			<p class="text-2xl font-headline font-bold {lowStockProducts > 0 ? 'text-error' : 'text-on-surface'}">{lowStockProducts}</p>
		</div>
		<div class="w-10 h-10 rounded-full {lowStockProducts > 0 ? 'bg-error-container text-error' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center">
			<span class="material-symbols-outlined text-xl">error</span>
		</div>
	</div>
</div>

<!-- Search -->
<div class="mb-6 max-w-md">
	<Input
		bind:value={searchQuery}
		placeholder={`Search ${$activeTerminology.items.toLowerCase()} by name or SKU...`}
		icon="search"
	/>
</div>

<!-- Table -->
<div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/15">
	{#if filteredProducts.length === 0 && !loading}
		<EmptyState
			icon="inventory_2"
			title={searchQuery ? 'No match found' : `No ${$activeTerminology.items.toLowerCase()} found`}
			description={searchQuery ? 'Try adjusting your search criteria.' : `Add your first ${$activeTerminology.item.toLowerCase()} to manage inventory.`}
		/>
	{:else}
		<div class="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
			<table class="w-full border-collapse whitespace-nowrap">
				<thead>
					<tr class="text-left bg-surface-container-low/50">
						<th class="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Item Details</th>
						<th class="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Selling Price</th>
						<th class="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Stock</th>
						<th class="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
						<th class="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-variant/20">
					{#each filteredProducts as product}
						<tr class="hover:bg-surface-container-low/50 transition-colors group">
							<td class="px-6 py-4">
								<div class="flex items-start flex-col">
									<p class="font-bold text-sm text-on-surface">{product.name}</p>
									<p class="text-xs text-on-surface-variant mt-0.5">
										{#if product.sku}SKU: {product.sku} &bull; {/if}
										{product.is_service ? 'Service' : 'Product'}
									</p>
								</div>
							</td>
							<td class="px-6 py-4 text-sm font-bold text-on-surface text-right">
								{formatINR(product.selling_price)}
							</td>
							<td class="px-6 py-4">
								{#if product.is_service}
									<span class="text-on-surface-variant text-xs">—</span>
								{:else}
									<div class="flex flex-col">
										<span class="text-sm font-semibold {product.stock_quantity <= product.low_stock_threshold ? 'text-error' : 'text-on-surface'}">
											{product.stock_quantity / 100} {product.unit}
										</span>
									</div>
								{/if}
							</td>
							<td class="px-6 py-4">
								{#if product.is_service}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-secondary text-[10px] font-bold tracking-wide uppercase">Service</span>
								{:else if product.stock_quantity <= 0}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold tracking-wide uppercase border border-error/20">Out of Stock</span>
								{:else if product.stock_quantity <= product.low_stock_threshold}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold tracking-wide uppercase">Low Stock</span>
								{:else}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-container text-primary text-[10px] font-bold tracking-wide uppercase">In Stock</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<button onclick={() => editProduct(product)} class="w-8 h-8 rounded-lg hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
									<span class="material-symbols-outlined text-sm">edit</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Modal -->
<Modal show={showModal} title={`${isEditing ? 'Edit' : 'Add'} ${$activeTerminology.item}`} onclose={resetForm}>
	<form class="p-6 overflow-y-auto max-h-[80vh]" onsubmit={(e) => { e.preventDefault(); handleSaveProduct(); }}>
		<div class="space-y-6">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<Input
					label="Item Name"
					bind:value={newName}
					required
					placeholder="E.g. Paracetamol 500mg, Consultation Fee"
					class="sm:col-span-2"
				/>
				
				<div class="sm:col-span-2 flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
					<input type="checkbox" id="is_service" bind:checked={newIsService} class="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary focus:ring-2">
					<label for="is_service" class="text-sm font-semibold text-on-surface cursor-pointer select-none">
						This is a service (Does not track inventory)
					</label>
				</div>

				<Input
					label="SKU / Item Code"
					bind:value={newSku}
					placeholder="Optional code"
				/>
				<Input
					label="HSN / SAC Code"
					bind:value={newHsn}
					placeholder="For GST billing"
				/>

				<div class="col-span-1 sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-outline-variant/30 pt-6 mt-2">
					<div class="sm:col-span-3 pb-2">
						<h4 class="text-xs font-bold text-primary uppercase tracking-widest">Pricing & Taxes</h4>
					</div>
					<Input
						label="Selling Price (₹)"
						bind:value={newSellingPrice}
						required
						type="number"
						step="0.01"
						min="0"
					/>
					<Input
						label="Purchase Price (₹)"
						bind:value={newPurchasePrice}
						type="number"
						step="0.01"
						min="0"
					/>
					<Select
						label="Tax Rate (%)"
						bind:value={newTaxRate}
						options={[
							{ value: '0', label: '0% (Exempt)' },
							{ value: '0.25', label: '0.25%' },
							{ value: '3', label: '3%' },
							{ value: '5', label: '5%' },
							{ value: '12', label: '12%' },
							{ value: '18', label: '18%' },
							{ value: '28', label: '28%' }
						]}
					/>
				</div>

				{#if !newIsService}
					<div class="col-span-1 sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-outline-variant/30 pt-6 mt-2">
						<div class="sm:col-span-3 pb-2">
							<h4 class="text-xs font-bold text-primary uppercase tracking-widest">Inventory Setup</h4>
						</div>
						<Input
							label="Opening Stock"
							bind:value={newStockQuantity}
							type="number"
							step="0.01"
						/>
						<Input
							label="Low Stock Alert At"
							bind:value={newLowStockThreshold}
							type="number"
							step="0.01"
						/>
						<Select
							label="Unit"
							bind:value={newUnit}
							options={[
								{ value: 'pcs', label: 'Pieces (pcs)' },
								{ value: 'box', label: 'Boxes (box)' },
								{ value: 'kg', label: 'Kilograms (kg)' },
								{ value: 'g', label: 'Grams (g)' },
								{ value: 'ltr', label: 'Liters (ltr)' },
								{ value: 'm', label: 'Meters (m)' },
								{ value: 'session', label: 'Session' },
								{ value: 'hour', label: 'Hours' }
							]}
						/>
					</div>
				{/if}
			</div>

			<div class="flex justify-end gap-3 pt-6 border-t border-outline-variant/20">
				<button type="button" onclick={resetForm} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm hover:bg-surface-container rounded-lg">Cancel</button>
				<button type="submit" class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md">
					{isEditing ? 'Update' : 'Save'} {$activeTerminology.item}
				</button>
			</div>
		</div>
	</form>
</Modal>
