<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, updateBusiness, createBusiness } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { theme } from '$lib/stores/theme';
	import type { Business } from '$lib/db/index';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { exportDatabaseToJSON, importDatabaseFromJSON, triggerDownload, wipeDatabase } from '$lib/utils/export';
	import { categoryGroups, getTerminology, type BusinessCategory, type TaxRegistrationType } from '$lib/utils/terminology';

	let showWipeConfirm = $state(false);
	let importing = $state(false);

	async function handleBackup() {
		try {
			const json = await exportDatabaseToJSON();
			const date = new Date().toISOString().split('T')[0];
			triggerDownload(json, `hisaab-backup-${date}.json`);
			toast.success($_('toast.backup_success', { default: 'Backup downloaded successfully' }));
		} catch {
			toast.error($_('toast.backup_fail', { default: 'Failed to create backup' }));
		}
	}

	function handleRestoreClick() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e: Event) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			importing = true;
			try {
				const text = await file.text();
				const ok = await importDatabaseFromJSON(text);
				if (ok) {
					toast.success($_('toast.restore_success', { default: 'Data restored! Reloading...' }));
					setTimeout(() => location.reload(), 1200);
				} else {
					toast.error($_('toast.restore_fail', { default: 'Invalid backup file' }));
				}
			} catch {
				toast.error($_('toast.restore_fail', { default: 'Invalid backup file' }));
			}
			importing = false;
		};
		input.click();
	}

	async function handleWipe() {
		await wipeDatabase();
		toast.success($_('toast.wipe_success', { default: 'All data cleared. Reloading...' }));
		setTimeout(() => location.reload(), 1200);
	}

	let business = $state<Business | null>(null);
	let loading = $state(true);

	// Form fields
	let name = $state('');
	let gstin = $state('');
	let stateCode = $state('27');
	let address = $state('');
	let phone = $state('');
	let email = $state('');
	let business_category = $state('');
	let tax_registration_type = $state<TaxRegistrationType>('unregistered');
	let industry_sector = $state('');

	async function loadSettings(bizId: string) {
		loading = true;
		const biz = await getBusiness(bizId);
		if (biz) {
			business = biz;
			name = biz.name;
			gstin = biz.gstin;
			stateCode = biz.state_code;
			address = biz.address;
			phone = biz.phone;
			email = biz.email;
			business_category = biz.business_category || 'medical_clinic';
			tax_registration_type = (biz.tax_registration_type as TaxRegistrationType) || 'unregistered';
			industry_sector = biz.industry_sector || 'healthcare';
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadSettings($activeBusinessId);
		}
	});

	async function handleSave() {
		if (!name.trim()) return;

		// Derive industry sector from selected category
		let newIndustrySector = industry_sector;
		for (const group of categoryGroups) {
			if (group.items.some(i => i.id === business_category)) {
				newIndustrySector = group.sector;
				break;
			}
		}
		
		const data = {
			name: name.trim(),
			gstin: gstin.trim(),
			state_code: stateCode,
			address: address.trim(),
			phone: phone.trim(),
			email: email.trim(),
			business_category: business_category || 'medical_clinic',
			tax_registration_type: tax_registration_type,
			industry_sector: newIndustrySector
		};

		if (business) {
			await updateBusiness(business.id, data);
		} else if ($activeBusinessId) {
			business = await createBusiness({ id: $activeBusinessId, ...data });
		} else {
			business = await createBusiness(data);
			$activeBusinessId = business.id;
		}

		if (business_category) {
			activeTerminology.set(getTerminology(business_category as BusinessCategory));
		}

		toast.success($_('toast.settings_saved', { default: 'Settings saved successfully' }));
	}
</script>

<svelte:head>
	<title>Settings | Hisaab</title>
