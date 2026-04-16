<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { getBusiness, updateBusiness, createBusiness } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { INDIAN_STATES } from '$lib/utils/helpers';
	import { toast } from '$lib/stores/toast';
	import { theme } from '$lib/stores/theme';
	import { preferences, type UserPreferences, resetPreferences } from '$lib/stores/preferences';
	import { db } from '$lib/db/index';
	import type { Business } from '$lib/db/index';
	import { formatINRCompact } from '$lib/utils/currency';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { exportDatabaseToJSON, importDatabaseFromJSON, triggerDownload, wipeDatabase } from '$lib/utils/export';
	import { purgeDeletedRecords } from '$lib/utils/purge';
	import { categoryGroups, getTerminology, type BusinessCategory, type TaxRegistrationType } from '$lib/utils/terminology';
	import { getEffectiveFeatures, saveFeatureOverrides, type BusinessFeatures } from '$lib/utils/business-features';
	import { fade, slide } from 'svelte/transition';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { supabase } from '$lib/db/supabase';
	import { currentUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/login');
	}

	let showWipeConfirm = $state(false);
	let features = $state<BusinessFeatures | null>(null);
	let importing = $state(false);
	let purging = $state(false);

	const accentColors = [
		{ id: 'blue', name: 'Ocean Blue', value: '#003f87' },
		{ id: 'violet', name: 'Royal Purple', value: '#7c3aed' },
		{ id: 'emerald', name: 'Forest Green', value: '#059669' },
		{ id: 'coral', name: 'Sunset Coral', value: '#f97316' },
		{ id: 'rose', name: 'Rose Pink', value: '#e11d48' },
		{ id: 'cyan', name: 'Sky Cyan', value: '#0891b2' },
		{ id: 'amber', name: 'Warm Amber', value: '#d97706' },
		{ id: 'slate', name: 'Steel Slate', value: '#475569' }
	];

	const currencies = [
		{ id: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
		{ id: 'USD', name: 'US Dollar ($)', symbol: '$' },
		{ id: 'EUR', name: 'Euro (€)', symbol: '€' },
		{ id: 'GBP', name: 'British Pound (£)', symbol: '£' },
		{ id: 'AED', name: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
		{ id: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' }
	];

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

	async function handlePurge() {
		purging = true;
		try {
			const result = await purgeDeletedRecords();
			toast.success(`Cleaned up ${result.recordsPurged} deleted records from ${result.tablesProcessed} tables.`);
		} catch {
			toast.error('Failed to clean up storage.');
		}
		purging = false;
	}

	let business = $state<Business | null>(null);
	let loading = $state(true);

	let name = $state('');
	let gstin = $state('');
	let stateCode = $state('27');
	let address = $state('');
	let phone = $state('');
	let email = $state('');
	let business_category = $state('');
	let tax_registration_type = $state<TaxRegistrationType>('unregistered');
	let industry_sector = $state('');
	
	let statsInvoices = $state(0);
	let statsCustomers = $state(0);
	let statsRevenue = $state(0);
	let storageUsed = $state(0);
	let storageQuota = $state(0);

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
			business_category = biz.business_category || 'kirana_store';
			tax_registration_type = (biz.tax_registration_type as TaxRegistrationType) || 'unregistered';
			industry_sector = biz.industry_sector || 'retail';
			features = getEffectiveFeatures(bizId, biz.business_category);
			
			// Load Quick Stats
			const firstDay = new Date();
			firstDay.setDate(1);
			const monthStart = firstDay.toISOString().split('T')[0];
			
			const invoices = await db.invoices.where('business_id').equals(bizId).toArray();
			statsInvoices = invoices.filter(i => !i.is_deleted && i.document_type === 'INVOICE').length;
			statsRevenue = invoices
				.filter(i => !i.is_deleted && i.document_type === 'INVOICE' && i.issue_date >= monthStart)
				.reduce((sum, i) => sum + i.grand_total, 0);
				
			statsCustomers = await db.patients.where('business_id').equals(bizId).filter(p => !p.is_deleted).count();
		}
		
		// Storage estimation
		if (navigator.storage && navigator.storage.estimate) {
			const estimate = await navigator.storage.estimate();
			storageUsed = estimate.usage || 0;
			storageQuota = estimate.quota || 0;
		}
		
		loading = false;
	}

	async function handleSaveFeatures() {
		if (!$activeBusinessId || !features) return;
		saveFeatureOverrides($activeBusinessId, {
			hasPOS: features.hasPOS,
			hasEstimates: features.hasEstimates,
			hasRecurring: features.hasRecurring,
			hasSuppliers: features.hasSuppliers,
			hasPurchases: features.hasPurchases,
			hasInventory: features.hasInventory,
			hasCustomers: features.hasCustomers
		});
		toast.success($_('toast.settings_saved', { default: 'Feature settings saved successfully' }));
	}

	$effect(() => {
		if ($activeBusinessId) {
			loadSettings($activeBusinessId);
		}
	});

	async function handleSave() {
		if (!name.trim()) return;

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
			business_category: business_category || 'kirana_store',
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

	function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
		preferences.update(p => ({ ...p, [key]: value }));
		if (key === 'theme') {
			theme.set(value as 'light' | 'dark' | 'auto');
		}
	}

	function handleResetPreferences() {
		resetPreferences();
		toast.success('All preferences reset to defaults');
	}

	function toggleAnalytics(key: keyof UserPreferences) {
		const currentValue = $preferences[key as keyof typeof $preferences];
		if (typeof currentValue === 'boolean') {
			updatePreference(key, !currentValue);
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			handleSave();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<title>Settings | Hisaab</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8 md:mb-12">
		<h2 class="text-3xl lg:text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">{$_('settings.title')}</h2>
		<p class="text-on-surface-variant text-base lg:text-lg">{$_('settings.subtitle')}</p>
	</div>

	<div class="grid grid-cols-12 gap-6 lg:gap-8">
		<!-- Form -->
		<div class="col-span-12 lg:col-span-8 space-y-8">
			<!-- Business Profile -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
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
					<label class="col-span-1 sm:col-span-2 w-full">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">{$_('settings.label_address')}</span>
						<textarea bind:value={address} rows="3" class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"></textarea>
					</label>
					
					<div class="col-span-1 sm:col-span-2 border-t border-outline-variant/30 pt-6 mt-2">
						<h4 class="text-sm font-bold text-primary mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px]">domain</span>
							Business Type & Tax Config
						</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<label class="block w-full">
								<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Business Category</span>
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
									Changes terminology across the app (e.g. from {getTerminology(business_category as BusinessCategory || 'kirana_store').person} to {getTerminology('retail').person})
								</p>
							</label>

							<fieldset class="w-full">
								<legend class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Tax Registration Type</legend>
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
							</fieldset>
						</div>
					</div>

					<div class="col-span-1 sm:col-span-2 flex justify-end gap-4 pt-4">
						<button type="submit" class="w-full sm:w-auto px-10 py-3 bg-linear-to-br from-primary to-primary-container text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
							{$_('settings.btn_save')}
						</button>
					</div>
				</form>
			</section>

			<!-- App Appearance & Personalization -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">palette</span>
					<h3 class="text-xl font-headline font-bold">Appearance & Personalization</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Customize the app look and feel to match your preferences. Changes apply instantly.</p>

<!-- Theme Mode -->
			<div class="mb-8">
				<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-4">Theme Mode</span>
				<div class="flex bg-surface-container-highest rounded-xl p-1.5 w-full max-w-md">
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$theme === 'light' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('theme', 'light')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">light_mode</span>
							{$_('settings.theme_light')}
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$theme === 'dark' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('theme', 'dark')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">dark_mode</span>
							{$_('settings.theme_dark')}
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$theme === 'auto' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('theme', 'auto')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">settings_brightness</span>
							{$_('settings.theme_auto')}
						</button>
					</div>
				</div>

<!-- Accent Color -->
			<div class="mb-8">
				<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-4">Accent Color</span>
				<div class="flex flex-wrap gap-3">
						{#each accentColors as color}
							<button
								type="button"
								onclick={() => updatePreference('accentColor', color.value)}
								class="w-12 h-12 rounded-2xl transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
								style="background-color: {color.value}; {$preferences.accentColor === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}"
								title={color.name}
							>
								{#if $preferences.accentColor === color.value}
									<span class="material-symbols-outlined text-white text-xl" style="font-variation-settings: 'FILL' 1;">check</span>
								{/if}
							</button>
						{/each}
					</div>
					<p class="text-xs text-on-surface-variant mt-2">Current: {accentColors.find(c => c.value === $preferences.accentColor)?.name || 'Custom'}</p>
				</div>

<!-- Display Density -->
			<div class="mb-8">
				<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-4">Display Density</span>
				<div class="flex bg-surface-container-highest rounded-xl p-1.5 w-full max-w-lg">
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.compactMode === true ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('compactMode', true)}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">compress</span>
							Compact
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.compactMode === false ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('compactMode', false)}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">expand_content</span>
							Comfortable
						</button>
					</div>
				</div>

<!-- Font Size -->
			<div class="mb-8">
				<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-4">Text Size</span>
				<div class="flex bg-surface-container-highest rounded-xl p-1.5 w-full max-w-lg">
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.fontSize === 'small' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('fontSize', 'small')}
						>
							<span class="text-xs">Aa</span>
							Small
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.fontSize === 'medium' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('fontSize', 'medium')}
						>
							<span class="text-base">Aa</span>
							Medium
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.fontSize === 'large' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('fontSize', 'large')}
						>
							<span class="text-xl">Aa</span>
							Large
						</button>
					</div>
				</div>

