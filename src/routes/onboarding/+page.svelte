<script lang="ts">
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { categoryGroups, type BusinessCategory, type TaxRegistrationType } from '$lib/utils/terminology';
	import { supabase } from '$lib/db/supabase';
	import { INDIAN_STATES } from '$lib/utils/helpers';

	// Step tracking: 1 = tax type, 2 = business category, 3 = business profile
	let currentStep = $state(1);

	let taxType = $state<TaxRegistrationType>('unregistered');
	let selectedCategory = $state<BusinessCategory | null>(null);
	let isSaving = $state(false);

	// Step 3: Business profile fields
	let bizName = $state('');
	let bizPhone = $state('');
	let bizEmail = $state('');
	let bizAddress = $state('');
	let bizStateCode = $state('27');
	let bizGstin = $state('');

	function goToStep(step: number) {
		currentStep = step;
	}

	async function finishOnboarding() {
		if (!selectedCategory) return;
		isSaving = true;

		try {
			const { data: { user } } = await supabase.auth.getUser();
			const sector = categoryGroups.find(g => g.items.some(i => i.id === selectedCategory))?.sector || 'Other';

			let businesses = await db.businesses.toArray();
			let targetBusiness = businesses[0];

			const profileData = {
				business_category: selectedCategory,
				tax_registration_type: taxType,
				industry_sector: sector,
				name: bizName.trim() || 'My Business',
				phone: bizPhone.trim(),
				email: bizEmail.trim(),
				address: bizAddress.trim(),
				state_code: bizStateCode,
				gstin: taxType === 'gst_registered' ? bizGstin.trim() : '',
				last_modified: new Date().toISOString()
			};

			if (targetBusiness) {
				await db.businesses.update(targetBusiness.id, profileData);
			} else {
				await db.businesses.add({
					id: crypto.randomUUID(),
					owner_id: user?.id ?? 'offline_user',
					logo_base64: '',
					invoice_counter: 1,
					fy_start: new Date().toISOString(),
					is_deleted: false,
					created_at: new Date().toISOString(),
					...profileData
				});
			}

			goto('/dashboard');
		} catch (e) {
			console.error('Failed to complete onboarding:', e);
		} finally {
			isSaving = false;
		}
	}

	const steps = [
		{ number: 1, label: 'Tax Type' },
		{ number: 2, label: 'Business Type' },
		{ number: 3, label: 'Your Details' }
	];
</script>

<svelte:head>
	<title>Welcome to Hisaab - Let's set up your business</title>
</svelte:head>