</svelte:head>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="mb-8 md:mb-12">
		<h2 class="text-3xl lg:text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">{$_('settings.title')}</h2>
		<p class="text-on-surface-variant text-base lg:text-lg">{$_('settings.subtitle')}</p>
	</div>

	<div class="grid grid-cols-12 gap-8">
		<!-- Form -->
		<div class="col-span-12 lg:col-span-8 space-y-8">
			<!-- Business Profile -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">apartment</span>
					<h3 class="text-xl font-headline font-bold">{$_('settings.business_profile')}</h3>
				</div>
				<form class="grid grid-cols-1 sm:grid-cols-2 gap-6" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
					<Input
						label={$_('settings.label_name')}
						bind:value={name}
						required
						class="col-span-1 sm:col-span-2"
					/>
					<Input
						label="GSTIN"
						bind:value={gstin}
						placeholder="27AAAAA0000A1Z5"
					/>
					<Select
						label={$_('settings.label_state')}
						bind:value={stateCode}
						options={INDIAN_STATES.map(s => ({ value: s.code, label: `${s.code} - ${s.name}` }))}
					/>

					<Input
						label={$_('settings.label_phone')}
						bind:value={phone}
						type="tel"
						placeholder="+91 ..."
					/>
					<Input
						label={$_('settings.label_email')}
						bind:value={email}
						type="email"
						placeholder="business@email.com"
					/>
					<div class="col-span-1 sm:col-span-2">
						<label class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">{$_('settings.label_address')}</label>
						<textarea bind:value={address} rows="3" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"></textarea>
					</div>
					
					<div class="col-span-1 sm:col-span-2 border-t border-outline-variant/30 pt-6 mt-2">
						<h4 class="text-sm font-bold text-primary mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px]">domain</span>
							Business Type & Tax Config
						</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div>
								<label class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Business Category</label>
								<select bind:value={business_category} class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all">
									<option value="" disabled>Select category...</option>
									{#each categoryGroups as group}
										<optgroup label={group.sector} class="font-bold text-primary">
											{#each group.items as item}
												<option value={item.id} class="font-medium text-on-surface">{item.label}</option>
											{/each}
										</optgroup>
									{/each}
								</select>
								<p class="text-[10px] text-on-surface-variant mt-1.5 leading-tight">
									Changes terminology across the app (e.g. from {getTerminology(business_category as BusinessCategory || 'medical_clinic').person} to {getTerminology('retail').person})
								</p>
							</div>

							<div>
								<label class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Tax Registration Type</label>
								<div class="flex flex-col gap-2 bg-surface-container-highest p-3 rounded-xl border border-transparent">
									<label class="flex items-center gap-3 cursor-pointer">
										<input type="radio" value="gst_regular" bind:group={tax_registration_type} class="text-primary focus:ring-primary h-4 w-4">
										<span class="text-sm font-semibold">GST Registered</span>
									</label>
									<label class="flex items-center gap-3 cursor-pointer">
										<input type="radio" value="composition" bind:group={tax_registration_type} class="text-primary focus:ring-primary h-4 w-4">
										<span class="text-sm font-semibold">Composition Scheme</span>
									</label>
									<label class="flex items-center gap-3 cursor-pointer">
										<input type="radio" value="unregistered" bind:group={tax_registration_type} class="text-primary focus:ring-primary h-4 w-4">
										<span class="text-sm font-semibold">Unregistered</span>
									</label>
								</div>
							</div>
						</div>
					</div>

					<div class="col-span-1 sm:col-span-2 flex justify-end gap-4 pt-4">
						<button type="submit" class="w-full sm:w-auto px-10 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
							{$_('settings.btn_save')}
						</button>
					</div>
				</form>
			</section>

			<!-- App Preferences -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-6">
					<span class="material-symbols-outlined text-primary">palette</span>
					<h3 class="text-xl font-headline font-bold">{$_('settings.app_prefs')}</h3>
				</div>
				<div>
					<label class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">{$_('settings.theme_mode')}</label>
					<div class="flex bg-surface-container-highest rounded-lg p-1 w-full max-w-sm">
						<button type="button" class="flex-1 py-2 text-sm font-bold rounded-md transition-all {$theme === 'light' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" onclick={() => theme.set('light')}>{$_('settings.theme_light')}</button>
						<button type="button" class="flex-1 py-2 text-sm font-bold rounded-md transition-all {$theme === 'dark' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" onclick={() => theme.set('dark')}>{$_('settings.theme_dark')}</button>
						<button type="button" class="flex-1 py-2 text-sm font-bold rounded-md transition-all {$theme === 'auto' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" onclick={() => theme.set('auto')}>{$_('settings.theme_auto')}</button>
					</div>
				</div>
			</section>

		</div>

		<!-- Sidebar -->
		<div class="col-span-12 lg:col-span-4 space-y-8">
			<!-- Plan Card -->
			<section class="bg-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/30">
				<div class="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
				<div class="relative z-10">
					<span class="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4">{$_('settings.current_plan')}</span>
					<h3 class="text-3xl font-headline font-extrabold mb-1">{$_('settings.free_forever')}</h3>
					<p class="text-primary-fixed-dim text-sm mb-8">{$_('settings.plan_desc')}</p>
					<ul class="space-y-4 mb-10">
						<li class="flex items-center gap-2 text-xs font-medium">
							<span class="material-symbols-outlined text-secondary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
							{$_('settings.feat_1')}
						</li>
						<li class="flex items-center gap-2 text-xs font-medium">
							<span class="material-symbols-outlined text-secondary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
							{$_('settings.feat_2')}
						</li>
						<li class="flex items-center gap-2 text-xs font-medium">
							<span class="material-symbols-outlined text-secondary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
							{$_('settings.feat_3')}
						</li>
						<li class="flex items-center gap-2 text-xs font-medium opacity-50">
							<span class="material-symbols-outlined text-lg">cancel</span>
							{$_('settings.feat_4')}
						</li>
					</ul>
					<button class="w-full py-4 bg-white text-primary rounded-xl font-extrabold text-sm hover:bg-primary-fixed transition-colors">
						{$_('settings.btn_upgrade')}
					</button>
				</div>
			</section>

			<!-- Security -->
			<div class="p-6 bg-surface-container-low rounded-xl border-l-4 border-secondary">
				<div class="flex gap-4">
					<span class="material-symbols-outlined text-secondary">verified_user</span>
					<div>
						<p class="text-xs font-bold mb-1 uppercase tracking-tight">{$_('settings.data_security')}</p>
						<p class="text-[10px] text-on-surface-variant leading-relaxed">{$_('settings.security_desc')}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Data Management -->
	<section class="mt-8 bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/20">
		<div class="flex items-center gap-3 mb-6">
			<span class="material-symbols-outlined text-primary">database</span>
			<h3 class="text-xl font-headline font-bold">{$_('settings.data_management', { default: 'Data Management' })}</h3>
		</div>
		<p class="text-sm text-on-surface-variant mb-6">{$_('settings.data_management_desc', { default: 'Export your data as a JSON backup, restore from a previous backup, or clear all data.' })}</p>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<!-- Backup -->
			<button
				onclick={handleBackup}
				class="flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group"
			>
				<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
					<span class="material-symbols-outlined text-primary">download</span>
				</div>
				<span class="text-sm font-bold text-on-surface">{$_('settings.backup_download', { default: 'Download Backup' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.backup_desc', { default: 'Save all business data as a JSON file' })}</span>
			</button>

			<!-- Restore -->
			<button
				onclick={handleRestoreClick}
				disabled={importing}
				class="flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group disabled:opacity-50"
			>
				<div class="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
					<span class="material-symbols-outlined text-secondary">{importing ? 'hourglass_empty' : 'upload'}</span>
				</div>
				<span class="text-sm font-bold text-on-surface">{importing ? $_('settings.restoring', { default: 'Restoring...' }) : $_('settings.restore_backup', { default: 'Restore Backup' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.restore_desc', { default: 'Upload a JSON backup to restore data' })}</span>
			</button>

			<!-- Wipe -->
			<button
				onclick={() => showWipeConfirm = true}
				class="flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-low hover:bg-error-container/30 border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group hover:border-error/30"
			>
				<div class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center group-hover:bg-error/20 transition-colors">
					<span class="material-symbols-outlined text-error">delete_forever</span>
				</div>
				<span class="text-sm font-bold text-error">{$_('settings.wipe_data', { default: 'Clear All Data' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.wipe_desc', { default: 'Permanently delete all business data' })}</span>
			</button>
		</div>

		{#if showWipeConfirm}
			<div class="mt-6 p-4 bg-error-container/20 border border-error/20 rounded-xl">
				<p class="text-sm font-bold text-error mb-3">{$_('settings.wipe_confirm', { default: '⚠️ This action is irreversible. All patients, invoices, and expenses will be permanently deleted.' })}</p>
				<div class="flex gap-3">
					<button onclick={() => showWipeConfirm = false} class="px-6 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
						{$_('actions.cancel', { default: 'Cancel' })}
					</button>
					<button onclick={handleWipe} class="px-6 py-2 bg-error text-on-error text-sm font-bold rounded-lg shadow-md hover:opacity-90 transition-all">
						{$_('settings.wipe_confirm_btn', { default: 'Yes, Delete Everything' })}
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>
