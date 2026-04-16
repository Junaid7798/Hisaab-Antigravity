<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { getBusiness, createStaff, getStaff, updateStaff, softDeleteStaff, createStaffSalary, getStaffSalaries, createStaffAdvance, approveStaffAdvance, getStaffAdvances, addStaffDocument, getStaffDocuments, deleteStaffDocument, getStaffById } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact, formatINR } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { invalidateBusinessCache } from '$lib/utils/cache';
	import type { Staff, StaffSalary, StaffAdvance, StaffDocument, StaffRole } from '$lib/db/index';
	import { fade, slide } from 'svelte/transition';

	let staff = $state<Staff[]>([]);
	let selectedStaff = $state<Staff | null>(null);
	let businessId = $state('');
	let loading = $state(true);
	let showModal = $state(false);
	let activeTab = $state<'staff' | 'salary' | 'advances'>('staff');
	let searchQuery = $state('');
	let isSubmitting = $state(false);

	// Form state
	let formName = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let formRole = $state<StaffRole>('helper');
	let formDOB = $state('');
	let formDOJ = $state('');
	let formAddress = $state('');
	let formAadhaar = $state('');
	let formPan = $state('');
	let formBankAccount = $state('');
	let formBankIFSC = $state('');
	let formBankName = $state('');
	let formSalary = $state(0);
	let formPhoto = $state('');

	const roles: { value: StaffRole; label: string }[] = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'store_manager', label: 'Store Manager' },
		{ value: 'cashier', label: 'Cashier' },
		{ value: 'helper', label: 'Helper' },
		{ value: 'accountant', label: 'Accountant' }
	];

	const rolePermissions = {
		admin: { canManageStaff: true, canViewSalary: true, canApproveAdvance: true, canManageInventory: true, canManageInvoices: true },
		store_manager: { canManageStaff: false, canViewSalary: true, canApproveAdvance: true, canManageInventory: true, canManageInvoices: true },
		cashier: { canManageStaff: false, canViewSalary: false, canApproveAdvance: false, canManageInventory: false, canManageInvoices: true },
		helper: { canManageStaff: false, canViewSalary: false, canApproveAdvance: false, canManageInventory: false, canManageInvoices: false },
		accountant: { canManageStaff: false, canViewSalary: true, canApproveAdvance: false, canManageInventory: false, canManageInvoices: false }
	};

	let currentUserRole = $state<StaffRole>('admin');

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			staff = await getStaff(biz.id);
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	function openAddModal() {
		selectedStaff = null;
		resetForm();
		showModal = true;
	}

	function openEditModal(s: Staff) {
		selectedStaff = s;
		formName = s.name;
		formPhone = s.phone;
		formEmail = s.email;
		formRole = s.role;
		formDOB = s.date_of_birth;
		formDOJ = s.date_of_joining;
		formAddress = s.address;
		formAadhaar = s.aadhaar_number;
		formPan = s.pan_number;
		formBankAccount = s.bank_account_number;
		formBankIFSC = s.bank_ifsc;
		formBankName = s.bank_name;
		formSalary = s.basic_salary;
		formPhoto = s.photo_base64;
		showModal = true;
	}

	function resetForm() {
		formName = '';
		formPhone = '';
		formEmail = '';
		formRole = 'helper';
		formDOB = '';
		formDOJ = '';
		formAddress = '';
		formAadhaar = '';
		formPan = '';
		formBankAccount = '';
		formBankIFSC = '';
		formBankName = '';
		formSalary = 0;
		formPhoto = '';
	}

	async function handleSave() {
		if (!formName.trim() || !businessId) return;

		isSubmitting = true;
		try {
			const data = {
				name: formName.trim(),
				phone: formPhone.trim(),
				email: formEmail.trim(),
				role: formRole,
				date_of_birth: formDOB,
				date_of_joining: formDOJ,
				address: formAddress.trim(),
				aadhaar_number: formAadhaar.trim(),
				pan_number: formPan.trim(),
				bank_account_number: formBankAccount.trim(),
				bank_ifsc: formBankIFSC.trim(),
				bank_name: formBankName.trim(),
				basic_salary: formSalary,
				photo_base64: formPhoto
			};

			if (selectedStaff) {
				await updateStaff(selectedStaff.id, data);
				toast.success('Staff updated successfully');
			} else {
				await createStaff(businessId, data);
				toast.success('Staff added successfully');
			}

			invalidateBusinessCache(businessId);
			staff = await getStaff(businessId);
			showModal = false;
			resetForm();
		} finally {
			isSubmitting = false;
		}
	}

	let showConfirm = $state(false);
	let staffToDelete = $state<Staff | null>(null);

	function handleDelete(s: Staff) {
		staffToDelete = s;
		showConfirm = true;
	}

	async function confirmDelete() {
		if (!staffToDelete) return;
		await softDeleteStaff(staffToDelete.id);
		invalidateBusinessCache(businessId);
		staff = await getStaff(businessId);
		toast.success('Staff removed successfully');
		showConfirm = false;
		staffToDelete = null;
	}

	function handlePhotoUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = () => {
			formPhoto = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	let filteredStaff = $derived(
		searchQuery 
			? staff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery))
			: staff
	);

	function getRoleColor(role: StaffRole): string {
		const colors = {
			admin: 'bg-primary text-white',
			store_manager: 'bg-secondary text-white',
			cashier: 'bg-tertiary text-white',
			helper: 'bg-surface-container text-on-surface',
			accountant: 'bg-outline text-on-surface'
		};
		return colors[role] || '';
	}
