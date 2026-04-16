<script lang="ts">
	import { page } from '$app/stores';
	import { isMobileDrawerOpen, closeMobileDrawer } from '$lib/stores/ui';
	import type { Business } from '$lib/db/index';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { fade, slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import { getEffectiveFeatures, type BusinessFeatures } from '$lib/utils/business-features';
	import { preferences } from '$lib/stores/preferences';

	import { onMount } from 'svelte';

	let { businesses = [], activeId = null, collapsed = false }: { businesses: Business[], activeId: string | null, collapsed?: boolean } = $props();

	let windowWidth = $state(1920);

	onMount(() => {
		windowWidth = window.innerWidth;
		const handleResize = () => windowWidth = window.innerWidth;
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	let activeBusiness = $derived(businesses.find(b => b.id === activeId));
	let switcherOpen = $state(false);
	
	let features = $derived<BusinessFeatures>(activeBusiness 
		? getEffectiveFeatures(activeBusiness.id, activeBusiness.business_category)
		: getEffectiveFeatures(undefined, undefined));

	let navItems = $derived([
		{ href: '/dashboard', icon: 'dashboard', i18nKey: 'nav.dashboard', fallback: 'Dashboard', show: true },
		{ href: '/pos', icon: 'point_of_sale', i18nKey: 'nav.pos', fallback: 'POS Mode', show: features.hasPOS },
		{ href: '/patients', icon: 'group', i18nKey: 'nav.customers', fallback: $activeTerminology.people, show: features.hasCustomers },
		{ href: '/invoices', icon: 'receipt_long', i18nKey: 'nav.invoices', fallback: 'Invoices', show: true },
		{ href: '/estimates/new', icon: 'description', i18nKey: 'nav.estimates', fallback: 'Estimates', show: features.hasEstimates },
		{ href: '/recurring', icon: 'autorenew', i18nKey: 'nav.recurring', fallback: 'Subscriptions', show: features.hasRecurring },
		{ href: '/inventory', icon: 'inventory_2', i18nKey: 'nav.inventory', fallback: $activeTerminology.items, show: features.hasInventory },
		{ href: '/suppliers', icon: 'local_shipping', i18nKey: 'nav.suppliers', fallback: 'Suppliers', show: features.hasSuppliers },
		{ href: '/purchases/new', icon: 'shopping_cart', i18nKey: 'nav.purchases', fallback: 'Purchases', show: features.hasPurchases },
		{ href: '/expenses', icon: 'payments', i18nKey: 'nav.expenses', fallback: 'Expenses', show: true },
		{ href: '/staff', icon: 'badge', i18nKey: 'nav.staff', fallback: 'Staff', show: true },
		{ href: '/attendance', icon: 'fingerprint', i18nKey: 'nav.attendance', fallback: 'Attendance', show: true },
		{ href: '/tasks', icon: 'task', i18nKey: 'nav.tasks', fallback: 'Tasks', show: true },
		{ href: '/gst', icon: 'receipt', i18nKey: 'nav.gst', fallback: 'GST', show: features.hasGST },
		{ href: '/reports', icon: 'analytics', i18nKey: 'nav.reports', fallback: 'Reports', show: true },
		{ href: '/analytics', icon: 'monitoring', i18nKey: 'nav.analytics', fallback: 'Intelligence', show: true },
		{ href: '/settings', icon: 'settings', i18nKey: 'nav.settings', fallback: 'Settings', show: true }
	].filter(item => item.show));

	const mobileNavItems = $derived([
		{ href: '/dashboard', icon: 'dashboard', label: 'Home' },
		{ href: '/invoices', icon: 'receipt_long', label: 'Invoices' },
		{ href: '/expenses', icon: 'payments', label: 'Expenses' },
		{ href: '/patients', icon: 'group', label: $activeTerminology.people }
	]);

	function switchBusiness(id: string) {
		$activeBusinessId = id;
		switcherOpen = false;
	}

	function toggleSidebar() {
		preferences.update(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }));
	}
</script>

<!-- Mobile Bottom Navigation -->
<nav class="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-container border-t border-surface-variant/40 safe-area-pb">
	<div class="flex items-center justify-around py-1.5 px-2">
		{#each mobileNavItems as item}
			{@const isActive = $page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/dashboard')}
			<a
				href={item.href}
				onclick={closeMobileDrawer}
				class="flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-all {isActive ? 'text-primary' : 'text-on-surface-variant'}"
			>
				<span class="material-symbols-outlined text-[22px] transition-transform {isActive ? 'scale-110' : ''}" style="font-variation-settings: 'FILL' {isActive ? 1 : 0}">{item.icon}</span>
				<span class="text-[10px] font-semibold">{item.label}</span>
			</a>
		{/each}
		
		<!-- More button -->
		<button
			onclick={() => $isMobileDrawerOpen = true}
			class="flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-all text-on-surface-variant"
			aria-label="More navigation"
		>
			<span class="material-symbols-outlined text-[22px]">more_horiz</span>
			<span class="text-[10px] font-semibold">More</span>
		</button>
	</div>
</nav>

<!-- Mobile Backdrop -->
{#if $isMobileDrawerOpen}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
		onclick={closeMobileDrawer}
		role="presentation"
	></div>
{/if}

<!-- Desktop Sidebar -->
<aside class="h-screen fixed left-0 top-0 bg-surface-container flex flex-col z-50 transition-all duration-300 ease-out border-r border-surface-variant/40
	{windowWidth < 1024 ? 'w-64' : (collapsed ? 'w-20' : 'w-64')}
	{$isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}">
	
	<!-- Logo & Multi-Tenant Switcher -->
	<div class="mb-4 px-3 lg:px-4 pt-4 relative">
		<div class="flex items-center justify-between mb-3">
			{#if !collapsed}
				<h1 class="text-2xl font-headline font-extrabold text-primary tracking-tight">Hisaab</h1>
			{:else}
				<span class="text-2xl font-headline font-extrabold text-primary">H</span>
			{/if}
			<div class="flex items-center gap-2">
				{#if windowWidth >= 1024}
					<button 
						onclick={toggleSidebar}
						class="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
						title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					>
						<span class="material-symbols-outlined text-xl transition-transform {collapsed ? 'rotate-180' : ''}">chevron_left</span>
					</button>
				{/if}
				<button class="lg:hidden w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface" onclick={closeMobileDrawer}>
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>
		</div>

		<button 
			type="button"
			class="flex items-center justify-between w-full px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors {collapsed ? 'justify-center' : ''}"
			onclick={() => switcherOpen = !switcherOpen}
			aria-label="Switch business"
		>
			{#if !collapsed}
				<div class="flex flex-col overflow-hidden">
					<span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">{$_('switcher.active_business', { default: `Active ${$activeTerminology.venue}` })}</span>
					<span class="text-sm font-semibold truncate text-on-surface">{activeBusiness ? activeBusiness.name : 'Select Business'}</span>
				</div>
				<span class="material-symbols-outlined text-on-surface-variant/70 transition-transform {switcherOpen ? 'rotate-180' : ''}">expand_more</span>
			{:else}
				<span class="material-symbols-outlined text-on-surface-variant text-xl">swap_vert</span>
			{/if}
		</button>

		<!-- Switcher Dropdown Menu -->
		{#if switcherOpen}
			<div transition:slide={{ duration: 200 }} class="absolute top-full left-3 right-3 mt-2 bg-surface rounded-xl border border-surface-variant shadow-xl overflow-hidden z-50">
				<div class="max-h-48 overflow-y-auto">
					{#each businesses as biz}
						<button 
							type="button"
							class="w-full px-4 py-3 hover:bg-surface-container-low cursor-pointer flex items-center justify-between transition-colors {activeId === biz.id ? 'bg-primary/5 text-primary' : ''}"
							onclick={() => switchBusiness(biz.id)}
						>
							<span class="text-sm font-medium truncate">{biz.name}</span>
							{#if activeId === biz.id}
								<span class="material-symbols-outlined text-sm font-bold">check</span>
							{/if}
						</button>
					{/each}
				</div>
				<div class="border-t border-outline-variant/20 p-2">
					<a href="/settings" class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
						<span class="material-symbols-outlined text-sm">add_circle</span>
						{$_('switcher.add_business', { default: `Add New ${$activeTerminology.venue}` })}
					</a>
				</div>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex flex-col gap-1 flex-grow overflow-y-auto px-2 lg:px-3 pb-4">
		{#each navItems as item}
			{@const isActive = $page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				onclick={() => {
					if (window.innerWidth < 1024) closeMobileDrawer();
				}}
				class="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl transition-all duration-150 text-[15px] lg:text-sm font-body
					{isActive
						? 'bg-surface text-primary font-semibold shadow-sm border border-surface-variant'
						: 'text-on-surface-variant hover:bg-surface/50 hover:text-primary active:bg-surface-variant'}
					{collapsed ? 'justify-center' : ''}"
				title={collapsed ? $_(item.i18nKey, { default: item.fallback }) : undefined}
			>
				<span class="material-symbols-outlined text-[22px] lg:text-[20px] shrink-0" style="font-variation-settings: 'FILL' {isActive ? 1 : 0}">{item.icon}</span>
				{#if !collapsed}
					<span>{$_(item.i18nKey, { default: item.fallback })}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- New Invoice CTA -->
	{#if !collapsed}
		<div class="mt-2 pt-4 px-3 lg:px-4 border-t border-outline-variant/20">
			<a
				href="/invoices/new"
				onclick={closeMobileDrawer}
				class="w-full py-3 lg:py-2.5 px-4 bg-primary text-on-primary rounded-xl font-semibold text-[15px] lg:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
			>
				<span class="material-symbols-outlined text-base lg:text-sm">add</span>
				{$_('actions.new_invoice', { default: 'New Invoice' })}
			</a>
		</div>
	{/if}

	<!-- Bottom Links -->
	{#if !collapsed}
		<div class="pt-3 px-3 lg:px-4 border-t border-surface-variant/50 space-y-1 mt-2">
			<a href="/help" onclick={closeMobileDrawer} class="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary text-[13px] lg:text-xs transition-colors">
				<span class="material-symbols-outlined text-[20px] lg:text-[18px]">help</span>
				<span>{$_('nav.help', { default: 'Help Center' })}</span>
			</a>
		</div>
	{/if}
</aside>

<style>
	.safe-area-pb {
		padding-bottom: env(safe-area-inset-bottom, 0.5rem);
	}
	
	@media (min-width: 1024px) {
		nav.fixed.bottom-0 {
			display: none;
		}
	}
</style>
