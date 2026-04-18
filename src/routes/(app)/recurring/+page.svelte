<script lang="ts">
	import { getRecurringSchedules, deleteRecurringSchedule, updateRecurringSchedule, getPatients } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatDate } from '$lib/utils/helpers';
	import { formatINR } from '$lib/utils/currency';
	import { toast } from '$lib/stores/toast';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { RecurringSchedule } from '$lib/db/index';

	let schedules = $state<RecurringSchedule[]>([]);
	let patientMap = $state<Map<string, string>>(new Map());
	let loading = $state(true);

	const FREQ_LABEL: Record<string, string> = {
		WEEKLY: 'Weekly',
		MONTHLY: 'Monthly',
		QUARTERLY: 'Quarterly',
		YEARLY: 'Yearly'
	};

	const FREQ_ICON: Record<string, string> = {
		WEEKLY: 'view_week',
		MONTHLY: 'calendar_month',
		QUARTERLY: 'date_range',
		YEARLY: 'event_repeat'
	};

	async function loadData(bizId: string) {
		loading = true;
		const [all, patients] = await Promise.all([
			getRecurringSchedules(bizId),
			getPatients(bizId)
		]);
		schedules = all;
		patientMap = new Map(patients.map(p => [p.id, p.name]));
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	async function toggleActive(schedule: RecurringSchedule) {
		await updateRecurringSchedule(schedule.id, { is_active: !schedule.is_active });
		toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule resumed');
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	async function handleDelete(id: string) {
		await deleteRecurringSchedule(id);
		toast.success('Schedule deleted');
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	function getInvoiceTotal(schedule: RecurringSchedule): number {
		const data = schedule.template_invoice_data as any;
		return data?.grand_total ?? 0;
	}

	let activeCount = $derived(schedules.filter(s => s.is_active).length);
	let pausedCount = $derived(schedules.filter(s => !s.is_active).length);

	// Next due in 7 days
	let dueSoon = $derived.by(() => {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() + 7);
		return schedules.filter(s => s.is_active && new Date(s.next_run) <= cutoff).length;
	});
</script>

<svelte:head>
	<title>Recurring Schedules | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl lg:text-3xl font-headline font-extrabold text-on-surface tracking-tight">Recurring</h1>
		<p class="text-on-surface-variant mt-0.5 text-xs lg:text-sm">Auto-invoices for repeat {$activeTerminology.people.toLowerCase()}.</p>
	</div>
	<a
		href="/recurring/new"
		class="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
	>
		<span class="material-symbols-outlined text-lg">add</span>
		<span class="hidden sm:inline">New Schedule</span>
		<span class="sm:hidden">New</span>
	</a>
</div>

<!-- Stats -->
<div class="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 mb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:mx-0 lg:px-0 lg:mb-6">
	<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Active</p>
		<p class="text-xl font-headline font-bold text-primary">{activeCount}</p>
	</div>
	<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Paused</p>
		<p class="text-xl font-headline font-bold text-on-surface-variant">{pausedCount}</p>
	</div>
	<div class="shrink-0 w-32 lg:w-auto bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3 lg:p-5">
		<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Due soon</p>
		<p class="text-xl font-headline font-bold {dueSoon > 0 ? 'text-error' : 'text-on-surface'}">{dueSoon}</p>
	</div>
</div>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<span class="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
	</div>
{:else if schedules.length === 0}
	<EmptyState
		icon="autorenew"
		title="No recurring schedules"
		description="Create a recurring schedule to automatically generate invoices for repeat customers on a set frequency."
		actionLabel="Create First Schedule"
		actionHref="/recurring/new"
	/>
{:else}
	<div class="space-y-4">
		{#each schedules as schedule}
			{@const total = getInvoiceTotal(schedule)}
			{@const patientName = patientMap.get(schedule.patient_id) || 'Unknown'}
			{@const isOverdue = schedule.is_active && new Date(schedule.next_run) < new Date()}
			{@const isDueSoon = schedule.is_active && !isOverdue && (new Date(schedule.next_run).getTime() - Date.now()) < 7 * 86400000}

			<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4 {!schedule.is_active ? 'opacity-60' : ''}">
				<!-- Frequency badge -->
				<div class="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-primary text-xl">{FREQ_ICON[schedule.frequency] ?? 'repeat'}</span>
				</div>

				<!-- Info -->
				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2 mb-1">
						<span class="font-bold text-on-surface">{patientName}</span>
						<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">{FREQ_LABEL[schedule.frequency]}</span>
						{#if !schedule.is_active}
							<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-surface-container text-on-surface-variant">Paused</span>
						{:else if isOverdue}
							<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-error-container text-error">Overdue</span>
						{:else if isDueSoon}
							<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-warning-container text-on-warning-container">Due Soon</span>
						{/if}
					</div>
					<div class="flex flex-wrap gap-4 text-sm text-on-surface-variant">
						<span class="flex items-center gap-1">
							<span class="material-symbols-outlined text-[14px]">event</span>
							Next: <strong class="text-on-surface ml-1">{formatDate(schedule.next_run)}</strong>
						</span>
						{#if total > 0}
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[14px]">payments</span>
								<strong class="text-on-surface">{formatINR(total)}</strong>
							</span>
						{/if}
						<span class="flex items-center gap-1">
							<span class="material-symbols-outlined text-[14px]">schedule</span>
							Created {formatDate(schedule.created_at)}
						</span>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2 shrink-0">
					<button
						onclick={() => toggleActive(schedule)}
						class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all
							{schedule.is_active
								? 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
								: 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'}"
						title={schedule.is_active ? 'Pause schedule' : 'Resume schedule'}
					>
						<span class="material-symbols-outlined text-[16px]">{schedule.is_active ? 'pause' : 'play_arrow'}</span>
						{schedule.is_active ? 'Pause' : 'Resume'}
					</button>
					<button
						onclick={() => handleDelete(schedule.id)}
						class="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-all"
						title="Delete schedule"
					>
						<span class="material-symbols-outlined text-[18px]">delete</span>
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
