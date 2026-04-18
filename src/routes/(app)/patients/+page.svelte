<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PatientAvatar from '$lib/components/PatientAvatar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getBusiness, createPatient, countPatients, getOutstandingTotal } from '$lib/db/crud';
	import { getCachedCustomers } from '$lib/utils/cache';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINRCompact } from '$lib/utils/currency';
	import { formatDate, INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import type { Patient } from '$lib/db/index';
	import { insights } from '$lib/stores/insights';

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
			patients = await getCachedCustomers(businessId);
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
		
		toast.success(`${$activeTerminology.person} registered successfully`);
		
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
	<title>{$activeTerminology.people} | Hisaab</title>
</svelte:head>

{#if $insights.find(i => i.id === 'churn_risk')}
	{@const churnAlert = $insights.find(i => i.id === 'churn_risk')!}
	<div class="mb-5 bg-tertiary-container/50 border-tertiary/20 border rounded-xl p-3 flex items-center gap-3">
		<span class="material-symbols-outlined text-tertiary text-lg shrink-0" style="font-variation-settings:'FILL' 1">{churnAlert.icon}</span>
		<div class="flex-1 min-w-0">
			<p class="text-sm font-bold text-on-surface">{churnAlert.title}</p>
			<p class="text-xs text-on-surface-variant">{churnAlert.description}</p>
		</div>
		<a href="/insights" class="text-xs font-bold text-primary whitespace-nowrap shrink-0">Details →</a>
	</div>
{/if}

<!-- Header -->
<div class="flex items-center justify-between gap-3 mb-4 lg:mb-8">
	<div>
		<h1 class="text-xl lg:text-3xl font-headline font-extrabold text-on-surface tracking-tight">{$activeTerminology.people}</h1>
		<p class="text-on-surface-variant font-body mt-0.5 text-xs lg:text-base">Manage your {$activeTerminology.people.toLowerCase()} and outstanding balances.</p>
	</div>
	<button
		onclick={() => (showModal = true)}
		class="shrink-0 flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl font-semibold shadow-md hover:opacity-90 transition-all active:scale-95 text-sm"
	>
		<span class="material-symbols-outlined text-lg">person_add</span>
		<span class="hidden sm:inline">Add {$activeTerminology.person}</span>
		<span class="sm:hidden">Add</span>
	</button>
</div>

<!-- Stats: 3-column grid -->
<div class="grid grid-cols-3 gap-2 mb-4 lg:gap-4 lg:mb-8">
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-primary text-sm" aria-hidden="true">group</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Total</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-on-surface truncate">{totalPatients.toLocaleString('en-IN')}</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block truncate">{$activeTerminology.people}</p>
	</div>
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-error text-sm" aria-hidden="true">account_balance_wallet</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Due</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-error truncate">{formatINRCompact(totalOutstanding)}</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block truncate">Outstanding</p>
	</div>
	<div class="bg-surface-container-lowest p-3 lg:p-6 rounded-xl border border-outline-variant/15">
		<div class="flex items-center gap-1 mb-1">
			<span class="material-symbols-outlined text-secondary text-sm" aria-hidden="true">calendar_today</span>
			<p class="text-[9px] lg:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Today</p>
		</div>
		<p class="text-base lg:text-xl font-headline font-bold text-secondary truncate">
			{patients.filter((p) => p.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
		</p>
		<p class="text-[10px] text-on-surface-variant mt-0.5 hidden sm:block truncate">Registered</p>
	</div>
</div>

<!-- Search -->
<div class="mb-4 max-w-md">
	<Input
		bind:value={searchQuery}
		placeholder={`Search ${$activeTerminology.people.toLowerCase()} by name or phone...`}
		icon="search"
	/>
</div>

<!-- Patient Table -->
<div class="bg-surface-container-lowest rounded-xl overflow-hidden">
	{#if filteredPatients.length === 0 && !loading}
		<EmptyState
			icon="group"
			title={searchQuery ? 'No match found' : `No ${$activeTerminology.people.toLowerCase()} found`}
			description={searchQuery ? 'Try adjusting your search criteria.' : `Add your first ${$activeTerminology.person.toLowerCase()} to get started.`}
		/>
	{:else}
		<!-- Mobile list (compact cards) -->
		<div class="md:hidden divide-y divide-surface-container-low">
			{#each filteredPatients as patient}
				<a href="/patients/{patient.id}" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors active:scale-[0.99]">
					<PatientAvatar name={patient.name} size="sm" />
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-on-surface truncate">{patient.name}</p>
						<p class="text-xs text-on-surface-variant">{patient.phone || '—'}</p>
					</div>
					<span class="material-symbols-outlined text-on-surface-variant/50 text-lg shrink-0">chevron_right</span>
				</a>
			{/each}
		</div>
		<!-- Desktop table -->
		<div class="hidden md:block overflow-x-auto">
			<table class="w-full border-collapse whitespace-nowrap">
				<thead>
					<tr class="text-left bg-surface-container-low/30">
						<th class="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{$activeTerminology.person} Name</th>
						<th class="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Contact</th>
						<th class="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">State</th>
						<th class="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Registered</th>
						<th class="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredPatients as patient}
						<tr class="hover:bg-surface-container-low transition-colors group">
							<td class="px-6 py-4">
								<div class="flex items-center gap-3">
									<PatientAvatar name={patient.name} />
									<div>
										<p class="font-bold text-sm text-on-surface">{patient.name}</p>
										<p class="text-xs text-on-surface-variant">ID: {patient.id.slice(0, 8)}</p>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 text-sm text-on-surface">{patient.phone || '—'}</td>
							<td class="px-6 py-4 text-sm text-on-surface-variant">{patient.state_code}</td>
							<td class="px-6 py-4 text-sm text-on-surface-variant">{formatDate(patient.created_at)}</td>
							<td class="px-6 py-4 text-right">
								<a href="/patients/{patient.id}" class="text-primary text-sm font-semibold hover:underline flex items-center justify-end gap-1">
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

<!-- Add Patient Modal -->
<Modal show={showModal} title={`Add New ${$activeTerminology.person}`} onclose={() => showModal = false}>
	<form class="p-6 space-y-5" onsubmit={(e) => { e.preventDefault(); handleAddPatient(); }}>
		<Input
			label={`Full Name`}
			bind:value={newName}
			required
			placeholder={`E.g. Rahul Sharma`}
		/>
		<Input
			label={`Phone Number`}
			bind:value={newPhone}
			type="tel"
			placeholder="10-digit mobile number"
		/>
		<Select
			label={`State`}
			bind:value={newStateCode}
			options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
		/>
		<label class="space-y-1.5 w-full">
			<span class="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">Address (Optional)</span>
			<textarea bind:value={newAddress} rows="2" placeholder="Full address..." class="w-full bg-surface-container-highest border-b border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"></textarea>
		</label>
		<div class="flex justify-end gap-3 pt-4">
			<button type="button" onclick={() => (showModal = false)} class="px-6 py-2.5 text-on-surface-variant font-semibold text-sm">Cancel</button>
			<button type="submit" class="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md">Add {$activeTerminology.person}</button>
		</div>
	</form>
</Modal>
