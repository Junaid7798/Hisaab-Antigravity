<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopNav from '$lib/components/TopNav.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { getBusinesses, processRecurringSchedules } from '$lib/db/crud';
	import type { Business } from '$lib/db/index';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { getTerminology } from '$lib/utils/terminology';
	import { onMount, setContext } from 'svelte';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	let { children } = $props();
	let businesses = $state<Business[]>([]);
	let activeBusiness = $derived(businesses.find(b => b.id === $activeBusinessId) || businesses[0]);

	onMount(async () => {
		businesses = await getBusinesses();
		
		try {
			await processRecurringSchedules();
		} catch (err) {
			console.error('Failed to process recurring schedules:', err);
		}

		if (businesses.length > 0 && !$activeBusinessId) {
			$activeBusinessId = businesses[0].id;
		}
		
		const currentBusiness = businesses.find(b => b.id === $activeBusinessId) || businesses[0];
		if (!currentBusiness || !currentBusiness.business_category) {
			goto('/onboarding');
		} else {
			activeTerminology.set(getTerminology(currentBusiness.business_category));
		}
	});
</script>

<Sidebar {businesses} activeId={$activeBusinessId} />
<TopNav userName="Admin" />
<Toast />
<CommandPalette />

<main class="ml-0 lg:ml-64 mt-16 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)] transition-all overflow-hidden relative">
	{#key $page.url.pathname}
		<div in:fade={{ duration: 300, delay: 150, easing: cubicOut }} out:fade={{ duration: 150 }} class="h-full">
			{@render children()}
		</div>
	{/key}
</main>
