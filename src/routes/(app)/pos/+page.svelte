<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getPatients, getProducts, createInvoice, updateProduct, createPayment } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { calculateInvoiceTax, type LineItem } from '$lib/utils/gst';
	import { formatINR, toPaise, toRupees } from '$lib/utils/currency';
	import { generateInvoiceNumber } from '$lib/utils/invoice-number';
	import { today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Patient, Product } from '$lib/db/index';
	import { goto } from '$app/navigation';
	import { fade, fly, slide, scale } from 'svelte/transition';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
	import { connectPrinter, printReceipt, isBtPrintSupported, getConnectionStatus } from '$lib/services/bluetooth-printer';
	import { createProduct } from '$lib/db/crud';

	let patients = $state<Patient[]>([]);
	let products = $state<Product[]>([]);
	let businessId = $state('');
	let businessStateCode = $state('27');
	let invoiceCounter = $state(1);
	let businessName = $state('');
	let business = $state<any>(null);
	let loading = $state(true);
	let processing = $state(false);

	// POS Cart
	let cart = $state<{ product: Product; qty: number }[]>([]);
	let selectedPatientId = $state('');
	let searchQuery = $state('');
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let showScanner = $state(false);
	let isPrinting = $state(false);

	let filteredProducts = $derived(
		searchQuery.trim()
			? products.filter(p =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			: products
	);

	let cartTotal = $derived.by(() => {
		const lineItems: LineItem[] = cart.map(c => ({
			description: c.product.name,
			hsn_sac: c.product.hsn_sac,
			quantity: c.qty * 100,
			rate: c.product.selling_price,
			tax_rate: c.product.tax_rate
		}));
		return calculateInvoiceTax(lineItems, businessStateCode, businessStateCode);
	});

	let cartItemCount = $derived(cart.reduce((s, c) => s + c.qty, 0));

	onMount(async () => {
		if ($activeBusinessId) {
			const biz = await getBusiness($activeBusinessId);
			if (biz) {
				businessId = biz.id;
				businessStateCode = biz.state_code;
				invoiceCounter = biz.invoice_counter;
				businessName = biz.name;
				business = biz;
				patients = await getPatients(biz.id);
				products = await getProducts(biz.id);
				if (patients.length > 0) selectedPatientId = patients[0].id;
			}
		}
		loading = false;
		await tick();
		searchInputRef?.focus();
	});

	function addToCart(product: Product) {
		const existing = cart.find(c => c.product.id === product.id);
		if (existing) {
			existing.qty += 1;
			cart = [...cart]; // trigger reactivity
		} else {
			cart = [...cart, { product, qty: 1 }];
		}
		searchQuery = '';
		searchInputRef?.focus();
	}

	function removeFromCart(index: number) {
		cart = cart.filter((_, i) => i !== index);
	}

	function updateQty(index: number, delta: number) {
		const newQty = cart[index].qty + delta;
		if (newQty <= 0) {
			removeFromCart(index);
		} else {
			cart[index].qty = newQty;
			cart = [...cart];
		}
	}

	function clearCart() {
		cart = [];
		searchInputRef?.focus();
	}

	async function checkout() {
		if (cart.length === 0 || !selectedPatientId) return;
		processing = true;

		try {
			const lineItems = cart.map(c => ({
				description: c.product.name,
				hsn_sac: c.product.hsn_sac,
				quantity: c.qty * 100,
				rate: c.product.selling_price,
				tax_rate: c.product.tax_rate,
				amount: c.product.selling_price * c.qty,
				invoice_id: ''
			}));

			const invoiceNumber = generateInvoiceNumber(invoiceCounter);

			const invoice = await createInvoice(
				{
					business_id: businessId,
					patient_id: selectedPatientId,
					invoice_number: invoiceNumber,
					issue_date: today(),
					due_date: today(),
					tax_type: cartTotal.tax_type,
					subtotal: cartTotal.subtotal,
					total_tax: cartTotal.total_tax,
					grand_total: cartTotal.grand_total,
					cgst: cartTotal.total_cgst,
					sgst: cartTotal.total_sgst,
					igst: cartTotal.total_igst,
					status: 'PAID',
					notes: 'POS Sale'
				},
				lineItems
			);

			// Auto-record payment
			await createPayment(businessId, {
				patient_id: selectedPatientId,
				invoice_id: invoice.id,
				amount: cartTotal.grand_total,
				payment_date: today(),
				method: 'CASH',
				reference: 'POS Auto-Payment'
			});

			// Deduct stock
			for (const c of cart) {
				if (!c.product.is_service) {
					await updateProduct(c.product.id, {
						stock_quantity: Math.max(0, c.product.stock_quantity - (c.qty * 100))
					});
				}
			}

			// Print receipt if printer is connected
			if (getConnectionStatus()) {
				try {
					isPrinting = true;
					await printReceipt({
						businessName: businessName,
						businessAddress: business?.address,
						businessPhone: business?.phone,
						gstin: business?.gstin,
						invoiceNumber: invoiceNumber,
						date: today(),
						customerName: patients.find(p => p.id === selectedPatientId)?.name || 'Walk-in Customer',
						items: cart.map(item => ({
							name: item.product.name,
							qty: item.qty,
							rate: item.product.selling_price,
							amount: item.product.selling_price * item.qty
						})),
						subtotal: cartTotal.subtotal,
						tax: cartTotal.total_tax,
						grandTotal: cartTotal.grand_total,
						paymentMethod: 'CASH'
					});
				} catch (err) {
					console.error('Printing failed:', err);
					toast.error('Printing failed, but sale was saved');
				} finally {
					isPrinting = false;
				}
			}

			toast.success('Sale completed successfully!');
			cart = [];
			selectedPatientId = '';
			searchQuery = '';
			invoiceCounter++;
			products = await getProducts(businessId);
			searchInputRef?.focus();
		} catch (err) {
			console.error(err);
			toast.error('Checkout failed');
		} finally {
			processing = false;
		}
	}

	// Keyboard shortcuts
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'F2') {
			e.preventDefault();
			searchInputRef?.focus();
		}
		if (e.key === 'F9') {
			e.preventDefault();
			checkout();
		}
		if (e.key === 'Escape') {
			searchQuery = '';
			searchInputRef?.focus();
		}
	}
	function handleBarcodeScan(code: string) {
		const product = products.find(p => p.sku === code || p.name === code);
		if (product) {
			addToCart(product);
			toast.success(`Added ${product.name}`);
		} else {
			toast.error(`Product not found: ${code}`);
		}
	}

	async function handleBluetooth() {
		try {
			await connectPrinter();
			toast.success('Printer connected!');
		} catch (err: any) {
			toast.error(err.message || 'Failed to connect printer');
		}
	}

	// Quick-add product from POS
	let showAddProduct = $state(false);
	let newProductName = $state('');
	let newProductPrice = $state('');
	let newProductStock = $state('');
	let newProductIsService = $state(false);
	let savingProduct = $state(false);

	function openAddProduct() {
		newProductName = searchQuery.trim();
		newProductPrice = '';
		newProductStock = '';
		newProductIsService = false;
		showAddProduct = true;
	}

	async function handleSaveProduct() {
		if (!newProductName.trim() || !newProductPrice) return;
		savingProduct = true;
		try {
			const product = await createProduct(businessId, {
				name: newProductName.trim(),
				selling_price: Math.round(Number(newProductPrice) * 100),
				stock_quantity: newProductIsService ? 0 : Math.round(Number(newProductStock || 1) * 100),
				is_service: newProductIsService,
				tax_rate: 0
			});
			products = [...products, product];
			addToCart(product);
			showAddProduct = false;
			toast.success(`${product.name} added`);
		} catch (err) {
			toast.error('Failed to add product');
		} finally {
			savingProduct = false;
		}
	}
