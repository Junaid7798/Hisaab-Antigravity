<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getBusiness, getSuppliers, createSupplier, getPurchasePaymentTotalForSupplier, getPurchaseOrdersBySupplier } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINRCompact } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Supplier } from '$lib/db/index';

	let suppliers = $state<Supplier[]>([]);
	let outstandingBalances = $state<Record<string, number>>({});
	let businessId = $state('');
	let totalSuppliers = $state(0);
	let totalPayable = $state(0);
	let loading = $state(true);
	let showModal = $state(false);
	let searchQuery = $state('');

	// New supplier form
	let newName = $state('');
	let newPhone = $state('');
	let newEmail = $state('');
	let newAddress = $state('');
	let newGstin = $state('');
	let newStateCode = $state('27');

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			suppliers = await getSuppliers(businessId);
			totalSuppliers = suppliers.length;
			
			let payableSum = 0;
			const balances: Record<string, number> = {};
			
			for (const supplier of suppliers) {
				const pos = await getPurchaseOrdersBySupplier(supplier.id);
				const totalBilled = pos.reduce((sum, po) => sum + po.grand_total, 0);
				const totalPaid = await getPurchasePaymentTotalForSupplier(supplier.id);
				const outstanding = totalBilled - totalPaid;
				
				balances[supplier.id] = outstanding;
				payableSum += outstanding;
			}
			
			outstandingBalances = balances;
			totalPayable = payableSum;
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	async function handleAddSupplier() {
		if (!newName.trim()) return;
		await createSupplier({
			name: newName.trim(),
			phone: newPhone.trim(),
			email: newEmail.trim(),
			address: newAddress.trim(),
			gstin: newGstin.trim(),
			state_code: newStateCode
		}, businessId);
		
		toast.success('Supplier registered successfully');
		
		newName = '';
		newPhone = '';
		newEmail = '';
		newAddress = '';
		newGstin = '';
		newStateCode = '27';
		showModal = false;
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	let filteredSuppliers = $derived(
		searchQuery
			? suppliers.filter(
					(s) =>
						s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						s.phone.includes(searchQuery) ||
						(s.gstin && s.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
				)
			: suppliers
	);
</script>

<svelte:head>
	<title>Suppliers | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
	<div>
		<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">{$_('suppliers.title', { default: 'Suppliers' })}</h1>
		<p class="text-on-surface-variant font-body mt-1">{$_('suppliers.subtitle', { default: 'Manage vendors and payables.' })}</p>
	</div>
	<button
		onclick={() => (showModal = true)}
		class="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold shadow-md inline-flex hover:opacity-90 transition-all active:scale-95"
	>
		<span class="material-symbols-outlined">person_add</span>
		<span>{$_('suppliers.add_supplier', { default: 'Add Supplier' })}</span>
	</button>
</div>

<!-- Stats -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
	<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('suppliers.total_suppliers', { default: 'Total Suppliers' })}</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{totalSuppliers.toLocaleString('en-IN')}</p>
		</div>
		<div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
			<span class="material-symbols-outlined">local_shipping</span>
		</div>
	</div>
	<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('suppliers.total_payable', { default: 'Total Payable' })}</p>
			<p class="text-2xl font-headline font-bold text-error">{formatINRCompact(totalPayable)}</p>
		</div>
		<div class="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
			<span class="material-symbols-outlined">account_balance_wallet</span>
		</div>
	</div>
</div>

<!-- Search -->
<div class="mb-6 max-w-md">
	<Input
		bind:value={searchQuery}
		placeholder={$_('suppliers.search_placeholder', { default: 'Search suppliers by name, phone, or GSTIN...' })}
		icon="search"
	/>
</div>

<!-- Supplier Table -->
<div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/15">
	{#if filteredSuppliers.length === 0 && !loading}
		<EmptyState
			icon="local_shipping"
			title={searchQuery ? 'No match found' : 'No suppliers found'}
			description={searchQuery ? 'Try adjusting your search criteria.' : 'Add your first supplier to get started.'}
		/>
	{:else}
		<div class="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
			<table class="w-full border-collapse whitespace-nowrap">
				<thead>
					<tr class="text-left bg-surface-container-low/30 border-b border-outline-variant/15">
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Supplier Name</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">GSTIN</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Payable</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredSuppliers as supplier}
						<tr class="border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors group">
							<td class="px-6 py-4 relative">
								<p class="font-bold text-on-surface">{supplier.name}</p>
								<a href="/suppliers/{supplier.id}" class="absolute inset-0 z-0"><span class="sr-only">View Supplier</span></a>
							</td>
							<td class="px-6 py-4 text-sm text-on-surface">{supplier.phone || '—'}</td>
							<td class="px-6 py-4 text-sm text-on-surface-variant">{supplier.gstin || '—'}</td>
							<td class="px-6 py-4 text-right">
								<span class={outstandingBalances[supplier.id] > 0 ? 'text-error font-semibold' : 'text-on-surface-variant font-medium'}>
									{formatINRCompact(outstandingBalances[supplier.id] || 0)}
								</span>
							</td>
							<td class="px-6 py-4 text-right relative z-10">
								<a href="/suppliers/{supplier.id}" class="text-primary text-sm font-semibold hover:underline flex items-center justify-end gap-1">
									View <span class="material-symbols-outlined text-xs">chevron_right</span>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<Modal show={showModal} title="Add Supplier" onclose={() => showModal = false}>
	<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleAddSupplier(); }}>
		<Input label="Supplier Name" bind:value={newName} placeholder="e.g. Acme Corp" required />
		
		<div class="grid grid-cols-2 gap-4">
			<Input label="Phone Number" bind:value={newPhone} placeholder="e.g. 9876543210" type="tel" />
			<Input label="Email Address" bind:value={newEmail} placeholder="e.g. hello@acme.com" type="email" />
		</div>
		
		<div class="grid grid-cols-2 gap-4">
			<Input label="GSTIN (Optional)" bind:value={newGstin} placeholder="e.g. 27AAAAA0000A1Z5" />
			<Select label="State of Supply" bind:value={newStateCode} options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))} />
		</div>

		<div class="space-y-1.5">
			<label class="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">Address (Optional)</label>
			<textarea bind:value={newAddress} rows="2" placeholder="e.g. 123 Business Park" class="w-full bg-surface-container-highest border-b border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"></textarea>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<button type="button" class="px-5 py-2.5 text-on-surface-variant font-semibold hover:bg-surface-variant/20 rounded-lg transition-colors" onclick={() => (showModal = false)}>
				Cancel
			</button>
			<button type="submit" class="px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50" disabled={!newName.trim()}>
				Save Supplier
			</button>
		</div>
	</form>
</Modal>