<div class="min-h-screen bg-surface flex flex-col items-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-4xl space-y-8">
		<!-- Header -->
		<div class="text-center">
			<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container text-primary mb-4">
				<span class="material-symbols-outlined text-3xl">rocket_launch</span>
			</div>
			<h1 class="text-4xl font-headline font-bold text-on-surface mb-2">Welcome to Hisaab</h1>
			<p class="text-xl text-on-surface-variant font-medium">Let's set up your business in just a few steps.</p>
		</div>

		<!-- Step Indicator -->
		<div class="flex items-center justify-center gap-0">
			{#each steps as step, i}
				<div class="flex items-center">
					<div class="flex flex-col items-center gap-1">
						<div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
							{currentStep > step.number ? 'bg-primary text-on-primary' : currentStep === step.number ? 'bg-primary text-on-primary ring-4 ring-primary/20' : 'bg-surface-container text-on-surface-variant'}">
							{#if currentStep > step.number}
								<span class="material-symbols-outlined text-base">check</span>
							{:else}
								{step.number}
							{/if}
						</div>
						<span class="text-[11px] font-semibold {currentStep === step.number ? 'text-primary' : 'text-on-surface-variant'}">{step.label}</span>
					</div>
					{#if i < steps.length - 1}
						<div class="h-0.5 w-16 mx-2 mb-5 transition-all {currentStep > step.number ? 'bg-primary' : 'bg-outline-variant/40'}"></div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-8">

			<!-- Step 1: Tax Registration -->
			{#if currentStep === 1}
				<section>
					<div class="flex items-center gap-2 mb-4">
						<span class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">1</span>
						<h2 class="text-xl font-bold text-on-surface">Tax Registration Type</h2>
					</div>
					<p class="text-on-surface-variant text-sm mb-6 max-w-2xl">
						This helps us format your invoices correctly. Are you registered for GST?
					</p>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<label class="relative flex flex-col p-5 border-2 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors {taxType === 'unregistered' ? 'border-primary bg-primary-container/20' : 'border-outline-variant'}">
							<input type="radio" bind:group={taxType} value="unregistered" class="sr-only" />
							<div class="flex justify-between items-start mb-2">
								<span class="font-bold text-on-surface">Unregistered</span>
								{#if taxType === 'unregistered'}
									<span class="material-symbols-outlined text-primary">check_circle</span>
								{/if}
							</div>
							<p class="text-xs text-on-surface-variant">I do not have a GST number. I issue a Bill of Supply.</p>
						</label>

						<label class="relative flex flex-col p-5 border-2 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors {taxType === 'gst_registered' ? 'border-primary bg-primary-container/20' : 'border-outline-variant'}">
							<input type="radio" bind:group={taxType} value="gst_registered" class="sr-only" />
							<div class="flex justify-between items-start mb-2">
								<span class="font-bold text-on-surface">GST Registered</span>
								{#if taxType === 'gst_registered'}
									<span class="material-symbols-outlined text-primary">check_circle</span>
								{/if}
							</div>
							<p class="text-xs text-on-surface-variant">I have a regular GST number and charge GST on invoices.</p>
						</label>

						<label class="relative flex flex-col p-5 border-2 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors {taxType === 'composition' ? 'border-primary bg-primary-container/20' : 'border-outline-variant'}">
							<input type="radio" bind:group={taxType} value="composition" class="sr-only" />
							<div class="flex justify-between items-start mb-2">
								<span class="font-bold text-on-surface">Composition Scheme</span>
								{#if taxType === 'composition'}
									<span class="material-symbols-outlined text-primary">check_circle</span>
								{/if}
							</div>
							<p class="text-xs text-on-surface-variant">I pay a fixed percentage of turnover. I issue a Bill of Supply.</p>
						</label>
					</div>
				</section>
			{/if}

			<!-- Step 2: Business Category -->
			{#if currentStep === 2}
				<section>
					<div class="flex items-center gap-2 mb-4">
						<span class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">2</span>
						<h2 class="text-xl font-bold text-on-surface">Business Type</h2>
					</div>
					<p class="text-on-surface-variant text-sm mb-6">
						We will personalize the app specifically for your industry.
					</p>

					<div class="space-y-10 max-h-[60vh] overflow-y-auto pr-1">
						{#each categoryGroups as group}
							<div>
								<h3 class="flex items-center gap-2 font-bold text-on-surface-variant uppercase tracking-wider text-xs mb-4 pb-2 border-b border-outline-variant/30">
									<span class="material-symbols-outlined text-base">{group.icon}</span>
									{group.sector}
								</h3>
								<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									{#each group.items as item}
										<button
											type="button"
											class="text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all
											{selectedCategory === item.id
												? 'border-primary bg-primary text-on-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
												: 'border-outline-variant bg-surface hover:bg-surface-container hover:border-outline text-on-surface'}"
											onclick={() => selectedCategory = item.id as BusinessCategory}
										>
											{item.label}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Step 3: Business Profile -->
			{#if currentStep === 3}
				<section>
					<div class="flex items-center gap-2 mb-4">
						<span class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">3</span>
						<h2 class="text-xl font-bold text-on-surface">Your Business Details</h2>
					</div>
					<p class="text-on-surface-variant text-sm mb-6">
						Tell us a bit more so we can personalize your invoices. You can update these later in Settings.
					</p>

					<div class="space-y-5">
						<div>
							<label for="biz-name" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Business Name *</label>
							<input
								id="biz-name"
								type="text"
								bind:value={bizName}
								placeholder="E.g. Sharma Medical Store"
								required
								class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none"
							/>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
							<div>
								<label for="biz-phone" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Phone</label>
								<input
									id="biz-phone"
									type="tel"
									bind:value={bizPhone}
									placeholder="10-digit mobile number"
									class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none"
								/>
							</div>
							<div>
								<label for="biz-email" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Email</label>
								<input
									id="biz-email"
									type="email"
									bind:value={bizEmail}
									placeholder="business@example.com"
									class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none"
								/>
							</div>
						</div>

						<div>
							<label for="biz-address" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Address</label>
							<textarea
								id="biz-address"
								bind:value={bizAddress}
								rows="2"
								placeholder="Shop/Office address..."
								class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none resize-none"
							></textarea>
						</div>

						<div>
							<label for="biz-state" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">State</label>
							<select
								id="biz-state"
								bind:value={bizStateCode}
								class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none"
							>
								{#each INDIAN_STATES as state}
									<option value={state.code}>{state.code} – {state.name}</option>
								{/each}
							</select>
						</div>

						{#if taxType === 'gst_registered'}
							<div>
								<label for="biz-gstin" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">GSTIN</label>
								<input
									id="biz-gstin"
									type="text"
									bind:value={bizGstin}
									placeholder="22AAAAA0000A1Z5"
									maxlength="15"
									class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-mono font-medium transition-all outline-none"
								/>
							</div>
						{/if}
					</div>
				</section>
			{/if}
		</div>

		<!-- Bottom Navigation Bar -->
		<div class="fixed bottom-0 left-0 right-0 p-6 bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 flex justify-center">
			<div class="w-full max-w-4xl flex justify-between items-center">
				<!-- Back button -->
				<button
					type="button"
					onclick={() => goToStep(currentStep - 1)}
					class="px-6 py-2.5 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-all flex items-center gap-2
						{currentStep === 1 ? 'invisible' : ''}"
				>
					<span class="material-symbols-outlined text-sm">arrow_back</span>
					Back
				</button>

				<!-- Status hint -->
				<p class="text-sm text-on-surface-variant hidden sm:block">
					{#if currentStep === 1}
						Step 1 of 3 — Tax registration
					{:else if currentStep === 2}
						{#if !selectedCategory}Select a business type to continue.{:else}Great choice! Continue to your details.{/if}
					{:else}
						Almost done! Enter your business details.
					{/if}
				</p>

				<!-- Next / Finish button -->
				{#if currentStep < 3}
					<button
						type="button"
						disabled={currentStep === 2 && !selectedCategory}
						onclick={() => goToStep(currentStep + 1)}
						class="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
					>
						Next
						<span class="material-symbols-outlined">arrow_forward</span>
					</button>
				{:else}
					<button
						type="button"
						disabled={!bizName.trim() || isSaving}
						onclick={finishOnboarding}
						class="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
					>
						{#if isSaving}
							<span class="material-symbols-outlined animate-spin">refresh</span>
							Setting up...
						{:else}
							Go to Dashboard
							<span class="material-symbols-outlined">rocket_launch</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Padding for bottom bar -->
		<div class="h-24"></div>
	</div>
</div>