<!-- Animations -->
			<div class="mb-6">
				<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-4">Animations</span>
				<div class="flex bg-surface-container-highest rounded-xl p-1.5 w-full max-w-lg">
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.animations === 'full' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('animations', 'full')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">animation</span>
							Full
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.animations === 'reduced' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('animations', 'reduced')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">slow_motion_video</span>
							Reduced
						</button>
						<button 
							type="button" 
							class="flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all {$preferences.animations === 'none' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low'}" 
							onclick={() => updatePreference('animations', 'none')}
						>
							<span class="material-symbols-outlined text-lg mr-1 align-middle">motion_photos_off</span>
							None
						</button>
					</div>
					<p class="text-xs text-on-surface-variant mt-2">Disabling animations can improve performance on older devices.</p>
				</div>

				<!-- Reset Button -->
				<div class="pt-6 border-t border-outline-variant/30">
					<button 
						type="button"
						onclick={handleResetPreferences}
						class="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
					>
						<span class="material-symbols-outlined text-lg">refresh</span>
						Reset all preferences to defaults
					</button>
				</div>
			</section>

			<!-- Regional & Format Settings -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">language</span>
					<h3 class="text-xl font-headline font-bold">Regional & Format Settings</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Configure regional preferences for currency, dates, and number formats.</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<!-- Currency -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Currency</span>
						<select 
							value={$preferences.currency}
							onchange={(e) => {
								const curr = currencies.find(c => c.id === (e.target as HTMLSelectElement).value);
								if (curr) {
									updatePreference('currency', curr.id);
									updatePreference('currencySymbol', curr.symbol);
								}
							}}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							{#each currencies as curr}
								<option value={curr.id}>{curr.name}</option>
							{/each}
						</select>
					</label>

					<!-- Date Format -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Date Format</span>
						<select 
							value={$preferences.dateFormat}
							onchange={(e) => updatePreference('dateFormat', (e.target as HTMLSelectElement).value as any)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value="dd-mm-yyyy">DD-MM-YYYY (31-12-2024)</option>
							<option value="mm-dd-yyyy">MM-DD-YYYY (12-31-2024)</option>
							<option value="yyyy-mm-dd">YYYY-MM-DD (2024-12-31)</option>
						</select>
					</label>

					<!-- Time Format -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Time Format</span>
						<select 
							value={$preferences.timeFormat}
							onchange={(e) => updatePreference('timeFormat', (e.target as HTMLSelectElement).value as any)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value="12h">12-hour (AM/PM)</option>
							<option value="24h">24-hour (00:00)</option>
						</select>
					</label>

					<!-- Week Start -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Week Starts On</span>
						<select 
							value={$preferences.weekStart}
							onchange={(e) => updatePreference('weekStart', (e.target as HTMLSelectElement).value as any)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value="monday">Monday</option>
							<option value="sunday">Sunday</option>
						</select>
					</label>

					<!-- Number Format -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Number Grouping</span>
						<select 
							value={$preferences.numberFormat}
							onchange={(e) => updatePreference('numberFormat', (e.target as HTMLSelectElement).value as any)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value="indian">Indian (1,23,456)</option>
							<option value="western">Western (123,456)</option>
						</select>
					</label>
				</div>
			</section>

			<!-- Invoice Defaults -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">receipt_long</span>
					<h3 class="text-xl font-headline font-bold">Invoice Defaults</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Set default values for new invoices. These can be changed per invoice.</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<!-- Invoice Prefix -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Invoice Prefix</span>
						<input
							type="text"
							value={$preferences.invoicePrefix}
							oninput={(e) => updatePreference('invoicePrefix', (e.target as HTMLInputElement).value)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							placeholder="INV"
						/>
					</label>

					<!-- Invoice Number Padding -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Invoice Number Padding</span>
						<select 
							value={$preferences.invoiceNumberPadding}
							onchange={(e) => updatePreference('invoiceNumberPadding', parseInt((e.target as HTMLSelectElement).value))}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value={3}>3 digits (001)</option>
							<option value={4}>4 digits (0001)</option>
							<option value={5}>5 digits (00001)</option>
							<option value={6}>6 digits (000001)</option>
						</select>
					</label>

					<!-- Default Tax Rate -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Default Tax Rate (%)</span>
						<input
							type="number"
							value={$preferences.defaultTaxRate}
							oninput={(e) => updatePreference('defaultTaxRate', parseFloat((e.target as HTMLInputElement).value) || 0)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="0"
							max="100"
							step="0.1"
						/>
					</label>

					<!-- Default Discount Rate -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Default Discount Rate (%)</span>
						<input
							type="number"
							value={$preferences.defaultDiscountRate}
							oninput={(e) => updatePreference('defaultDiscountRate', parseFloat((e.target as HTMLInputElement).value) || 0)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="0"
							max="100"
							step="0.1"
						/>
					</label>

					<!-- Default Payment Method -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Default Payment Method</span>
						<select 
							value={$preferences.defaultPaymentMethod}
							onchange={(e) => updatePreference('defaultPaymentMethod', (e.target as HTMLSelectElement).value as any)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
						>
							<option value="cash">Cash</option>
							<option value="card">Card</option>
							<option value="upi">UPI</option>
							<option value="bank_transfer">Bank Transfer</option>
							<option value="credit">Credit/Account</option>
						</select>
					</label>

					<!-- Credit Days -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Credit Period (Days)</span>
						<input
							type="number"
							value={$preferences.defaultCreditDays}
							oninput={(e) => updatePreference('defaultCreditDays', parseInt((e.target as HTMLInputElement).value) || 0)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="0"
							max="365"
						/>
					</label>

					<!-- Allow Partial Payment -->
					<div class="sm:col-span-2">
						<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-primary">payments</span>
								<div>
									<span class="font-medium">Allow Partial Payments</span>
									<p class="text-xs text-on-surface-variant">Enable split payments across multiple methods</p>
								</div>
							</div>
							<input 
								type="checkbox" 
								checked={$preferences.allowPartialPayment}
								onchange={(e) => updatePreference('allowPartialPayment', (e.target as HTMLInputElement).checked)}
								class="toggle toggle-primary"
							/>
						</label>
					</div>

					<!-- Default Advance % -->
					{#if $preferences.allowPartialPayment}
						<label class="block">
							<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1">Default Advance Payment (%)</span>
							<p class="text-[10px] text-on-surface-variant mb-3">Pre-filled advance amount when creating invoices</p>
							<input
								type="number"
								value={$preferences.defaultPartialPercent}
								oninput={(e) => updatePreference('defaultPartialPercent', parseFloat((e.target as HTMLInputElement).value) || 50)}
								class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
								min="1"
								max="99"
							/>
						</label>
					{/if}

					<!-- Default Notes -->
					<label class="sm:col-span-2 block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Default Invoice Notes</span>
						<textarea
							value={$preferences.defaultNotes}
							oninput={(e) => updatePreference('defaultNotes', (e.target as HTMLTextAreaElement).value)}
							rows="3"
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"
							placeholder="Thank you for your business!"
						></textarea>
					</label>

					<!-- Default Terms -->
					<label class="sm:col-span-2 block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Default Terms & Conditions</span>
						<textarea
							value={$preferences.defaultTerms}
							oninput={(e) => updatePreference('defaultTerms', (e.target as HTMLTextAreaElement).value)}
							rows="3"
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all resize-none"
							placeholder="Payment due within 30 days"
						></textarea>
					</label>

					<!-- Auto Tax -->
					<div>
						<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-primary">receipt</span>
								<div>
									<span class="font-medium">Auto-apply Tax</span>
									<p class="text-xs text-on-surface-variant">Automatically add tax to new invoices</p>
								</div>
							</div>
							<input 
								type="checkbox" 
								checked={$preferences.autoInvoiceTax}
								onchange={(e) => updatePreference('autoInvoiceTax', (e.target as HTMLInputElement).checked)}
								class="toggle toggle-primary"
							/>
						</label>
					</div>

					<!-- Auto Discount -->
					<div>
						<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-primary">percent</span>
								<div>
									<span class="font-medium">Auto-apply Discount</span>
									<p class="text-xs text-on-surface-variant">Automatically add discount to new invoices</p>
								</div>
							</div>
							<input 
								type="checkbox" 
								checked={$preferences.autoInvoiceDiscount}
								onchange={(e) => updatePreference('autoInvoiceDiscount', (e.target as HTMLInputElement).checked)}
								class="toggle toggle-primary"
							/>
						</label>
					</div>
				</div>
			</section>

			<!-- Analytics Features Toggle -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">analytics</span>
					<h3 class="text-xl font-headline font-bold">Analytics Features</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Enable advanced analytics features. These are OFF by default to keep the app fast and focused.</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- RFM Analysis -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsRFM ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">group</span>
							<div>
								<span class="font-medium">RFM Customer Analysis</span>
								<p class="text-xs text-on-surface-variant">Recency, Frequency, Monetary segmentation</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsRFM}
							onchange={(e) => updatePreference('analyticsRFM', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- ABC Analysis -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsABC ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">inventory_2</span>
							<div>
								<span class="font-medium">Inventory ABC Analysis</span>
								<p class="text-xs text-on-surface-variant">Pareto analysis for inventory valuation</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsABC}
							onchange={(e) => updatePreference('analyticsABC', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Financial Ratios -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsRatios ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">account_balance</span>
							<div>
								<span class="font-medium">Financial Ratios</span>
								<p class="text-xs text-on-surface-variant">Current ratio, ROI, ROA, margins</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsRatios}
							onchange={(e) => updatePreference('analyticsRatios', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Forecasting -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsForecasting ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">trending_up</span>
							<div>
								<span class="font-medium">Revenue Forecasting</span>
								<p class="text-xs text-on-surface-variant">Predict future revenue trends</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsForecasting}
							onchange={(e) => updatePreference('analyticsForecasting', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Goal Tracking -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsGoals ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">flag</span>
							<div>
								<span class="font-medium">Goal Tracking</span>
								<p class="text-xs text-on-surface-variant">Track revenue and profit goals</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsGoals}
							onchange={(e) => updatePreference('analyticsGoals', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Alert System -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsAlerts ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">notifications</span>
							<div>
								<span class="font-medium">Smart Alerts</span>
								<p class="text-xs text-on-surface-variant">Automatic alerts for low stock, overdue</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsAlerts}
							onchange={(e) => updatePreference('analyticsAlerts', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Operational Metrics -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors {$preferences.analyticsOperations ? 'ring-2 ring-primary' : ''}">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">schedule</span>
							<div>
								<span class="font-medium">Operational Metrics</span>
								<p class="text-xs text-on-surface-variant">Peak hours and days analysis</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.analyticsOperations}
							onchange={(e) => updatePreference('analyticsOperations', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>
				</div>

				<div class="mt-6 p-4 bg-tertiary-container/30 rounded-xl border border-tertiary/20">
					<p class="text-sm text-on-tertiary font-medium flex items-center gap-2">
						<span class="material-symbols-outlined text-lg">info</span>
						Enabling analytics will add processing time when loading reports. Disable when not needed to keep the app snappy.
					</p>
				</div>
			</section>

			<!-- Inventory Settings -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">inventory</span>
					<h3 class="text-xl font-headline font-bold">Inventory Settings</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Configure stock alerts and reorder points.</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<!-- Low Stock Threshold -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Low Stock Alert Threshold</span>
						<input
							type="number"
							value={$preferences.lowStockThreshold}
							oninput={(e) => updatePreference('lowStockThreshold', parseInt((e.target as HTMLInputElement).value) || 10)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="1"
						/>
						<p class="text-[10px] text-on-surface-variant mt-1">Alert when stock falls below this quantity</p>
					</label>

					<!-- Dead Stock Days -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Dead Stock After (Days)</span>
						<input
							type="number"
							value={$preferences.deadStockDays}
							oninput={(e) => updatePreference('deadStockDays', parseInt((e.target as HTMLInputElement).value) || 90)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="1"
						/>
						<p class="text-[10px] text-on-surface-variant mt-1">No sales for this many days = dead stock</p>
					</label>

					<!-- Reorder Point Days -->
					<label class="block">
						<span class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-3">Reorder Reminder (Days)</span>
						<input
							type="number"
							value={$preferences.reorderPointDays}
							oninput={(e) => updatePreference('reorderPointDays', parseInt((e.target as HTMLInputElement).value) || 7)}
							class="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all"
							min="1"
						/>
						<p class="text-[10px] text-on-surface-variant mt-1">Days before stock runs out to warn</p>
					</label>
				</div>
			</section>

			<!-- Customer Settings -->
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-8">
					<span class="material-symbols-outlined text-primary">people</span>
					<h3 class="text-xl font-headline font-bold">{$activeTerminology.people} Settings</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-8">Configure customer-related preferences.</p>

				<div class="space-y-4">
					<!-- Customer Groups -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">group_work</span>
							<div>
								<span class="font-medium">Enable Customer Groups</span>
								<p class="text-xs text-on-surface-variant">Organize customers into groups</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.customerGroups}
							onchange={(e) => updatePreference('customerGroups', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>

					<!-- Show Inactive Customers -->
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">visibility</span>
							<div>
								<span class="font-medium">Show Inactive {getTerminology(business_category as BusinessCategory || 'retail').people}</span>
								<p class="text-xs text-on-surface-variant">Display archived customers in lists</p>
							</div>
						</div>
						<input 
							type="checkbox" 
							checked={$preferences.showInactiveCustomers}
							onchange={(e) => updatePreference('showInactiveCustomers', (e.target as HTMLInputElement).checked)}
							class="toggle toggle-primary"
						/>
					</label>
				</div>
			</section>

			<!-- Feature Toggles -->
			{#if features}
			<section class="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
				<div class="flex items-center gap-3 mb-6">
					<span class="material-symbols-outlined text-primary">toggle_on</span>
					<h3 class="text-xl font-headline font-bold">Feature Visibility</h3>
				</div>
				<p class="text-sm text-on-surface-variant mb-6">Enable or disable features based on your business needs. Changes will reflect in the navigation.</p>
				
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">point_of_sale</span>
							<span class="font-medium">POS Mode</span>
						</div>
						<input type="checkbox" bind:checked={features.hasPOS} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">description</span>
							<span class="font-medium">Estimates & Quotes</span>
						</div>
						<input type="checkbox" bind:checked={features.hasEstimates} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">autorenew</span>
							<span class="font-medium">Recurring / Subscriptions</span>
						</div>
						<input type="checkbox" bind:checked={features.hasRecurring} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">local_shipping</span>
							<span class="font-medium">Suppliers</span>
						</div>
						<input type="checkbox" bind:checked={features.hasSuppliers} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">shopping_cart</span>
							<span class="font-medium">Purchases</span>
						</div>
						<input type="checkbox" bind:checked={features.hasPurchases} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">inventory_2</span>
							<span class="font-medium">Inventory</span>
						</div>
						<input type="checkbox" bind:checked={features.hasInventory} class="toggle toggle-primary">
					</label>
					
					<label class="flex items-center justify-between p-4 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-primary">group</span>
							<span class="font-medium">{$activeTerminology.people}</span>
						</div>
						<input type="checkbox" bind:checked={features.hasCustomers} class="toggle toggle-primary">
					</label>
				</div>
				
				<div class="mt-6 pt-4 border-t border-outline-variant/30">
					<button onclick={handleSaveFeatures} class="w-full sm:w-auto px-6 py-3 bg-linear-to-br from-primary to-primary-container text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
						Save Feature Settings
					</button>
				</div>
			</section>
			{/if}

		</div>

		<!-- Sidebar -->
		<div class="col-span-12 lg:col-span-4 space-y-6">
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

			<!-- Quick Stats Card -->
			<div class="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
				<h4 class="font-headline font-bold text-lg mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">insights</span>
					Your Stats
				</h4>
				<div class="space-y-4">
					<div class="flex justify-between items-center">
						<span class="text-sm text-on-surface-variant">Invoices Created</span>
						<span class="text-lg font-bold text-primary">{statsInvoices}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm text-on-surface-variant">Active {$activeTerminology.people}</span>
						<span class="text-lg font-bold text-secondary">{statsCustomers}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm text-on-surface-variant">This Month</span>
						<span class="text-lg font-bold text-tertiary">{formatINRCompact(statsRevenue)}</span>
					</div>
				</div>
			</div>

			<!-- Storage Meter -->
			{#if storageQuota > 0}
			<div class="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
				<h4 class="font-headline font-bold text-sm mb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-lg">storage</span>
					Local Storage
				</h4>
				<div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden mb-2">
					<div
						class="h-full rounded-full transition-all duration-500 {Math.round((storageUsed / storageQuota) * 100) > 80 ? 'bg-error' : Math.round((storageUsed / storageQuota) * 100) > 50 ? 'bg-warning' : 'bg-primary'}"
						style="width: {Math.min(100, Math.round((storageUsed / storageQuota) * 100))}%"
					></div>
				</div>
				<div class="flex justify-between text-[10px] text-on-surface-variant font-medium">
					<span>{(storageUsed / (1024 * 1024)).toFixed(1)} MB used</span>
					<span>{Math.min(100, Math.round((storageUsed / storageQuota) * 100))}%</span>
				</div>
			</div>
			{/if}

			<!-- Security -->
			<div class="p-6 bg-surface-container-low rounded-2xl border-l-4 border-secondary">
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
	<section class="mt-8 bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
		<div class="flex items-center gap-3 mb-6">
			<span class="material-symbols-outlined text-primary">database</span>
			<h3 class="text-xl font-headline font-bold">{$_('settings.data_management', { default: 'Data Management' })}</h3>
		</div>
		<p class="text-sm text-on-surface-variant mb-6">{$_('settings.data_management_desc', { default: 'Export your data as a JSON backup, restore from a previous backup, or clear all data.' })}</p>

		<!-- Auto Backup Toggle -->
		<div class="mb-8 p-4 rounded-xl bg-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
					<span class="material-symbols-outlined text-primary text-xl">cloud_sync</span>
				</div>
				<div>
					<h4 class="font-bold text-on-surface">Auto File Backup</h4>
					<p class="text-xs text-on-surface-variant">Automatically prompt JSON backup download periodically</p>
				</div>
			</div>
			<div class="flex items-center gap-4 w-full sm:w-auto">
				<select
					value={$preferences.backupFrequency}
					onchange={(e) => updatePreference('backupFrequency', (e.target as HTMLSelectElement).value as any)}
					disabled={!$preferences.autoBackup}
					class="flex-1 sm:flex-none sm:w-32 bg-surface-container border-b-2 border-transparent focus:border-primary rounded-t-lg px-3 py-2 text-sm font-bold text-on-surface outline-none disabled:opacity-50"
				>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
				<button 
					onclick={() => toggleAnalytics('autoBackup')}
					class="w-12 h-6 rounded-full transition-colors relative flex-shrink-0 {$preferences.autoBackup ? 'bg-primary' : 'bg-outline-variant'}"
				>
					<div class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm {$preferences.autoBackup ? 'left-[26px]' : 'left-1'}"></div>
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
			<!-- Backup -->
			<button
				onclick={handleBackup}
				class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group"
			>
				<div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
					<span class="material-symbols-outlined text-primary text-2xl">download</span>
				</div>
				<span class="text-sm font-bold text-on-surface">{$_('settings.backup_download', { default: 'Download Backup' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.backup_desc', { default: 'Save all business data as a JSON file' })}</span>
			</button>

			<!-- Restore -->
			<button
				onclick={handleRestoreClick}
				disabled={importing}
				class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group disabled:opacity-50"
			>
				<div class="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
					<span class="material-symbols-outlined text-secondary text-2xl">{importing ? 'hourglass_empty' : 'upload'}</span>
				</div>
				<span class="text-sm font-bold text-on-surface">{importing ? $_('settings.restoring', { default: 'Restoring...' }) : $_('settings.restore_backup', { default: 'Restore Backup' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.restore_desc', { default: 'Upload a JSON backup to restore data' })}</span>
			</button>

			<!-- Wipe -->
			<button
				onclick={() => showWipeConfirm = true}
				class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-surface-container-low hover:bg-error-container/30 border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group hover:border-error/30"
			>
				<div class="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center group-hover:bg-error/20 transition-colors">
					<span class="material-symbols-outlined text-error text-2xl">delete_forever</span>
				</div>
				<span class="text-sm font-bold text-error">{$_('settings.wipe_data', { default: 'Clear All Data' })}</span>
				<span class="text-[10px] text-on-surface-variant text-center">{$_('settings.wipe_desc', { default: 'Permanently delete all business data' })}</span>
			</button>

			<!-- Clean Up Storage -->
			<button
				onclick={handlePurge}
				disabled={purging}
				class="flex flex-col items-center gap-3 p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 transition-all hover:shadow-md active:scale-[0.98] group disabled:opacity-50"
			>
				<div class="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center group-hover:bg-tertiary/20 transition-colors">
					<span class="material-symbols-outlined text-tertiary text-2xl">{purging ? 'hourglass_empty' : 'mop'}</span>
				</div>
				<span class="text-sm font-bold text-on-surface">{purging ? 'Cleaning...' : 'Clean Up Storage'}</span>
				<span class="text-[10px] text-on-surface-variant text-center">Remove deleted records older than 30 days</span>
			</button>
		</div>

		<ConfirmDialog
			show={showWipeConfirm}
			title={$_('settings.wipe_data', { default: 'Clear All Data' })}
			message={$_('settings.wipe_confirm', { default: '⚠️ This action is irreversible. All customers, invoices, and expenses will be permanently deleted.' })}
			confirmText={$_('settings.wipe_confirm_btn', { default: 'Yes, Delete Everything' })}
			destructive={true}
			onConfirm={() => { handleWipe(); showWipeConfirm = false; }}
			onCancel={() => showWipeConfirm = false}
		/>
	</section>

	<!-- Account -->
	<section class="mt-8 bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
		<div class="flex items-center gap-3 mb-6">
			<span class="material-symbols-outlined text-primary">manage_accounts</span>
			<h3 class="text-xl font-headline font-bold">Account</h3>
		</div>

		{#if $currentUser}
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-container rounded-xl">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
						<span class="material-symbols-outlined text-primary">person</span>
					</div>
					<div>
						<p class="text-sm font-semibold text-on-surface">{$currentUser.email}</p>
						<p class="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
							<span class="material-symbols-outlined text-xs text-primary" style="font-variation-settings: 'FILL' 1;">verified</span>
							Signed in
						</p>
					</div>
				</div>
				<button
					onclick={handleSignOut}
					class="px-5 py-2.5 text-sm font-semibold text-error border border-error/20 rounded-xl hover:bg-error/10 transition-colors flex items-center gap-2"
				>
					<span class="material-symbols-outlined text-base">logout</span>
					Sign Out
				</button>
			</div>
		{:else}
			<div class="p-4 bg-surface-container rounded-xl flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-outline">wifi_off</span>
					<div>
						<p class="text-sm font-medium text-on-surface">Offline Mode</p>
						<p class="text-xs text-on-surface-variant mt-0.5">Sign in to sync your data across devices</p>
					</div>
				</div>
				<a
					href="/login"
					class="px-5 py-2.5 text-sm font-semibold text-primary border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors"
				>
					Sign In
				</a>
			</div>
		{/if}
	</section>
</div>