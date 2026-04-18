<script lang="ts">
	import { createBranch, getBranches, updateBranch } from '$lib/db/crud-extended';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatDate } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import type { Branch } from '$lib/db/index';

	let branches = $state<Branch[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let editingBranch = $state<Branch | null>(null);
	let isSaving = $state(false);

	// Form fields
	let formName = $state('');
	let formAddress = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let formGstin = $state('');

	async function loadData(bizId: string) {
		loading = true;
		branches = await getBranches(bizId);
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	function openNew() {
		editingBranch = null;
		formName = '';
		formAddress = '';
		formPhone = '';
		formEmail = '';
		formGstin = '';
		showModal = true;
	}

	function openEdit(branch: Branch) {
		editingBranch = branch;
		formName = branch.name;
		formAddress = branch.address;
		formPhone = branch.phone;
		formEmail = branch.email;
		formGstin = branch.gstin;
		showModal = true;
	}

	async function handleSave() {
		if (!$activeBusinessId || !formName.trim()) return;
		isSaving = true;
		try {
			if (editingBranch) {
				await updateBranch(editingBranch.id, {
					name: formName.trim(),
					address: formAddress.trim(),
					phone: formPhone.trim(),
					email: formEmail.trim(),
					gstin: formGstin.trim()
				});
				toast.success('Branch updated');
			} else {
				await createBranch($activeBusinessId, formName.trim(), formAddress.trim(), formPhone.trim(), formEmail.trim(), formGstin.trim());
				toast.success('Branch created');
			}
			showModal = false;
			await loadData($activeBusinessId);
		} catch (e) {
			toast.error('Failed to save branch');
		} finally {
			isSaving = false;
		}
	}

	async function toggleActive(branch: Branch) {
		await updateBranch(branch.id, { is_active: !branch.is_active });
		toast.success(branch.is_active ? 'Branch deactivated' : 'Branch activated');
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	let activeCount = $derived(branches.filter(b => b.is_active).length);
</script>

<svelte:head>
	<title>Branches | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl lg:text-3xl font-headline font-extrabold text-on-surface tracking-tight">Branches</h1>
		<p class="text-on-surface-variant mt-0.5 text-xs lg:text-sm">Manage locations and outlets.</p>
	</div>
	<button
		onclick={openNew}
		class="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
	>
		<span class="material-symbols-outlined text-lg">add_business</span>
		<span class="hidden sm:inline">Add Branch</span>
		<span class="sm:hidden">Add</span>
	</button>
</div>

<!-- Stats -->
{#if !loading}
	<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-6">
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
			<p class="text-xl font-headline font-bold text-on-surface">{branches.length}</p>
		</div>
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Active</p>
			<p class="text-xl font-headline font-bold text-primary">{activeCount}</p>
		</div>
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Inactive</p>
			<p class="text-xl font-headline font-bold text-on-surface-variant">{branches.length - activeCount}</p>
		</div>
	</div>
{/if}

{#if loading}
	<div class="flex items-center justify-center py-24">
		<span class="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
	</div>
{:else if branches.length === 0}
	<EmptyState
		icon="add_business"
		title="No branches yet"
		description="Add your first branch or outlet to manage multiple locations under one account."
		actionLabel="Add First Branch"
	/>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each branches as branch}
			<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 shadow-sm flex flex-col gap-4 {!branch.is_active ? 'opacity-60' : ''}">
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
							<span class="material-symbols-outlined text-primary text-xl">storefront</span>
						</div>
						<div>
							<h3 class="font-bold text-on-surface text-base">{branch.name}</h3>
							{#if branch.gstin}
								<p class="text-xs text-on-surface-variant font-mono">GSTIN: {branch.gstin}</p>
							{/if}
						</div>
					</div>
					<span class="text-xs px-2 py-1 rounded-full font-semibold shrink-0
						{branch.is_active ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}">
						{branch.is_active ? 'Active' : 'Inactive'}
					</span>
				</div>

				<div class="space-y-1.5 text-sm text-on-surface-variant">
					{#if branch.address}
						<div class="flex items-start gap-2">
							<span class="material-symbols-outlined text-[16px] mt-0.5 shrink-0">location_on</span>
							<span>{branch.address}</span>
						</div>
					{/if}
					{#if branch.phone}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] shrink-0">phone</span>
							<span>{branch.phone}</span>
						</div>
					{/if}
					{#if branch.email}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] shrink-0">mail</span>
							<span>{branch.email}</span>
						</div>
					{/if}
				</div>

				<div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
					<span class="text-xs text-on-surface-variant">Added {formatDate(branch.created_at)}</span>
					<div class="flex items-center gap-2">
						<button
							onclick={() => toggleActive(branch)}
							class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-all"
						>
							{branch.is_active ? 'Deactivate' : 'Activate'}
						</button>
						<button
							onclick={() => openEdit(branch)}
							class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-all"
						>
							Edit
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Add/Edit Modal -->
<Modal show={showModal} title={editingBranch ? 'Edit Branch' : 'Add New Branch'} onclose={() => showModal = false}>
	<form class="p-6 space-y-5 overflow-y-auto max-h-[80vh]" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
		<Input label="Branch Name *" bind:value={formName} required placeholder="E.g. Main Store, North Outlet" />
		<Input label="Address" bind:value={formAddress} placeholder="Full address..." />
		<div class="grid grid-cols-2 gap-4">
			<Input label="Phone" bind:value={formPhone} type="tel" placeholder="10-digit number" />
			<Input label="Email" bind:value={formEmail} type="email" placeholder="branch@example.com" />
		</div>
		<Input label="GSTIN (if different)" bind:value={formGstin} placeholder="22AAAAA0000A1Z5" />

		<div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
			<button type="button" onclick={() => showModal = false} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">Cancel</button>
			<button type="submit" disabled={isSaving} class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md disabled:opacity-50">
				{isSaving ? 'Saving...' : (editingBranch ? 'Update Branch' : 'Create Branch')}
			</button>
		</div>
	</form>
</Modal>
