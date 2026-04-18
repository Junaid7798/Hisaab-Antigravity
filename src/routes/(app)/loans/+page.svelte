<script lang="ts">
	import { createLoan, getLoans, repayLoan } from '$lib/db/crud-extended';
	import { getStaff } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINR, toRupees } from '$lib/utils/currency';
	import { formatDate, today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import type { Loan } from '$lib/db/index';

	type StaffMember = { id: string; name: string };

	let loans = $state<Loan[]>([]);
	let staff = $state<StaffMember[]>([]);
	let loading = $state(true);

	// Modal state
	let showNewLoanModal = $state(false);
	let showRepayModal = $state(false);
	let selectedLoan = $state<Loan | null>(null);

	// New loan form
	let loanStaffId = $state('');
	let loanType = $state<Loan['loan_type']>('personal');
	let loanPrincipal = $state('');
	let loanRate = $state('0');
	let loanTenure = $state('12');
	let loanStartDate = $state(today());
	let isSaving = $state(false);

	// Repay form
	let repayAmount = $state('');

	// EMI preview
	let emiPreview = $derived.by(() => {
		const p = Number(loanPrincipal) * 100; // to paise
		const r = Number(loanRate) / 12 / 100;
		const n = Number(loanTenure);
		if (!p || n <= 0) return null;
		if (r === 0) return { emi: p / n, total: p, interest: 0 };
		const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
		const total = emi * n;
		return { emi, total, interest: total - p };
	});

	// Filter state
	let filterStatus = $state<'all' | 'active' | 'completed' | 'defaulted'>('all');

	let filteredLoans = $derived(
		filterStatus === 'all' ? loans : loans.filter(l => l.status === filterStatus)
	);

	let totalPrincipal = $derived(loans.filter(l => l.status === 'active').reduce((s, l) => s + l.principal_amount, 0));
	let totalRemaining = $derived(loans.filter(l => l.status === 'active').reduce((s, l) => s + l.amount_remaining, 0));

	const LOAN_TYPE_LABELS: Record<string, string> = {
		personal: 'Personal',
		salary_advance: 'Salary Advance',
		emergency: 'Emergency',
		other: 'Other'
	};

	const STATUS_COLOR: Record<string, string> = {
		active: 'bg-primary/10 text-primary',
		completed: 'bg-tertiary-container text-on-tertiary-container',
		defaulted: 'bg-error-container text-error'
	};

	async function loadData(bizId: string) {
		loading = true;
		const [allLoans, allStaff] = await Promise.all([
			getLoans(bizId),
			getStaff(bizId)
		]);
		loans = allLoans;
		staff = allStaff.map(s => ({ id: s.id, name: s.name }));
		if (staff.length > 0 && !loanStaffId) loanStaffId = staff[0].id;
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	async function handleCreateLoan() {
		if (!$activeBusinessId || !loanStaffId || !loanPrincipal) return;
		isSaving = true;
		try {
			const principal = Math.round(Number(loanPrincipal) * 100);
			await createLoan($activeBusinessId, loanStaffId, principal, Number(loanRate), Number(loanTenure));
			toast.success('Loan created successfully');
			showNewLoanModal = false;
			loanPrincipal = '';
			loanRate = '0';
			loanTenure = '12';
			await loadData($activeBusinessId);
		} catch (e) {
			toast.error('Failed to create loan');
		} finally {
			isSaving = false;
		}
	}

	async function handleRepay() {
		if (!selectedLoan || !repayAmount) return;
		isSaving = true;
		try {
			const amt = Math.round(Number(repayAmount) * 100);
			await repayLoan(selectedLoan.id, amt);
			toast.success('Payment recorded');
			showRepayModal = false;
			repayAmount = '';
			selectedLoan = null;
			if ($activeBusinessId) await loadData($activeBusinessId);
		} catch (e) {
			toast.error('Failed to record payment');
		} finally {
			isSaving = false;
		}
	}

	function openRepay(loan: Loan) {
		selectedLoan = loan;
		repayAmount = String(toRupees(loan.monthly_emi).toFixed(2));
		showRepayModal = true;
	}

	function staffName(id: string) {
		return staff.find(s => s.id === id)?.name || 'Unknown';
	}

	function progressPct(loan: Loan) {
		if (loan.total_amount === 0) return 0;
		return Math.min(100, Math.round((loan.amount_paid / loan.total_amount) * 100));
	}
</script>

<svelte:head>
	<title>Loans & EMI | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl lg:text-3xl font-headline font-extrabold text-on-surface tracking-tight">Loans & EMI</h1>
		<p class="text-on-surface-variant mt-0.5 text-xs lg:text-sm">Staff loans and repayment schedules.</p>
	</div>
	<button
		onclick={() => showNewLoanModal = true}
		class="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
	>
		<span class="material-symbols-outlined text-lg">add</span>
		<span class="hidden sm:inline">New Loan</span>
		<span class="sm:hidden">New</span>
	</button>
</div>

<!-- Stats -->
{#if !loading}
	<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-6">
		<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Active</p>
			<p class="text-xl font-headline font-bold text-primary">{loans.filter(l => l.status === 'active').length}</p>
		</div>
		<div class="shrink-0 w-36 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Disbursed</p>
			<p class="text-xl font-headline font-bold text-on-surface">{formatINR(totalPrincipal)}</p>
		</div>
		<div class="shrink-0 w-36 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Outstanding</p>
			<p class="text-xl font-headline font-bold text-error">{formatINR(totalRemaining)}</p>
		</div>
	</div>
{/if}

<!-- Filter -->
<div class="flex gap-2 mb-6 flex-wrap">
	{#each ['all', 'active', 'completed', 'defaulted'] as status}
		<button
			onclick={() => filterStatus = status as any}
			class="px-4 py-2 rounded-xl text-sm font-semibold transition-all
				{filterStatus === status ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}"
		>
			{status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
		</button>
	{/each}
</div>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<span class="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
	</div>
{:else if filteredLoans.length === 0}
	<EmptyState
		icon="account_balance"
		title="No loans found"
		description="Create a loan to track staff advances and repayments."
		actionLabel="Create Loan"
	/>
{:else}
	<div class="space-y-4">
		{#each filteredLoans as loan}
			{@const pct = progressPct(loan)}
			<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
				<div class="flex flex-col md:flex-row md:items-start gap-4">
					<!-- Left: Info -->
					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-2 mb-2">
							<span class="font-bold text-on-surface text-base">{staffName(loan.staff_id)}</span>
							<span class="text-xs px-2 py-0.5 rounded-full font-semibold {STATUS_COLOR[loan.status] ?? ''}">{loan.status}</span>
							<span class="text-xs px-2 py-0.5 rounded-full border border-outline-variant text-on-surface-variant">{LOAN_TYPE_LABELS[loan.loan_type] ?? loan.loan_type}</span>
						</div>

						<div class="flex flex-wrap gap-4 text-sm text-on-surface-variant mb-4">
							<span>Principal: <strong class="text-on-surface">{formatINR(loan.principal_amount)}</strong></span>
							<span>EMI: <strong class="text-on-surface">{formatINR(loan.monthly_emi)}/mo</strong></span>
							<span>Tenure: <strong class="text-on-surface">{loan.tenure_months} months</strong></span>
							{#if loan.interest_rate > 0}
								<span>Rate: <strong class="text-on-surface">{loan.interest_rate}%</strong></span>
							{/if}
							<span>End: <strong class="text-on-surface">{formatDate(loan.end_date)}</strong></span>
						</div>

						<!-- Progress bar -->
						<div class="space-y-1.5">
							<div class="flex justify-between text-xs text-on-surface-variant">
								<span>Paid: {formatINR(loan.amount_paid)}</span>
								<span class="font-semibold text-on-surface">{pct}%</span>
								<span>Remaining: {formatINR(loan.amount_remaining)}</span>
							</div>
							<div class="h-2 bg-surface-container rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500
										{loan.status === 'completed' ? 'bg-tertiary' : loan.status === 'defaulted' ? 'bg-error' : 'bg-primary'}"
									style="width: {pct}%"
								></div>
							</div>
						</div>
					</div>

					<!-- Right: Actions -->
					{#if loan.status === 'active'}
						<button
							onclick={() => openRepay(loan)}
							class="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:opacity-90 transition-all shrink-0 flex items-center gap-2"
						>
							<span class="material-symbols-outlined text-sm">payments</span>
							Record Payment
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- New Loan Modal -->
<Modal show={showNewLoanModal} title="Create New Loan" onclose={() => showNewLoanModal = false}>
	<form class="p-6 space-y-5 overflow-y-auto max-h-[80vh]" onsubmit={(e) => { e.preventDefault(); handleCreateLoan(); }}>
		<Select
			label="Staff Member"
			bind:value={loanStaffId}
			options={staff.map(s => ({ value: s.id, label: s.name }))}
		/>
		<Select
			label="Loan Type"
			bind:value={loanType}
			options={[
				{ value: 'personal', label: 'Personal Loan' },
				{ value: 'salary_advance', label: 'Salary Advance' },
				{ value: 'emergency', label: 'Emergency Loan' },
				{ value: 'other', label: 'Other' }
			]}
		/>

		<div class="grid grid-cols-2 gap-4">
			<Input label="Principal Amount (₹)" bind:value={loanPrincipal} type="number" min="1" step="100" required />
			<Input label="Interest Rate (% p.a.)" bind:value={loanRate} type="number" min="0" max="100" step="0.1" />
		</div>

		<div class="grid grid-cols-2 gap-4">
			<Input label="Tenure (months)" bind:value={loanTenure} type="number" min="1" max="120" step="1" required />
			<Input label="Start Date" bind:value={loanStartDate} type="date" required />
		</div>

		<!-- EMI Preview -->
		{#if emiPreview}
			<div class="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
				<p class="text-xs font-bold text-primary uppercase tracking-wider">EMI Preview</p>
				<div class="flex justify-between items-center">
					<span class="text-sm text-on-surface-variant">Monthly EMI</span>
					<span class="font-headline font-bold text-primary text-lg">{formatINR(emiPreview.emi)}</span>
				</div>
				<div class="flex justify-between text-xs text-on-surface-variant">
					<span>Total Amount</span>
					<span>{formatINR(emiPreview.total)}</span>
				</div>
				{#if emiPreview.interest > 0}
					<div class="flex justify-between text-xs text-on-surface-variant">
						<span>Total Interest</span>
						<span>{formatINR(emiPreview.interest)}</span>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
			<button type="button" onclick={() => showNewLoanModal = false} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">Cancel</button>
			<button type="submit" disabled={isSaving} class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md disabled:opacity-50">
				{isSaving ? 'Creating...' : 'Create Loan'}
			</button>
		</div>
	</form>
</Modal>

<!-- Repay Modal -->
<Modal show={showRepayModal} title="Record EMI Payment" onclose={() => { showRepayModal = false; selectedLoan = null; }}>
	{#if selectedLoan}
		<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleRepay(); }}>
			<div class="bg-surface-container-low rounded-xl p-4 space-y-1">
				<p class="text-sm font-bold text-on-surface">{staffName(selectedLoan.staff_id)}</p>
				<p class="text-xs text-on-surface-variant">Outstanding: <strong>{formatINR(selectedLoan.amount_remaining)}</strong> • Monthly EMI: <strong>{formatINR(selectedLoan.monthly_emi)}</strong></p>
			</div>

			<Input label="Payment Amount (₹)" bind:value={repayAmount} type="number" min="1" step="100" required />

			<div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
				<button type="button" onclick={() => { showRepayModal = false; selectedLoan = null; }} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">Cancel</button>
				<button type="submit" disabled={isSaving} class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md disabled:opacity-50">
					{isSaving ? 'Saving...' : 'Save Payment'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
