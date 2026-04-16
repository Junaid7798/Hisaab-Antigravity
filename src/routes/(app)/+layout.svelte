<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopNav from '$lib/components/TopNav.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { getBusinesses, processRecurringSchedules } from '$lib/db/crud';
	import type { Business } from '$lib/db/index';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { getTerminology } from '$lib/utils/terminology';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { preferences } from '$lib/stores/preferences';
	import { closeMobileDrawer } from '$lib/stores/ui';
	import { exportDatabaseToJSON, triggerDownload } from '$lib/utils/export';
	
	let { children } = $props();
	let businesses = $state<Business[]>([]);
	let activeBusiness = $derived(businesses.find(b => b.id === $activeBusinessId) || businesses[0]);
	let sidebarCollapsed = $derived($preferences.sidebarCollapsed);
	let md = $state(false);

	onMount(async () => {
		md = window.innerWidth >= 768;
		const handleResize = () => md = window.innerWidth >= 768;
		window.addEventListener('resize', handleResize);

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
			
			// Auto Backup logic
			const prefs = $preferences;
			if (prefs.autoBackup) {
				const now = new Date();
				const lastBackup = prefs.lastBackupDate ? new Date(prefs.lastBackupDate) : new Date(0);
				let shouldBackup = false;
				const daysSince = (now.getTime() - lastBackup.getTime()) / (1000 * 3600 * 24);
				
				if (prefs.backupFrequency === 'daily' && daysSince >= 1) shouldBackup = true;
				else if (prefs.backupFrequency === 'weekly' && daysSince >= 7) shouldBackup = true;
				else if (prefs.backupFrequency === 'monthly' && daysSince >= 30) shouldBackup = true;
				
				if (shouldBackup) {
					setTimeout(async () => {
						try {
							const json = await exportDatabaseToJSON();
							const dateStr = now.toISOString().split('T')[0];
							triggerDownload(json, `hisaab-auto-backup-${dateStr}.json`);
							preferences.update(p => ({ ...p, lastBackupDate: now.toISOString() }));
						} catch (e) {
							console.error('Auto backup failed:', e);
						}
					}, 3000); // Wait 3s after load to not block UI
				}
			}
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && window.innerWidth < 1024) {
			closeMobileDrawer();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Sidebar {businesses} activeId={$activeBusinessId} collapsed={sidebarCollapsed} />
<TopNav userName="Admin" />
<Toast />
<CommandPalette />

<main 
	class="transition-all duration-200 ease-out
		pt-16 lg:pt-20 min-h-screen pb-20 lg:pb-4
		{sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
		px-3 sm:px-4 md:px-6 lg:px-8"
>
	{#key $page.url.pathname}
		<div 
			in:fade={{ duration: 150, delay: 150, easing: cubicOut }} 
			out:fade={{ duration: 150, easing: cubicOut }}
		>
			{@render children()}
		</div>
	{/key}
</main>

