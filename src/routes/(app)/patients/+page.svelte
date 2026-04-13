<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getBusiness, getPatients, createPatient, countPatients, getOutstandingTotal } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import { formatINRCompact } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Patient } from '$lib/db/index';

	let patients = $state<Patient[]>([]);
	let businessId = $state('');
	let totalPatients = $state(0);
	let totalOutstanding = $state(0);
	let loading = $state(true);
	let showModal = $state(false);
	let searchQuery = $state('');

	// New patient form
	let newName = $state('');
	let newPhone = $state('');
	let newAddress = $state('');
	let newStateCode = $state('27');

	async function loadData(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			businessId = biz.id;
			patients = await getPatients(businessId);
			totalPatients = await countPatients(businessId);
			totalOutstanding = await getOutstandingTotal(businessId);
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadData($activeBusinessId);
		}
	});

	async function handleAddPatient() {
		if (!newName.trim()) return;
		await createPatient(businessId, {
			name: newName.trim(),
			phone: newPhone.trim(),
			address: newAddress.trim(),
			state_code: newStateCode
		});
		
		toast.success($_('toast.patient_added', { default: 'Patient registered successfully' }));
		
		newName = '';
		newPhone = '';
		newAddress = '';
		newStateCode = '27';
		showModal = false;
		if ($activeBusinessId) await loadData($activeBusinessId);
	}

	let filteredPatients = $derived(
		searchQuery
			? patients.filter(
					(p) =>
						p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						p.phone.includes(searchQuery)
				)
			: patients
	);
</script>

<svelte:head>
	<title>Patients | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
	<div>
		<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">{$_('patients.title')}</h1>
		<p class="text-on-surface-variant font-body mt-1">{$_('patients.subtitle')}</p>
	</div>
	<button
		onclick={() => (showModal = true)}
		class="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold shadow-md inline-flex hover:opacity-90 transition-all active:scale-95"
	>
		<span class="material-symbols-outlined">person_add</span>
		<span>{$_('patients.add_new')}</span>
	</button>
</div>

<!-- Stats -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
	<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.total')}</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{totalPatients.toLocaleString('en-IN')}</p>
		</div>
		<div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
			<span class="material-symbols-outlined">group</span>
		</div>
	</div>
	<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.total_outstanding')}</p>
			<p class="text-2xl font-headline font-bold text-error">{formatINRCompact(totalOutstanding)}</p>
		</div>
		<div class="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
			<span class="material-symbols-outlined">account_balance_wallet</span>
		</div>
	</div>
	<div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{$_('patients.registered_today')}</p>
			<p class="text-2xl font-headline font-bold text-secondary">
				{patients.filter((p) => p.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
			</p>
		</div>
		<div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
			<span class="material-symbols-outlined">calendar_today</span>
		</div>
	</div>
</div>

<!-- Search -->
<div class="mb-6 max-w-md">
	<Input
		bind:value={searchQuery}
		placeholder={$_('patients.search_placeholder')}
		icon="search"
	/>
</div>

<!-- Patient Table -->
<div class="bg-surface-container-lowest rounded-xl overflow-hidden">
	{#if filteredPatients.length === 0 && !loading}
		<EmptyState
			icon="group"
			title={searchQuery ? $_('patients.no_match') : $_('patients.no_patients')}
			description={searchQuery ? $_('patients.no_match_desc') : $_('patients.no_patients_desc')}
		/>
	{:else}
		<div class="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
			<table class="w-full border-collapse whitespace-nowrap">
				<thead>
					<tr class="text-left bg-surface-container-low/30">
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$_('patients.table_name')}</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$_('patients.table_contact')}</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$_('patients.table_state')}</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$_('patients.table_registered')}</th>
						<th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">{$_('patients.table_actions')}</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredPatients as patient}
						<tr class="hover:bg-surface-container-low transition-colors group">
							<td class="px-6 py-5">
								<div class="flex items-center gap-3">
									<PatientAvatar name={patient.name} />
									<div>
										<p class="font-bold text-on-surface">{patient.name}</p>
										<p class="text-xs text-on-surface-variant">{$_('patients.id')}: {patient.id.slice(0, 8)}</p>
									</div>
								</div>
							</td>
							<td class="px-6 py-5 text-sm text-on-surface">{patient.phone || '—'}</td>
							<td class="px-6 py-5 text-sm text-on-surface-variant">{patient.state_code}</td>
							<td class="px-6 py-5 text-sm text-on-surface-variant">{formatDate(patient.created_at)}</td>
							<td class="px-6 py-5 text-right">
								<a href="/patients/{patient.id}" class="text-primary text-sm font-semibold hover:underline flex items-center justify-end gap-1">
									{$_('patients.view')} <span class="material-symbols-outlined text-xs">chevron_right</span>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Add Patient Modal -->
<Modal show={showModal} title={$_('patients.modal_title')} onclose={() => showModal = false}>
	<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleAddPatient(); }}>
		<Input
			label={$_('patients.label_name')}
			bind:value={newName}
			required
			placeholder={$_('patients.placeholder_name')}
		/>
		<Input
			label={$_('patients.label_phone')}
			bind:value={newPhone}
			type="tel"
			placeholder={$_('patients.placeholder_phone')}
		/>
		<Select
			label={$_('patients.label_state')}
			bind:value={newStateCode}
			options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
		/>
		<div class="space-y-1.5">
			<label class="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">{$_('patients.label_address')}</label>
			<textarea bind:value={newAddress} rows="2" placeholder={$_('patients.placeholder_address')} class="w-full bg-surface-container-highest border-b border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"></textarea>
		</div>
		<div class="flex justify-end gap-3 pt-4">
			<button type="button" onclick={() => (showModal = false)} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">{$_('patients.btn_cancel')}</button>
			<button type="submit" class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md">{$_('patients.btn_add')}</button>
		</div>
	</form>
</Modal>