</script>

<svelte:head>
	<title>Staff Management | Hisaab</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
		<div>
			<h2 class="text-3xl font-headline font-bold text-on-surface">Staff Management</h2>
			<p class="text-on-surface-variant mt-1">Manage your team members, salaries, and advances</p>
		</div>
		<button onclick={openAddModal} class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
			<span class="material-symbols-outlined">person_add</span>
			Add Staff
		</button>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 mb-6 overflow-x-auto pb-2">
		<button onclick={() => activeTab = 'staff'} class="px-4 py-2 rounded-lg font-semibold transition-all {activeTab === 'staff' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}">
			<span class="material-symbols-outlined text-lg mr-1 align-middle">people</span>
			Staff ({staff.length})
		</button>
		<button onclick={() => activeTab = 'salary'} class="px-4 py-2 rounded-lg font-semibold transition-all {activeTab === 'salary' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}">
			<span class="material-symbols-outlined text-lg mr-1 align-middle">payments</span>
			Salary
		</button>
		<button onclick={() => activeTab = 'advances'} class="px-4 py-2 rounded-lg font-semibold transition-all {activeTab === 'advances' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}">
			<span class="material-symbols-outlined text-lg mr-1 align-middle">account_balance</span>
			Advances
		</button>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<span class="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">sync</span>
			<p class="text-on-surface-variant mt-4">Loading...</p>
		</div>
	{:else if activeTab === 'staff'}
		<!-- Search -->
		<div class="mb-6">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search staff by name or phone..."
				class="w-full max-w-md bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50"
			/>
		</div>

		{#if filteredStaff.length === 0}
			<EmptyState 
				icon="people" 
				title="No staff members yet" 
				description="Add your first staff member to get started"
				actionLabel="Add Staff"
				{onclick}
			/>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each filteredStaff as s (s.id)}
					<div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 hover:shadow-lg transition-all">
						<div class="flex items-start gap-4">
							{#if s.photo_base64}
								<img src={s.photo_base64} alt={s.name} class="w-14 h-14 rounded-full object-cover" />
							{:else}
								<div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
									<span class="material-symbols-outlined text-2xl text-primary">{s.name[0]}</span>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-on-surface truncate">{s.name}</h3>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1 {getRoleColor(s.role)}">
									{s.role.replace('_', ' ')}
								</span>
								<p class="text-sm text-on-surface-variant mt-1">{s.phone}</p>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
							<div class="text-sm">
								<p class="text-on-surface-variant">Salary</p>
								<p class="font-bold text-primary">{formatINRCompact(s.basic_salary)}</p>
							</div>
							<div class="flex gap-2">
								<button aria-label="Edit Staff" onclick={() => openEditModal(s)} class="p-2 rounded-lg hover:bg-surface-container transition-colors">
									<span class="material-symbols-outlined text-on-surface-variant">edit</span>
								</button>
								<button aria-label="Delete Staff" onclick={() => handleDelete(s)} class="p-2 rounded-lg hover:bg-error-container transition-colors">
									<span class="material-symbols-outlined text-error">delete</span>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else if activeTab === 'salary'}
		<div class="bg-surface-container-lowest rounded-2xl p-8 text-center">
			<span class="material-symbols-outlined text-5xl text-on-surface-variant/30">payments</span>
			<h3 class="text-xl font-bold text-on-surface mt-4">Salary Management</h3>
			<p class="text-on-surface-variant mt-2">Process monthly salaries for your staff</p>
			<button class="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-bold">
				Process Monthly Salary
			</button>
		</div>
	{:else if activeTab === 'advances'}
		<div class="bg-surface-container-lowest rounded-2xl p-8 text-center">
			<span class="material-symbols-outlined text-5xl text-on-surface-variant/30">account_balance</span>
			<h3 class="text-xl font-bold text-on-surface mt-4">Advance Requests</h3>
			<p class="text-on-surface-variant mt-2">View and approve salary advances</p>
			<button class="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-bold">
				View Requests
			</button>
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
		<div class="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="sticky top-0 bg-surface-container-lowest p-6 border-b border-outline-variant/10 flex items-center justify-between">
				<h3 class="text-xl font-headline font-bold">{selectedStaff ? 'Edit Staff' : 'Add New Staff Member'}</h3>
				<button onclick={() => showModal = false} class="p-2 rounded-full hover:bg-surface-container transition-colors">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			
			<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="p-6 space-y-6">
				<!-- Photo -->
				<div class="flex items-center gap-4">
					{#if formPhoto}
						<img src={formPhoto} alt="Preview" class="w-20 h-20 rounded-full object-cover" />
					{:else}
						<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
							<span class="material-symbols-outlined text-3xl text-on-surface-variant">person</span>
						</div>
					{/if}
					<div>
						<label class="btn btn-outline cursor-pointer">
							<span class="material-symbols-outlined text-lg">upload</span>
							Upload Photo
							<input type="file" accept="image/*" onchange={handlePhotoUpload} class="hidden" />
						</label>
					</div>
				</div>

				<!-- Basic Info -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Input label="Full Name" bind:value={formName} required />
					<Input label="Phone" bind:value={formPhone} type="tel" required />
					<Input label="Email" bind:value={formEmail} type="email" />
					<label class="w-full">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Role</span>
						<select bind:value={formRole} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3">
							{#each roles as r}
								<option value={r.value}>{r.label}</option>
							{/each}
						</select>
					</label>
					<Input label="Date of Birth" bind:value={formDOB} type="date" />
					<Input label="Date of Joining" bind:value={formDOJ} type="date" />
				</div>

				<!-- Address -->
				<label class="w-full">
					<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Address</span>
					<textarea bind:value={formAddress} rows="2" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 resize-none"></textarea>
				</label>

				<!-- Documents -->
				<div class="border-t border-outline-variant/20 pt-4">
					<h4 class="font-bold text-on-surface mb-4">Documents</h4>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input label="Aadhaar Number" bind:value={formAadhaar} />
						<Input label="PAN Number" bind:value={formPan} />
					</div>
				</div>

				<!-- Bank Details -->
				<div class="border-t border-outline-variant/20 pt-4">
					<h4 class="font-bold text-on-surface mb-4">Bank Details</h4>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input label="Bank Account Number" bind:value={formBankAccount} />
						<Input label="IFSC Code" bind:value={formBankIFSC} />
						<Input label="Bank Name" bind:value={formBankName} />
						<Input label="Basic Salary (₹)" bind:value={formSalary} type="number" />
					</div>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-4 border-t border-outline-variant/20">
					<button type="button" onclick={() => showModal = false} class="flex-1 px-4 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">refresh</span>
						{/if}
						{selectedStaff ? 'Update Staff' : 'Add Staff'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	show={showConfirm}
	title="Remove Staff"
	message={staffToDelete ? `Are you sure you want to remove ${staffToDelete.name}? This action cannot be undone.` : ''}
	confirmText="Remove"
	destructive={true}
	onConfirm={confirmDelete}
	onCancel={() => { showConfirm = false; staffToDelete = null; }}
/>