<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, getPatients, getProducts, createRecurringSchedule } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { calculateInvoiceTax, GST_RATES, type LineItem } from '$lib/utils/gst';
	import { formatINR, toPaise } from '$lib/utils/currency';
	import { today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Patient, Product } from '$lib/db/index';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';

	let patients = $state<Patient[]>([]);
	let products = $state<Product[]>([]);
	let businessId = $state('');
	let businessStateCode = $state('27');
	let loading = $state(true);
	let saving = $state(false);

	// Form state
	let selectedPatientId = $state('');
	let firstRunDate = $state(today());
	let frequency = $state<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
	let placeOfSupply = $state('27');

	// Line items
	let items = $state<{ product_id: string | null; description: string; hsn_sac: string; quantity: string; rate: string; tax_rate: number }[]>([
		{ product_id: null, description: '', hsn_sac: '', quantity: '1', rate: '', tax_rate: 1800 }
	]);

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

	let selectedPatient = $derived(patients.find((p) => p.id === selectedPatientId));

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
				amount: Math.round(toPaise(parseFloat(it.rate || '0')) * parseFloat(it.quantity || '0'))
			}));

			await createRecurringSchedule({
				business_id: businessId,
				patient_id: selectedPatientId,
				frequency: frequency,
				next_run: firstRunDate,
				is_active: true,
				template_invoice_data: {
					tax_type: taxSummary.tax_type,
					subtotal: taxSummary.subtotal,
					total_tax: taxSummary.total_tax,
					grand_total: taxSummary.grand_total,
					cgst: taxSummary.total_cgst,
					sgst: taxSummary.total_sgst,
					igst: taxSummary.total_igst,
					notes: ''
				} as any,
				template_items_data: lineItems as any
			});

			toast.success('Recurring subscription created!');
			setTimeout(() => {
				goto(`/patients/${selectedPatientId}`);
			}, 300);
		} catch (err) {
			console.error(err);
			toast.error('Failed to create subscription');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Subscription</title>
</svelte:head>

<!-- Similar to invoice/new layout but modified for Subscription Template -->
<div class="max-w-4xl mx-auto space-y-8 pb-32">
	<div>
		<h2 class="text-3xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-2">
			<span class="material-symbols-outlined text-4xl text-primary">autorenew</span>
			New Subscription
		</h2>
		<p class="text-on-surface-variant font-body mt-1">Configure an auto-generated recurring invoice template.</p>
	</div>

	<div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<Select label="Customer" bind:value={selectedPatientId} required
					options={patients.map(p => ({ value: p.id, label: `${p.name}${p.phone ? ` (${p.phone})` : ''}` }))}
				/>
			</div>
			
			<div class="grid grid-cols-2 gap-4">
				<Input label="First Run Date" bind:value={firstRunDate} type="date" required />
				<Select label="Frequency" bind:value={frequency}
					options={[
						{ value: 'WEEKLY', label: 'Weekly' },
						{ value: 'MONTHLY', label: 'Monthly' },
						{ value: 'QUARTERLY', label: 'Quarterly' },
						{ value: 'YEARLY', label: 'Yearly' }
					]}
				/>
			</div>
		</div>
	</div>

	<div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
		<h3 class="font-headline font-bold text-lg mb-6 flex items-center gap-2">
			Template Line Items
		</h3>

		<div class="space-y-4">
			{#each items as item, i}
				<div class="flex flex-col sm:flex-row items-end gap-3 p-4 bg-surface-container-low/30 border border-outline-variant/20 rounded-lg group">
					<div class="w-full sm:flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 relative">
						<div class="sm:col-span-5 relative">
							<Input
								label="Item/Service Name"
								bind:value={item.description}
								placeholder="e.g. Website Maintenance"
								list="products-list"
								required
								oninput={() => handleProductSelect(i, item.description)}
							/>
							{#if item.product_id}
								<div class="absolute right-3 top-9 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider pointer-events-none">Catalog</div>
							{/if}
						</div>
						<div class="sm:col-span-3">
							<Input label="Rate (₹)" bind:value={item.rate} type="number" step="0.01" min="0" required placeholder="0.00" />
						</div>
						<div class="sm:col-span-2">
							<Input label="Qty" bind:value={item.quantity} type="number" step="1" min="1" required placeholder="1" />
						</div>
						<div class="sm:col-span-2">
							<Select label="Tax" bind:value={item.tax_rate}
								options={GST_RATES.map(r => ({ value: r.value, label: r.label }))}
							/>
						</div>
					</div>
					<button type="button" onclick={() => removeRow(i)} class="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg shrink-0 transition-colors" disabled={items.length <= 1}>
						<span class="material-symbols-outlined text-lg">delete</span>
					</button>
				</div>
			{/each}

			<datalist id="products-list">
				{#each products as p}
					<option value={p.name}>{p.sku ? `[${p.sku}] ` : ''}{p.name} - {formatINR(p.selling_price)}</option>
				{/each}
			</datalist>

			<button type="button" onclick={addRow} class="flex items-center gap-2 text-primary font-bold text-sm px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors">
				<span class="material-symbols-outlined text-[18px]">add</span>
				Add Line Item
			</button>
		</div>
	</div>
</div>

<div class="fixed bottom-0 left-0 right-0 p-4 bg-surface-container-lowest border-t border-outline-variant/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 flex justify-center">
	<div class="max-w-4xl w-full flex justify-between gap-4">
		<button onclick={() => goto('/dashboard')} class="px-6 py-3 rounded-xl border border-outline-variant font-headline font-semibold text-[15px] hover:bg-surface-container-low transition-colors">
			Cancel
		</button>
		<button onclick={handleSubmit} disabled={saving || !selectedPatientId} class="px-8 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-[15px] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
			<span class="material-symbols-outlined text-base">save</span>
			{saving ? 'Saving...' : 'Start Subscription'}
		</button>
	</div>
</div>
