<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import { getPatients, getProducts } from '$lib/db/crud';
	import { activeBusinessId } from '$lib/stores/session';
	import type { Patient, Product } from '$lib/db/index';

	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);

	let patients = $state<Patient[]>([]);
	let products = $state<Product[]>([]);

	interface CommandItem {
		id: string;
		label: string;
		icon: string;
		action: () => void;
		category: string;
		keywords: string[];
		sublabel?: string;
	}

	const commands: CommandItem[] = [
		{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard', action: () => navigate('/dashboard'), category: 'Navigation', keywords: ['home', 'main', 'overview'] },
		{ id: 'pos', label: 'POS Mode', icon: 'point_of_sale', action: () => navigate('/pos'), category: 'Quick Actions', keywords: ['sale', 'checkout', 'billing', 'counter'] },
		{ id: 'patients', label: 'Customers', icon: 'group', action: () => navigate('/patients'), category: 'Navigation', keywords: ['people', 'list', 'clients', 'patients'] },
		{ id: 'new-invoice', label: 'New Invoice', icon: 'add_circle', action: () => navigate('/invoices/new'), category: 'Quick Actions', keywords: ['create', 'bill', 'gst', 'billing'] },
		{ id: 'new-estimate', label: 'New Estimate', icon: 'description', action: () => navigate('/estimates/new'), category: 'Quick Actions', keywords: ['quote', 'quotation', 'proposal'] },
		{ id: 'new-subscription', label: 'New Subscription', icon: 'autorenew', action: () => navigate('/recurring/new'), category: 'Quick Actions', keywords: ['recurring', 'auto', 'schedule'] },
		{ id: 'inventory', label: 'Inventory', icon: 'inventory_2', action: () => navigate('/inventory'), category: 'Navigation', keywords: ['products', 'stock', 'items'] },
		{ id: 'suppliers', label: 'Suppliers', icon: 'local_shipping', action: () => navigate('/suppliers'), category: 'Navigation', keywords: ['vendor', 'purchase'] },
		{ id: 'expenses', label: 'Expenses', icon: 'account_balance_wallet', action: () => navigate('/expenses'), category: 'Navigation', keywords: ['spending', 'costs', 'money'] },
		{ id: 'reports', label: 'Reports', icon: 'bar_chart', action: () => navigate('/reports'), category: 'Navigation', keywords: ['analytics', 'charts', 'stats', 'revenue'] },
		{ id: 'intelligence', label: 'Intelligence', icon: 'monitoring', action: () => navigate('/analytics'), category: 'Navigation', keywords: ['ai', 'insights', 'health', 'anomaly'] },
		{ id: 'settings', label: 'Settings', icon: 'settings', action: () => navigate('/settings'), category: 'Navigation', keywords: ['config', 'profile', 'business', 'theme', 'backup'] },
		{ id: 'add-patient', label: 'Add Customer', icon: 'person_add', action: () => navigate('/patients'), category: 'Quick Actions', keywords: ['new', 'register', 'create'] },
		{ id: 'log-expense', label: 'Log Expense', icon: 'post_add', action: () => navigate('/expenses'), category: 'Quick Actions', keywords: ['add', 'track', 'spending'] },
	];

	let filteredCommands = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return commands.slice(0, 10);

		const matched: CommandItem[] = [];

		// Search commands
		for (const c of commands) {
			if (c.label.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))) {
				matched.push(c);
			}
		}

		// Search patients dynamically
		for (const p of patients) {
			if (p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q))) {
				matched.push({
					id: `patient-${p.id}`,
					label: p.name,
					icon: 'person',
					sublabel: p.phone || '',
					action: () => navigate(`/patients/${p.id}`),
					category: 'Customers',
					keywords: []
				});
			}
		}

		// Search products dynamically
		for (const p of products) {
			if (p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))) {
				matched.push({
					id: `product-${p.id}`,
					label: p.name,
					icon: 'inventory_2',
					sublabel: p.sku ? `SKU: ${p.sku}` : '',
					action: () => navigate('/inventory'),
					category: 'Products',
					keywords: []
				});
			}
		}

		return matched.slice(0, 14);
	});

	// Reset selection when filter changes
	$effect(() => {
		if (filteredCommands) {
			selectedIndex = 0;
		}
	});

	function navigate(path: string) {
		open = false;
		query = '';
		goto(path);
	}

	async function handleOpen() {
		if ($activeBusinessId) {
			patients = await getPatients($activeBusinessId);
			products = await getProducts($activeBusinessId);
		}
		open = true;
		query = '';
		selectedIndex = 0;
		setTimeout(() => inputRef?.focus(), 50);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Global shortcut: Ctrl+K / Cmd+K
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			if (open) {
				open = false;
				query = '';
			} else {
				handleOpen();
			}
			return;
		}

		if (!open) return;

		if (e.key === 'Escape') {
			open = false;
			query = '';
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % filteredCommands.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredCommands[selectedIndex]) {
				filteredCommands[selectedIndex].action();
			}
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Group commands by category
	let groupedCommands = $derived(() => {
		const groups: Record<string, CommandItem[]> = {};
		for (const cmd of filteredCommands) {
			if (!groups[cmd.category]) groups[cmd.category] = [];
			groups[cmd.category].push(cmd);
		}
		return groups;
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-[15vh]"
		transition:fade={{ duration: 150 }}
		onclick={() => { open = false; query = ''; }}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div
			class="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/10"
			transition:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Search Input -->
			<div class="flex items-center gap-3 px-5 py-4 border-b border-surface-container">
				<span class="material-symbols-outlined text-on-surface-variant">search</span>
				<input
					bind:this={inputRef}
					bind:value={query}
					type="text"
					placeholder={$_('command_palette.placeholder', { default: 'Search commands, customers, products...' })}
					class="flex-1 bg-transparent text-on-surface text-base font-medium placeholder:text-on-surface-variant/50 outline-none"
				/>
				<kbd class="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant tracking-wider">ESC</kbd>
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto py-2">
				{#if filteredCommands.length === 0}
					<div class="px-5 py-8 text-center">
						<span class="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">search_off</span>
						<p class="text-sm text-on-surface-variant">{$_('command_palette.no_results', { default: 'No matching commands' })}</p>
					</div>
				{:else}
					{@const groups = groupedCommands()}
					{#each Object.entries(groups) as [category, items]}
						<p class="px-5 pt-3 pb-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{category}</p>
						{#each items as cmd, i (cmd.id)}
							{@const globalIndex = filteredCommands.indexOf(cmd)}
							<button
								class="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors {globalIndex === selectedIndex ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container-low'}"
								onclick={() => cmd.action()}
								onmouseenter={() => { selectedIndex = globalIndex; }}
							>
								<span class="material-symbols-outlined text-lg {globalIndex === selectedIndex ? 'text-primary' : 'text-on-surface-variant'}">{cmd.icon}</span>
								<div class="flex-1 min-w-0">
									<span class="text-sm font-semibold">{cmd.label}</span>
									{#if cmd.sublabel}
										<span class="text-[10px] text-on-surface-variant/60 ml-2">{cmd.sublabel}</span>
									{/if}
								</div>
								{#if globalIndex === selectedIndex}
									<kbd class="text-[10px] font-bold text-primary/60 tracking-wider">↵</kbd>
								{/if}
							</button>
						{/each}
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-5 py-3 border-t border-surface-container flex items-center justify-between">
				<div class="flex items-center gap-4 text-[10px] text-on-surface-variant font-semibold">
					<span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-surface-container-high rounded text-[9px] font-bold">↑↓</kbd> {$_('command_palette.navigate', { default: 'Navigate' })}</span>
					<span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-surface-container-high rounded text-[9px] font-bold">↵</kbd> {$_('command_palette.select', { default: 'Select' })}</span>
					<span class="flex items-center gap-1"><kbd class="px-1.5 py-0.5 bg-surface-container-high rounded text-[9px] font-bold">Esc</kbd> {$_('command_palette.close', { default: 'Close' })}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
