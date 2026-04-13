<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import StatusChip from '$lib/components/StatusChip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { getPatient, getInvoicesByPatient } from '$lib/db/crud';
	import { formatINR, formatINRCompact } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/helpers';
	import type { Patient, Invoice } from '$lib/db/index';

	let patient = $state<Patient | null>(null);
	let invoices = $state<Invoice[]>([]);
	let loading = $state(true);

	let totalBilled = $derived(invoices.reduce((s, i) => s + i.grand_total, 0));
	let outstanding = $derived(invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + i.grand_total, 0));

	onMount(async () => {
		const id = $page.params.id as string;
		if (!id) return;
		patient = (await getPatient(id)) || null;
		if (patient) {
			invoices = await getInvoicesByPatient(patient.id);
		}
		loading = false;
	});
</script>

<svelte:head>
	<title>{patient?.name || 'Patient'} | Hisaab</title>
</svelte:head>

{#if !patient && !loading}
	<EmptyState icon="person_off" title={$_('patients.not_found')} description={$_('patients.not_found_desc')} actionLabel={$_('patients.back_to_list')} actionHref="/patients" />
{:else if patient}
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center gap-6 mb-10">
		<div class="flex items-center gap-6">
			<PatientAvatar name={patient.name} size="lg" />
			<div>
				<h1 class="text-3xl font-headline font-extrabold text-on-surface">{patient.name}</h1>
				<p class="text-on-surface-variant text-sm mt-1">{patient.phone || $_('patients.no_phone')} • {patient.address || $_('patients.no_address')}</p>
			</div>
		</div>
		<div class="md:ml-auto w-full md:w-auto mt-2 md:mt-0">
			<a href="/invoices/new?patient_id={patient.id}" class="w-full md:w-auto px-5 py-3 md:py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2">
				<span class="material-symbols-outlined text-sm">add</span>
				{$_('actions.new_invoice')}
			</a>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.total_billed')}</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{formatINRCompact(totalBilled)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.outstanding')}</p>
			<p class="text-2xl font-headline font-bold text-error">{formatINRCompact(outstanding)}</p>
		</div>
		<div class="bg-surface-container-lowest p-5 md:p-6 rounded-xl border border-outline-variant/20 shadow-sm">
			<p class="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.invoices')}</p>
			<p class="text-2xl font-headline font-bold text-secondary">{invoices.length}</p>
		</div>
	</div>

	<!-- Invoice History -->
	<div class="bg-surface-container-lowest rounded-xl overflow-hidden">
		<div class="p-6 border-b border-surface-container">
			<h3 class="font-headline font-bold text-xl">{$_('patients.invoice_history')}</h3>
		</div>

		{#if invoices.length === 0}
			<EmptyState icon="receipt_long" title={$_('patients.no_history')} description={$_('patients.no_history_desc')} />
		{:else}
			<div class="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
				<table class="w-full text-left whitespace-nowrap">
					<thead>
						<tr class="bg-surface-container-low text-on-surface-variant">
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('patients.table_inv_num')}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_date')}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">{$_('dashboard.table_amount')}</th>
							<th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{$_('dashboard.table_status')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container-low">
						{#each invoices as inv}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="px-6 py-4 text-sm font-semibold">{inv.invoice_number}</td>
								<td class="px-6 py-4 text-sm text-on-surface-variant">{formatDate(inv.issue_date)}</td>
								<td class="px-6 py-4 text-sm font-bold text-right">{formatINR(inv.grand_total)}</td>
								<td class="px-6 py-4"><StatusChip status={inv.status} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
