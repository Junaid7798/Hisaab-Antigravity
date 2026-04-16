<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	let {
		icon = 'inbox',
		title = 'No Data',
		description = 'There is nothing here yet.',
		actionLabel = '',
		actionHref = '',
		onclick = undefined
	} = $props();
</script>

<div class="flex flex-col items-center justify-center p-12 text-center" in:fade={{ duration: 400, easing: cubicOut }}>
	<div class="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6 text-on-surface-variant/50" in:fly={{ y: 10, duration: 400, delay: 100, easing: cubicOut }}>
		<span class="material-symbols-outlined text-[40px]">{icon}</span>
	</div>
	<h4 class="text-xl font-headline font-bold text-on-surface mb-2" in:fly={{ y: 10, duration: 400, delay: 200, easing: cubicOut }}>{title}</h4>
	<p class="text-sm text-on-surface-variant max-w-sm mb-8" in:fly={{ y: 10, duration: 400, delay: 300, easing: cubicOut }}>{description}</p>
	{#if actionLabel}
		{#if actionHref}
			<a
				href={actionHref}
				class="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
				in:fly={{ y: 10, duration: 400, delay: 400, easing: cubicOut }}
			>
				{actionLabel}
			</a>
		{:else if onclick}
			<button
				onclick={onclick}
				class="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
				in:fly={{ y: 10, duration: 400, delay: 400, easing: cubicOut }}
			>
				{actionLabel}
			</button>
		{/if}
	{/if}
</div>
