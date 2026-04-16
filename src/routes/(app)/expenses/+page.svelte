<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { getBusiness, getExpenses, createExpense, updateExpense, softDeleteExpense, getExpensesByCategory, getExpenseTotal, restoreRecord } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINR, formatINRCompact, toPaise } from '$lib/utils/currency';
	import { formatDate, EXPENSE_CATEGORIES, today } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Expense } from '$lib/db/index';

	let expenses = $state<Expense[]>([]);
	let categoryBreakdown = $state<Record<string, number>>({});
	let totalExpense = $state(0);
	let businessId = $state('');
	let loading = $state(true);
	let showModal = $state(false);
	let selectedExpense = $state<Expense | null>(null);
	let showConfirm = $state(false);
	let expenseToDelete = $state<Expense | null>(null);
	let isSubmitting = $state(false);

	// Filters
	let searchQuery = $state('');
	let categoryFilter = $state('ALL');

	let filteredExpenses = $derived(
		expenses.filter(exp => {
			const matchSearch = searchQuery === '' || 
				exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
				exp.category.toLowerCase().includes(searchQuery.toLowerCase());
			const matchCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
			return matchSearch && matchCategory;
		})
	);

	// Pagination
	const PAGE_SIZE = 20;
	let currentPage = $state(1);
	let totalPages = $derived(Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE)));
	let paginatedExpenses = $derived(
		filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);
	// Reset page when filters change
	$effect(() => {
		searchQuery; categoryFilter;
		currentPage = 1;
	});

	// Form
	let newCategory = $state(EXPENSE_CATEGORIES[0]);
	let newDescription = $state('');
	let newAmount = $state('');
	let newDate = $state(today());
	let newNotes = $state('');
	let formReceipt = $state('');
	let receiptPreviewUrl = $state<string | null>(null);

	const categoryIcons: Record<string, string> = {
		'Medical Supplies': 'biotech',
		'Utilities': 'bolt',
		'Rent': 'apartment',
		'Staff Payroll': 'badge',
		'Equipment': 'build',
		'Maintenance': 'engineering',
		'Insurance': 'shield',
		'Marketing': 'campaign',
		'Travel': 'flight',
		'Others': 'more_horiz'
	};

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			expenses = await getExpenses(businessId);
			categoryBreakdown = await getExpensesByCategory(businessId);
			totalExpense = await getExpenseTotal(businessId);
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	function handleReceiptUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		
		if (file.size > 2 * 1024 * 1024) {
			toast.error('Image size must be less than 2MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			formReceipt = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	function openAddModal() {
		selectedExpense = null;
		newCategory = EXPENSE_CATEGORIES[0];
		newDescription = '';
		newAmount = '';
		newDate = today();
		newNotes = '';
		formReceipt = '';
		showModal = true;
	}

	function openEditModal(exp: Expense) {
		selectedExpense = exp;
		newCategory = exp.category;
		newDescription = exp.description;
		newAmount = (exp.amount / 100).toString();
		newDate = exp.expense_date.split('T')[0];
		newNotes = exp.notes || '';
		formReceipt = exp.receipt_base64 || '';
		showModal = true;
	}

	async function handleSaveExpense() {
		if (!newDescription.trim() || !newAmount) return;
		
		isSubmitting = true;
		try {
			const expData = {
				category: newCategory,
				description: newDescription.trim(),
				amount: toPaise(parseFloat(newAmount)),
				expense_date: newDate,
				notes: newNotes.trim(),
				receipt_base64: formReceipt
			};

			if (selectedExpense) {
				await updateExpense(selectedExpense.id, expData);
				toast.success($_('toast.expense_updated', { default: 'Expense updated' }));
			} else {
				await createExpense(businessId, expData);
				toast.success($_('toast.expense_recorded', { default: 'Expense recorded' }));
			}
			
			showModal = false;
			if ($activeBusinessId) await loadData($activeBusinessId);
		} finally {
			isSubmitting = false;
		}
	}

	function handleDeleteClick(exp: Expense) {
		expenseToDelete = exp;
		showConfirm = true;
	}

	async function confirmDelete() {
		if (!expenseToDelete) return;
		const deletedId = expenseToDelete.id;
		await softDeleteExpense(deletedId);
		showConfirm = false;
		expenseToDelete = null;
		if ($activeBusinessId) await loadData($activeBusinessId);
		toast.undoable('Expense deleted', async () => {
			await restoreRecord('expenses', deletedId);
			if ($activeBusinessId) await loadData($activeBusinessId);
		});
	}
</script>

<svelte:head>
	<title>Expenses | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
	<div>
		<h2 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight">{$_('expenses.title')}</h2>
		<p class="text-on-surface-variant mt-1 font-body">{$_('expenses.subtitle')}</p>
	</div>
	<button onclick={openAddModal} class="w-full md:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95">
		<span class="material-symbols-outlined">post_add</span>
		{$_('expenses.log_new')}
	</button>
</div>

<!-- Summary -->
<div class="grid grid-cols-12 gap-6 mb-10">
	<div class="col-span-12 lg:col-span-4 bg-primary p-8 rounded-xl text-on-primary shadow-xl shadow-primary/10 relative overflow-hidden">
		<div class="relative z-10">
			<p class="text-on-primary-container font-label text-xs font-bold uppercase tracking-widest mb-2 opacity-80">{$_('expenses.total')}</p>
			<h3 class="font-headline text-5xl font-black tracking-tighter">{formatINRCompact(totalExpense)}</h3>
		</div>
		<div class="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
	</div>

	<div class="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
		{#each Object.entries(categoryBreakdown).slice(0, 4) as [cat, amount]}
			<div class="bg-surface-container-lowest p-5 rounded-xl flex flex-col justify-between border border-outline-variant/10">
				<div class="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center mb-4">
					<span class="material-symbols-outlined text-primary">{categoryIcons[cat] || 'payments'}</span>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">{cat}</p>
					<p class="text-lg font-bold text-on-surface">{formatINRCompact(amount)}</p>
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Table -->
<div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/5">
	<div class="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-low">
		<h4 class="font-headline text-xl font-bold">{$_('expenses.recent_transactions')}</h4>
		
		<div class="flex items-center gap-3">
			<div class="w-full sm:w-64">
				<Input
					bind:value={searchQuery}
					placeholder="Search description..."
					icon="search"
				/>
			</div>
			<div class="w-40 relative">
				<select
					bind:value={categoryFilter}
					class="w-full h-[52px] bg-surface-container-highest border-b-2 border-transparent focus:border-primary rounded-t-lg px-4 font-bold text-on-surface outline-none transition-colors cursor-pointer appearance-none"
				>
					<option value="ALL">All Categories</option>
					{#each EXPENSE_CATEGORIES as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
				<span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
			</div>
		</div>
	</div>

	{#if filteredExpenses.length === 0}
		<EmptyState icon="payments" title={$_('expenses.no_expenses')} description={$_('expenses.no_expenses_desc')} />
	{:else}
		<div class="px-4 lg:mx-0 lg:px-0">
			<!-- Desktop Table -->
			<table class="hidden md:table w-full text-left border-collapse whitespace-nowrap min-w-[500px]">
				<thead>
					<tr class="bg-surface-container-low">
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_category')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_desc')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_date')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 text-right">{$_('expenses.table_amount')}</th>
						<th class="px-8 py-4"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container-low">
					{#each paginatedExpenses as exp}
						<tr class="hover:bg-surface-container-low/50 transition-colors group">
							<td class="px-8 py-5">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
										<span class="material-symbols-outlined text-primary text-sm">{categoryIcons[exp.category] || 'payments'}</span>
									</div>
									<span class="text-sm font-semibold text-on-surface">{exp.category}</span>
								</div>
							</td>
							<td class="px-8 py-5 text-sm text-on-surface-variant">
								<span class="block">{exp.description}</span>
								{#if exp.receipt_base64}
									<button aria-label="View Receipt" class="text-primary hover:underline text-xs flex items-center gap-1 mt-1 font-semibold" onclick={() => receiptPreviewUrl = exp.receipt_base64}>
										<span class="material-symbols-outlined text-[14px]">receipt_long</span> View Receipt
									</button>
								{/if}
							</td>
							<td class="px-8 py-5 text-sm text-on-surface-variant">{formatDate(exp.expense_date)}</td>
							<td class="px-8 py-5 text-sm font-bold text-on-surface text-right">{formatINR(exp.amount)}</td>
							<td class="px-8 py-5 text-right">
								<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button aria-label="Edit Expense" onclick={() => openEditModal(exp)} class="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
										<span class="material-symbols-outlined text-sm">edit</span>
									</button>
									<button aria-label="Delete Expense" onclick={() => handleDeleteClick(exp)} class="p-2 rounded-full hover:bg-error/10 transition-colors text-on-surface-variant hover:text-error">
										<span class="material-symbols-outlined text-sm">delete</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<!-- Mobile Cards -->
			<div class="md:hidden divide-y divide-surface-container-low">
				{#each paginatedExpenses as exp}
					<div class="py-4">
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0">
									<span class="material-symbols-outlined text-primary text-base">{categoryIcons[exp.category] || 'payments'}</span>
								</div>
								<div>
									<h4 class="text-sm font-bold text-on-surface">{exp.category}</h4>
									<p class="text-xs text-on-surface-variant">{formatDate(exp.expense_date)}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-base font-bold text-on-surface">{formatINR(exp.amount)}</p>
							</div>
						</div>
						
						<p class="text-sm text-on-surface-variant mb-2">{exp.description}</p>
						{#if exp.receipt_base64}
							<button aria-label="View Receipt" class="text-primary hover:underline text-xs flex items-center gap-1 mb-3 font-semibold w-fit" onclick={() => receiptPreviewUrl = exp.receipt_base64}>
								<span class="material-symbols-outlined text-[14px]">receipt_long</span> View Attached Receipt
							</button>
						{/if}
						
						<div class="flex items-center justify-end gap-2">
							<button aria-label="Edit Expense" onclick={() => openEditModal(exp)} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface-variant">
								Edit
							</button>
							<button aria-label="Delete Expense" onclick={() => handleDeleteClick(exp)} class="px-3 py-1.5 rounded-lg bg-error-container/30 hover:bg-error-container/70 transition-colors text-xs font-bold text-error">
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between px-6 py-4 border-t border-surface-container-low">
				<p class="text-xs text-on-surface-variant font-medium">
					Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length}
				</p>
				<div class="flex items-center gap-1">
					<button aria-label="Previous Page" disabled={currentPage <= 1} onclick={() => currentPage--} class="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-sm">chevron_left</span>
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
						{#if pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)}
							<button onclick={() => currentPage = pg} class="w-8 h-8 rounded-lg text-xs font-bold transition-all {currentPage === pg ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}">
								{pg}
							</button>
						{:else if pg === currentPage - 2 || pg === currentPage + 2}
							<span class="text-on-surface-variant/50 text-xs px-1">…</span>
						{/if}
					{/each}
					<button aria-label="Next Page" disabled={currentPage >= totalPages} onclick={() => currentPage++} class="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
						<span class="material-symbols-outlined text-sm">chevron_right</span>
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Add Expense Modal -->
<Modal show={showModal} title={selectedExpense ? 'Edit Expense' : $_('expenses.modal_title')} onclose={() => showModal = false}>
	<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleSaveExpense(); }}>
		<Select
			label={$_('expenses.label_category')}
			bind:value={newCategory}
			options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
		/>
		<Input
			label={$_('expenses.label_desc')}
			bind:value={newDescription}
			required
			placeholder={$_('expenses.placeholder_desc')}
		/>
		<div class="grid grid-cols-2 gap-4">
			<Input
				label={$_('expenses.label_amount')}
				bind:value={newAmount}
				type="number"
				required
				min="0"
				step="0.01"
				placeholder="0.00"
			/>
			<Input
				label={$_('expenses.label_date')}
				bind:value={newDate}
				type="date"
			/>
		</div>
		<div class="flex items-center gap-4 py-2">
			{#if formReceipt}
				<div class="relative group">
					<img src={formReceipt} alt="Receipt preview" class="w-16 h-16 rounded-xl object-cover border border-outline-variant/30" />
					<button type="button" aria-label="Remove Receipt" onclick={() => formReceipt = ''} class="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
						<span class="material-symbols-outlined text-[14px]">close</span>
					</button>
				</div>
			{:else}
				<div class="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center border border-dashed border-outline-variant/50">
					<span class="material-symbols-outlined text-on-surface-variant/50">receipt_long</span>
				</div>
			{/if}
			<div>
				<label class="btn btn-outline cursor-pointer border border-outline-variant/30 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors">
					<span class="material-symbols-outlined text-sm">upload</span>
					Attach Receipt
					<input type="file" accept="image/*" onchange={handleReceiptUpload} class="hidden" />
				</label>
				<p class="text-[10px] text-on-surface-variant mt-1.5">Max size 2MB. Optional.</p>
			</div>
		</div>
		<div class="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
			<button type="button" onclick={() => (showModal = false)} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm" disabled={isSubmitting}>{$_('expenses.btn_cancel')}</button>
			<button type="submit" disabled={isSubmitting} class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
				{#if isSubmitting}
					<span class="material-symbols-outlined text-sm animate-spin">refresh</span>
				{/if}
				{selectedExpense ? 'Save Changes' : $_('expenses.btn_log')}
			</button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	show={showConfirm}
	title="Delete Expense"
	message={expenseToDelete ? `Are you sure you want to delete this expense?` : ''}
	confirmText="Delete"
	destructive={true}
	onConfirm={confirmDelete}
	onCancel={() => { showConfirm = false; expenseToDelete = null; }}
/>

<!-- Receipt Preview Modal -->
{#if receiptPreviewUrl}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onclick={() => receiptPreviewUrl = null}>
		<div class="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center p-4" onclick={(e) => e.stopPropagation()}>
			<img src={receiptPreviewUrl} alt="Receipt Preview" class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
			<button class="absolute top-0 right-0 w-10 h-10 bg-surface-container-lowest text-on-surface rounded-full flex items-center justify-center hover:bg-surface-container transition-colors shadow-lg" onclick={() => receiptPreviewUrl = null}>
				<span class="material-symbols-outlined">close</span>
			</button>
		</div>
	</div>
{/if}