</script>

<svelte:head>
	<title>POS Mode | Hisaab</title>
</svelte:head>

<svelte:window onkeydown={handleKeyDown} />

{#if loading}
	<div class="flex items-center justify-center h-screen">
		<span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
	</div>
{:else}
	<div class="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-0 overflow-hidden" in:fade={{ duration: 200 }}>
		<!-- Left: Product Grid -->
		<div class="flex-1 flex flex-col overflow-hidden">
			<!-- Search bar -->
			<div class="p-4 border-b border-outline-variant/10 bg-surface-container-lowest">
				<div class="relative">
					<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xl">search</span>
					<input
						bind:this={searchInputRef}
						bind:value={searchQuery}
						type="text"
						placeholder={$_('pos.search_placeholder', { default: 'Search products (F2)...' })}
						class="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border-none text-sm font-body focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
					/>
					{#if searchQuery}
						<button onclick={() => { searchQuery = ''; searchInputRef?.focus(); }} class="absolute right-20 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface">
							<span class="material-symbols-outlined text-lg">close</span>
						</button>
					{/if}
					<button
						onclick={() => showScanner = true}
						class="absolute right-11 top-1/2 -translate-y-1/2 text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-colors"
						title="Scan Barcode"
					>
						<span class="material-symbols-outlined text-xl">qr_code_scanner</span>
					</button>
					<button
						onclick={openAddProduct}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-colors"
						title="Add New Product"
					>
						<span class="material-symbols-outlined text-xl">add_circle</span>
					</button>
				</div>
			</div>

			<!-- Product Grid -->
			<div class="flex-1 overflow-y-auto p-4">
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
					{#each filteredProducts as product (product.id)}
						{@const inCart = cart.find(c => c.product.id === product.id)}
						{@const isLow = !product.is_service && product.stock_quantity <= product.low_stock_threshold}
						<button
							onclick={() => addToCart(product)}
							class="relative bg-surface-container-lowest rounded-xl p-4 border transition-all text-left hover:shadow-md active:scale-[0.97] {inCart ? 'border-primary/50 ring-2 ring-primary/20' : 'border-outline-variant/10'}"
						>
							{#if inCart}
								<div class="absolute -top-2 -right-2 w-6 h-6 bg-primary text-on-primary rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">{inCart.qty}</div>
							{/if}
							{#if isLow}
								<div class="absolute top-1 right-1">
									<span class="material-symbols-outlined text-sm text-amber-400">warning</span>
								</div>
							{/if}
							<div class="text-sm font-bold text-on-surface truncate">{product.name}</div>
							{#if product.sku}
								<div class="text-[10px] text-on-surface-variant/60 mt-0.5 font-mono">{product.sku}</div>
							{/if}
							<div class="text-primary font-headline font-extrabold mt-2">{formatINR(product.selling_price)}</div>
							{#if !product.is_service}
								<div class="text-[10px] text-on-surface-variant/50 mt-1">{(product.stock_quantity / 100).toFixed(0)} in stock</div>
							{/if}
						</button>
					{/each}
				</div>
				{#if filteredProducts.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-on-surface-variant/50">
						<span class="material-symbols-outlined text-5xl mb-3">search_off</span>
						<p class="text-sm">{$_('pos.no_products', { default: 'No products found' })}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Cart -->
		<div class="w-full lg:w-96 bg-surface-container-lowest border-l border-outline-variant/10 flex flex-col overflow-hidden shadow-xl">
			<!-- Cart Header -->
			<div class="p-4 border-b border-outline-variant/10 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">shopping_cart</span>
					<h2 class="font-headline font-bold text-lg">{$_('pos.cart', { default: 'Cart' })}</h2>
					{#if cartItemCount > 0}
						<span class="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{cartItemCount}</span>
					{/if}
				</div>
			</div>

			<!-- Customer Select -->
			<div class="px-4 py-3 border-b border-outline-variant/10">
				<select bind:value={selectedPatientId} class="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm border-none focus:ring-primary/30">
					{#each patients as p}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>

			<!-- Cart Items -->
			<div class="flex-1 overflow-y-auto">
				{#if cart.length === 0}
					<div class="flex flex-col items-center justify-center h-full text-on-surface-variant/40">
						<span class="material-symbols-outlined text-5xl mb-3">add_shopping_cart</span>
						<p class="text-sm font-body">{$_('pos.tap_products', { default: 'Tap products to add' })}</p>
						<p class="text-[10px] mt-1 font-mono opacity-60">{$_('pos.shortcuts', { default: 'F2 = Search • F9 = Checkout' })}</p>
					</div>
				{:else}
					<div class="divide-y divide-surface-container-low">
						{#each cart as item, i (item.product.id)}
							<div class="px-4 py-3 flex items-center gap-3" in:slide={{ duration: 200 }}>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-bold truncate">{item.product.name}</p>
									<p class="text-xs text-on-surface-variant">{formatINR(item.product.selling_price)} {$_('pos.each', { default: 'each' })}</p>
								</div>
								<div class="flex items-center gap-1.5 shrink-0">
									<button onclick={() => updateQty(i, -1)} class="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors">
										<span class="material-symbols-outlined text-sm">remove</span>
									</button>
									<span class="w-8 text-center text-sm font-bold">{item.qty}</span>
									<button onclick={() => updateQty(i, 1)} class="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors">
										<span class="material-symbols-outlined text-sm">add</span>
									</button>
								</div>
								<p class="text-sm font-bold w-20 text-right">{formatINR(item.product.selling_price * item.qty)}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Cart Footer -->
			{#if cart.length > 0}
				<div class="border-t border-outline-variant/10 p-4 space-y-3" in:slide={{ duration: 200 }}>
					<div class="space-y-1.5 text-sm">
						<div class="flex justify-between text-on-surface-variant">
							<span>{$_('pos.subtotal', { default: 'Subtotal' })}</span>
							<span>{formatINR(cartTotal.subtotal)}</span>
						</div>
						<div class="flex justify-between text-on-surface-variant">
							<span>{$_('pos.tax', { default: 'Tax' })}</span>
							<span>{formatINR(cartTotal.total_tax)}</span>
						</div>
						<div class="flex justify-between font-headline font-extrabold text-on-surface text-lg pt-2 border-t border-outline-variant/10">
							<span>{$_('pos.total', { default: 'Total' })}</span>
							<span class="text-primary">{formatINR(cartTotal.grand_total)}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Footer actions -->
			<div class="p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if isBtPrintSupported()}
						<button 
							onclick={handleBluetooth}
							class="flex items-center gap-2 px-3 py-2 rounded-lg {getConnectionStatus() ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container-low text-on-surface-variant'} text-xs font-bold transition-colors"
						>
							<span class="material-symbols-outlined text-sm">{getConnectionStatus() ? 'print_connect' : 'bluetooth'}</span>
							{getConnectionStatus() ? $_('pos.printer_connected', { default: 'Printer Connected' }) : $_('pos.connect_printer', { default: 'Connect Printer' })}
						</button>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<button 
						onclick={() => cart = []} 
						class="px-4 py-2 text-xs font-bold text-error hover:bg-error/5 rounded-lg"
						disabled={cart.length === 0}
					>
						{$_('pos.clear_cart', { default: 'Clear Cart' })}
					</button>
					<button
						onclick={checkout}
						disabled={processing || cart.length === 0}
						class="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-sm">{isPrinting ? 'print' : 'receipt_long'}</span>
						{isPrinting ? $_('pos.printing', { default: 'Printing...' }) : processing ? $_('pos.processing', { default: 'Processing...' }) : $_('pos.checkout_button', { default: 'Checkout (F9)' })}
					</button>
				</div>
			</div>
		</div>
	</div>

	{#if showScanner}
		<BarcodeScanner onScan={handleBarcodeScan} onClose={() => showScanner = false} />
	{/if}

	{#if showAddProduct}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" onkeydown={(e) => e.key === 'Escape' && (showAddProduct = false)}>
			<div class="bg-surface-container-lowest rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
				<h2 class="font-headline font-bold text-lg text-on-surface">Add Product</h2>

				<div class="space-y-3">
					<div>
						<label for="qap-name" class="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Name *</label>
						<input
							id="qap-name"
							bind:value={newProductName}
							type="text"
							placeholder="Product name"
							class="w-full bg-surface-container-high rounded-lg px-3 py-2.5 text-base text-on-surface border-none focus:ring-2 focus:ring-primary/30 outline-none"
						/>
					</div>

					<div>
						<label for="qap-price" class="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Selling Price (₹) *</label>
						<input
							id="qap-price"
							bind:value={newProductPrice}
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00"
							class="w-full bg-surface-container-high rounded-lg px-3 py-2.5 text-base text-on-surface border-none focus:ring-2 focus:ring-primary/30 outline-none"
						/>
					</div>

					<label class="flex items-center gap-3 cursor-pointer py-1">
						<input type="checkbox" bind:checked={newProductIsService} class="w-4 h-4 rounded accent-primary" />
						<span class="text-sm font-medium text-on-surface">This is a service (no stock tracking)</span>
					</label>

					{#if !newProductIsService}
						<div>
							<label for="qap-stock" class="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Opening Stock (units)</label>
							<input
								id="qap-stock"
								bind:value={newProductStock}
								type="number"
								min="0"
								placeholder="1"
								class="w-full bg-surface-container-high rounded-lg px-3 py-2.5 text-base text-on-surface border-none focus:ring-2 focus:ring-primary/30 outline-none"
							/>
						</div>
					{/if}
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={() => showAddProduct = false}
						class="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleSaveProduct}
						disabled={!newProductName.trim() || !newProductPrice || savingProduct}
						class="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md disabled:opacity-50"
					>
						{savingProduct ? 'Saving…' : 'Add & Cart'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<style>
		/* Custom scrollbar for better look */
		.overflow-y-auto::-webkit-scrollbar {
			width: 4px;
		}
		.overflow-y-auto::-webkit-scrollbar-track {
			background: transparent;
		}
		.overflow-y-auto::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-rgb), 0.1);
			border-radius: 2px;
		}
		.overflow-y-auto::-webkit-scrollbar-thumb:hover {
			background: rgba(var(--primary-rgb), 0.2);
		}
	</style>
{/if}
