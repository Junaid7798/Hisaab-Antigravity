<script lang="ts">
	import { page } from '$app/stores';
	import { isMobileDrawerOpen, closeMobileDrawer } from '$lib/stores/ui';

	const navItems = [
		{ href: '/dashboard', icon: 'dashboard', i18nKey: 'nav.dashboard', fallback: 'Dashboard' },
		{ href: '/patients', icon: 'group', i18nKey: 'nav.patients', fallback: 'Patients' },
		{ href: '/invoices/new', icon: 'receipt_long', i18nKey: 'nav.invoices', fallback: 'Invoices' },
		{ href: '/expenses', icon: 'payments', i18nKey: 'nav.expenses', fallback: 'Expenses' },
		{ href: '/reports', icon: 'analytics', i18nKey: 'nav.reports', fallback: 'Reports' },
		{ href: '/settings', icon: 'settings', i18nKey: 'nav.settings', fallback: 'Settings' }
	];

	import type { Business } from '$lib/db/index';
	import { activeBusinessId } from '$lib/stores/session';
	import { fade, slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';

	let { businesses = [], activeId = null }: { businesses: Business[], activeId: string | null } = $props();

	let activeBusiness = $derived(businesses.find(b => b.id === activeId));
	let switcherOpen = $state(false);

	function switchClinic(id: string) {
		$activeBusinessId = id;
		switcherOpen = false;
	}
</script>

<!-- Mobile Backdrop -->
{#if $isMobileDrawerOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
		onclick={closeMobileDrawer}
	></div>
{/if}

<aside class="h-screen w-64 fixed left-0 top-0 bg-surface-container flex flex-col p-4 gap-2 z-50 transition-transform duration-300 ease-in-out border-r border-surface-variant/40 lg:border-none
	{$isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}">
	
	<!-- Logo & Multi-Tenant Switcher -->
	<div class="mb-6 px-2 relative">
		<div class="flex items-start justify-between mb-4">
			<h1 class="text-2xl font-headline font-extrabold text-primary tracking-tight">Hisaab</h1>
			<button class="lg:hidden text-on-surface-variant hover:text-on-surface" onclick={closeMobileDrawer}>
				<span class="material-symbols-outlined text-2xl">close</span>
			</button>
		</div>

		<!-- Switcher Button -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div 
			class="relative flex items-center justify-between p-3 bg-surface rounded-xl border border-surface-variant shadow-[0_2px_8px_rgba(25,28,29,0.04)] cursor-pointer hover:border-primary/30 transition-colors"
			onclick={() => switcherOpen = !switcherOpen}
		>
			<div class="flex flex-col overflow-hidden">
				<span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">{$_('switcher.active_clinic', { default: 'Active Clinic' })}</span>
				<span class="text-sm font-semibold truncate text-on-surface">{activeBusiness ? activeBusiness.name : 'Select Clinic'}</span>
			</div>
			<span class="material-symbols-outlined text-on-surface-variant/70 transition-transform {switcherOpen ? 'rotate-180' : ''}">expand_more</span>
		</div>

		<!-- Switcher Dropdown Menu -->
		{#if switcherOpen}
			<div transition:slide={{ duration: 200 }} class="absolute top-full left-2 right-2 mt-2 bg-surface rounded-xl border border-surface-variant shadow-xl overflow-hidden z-50">
				<div class="max-h-48 overflow-y-auto">
					{#each businesses as biz}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_invalid_a_href a11y_no_static_element_interactions -->
						<div 
							class="px-4 py-3 hover:bg-surface-container-low cursor-pointer flex items-center justify-between transition-colors {activeId === biz.id ? 'bg-primary/5 text-primary' : ''}"
							onclick={() => switchClinic(biz.id)}
						>
							<span class="text-sm font-medium truncate">{biz.name}</span>
							{#if activeId === biz.id}
								<span class="material-symbols-outlined text-sm font-bold">check</span>
							{/if}
						</div>
					{/each}
				</div>
				<div class="border-t border-outline-variant/20 p-2">
					<!-- svelte-ignore a11y_invalid_a_href -->
					<a href="/settings" class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
						<span class="material-symbols-outlined text-sm">add_circle</span>
						{$_('switcher.add_clinic', { default: 'Add New Clinic' })}
					</a>
				</div>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex flex-col gap-1 flex-grow overflow-y-auto pb-4">
		{#each navItems as item}
			{@const isActive = $page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				onclick={() => {
					// Close drawer only if linking to a new page (rough check)
					if (window.innerWidth < 1024) closeMobileDrawer();
				}}
				class="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg transition-all duration-150 text-[15px] lg:text-sm font-body
					{isActive
						? 'bg-surface text-primary font-semibold shadow-sm border border-surface-variant'
						: 'text-on-surface-variant hover:bg-surface/50 hover:text-primary active:bg-surface-variant'}"
			>
				<span class="material-symbols-outlined text-[22px] lg:text-[20px]">{item.icon}</span>
				<span>{$_(item.i18nKey, { default: item.fallback })}</span>
			</a>
		{/each}
	</nav>

	<!-- New Invoice CTA -->
	<div class="mt-2 pt-4 border-t border-outline-variant/20">
		<a
			href="/invoices/new"
			onclick={closeMobileDrawer}
			class="w-full py-3 lg:py-2.5 px-4 bg-primary text-on-primary rounded-xl font-semibold text-[15px] lg:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
		>
			<span class="material-symbols-outlined text-base lg:text-sm">add</span>
			{$_('actions.new_invoice', { default: 'New Invoice' })}
		</a>
	</div>

	<!-- Bottom Links -->
	<div class="pt-3 border-t border-surface-variant/50 space-y-1 mt-2">
		<a href="/help" onclick={closeMobileDrawer} class="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary text-[13px] lg:text-xs transition-colors">
			<span class="material-symbols-outlined text-[20px] lg:text-[18px]">help</span>
			<span>{$_('nav.help', { default: 'Help Center' })}</span>
		</a>
	</div>
</aside>
