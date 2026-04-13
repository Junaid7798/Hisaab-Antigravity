<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getBusiness, getExpenses, createExpense, getExpensesByCategory, getExpenseTotal } from '$lib/db/crud';
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

	// Form
	let newCategory = $state('Medical Supplies');
	let newDescription = $state('');
	let newAmount = $state('');
	let newDate = $state(today());
	let newNotes = $state('');

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

	async function handleAddExpense() {
		if (!newDescription.trim() || !newAmount) return;
		await createExpense(businessId, {
			category: newCategory,
			description: newDescription.trim(),
			amount: toPaise(parseFloat(newAmount)),
			expense_date: newDate,
			notes: newNotes.trim()
		});
		newAmount = '';
		newNotes = '';
		showModal = false;
		toast.success($_('toast.expense_recorded', { default: 'Expense recorded' }));
		if ($activeBusinessId) await loadData($activeBusinessId);
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
	<button onclick={() => (showModal = true)} class="w-full md:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95">
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
	<div class="px-8 py-6 flex justify-between items-center border-b border-surface-container-low">
		<h4 class="font-headline text-xl font-bold">{$_('expenses.recent_transactions')}</h4>
	</div>

	{#if expenses.length === 0}
		<EmptyState icon="payments" title={$_('expenses.no_expenses')} description={$_('expenses.no_expenses_desc')} />
	{:else}
		<div class="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
			<table class="w-full text-left border-collapse whitespace-nowrap min-w-[500px]">
				<thead>
					<tr class="bg-surface-container-low">
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_category')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_desc')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{$_('expenses.table_date')}</th>
						<th class="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 text-right">{$_('expenses.table_amount')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container-low">
					{#each expenses as exp}
						<tr class="hover:bg-surface-container-low/50 transition-colors">
							<td class="px-8 py-5">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
										<span class="material-symbols-outlined text-primary text-sm">{categoryIcons[exp.category] || 'payments'}</span>
									</div>
									<span class="text-sm font-semibold text-on-surface">{exp.category}</span>
								</div>
							</td>
							<td class="px-8 py-5 text-sm text-on-surface-variant">{exp.description}</td>
							<td class="px-8 py-5 text-sm text-on-surface-variant">{formatDate(exp.expense_date)}</td>
							<td class="px-8 py-5 text-sm font-bold text-on-surface text-right">{formatINR(exp.amount)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Add Expense Modal -->
<Modal show={showModal} title={$_('expenses.modal_title')} onclose={() => showModal = false}>
	<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleAddExpense(); }}>
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
		<div class="flex justify-end gap-3 pt-4">
			<button type="button" onclick={() => (showModal = false)} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">{$_('expenses.btn_cancel')}</button>
			<button type="submit" class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md">{$_('expenses.btn_log')}</button>
		</div>
	</form>
</Modal>
