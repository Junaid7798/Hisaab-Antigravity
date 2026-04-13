<script lang="ts">
	import { toggleMobileDrawer } from '$lib/stores/ui';
	import { locale, _ } from 'svelte-i18n';

	let { userName = 'Admin' }: { userName?: string } = $props();
	let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

	function changeLanguage(event: Event) {
		const target = event.target as HTMLSelectElement;
		const val = target.value;
		$locale = val;
		if (typeof window !== 'undefined') {
			localStorage.setItem('locale', val);
		}
	}

	$effect(() => {
		const online = () => (isOnline = true);
		const offline = () => (isOnline = false);
		window.addEventListener('online', online);
		window.addEventListener('offline', offline);
		return () => {
			window.removeEventListener('online', online);
			window.removeEventListener('offline', offline);
		};
	});
</script>

<header class="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 bg-surface/90 backdrop-blur-md border-b border-surface-variant/40 flex items-center justify-between px-4 lg:px-8 z-30 transition-all">
	
	<!-- Left Side: Hamburger (Mobile) + Search -->
	<div class="flex items-center gap-3 flex-grow">
		<button class="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full active:scale-95 transition-all" onclick={toggleMobileDrawer}>
			<span class="material-symbols-outlined text-[26px]">menu</span>
		</button>
		
		<div class="hidden sm:flex relative w-full max-w-md ml-1 lg:ml-0">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg">search</span>
			<input
				type="text"
				placeholder="Search patients or invoices..."
				class="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 font-body transition-colors"
			/>
		</div>
	</div>

	<!-- Right Side -->
	<div class="flex items-center gap-3 lg:gap-5">
		<!-- Language Switcher -->
		<div class="hidden md:flex items-center">
			<select 
				class="bg-surface-container-low border-none rounded-lg py-1.5 px-3 text-xs font-bold text-on-surface-variant focus:ring-0 cursor-pointer outline-none"
				onchange={changeLanguage}
				value={$locale || 'en'}
			>
				<option value="en">English</option>
				<option value="hi">हिंदी</option>
				<option value="mr">मराठी</option>
			</select>
		</div>

		<!-- Sync Status (Hidden on very small screens) -->
		<div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
			{isOnline ? 'bg-secondary-container text-secondary' : 'bg-error-container text-error'}">
			<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">
				{isOnline ? 'cloud_done' : 'cloud_off'}
			</span>
			<span>{isOnline ? $_('status.online', { default: 'Online' }) : $_('status.offline', { default: 'Offline' })}</span>
		</div>
		<!-- Mobile-only sync dot -->
		<div class="sm:hidden w-3 h-3 rounded-full {isOnline ? 'bg-secondary' : 'bg-error'} shadow-sm"></div>

		<!-- Notifications -->
		<button class="w-10 h-10 flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-surface-container rounded-full transition-all relative active:scale-95">
			<span class="material-symbols-outlined">notifications</span>
		</button>

		<!-- User -->
		<div class="flex items-center gap-2 pl-2 lg:pl-4 border-l border-outline-variant/30">
			<div class="hidden sm:block text-right">
				<p class="text-xs font-bold font-headline leading-none">{userName}</p>
				<p class="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-0.5">Admin</p>
			</div>
			<div class="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs lg:text-sm">
				{userName.slice(0, 1).toUpperCase()}
			</div>
		</div>
	</div>
</header>
