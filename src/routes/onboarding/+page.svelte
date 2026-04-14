<script lang="ts">
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { categoryGroups, type BusinessCategory, type TaxRegistrationType } from '$lib/utils/terminology';

	let taxType = $state<TaxRegistrationType>('unregistered');
	let selectedCategory = $state<BusinessCategory | null>(null);
	let isSaving = $state(false);

	async function finishOnboarding() {
		if (!selectedCategory) return;
		isSaving = true;

		try {
			// Find existing business or create
			let businesses = await db.businesses.toArray();
			let targetBusiness = businesses[0]; // for simplicity, pick first in offline mode
			
			if (targetBusiness) {
				await db.businesses.update(targetBusiness.id, {
					business_category: selectedCategory,
					tax_registration_type: taxType,
					// find sector
					industry_sector: categoryGroups.find(g => g.items.some(i => i.id === selectedCategory))?.sector || 'Other'
				});
			} else {
				// Initialize a dummy business
				await db.businesses.add({
					id: crypto.randomUUID(),
					owner_id: 'user_123',
					name: 'My Business',
					gstin: '',
					state_code: '27',
					address: '',
					phone: '',
					email: '',
					logo_base64: '',
					invoice_counter: 1,
					fy_start: new Date().toISOString(),
					business_category: selectedCategory,
					tax_registration_type: taxType,
					industry_sector: categoryGroups.find(g => g.items.some(i => i.id === selectedCategory))?.sector || 'Other',
					is_deleted: false,
					created_at: new Date().toISOString(),
					last_modified: new Date().toISOString()
				});
			}

			goto('/dashboard');
		} catch (e) {
			console.error("Failed to complete onboarding:", e);
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Welcome to Hisaab - Let's set up your business</title>
</svelte:head>

<div class="min-h-screen bg-surface flex flex-col items-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-4xl space-y-8">
		<div class="text-center">
			<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container text-primary mb-4">
				<span class="material-symbols-outlined text-3xl">rocket_launch</span>
			</div>
			<h1 class="text-4xl font-headline font-bold text-on-surface mb-2">Welcome to Hisaab</h1>
			<p class="text-xl text-on-surface-variant font-medium">To give you the best experience, tell us about your business.</p>
		</div>

		<div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-12">
			
			<!-- Step 1: Tax Registration -->
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

			<hr class="border-outline-variant/50" />

			<!-- Step 2: Business Category -->
			<section>
				<div class="flex items-center gap-2 mb-4">
					<span class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">2</span>
					<h2 class="text-xl font-bold text-on-surface">Business Type</h2>
				</div>
				<p class="text-on-surface-variant text-sm mb-6">
					We will personalize the app specifically for your industry.
				</p>

				<div class="space-y-10">
					{#each categoryGroups as group}
						<div>
							<h3 class="flex items-center gap-2 font-bold text-on-surface-variant uppercase tracking-wider text-xs mb-4 pb-2 border-b border-outline-variant/30">
								<span class="material-symbols-outlined text-base"> {group.icon} </span>
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
		</div>

		<div class="fixed bottom-0 left-0 right-0 p-6 bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 flex justify-center">
			<div class="w-full max-w-4xl flex justify-between items-center">
				<p class="text-sm text-on-surface-variant">
					{#if !selectedCategory}
						Please select a business type to continue.
					{:else}
						Ready to set up your personalized workspace!
					{/if}
				</p>
				<button 
					type="button"
					disabled={!selectedCategory || isSaving}
					class="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
					onclick={finishOnboarding}
				>
					{#if isSaving}
						<span class="material-symbols-outlined animate-spin">refresh</span>
						Setting up...
					{:else}
						Continue to Dashboard
						<span class="material-symbols-outlined">arrow_forward</span>
					{/if}
				</button>
			</div>
		</div>
		
		<!-- Padding for bottom nav -->
		<div class="h-24"></div>
	</div>
</div>
