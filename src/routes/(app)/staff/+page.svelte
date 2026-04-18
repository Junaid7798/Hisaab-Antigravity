<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { getBusiness, createStaff, getStaff, updateStaff, softDeleteStaff, createStaffSalary, getStaffSalaries, getStaffSalaryByMonth, createStaffAdvance, approveStaffAdvance, getStaffAdvances, addStaffDocument, getStaffDocuments, deleteStaffDocument, getStaffById } from '$lib/db/crud';
	import { getAttendanceByMonth } from '$lib/db/crud-extended';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact, formatINR } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { invalidateBusinessCache } from '$lib/utils/cache';
	import { calculatePayroll, buildSalaryRecord, formatMonthYear, getWorkingDaysInMonth } from '$lib/utils/payroll';
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

	// ── Payroll state ──────────────────────────────────────────────────────────
	const today = new Date();
	let salaryMonth = $state(today.getMonth() + 1); // 1-based
	let salaryYear = $state(today.getFullYear());
	let salaries = $state<StaffSalary[]>([]);
	let isGeneratingSalary = $state(false);
	let showSalaryModal = $state(false);
	let salaryPreview = $state<{ staffId: string; name: string; basic: number; absent: number; late: number; absentDeduct: number; lateDeduct: number; gross: number; workingDays: number } | null>(null);
	let salaryBonus = $state(0);
	let salaryExtraDeductions = $state(0);
	let salaryPaymentMethod = $state<StaffSalary['payment_method']>('cash');
	let salaryRemarks = $state('');

	async function loadSalaries() {
		if (!businessId) return;
		salaries = await getStaffSalaries(businessId);
	}

	async function openSalaryModal(s: Staff) {
		if (!businessId) return;
		const attendance = await getAttendanceByMonth(businessId, s.id, salaryMonth, salaryYear);
		const calc = calculatePayroll(s, salaryMonth, salaryYear, attendance);
		salaryPreview = {
			staffId: s.id,
			name: s.name,
			basic: calc.basicSalary,
			absent: calc.absentDays,
			late: calc.lateDays,
			absentDeduct: calc.absentDeduction,
			lateDeduct: calc.lateDeduction,
			gross: calc.grossSalary,
			workingDays: calc.workingDays
		};
		salaryBonus = 0;
		salaryExtraDeductions = 0;
		salaryPaymentMethod = 'cash';
		salaryRemarks = '';
		showSalaryModal = true;
	}

	async function generateSalaryPdf(s: Staff, sal: StaffSalary) {
		try {
			const { jsPDF } = await import('jspdf');
			const doc = new jsPDF('p', 'mm', 'a4');
			const W = doc.internal.pageSize.getWidth();
			const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
			const monthLabel = `${monthNames[sal.month - 1]} ${sal.year}`;

			// Header
			doc.setFontSize(20);
			doc.setFont('helvetica', 'bold');
			doc.text('SALARY SLIP', W / 2, 20, { align: 'center' });

			doc.setFontSize(11);
			doc.setFont('helvetica', 'normal');
			doc.text(monthLabel, W / 2, 27, { align: 'center' });

			// Divider
			doc.setDrawColor(200, 200, 200);
			doc.line(14, 32, W - 14, 32);

			// Employee details
			doc.setFontSize(10);
			doc.setFont('helvetica', 'bold');
			doc.text('Employee Details', 14, 40);
			doc.setFont('helvetica', 'normal');
			doc.text(`Name: ${s.name}`, 14, 48);
			doc.text(`Role: ${s.role.replace('_', ' ')}`, 14, 54);
			doc.text(`Payment Method: ${sal.payment_method.replace('_', ' ')}`, 14, 60);
			if (sal.payment_date) doc.text(`Payment Date: ${formatDate(sal.payment_date)}`, 14, 66);

			// Earnings / Deductions table
			doc.setFont('helvetica', 'bold');
			doc.text('Earnings', 14, 78);
			doc.text('Amount (₹)', W - 14, 78, { align: 'right' });
			doc.setDrawColor(200, 200, 200);
			doc.line(14, 80, W - 14, 80);

			doc.setFont('helvetica', 'normal');
			let y = 87;
			doc.text('Basic Salary', 14, y);
			doc.text(sal.basic_salary.toLocaleString('en-IN'), W - 14, y, { align: 'right' });
			y += 7;
			if (sal.bonus > 0) {
				doc.text('Bonus', 14, y);
				doc.text(`+ ${sal.bonus.toLocaleString('en-IN')}`, W - 14, y, { align: 'right' });
				y += 7;
			}
			if (sal.deductions > 0) {
				doc.text('Deductions', 14, y);
				doc.text(`- ${sal.deductions.toLocaleString('en-IN')}`, W - 14, y, { align: 'right' });
				y += 7;
			}

			doc.line(14, y, W - 14, y);
			y += 6;
			doc.setFont('helvetica', 'bold');
			doc.text('Net Salary', 14, y);
			doc.text(`₹ ${sal.net_salary.toLocaleString('en-IN')}`, W - 14, y, { align: 'right' });

			if (sal.remarks) {
				y += 12;
				doc.setFont('helvetica', 'italic');
				doc.setFontSize(9);
				doc.text(`Remarks: ${sal.remarks}`, 14, y);
			}

			doc.save(`salary-slip-${s.name.replace(/\s+/g, '-')}-${monthLabel}.pdf`);
			toast.success('Salary slip downloaded');
		} catch {
			toast.error('Failed to generate salary slip');
		}
	}

	async function saveSalary() {
		if (!salaryPreview || !businessId) return;
		isGeneratingSalary = true;
		try {
			const staffMember = staff.find(s => s.id === salaryPreview!.staffId);
			if (!staffMember) return;
			const attendance = await getAttendanceByMonth(businessId, staffMember.id, salaryMonth, salaryYear);
			const calc = calculatePayroll(staffMember, salaryMonth, salaryYear, attendance);
			const record = buildSalaryRecord(businessId, calc, salaryBonus, salaryExtraDeductions, salaryPaymentMethod, salaryRemarks);
			await createStaffSalary(businessId, record);
			await loadSalaries();
			showSalaryModal = false;
			toast.success(`Salary saved for ${staffMember.name}`);
		} catch {
			toast.error('Failed to save salary');
		} finally {
			isGeneratingSalary = false;
		}
	}

	$effect(() => {
		if (businessId) loadSalaries();
	});

	// ── Advances state ─────────────────────────────────────────────────────────
	let advances = $state<StaffAdvance[]>([]);
	let showAdvanceModal = $state(false);
	let advanceStaffId = $state('');
	let advanceAmount = $state(0);
	let advanceReason = $state('');
	let advanceRepayStart = $state(today.getMonth() + 1);
	let advanceRepayAmount = $state(0);
	let advanceInstallments = $state(1);
	let isSavingAdvance = $state(false);

	async function loadAdvances() {
		if (!businessId) return;
		advances = await getStaffAdvances(businessId);
	}

	function openAdvanceModal(staffMember?: Staff) {
		advanceStaffId = staffMember?.id || (staff[0]?.id ?? '');
		advanceAmount = 0;
		advanceReason = '';
		advanceRepayStart = today.getMonth() + 1;
		advanceRepayAmount = 0;
		advanceInstallments = 1;
		showAdvanceModal = true;
	}

	async function saveAdvance() {
		if (!advanceStaffId || advanceAmount <= 0 || !businessId) return;
		isSavingAdvance = true;
		try {
			await createStaffAdvance(businessId, {
				staff_id: advanceStaffId,
				amount: advanceAmount,
				reason: advanceReason.trim(),
				repayment_start_month: advanceRepayStart,
				repayment_amount: advanceRepayAmount,
				repayment_installments: advanceInstallments
			});
			await loadAdvances();
			showAdvanceModal = false;
			toast.success('Advance request created');
		} catch {
			toast.error('Failed to create advance');
		} finally {
			isSavingAdvance = false;
		}
	}

	async function handleApproveAdvance(id: string, approve: boolean) {
		await approveStaffAdvance(id, 'admin', approve);
		await loadAdvances();
		toast.success(approve ? 'Advance approved' : 'Advance rejected');
	}

	$effect(() => {
		if (businessId && activeTab === 'advances') loadAdvances();
	});

	function getStaffName(staffId: string) {
		return staff.find(s => s.id === staffId)?.name ?? staffId;
	}

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
	<div class="flex items-center justify-between gap-3 mb-4">
		<div>
			<h2 class="text-xl lg:text-3xl font-headline font-bold text-on-surface">Staff</h2>
			<p class="text-on-surface-variant mt-0.5 text-xs lg:text-sm">Team, salaries and advances</p>
		</div>
		<button onclick={openAddModal} class="shrink-0 px-3.5 py-2 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-all flex items-center gap-1.5 text-sm">
			<span class="material-symbols-outlined text-lg">person_add</span>
			<span class="hidden sm:inline">Add Staff</span>
			<span class="sm:hidden">Add</span>
		</button>
	</div>

	<!-- Tabs — pill style -->
	<div class="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 scrollbar-none">
		<button onclick={() => activeTab = 'staff'} class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all {activeTab === 'staff' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}">
			Staff ({staff.length})
		</button>
		<button onclick={() => activeTab = 'salary'} class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all {activeTab === 'salary' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}">
			Salary
		</button>
		<button onclick={() => activeTab = 'advances'} class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all {activeTab === 'advances' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}">
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
				class="w-full max-w-md bg-surface-container border-none rounded-xl px-4 py-3 text-base text-on-surface placeholder:text-on-surface-variant/50"
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
		<!-- Month/Year selector -->
		<div class="flex items-center gap-3 mb-4 flex-wrap">
			<span class="text-sm font-semibold text-on-surface-variant">Processing salary for:</span>
			<select bind:value={salaryMonth} class="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none">
				{#each [{v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},{v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},{v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'}] as m}
					<option value={m.v}>{m.l}</option>
				{/each}
			</select>
			<select bind:value={salaryYear} class="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none">
				{#each [today.getFullYear()-1, today.getFullYear()] as y}
					<option value={y}>{y}</option>
				{/each}
			</select>
			<span class="text-xs text-on-surface-variant ml-auto">{getWorkingDaysInMonth(salaryMonth, salaryYear)} working days this month</span>
		</div>

		{#if staff.filter(s => s.is_active).length === 0}
			<div class="bg-surface-container-lowest rounded-2xl p-8 text-center">
				<span class="material-symbols-outlined text-5xl text-on-surface-variant/30">payments</span>
				<h3 class="text-xl font-bold text-on-surface mt-4">No Active Staff</h3>
				<p class="text-on-surface-variant mt-2">Add staff members first to process salaries.</p>
			</div>
		{:else}
			<div class="grid gap-3">
				{#each staff.filter(s => s.is_active) as s}
					{@const existingSalary = salaries.find(sal => sal.staff_id === s.id && sal.month === salaryMonth && sal.year === salaryYear)}
					<div class="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between gap-4">
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
								{s.name.charAt(0).toUpperCase()}
							</div>
							<div class="min-w-0">
								<p class="font-semibold truncate">{s.name}</p>
								<p class="text-xs text-on-surface-variant capitalize">{s.role.replace('_', ' ')} · Base: {formatINR(s.basic_salary)}/mo</p>
							</div>
						</div>
						{#if existingSalary}
							<div class="text-right shrink-0">
								<p class="text-xs text-tertiary font-bold uppercase tracking-wide">Paid</p>
								<p class="font-bold">{formatINR(existingSalary.net_salary)}</p>
							</div>
							<button
								onclick={() => generateSalaryPdf(s, existingSalary)}
								title="Download salary slip"
								class="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary"
							>
								<span class="material-symbols-outlined text-xl">download</span>
							</button>
							<span class="material-symbols-outlined text-tertiary text-xl" style="font-variation-settings:'FILL' 1">check_circle</span>
						{:else}
							<button
								onclick={() => openSalaryModal(s)}
								class="shrink-0 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
							>
								Generate Salary
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else if activeTab === 'advances'}
		<div class="flex items-center justify-between mb-6">
			<div>
				<h3 class="text-lg font-bold text-on-surface">Advance Requests</h3>
				<p class="text-sm text-on-surface-variant">Salary advances and repayment tracking</p>
			</div>
			<button
				onclick={() => openAdvanceModal()}
				class="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-all"
			>
				<span class="material-symbols-outlined text-base">add</span>
				New Advance
			</button>
		</div>

		{#if advances.length === 0}
			<div class="bg-surface-container-lowest rounded-2xl p-10 text-center">
				<span class="material-symbols-outlined text-5xl text-on-surface-variant/30">account_balance</span>
				<h3 class="text-lg font-bold text-on-surface mt-4">No advance requests yet</h3>
				<p class="text-sm text-on-surface-variant mt-1">Create one using the button above</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each advances as adv}
					{@const staffName = getStaffName(adv.staff_id)}
					{@const remaining = adv.amount - (adv.total_repaid || 0)}
					<div class="bg-surface-container-lowest rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-bold text-on-surface">{staffName}</span>
								<span class="px-2 py-0.5 rounded-full text-[11px] font-bold
									{adv.status === 'pending' ? 'bg-warning/15 text-warning' :
									 adv.status === 'approved' ? 'bg-success/15 text-success' :
									 adv.status === 'repaid' ? 'bg-primary/10 text-primary' :
									 'bg-error/10 text-error'}">
									{adv.status.toUpperCase()}
								</span>
							</div>
							<p class="text-sm text-on-surface-variant mt-0.5 truncate">{adv.reason || 'No reason provided'}</p>
							<div class="flex gap-4 mt-2 text-xs text-on-surface-variant">
								<span>Requested: {formatDate(adv.request_date)}</span>
								{#if adv.repayment_installments > 0}
									<span>EMI: ₹{adv.repayment_amount} × {adv.repayment_installments}</span>
								{/if}
							</div>
							{#if adv.status === 'approved' && remaining > 0}
								<div class="mt-2 h-1.5 w-full max-w-xs bg-surface-container rounded-full overflow-hidden">
									<div class="h-full bg-primary rounded-full" style="width: {Math.round(((adv.total_repaid || 0) / adv.amount) * 100)}%"></div>
								</div>
								<p class="text-[11px] text-on-surface-variant mt-0.5">₹{adv.total_repaid || 0} repaid · ₹{remaining} remaining</p>
							{/if}
						</div>
						<div class="flex flex-col items-end gap-2 shrink-0">
							<span class="text-lg font-bold text-on-surface">₹{adv.amount.toLocaleString('en-IN')}</span>
							{#if adv.status === 'pending'}
								<div class="flex gap-2">
									<button
										onclick={() => handleApproveAdvance(adv.id, true)}
										class="px-3 py-1.5 bg-success/15 text-success rounded-lg text-xs font-bold hover:bg-success/25 transition-colors"
									>Approve</button>
									<button
										onclick={() => handleApproveAdvance(adv.id, false)}
										class="px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-bold hover:bg-error/20 transition-colors"
									>Reject</button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Advance Modal -->
	{#if showAdvanceModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showAdvanceModal = false}>
			<div class="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl" onclick={(e) => e.stopPropagation()}>
				<div class="p-6 border-b border-outline-variant/10 flex items-center justify-between">
					<h3 class="text-lg font-headline font-bold">New Advance Request</h3>
					<button onclick={() => showAdvanceModal = false} class="p-2 rounded-full hover:bg-surface-container transition-colors">
						<span class="material-symbols-outlined">close</span>
					</button>
				</div>
				<form onsubmit={(e) => { e.preventDefault(); saveAdvance(); }} class="p-6 space-y-4">
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Staff Member</span>
						<select bind:value={advanceStaffId} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all">
							{#each staff.filter(s => s.is_active && !s.is_deleted) as s}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</label>

					<label for="adv-amount" class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Amount (₹)</span>
						<input id="adv-amount" type="number" min="0" bind:value={advanceAmount} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all" />
					</label>

					<label for="adv-reason" class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Reason</span>
						<input id="adv-reason" type="text" bind:value={advanceReason} placeholder="e.g. Medical emergency" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 text-base text-on-surface font-medium transition-all" />
					</label>

					<div class="grid grid-cols-2 gap-4">
						<label for="adv-emi" class="block">
							<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Monthly EMI (₹)</span>
							<input id="adv-emi" type="number" min="0" bind:value={advanceRepayAmount} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all" />
						</label>
						<label for="adv-installments" class="block">
							<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Installments</span>
							<input id="adv-installments" type="number" min="1" bind:value={advanceInstallments} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all" />
						</label>
					</div>

					<div class="flex gap-3 pt-2">
						<button type="button" onclick={() => showAdvanceModal = false} class="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm">Cancel</button>
						<button type="submit" disabled={isSavingAdvance || advanceAmount <= 0} class="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50">
							{isSavingAdvance ? 'Saving...' : 'Create Request'}
						</button>
					</div>
				</form>
			</div>
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

<!-- Salary Generation Modal -->
{#if showSalaryModal && salaryPreview}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showSalaryModal = false}>
		<div class="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onclick={(e) => e.stopPropagation()}>
			<div class="p-6 border-b border-outline-variant/10 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-headline font-bold">Generate Salary</h3>
					<p class="text-sm text-on-surface-variant">{salaryPreview.name} · {formatMonthYear(salaryMonth, salaryYear)}</p>
				</div>
				<button onclick={() => showSalaryModal = false} class="p-2 rounded-full hover:bg-surface-container transition-colors">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<!-- Attendance breakdown -->
				<div class="bg-surface-container rounded-xl p-4 space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Working Days</span>
						<span class="font-semibold">{salaryPreview.workingDays}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Absent Days</span>
						<span class="font-semibold text-error">{salaryPreview.absent}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Late Days (½ deduction)</span>
						<span class="font-semibold text-warning">{salaryPreview.late}</span>
					</div>
					<div class="border-t border-outline-variant/20 pt-2 flex justify-between">
						<span class="text-on-surface-variant">Basic Salary</span>
						<span class="font-semibold">{formatINR(salaryPreview.basic)}</span>
					</div>
					<div class="flex justify-between text-error">
						<span>Absent Deduction</span>
						<span>− {formatINR(salaryPreview.absentDeduct)}</span>
					</div>
					<div class="flex justify-between text-error">
						<span>Late Deduction</span>
						<span>− {formatINR(salaryPreview.lateDeduct)}</span>
					</div>
					<div class="border-t border-outline-variant/20 pt-2 flex justify-between font-bold text-base">
						<span>Gross Salary</span>
						<span class="text-primary">{formatINR(salaryPreview.gross)}</span>
					</div>
				</div>

				<!-- Adjustments -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="sal-bonus" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1">Bonus</label>
						<input id="sal-bonus" type="number" bind:value={salaryBonus} min="0" class="w-full bg-surface-container-highest rounded-lg px-3 py-2 text-base font-semibold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0" />
					</div>
					<div>
						<label for="sal-deduct" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1">Extra Deductions</label>
						<input id="sal-deduct" type="number" bind:value={salaryExtraDeductions} min="0" class="w-full bg-surface-container-highest rounded-lg px-3 py-2 text-base font-semibold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0" />
					</div>
				</div>

				<div>
					<label for="sal-method" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1">Payment Method</label>
					<select id="sal-method" bind:value={salaryPaymentMethod} class="w-full bg-surface-container-highest rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none">
						<option value="cash">Cash</option>
						<option value="bank_transfer">Bank Transfer</option>
						<option value="upi">UPI</option>
					</select>
				</div>

				<div>
					<label for="sal-remarks" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1">Remarks</label>
					<input id="sal-remarks" type="text" bind:value={salaryRemarks} class="w-full bg-surface-container-highest rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Optional note" />
				</div>

				<!-- Net salary -->
				<div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
					<span class="font-bold text-on-surface">Net Salary</span>
					<span class="text-2xl font-extrabold text-primary">{formatINR(Math.max(0, salaryPreview.gross + salaryBonus - salaryExtraDeductions))}</span>
				</div>
			</div>

			<div class="p-6 pt-0 flex gap-3">
				<button onclick={() => showSalaryModal = false} class="flex-1 py-3 rounded-xl border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
					Cancel
				</button>
				<button onclick={saveSalary} disabled={isGeneratingSalary} class="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
					{isGeneratingSalary ? 'Saving...' : 'Save & Mark Paid'}
				</button>
			</div>
		</div>
	</div>
{/if}