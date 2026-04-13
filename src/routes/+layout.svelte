<script lang="ts">
	import './layout.css';
	import { setupI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	
	let { children } = $props();

	setupI18n();
</script>

{#if $isLoading}
	<div class="h-screen w-screen flex items-center justify-center bg-surface">
		<div class="animate-pulse flex flex-col items-center gap-4">
			<div class="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
			<p class="text-sm font-label text-on-surface-variant tracking-widest font-bold uppercase">Loading Hisaab...</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
