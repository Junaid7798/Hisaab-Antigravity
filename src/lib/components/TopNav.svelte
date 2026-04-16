<script lang="ts">
	import { toggleMobileDrawer } from '$lib/stores/ui';
	import { locale, _ } from 'svelte-i18n';
	import { preferences } from '$lib/stores/preferences';
	import { syncStatus, lastSyncError } from '$lib/stores/sync';

	let { userName = 'Admin' }: { userName?: string } = $props();
	let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
	let scrolled = $state(false);

	function changeLanguage(event: Event) {
		const target = event.target as HTMLSelectElement;
		const val = target.value;
		$locale = val;
		if (typeof window !== 'undefined') {
			localStorage.setItem('locale', val);
		}
	}

	$effect(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};
		
		window.addEventListener('scroll', handleScroll, { passive: true });
		
		const online = () => (isOnline = true);
		const offline = () => (isOnline = false);
		window.addEventListener('online', online);
		window.addEventListener('offline', offline);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('online', online);
			window.removeEventListener('offline', offline);
		};
	});
</script>

<header 
	class="topnav-header fixed top-0 right-0 h-14 lg:h-16 bg-surface/80 lg:bg-surface/90 backdrop-blur-xl border-b transition-all duration-300 z-30
		{scrolled ? 'border-surface-variant/60 shadow-lg' : 'border-surface-variant/40'}"
>
	
	<!-- Left Side: Hamburger (Mobile) + Search -->
	<div class="flex items-center gap-2 lg:gap-3 h-full px-3 lg:px-6">
		<button 
			class="lg:hidden w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full active:scale-95 transition-all" 
			onclick={toggleMobileDrawer}
			aria-label="Open menu"
		>
			<span class="material-symbols-outlined text-[22px]">menu</span>
		</button>
		
		<!-- Search - Hidden on small mobile, visible from sm+ -->
		<div class="hidden sm:flex relative flex-1 max-w-xs lg:max-w-md">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg">search</span>
			<input
				type="text"
				placeholder="Search..."
				class="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 font-body transition-colors"
			/>
			<!-- Keyboard shortcut hint -->
			<kbd class="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 bg-surface-container rounded text-[10px] text-on-surface-variant">
				<span class="text-[10px]">⌘</span>K
			</kbd>
		</div>
		
		<!-- Mobile search button -->
		<button class="sm:hidden w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all" aria-label="Search">
			<span class="material-symbols-outlined text-[20px]">search</span>
		</button>
	</div>

	<!-- Right Side -->
	<div class="flex items-center gap-1 sm:gap-2 lg:gap-4 h-full px-2 sm:px-3 lg:px-6">
		<!-- Language Switcher - Hidden on mobile -->
		<div class="hidden lg:flex items-center">
			<select 
				class="bg-surface-container-low border-none rounded-lg py-1.5 px-3 text-xs font-bold text-on-surface-variant focus:ring-0 cursor-pointer outline-none"
				onchange={changeLanguage}
				value={$locale || 'en'}
			>
				<option value="en">EN</option>
				<option value="hi">HI</option>
				<option value="mr">MR</option>
			</select>
		</div>

		<!-- Sync Status -->
		{#if !isOnline}
			<div class="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container/80 text-error">
				<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">cloud_off</span>
				<span class="hidden sm:inline">Offline</span>
			</div>
		{:else if $syncStatus === 'syncing'}
			<div class="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-container/80 text-primary">
				<span class="material-symbols-outlined text-sm animate-spin">sync</span>
				<span class="hidden md:inline">Syncing</span>
			</div>
		{:else if $syncStatus === 'error'}
			<div class="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container/80 text-error" title={$lastSyncError || 'Sync failed'}>
				<span class="material-symbols-outlined text-sm">sync_problem</span>
			</div>
		{:else}
			<div class="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
				{$syncStatus === 'success' ? 'bg-tertiary-container/80 text-tertiary' : 'bg-surface-container-high text-on-surface-variant'}">
				<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">
					{$syncStatus === 'success' ? 'cloud_done' : 'cloud'}
				</span>
				<span class="hidden md:inline">
					{$syncStatus === 'success' ? 'Synced' : $_('status.online', { default: 'Online' })}
				</span>
			</div>
		{/if}

		<!-- Notifications - hidden on very small screens -->
		<button class="hidden sm:flex w-9 h-9 items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-surface-container rounded-full transition-all relative active:scale-95" aria-label="Notifications">
			<span class="material-symbols-outlined text-[20px]">notifications</span>
			<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
		</button>

		<!-- User Avatar -->
		<a href="/settings" class="flex items-center gap-2 pl-1 sm:pl-2 lg:pl-4 lg:border-l lg:border-outline-variant/30 hover:bg-surface-container rounded-full transition-colors" aria-label="Settings">
			<div class="hidden lg:block text-right">
				<p class="text-xs font-bold font-headline leading-none">{userName}</p>
				<p class="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-0.5">Admin</p>
			</div>
			<div class="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center text-white font-bold text-xs shadow-md">
				{userName.slice(0, 1).toUpperCase()}
			</div>
		</a>
	</div>
</header>

<style>
	.bg-primary-gradient {
		background: linear-gradient(135deg, var(--sys-primary) 0%, var(--sys-primary-container) 100%);
	}
	.topnav-header {
		left: 0;
		display: flex;
		justify-content: space-between;
	}
	@media (min-width: 1024px) {
		.topnav-header {
			left: auto;
		}
	}
</style>
