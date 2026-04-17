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

<div class="flex flex-col items-center justify-center px-8 py-14 text-center" in:fade={{ duration: 400, easing: cubicOut }}>
	<div class="w-20 h-20 bg-surface-container rounded-2xl flex items-center justify-center mb-5 text-on-surface-variant/50" in:fly={{ y: 10, duration: 400, delay: 100, easing: cubicOut }}>
		<span class="material-symbols-outlined text-[40px]">{icon}</span>
	</div>
	<h4 class="text-lg lg:text-xl font-headline font-bold text-on-surface mb-2" in:fly={{ y: 10, duration: 400, delay: 200, easing: cubicOut }}>{title}</h4>
	<p class="text-sm text-on-surface-variant max-w-xs lg:max-w-sm mb-7 leading-relaxed" in:fly={{ y: 10, duration: 400, delay: 300, easing: cubicOut }}>{description}</p>
	{#if actionLabel}
		{#if actionHref}
			<a
				href={actionHref}
				class="bg-primary text-on-primary px-6 py-3 min-h-[48px] rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] inline-flex items-center gap-2 text-[15px]"
				in:fly={{ y: 10, duration: 400, delay: 400, easing: cubicOut }}
			>
				{actionLabel}
			</a>
		{:else if onclick}
			<button
				onclick={onclick}
				class="bg-primary text-on-primary px-6 py-3 min-h-[48px] rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] inline-flex items-center gap-2 text-[15px]"
				in:fly={{ y: 10, duration: 400, delay: 400, easing: cubicOut }}
			>
				{actionLabel}
			</button>
		{/if}
	{/if}
</div>
