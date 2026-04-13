<script lang="ts">
	interface Props {
		width?: string;
		height?: string;
		rounded?: string;
		class?: string;
	}

	let { width = '100%', height = '1rem', rounded = 'rounded-lg', class: className = '' }: Props = $props();
</script>

<div
	class="animate-pulse bg-surface-container-high/60 {rounded} {className}"
	style="width: {width}; height: {height};"
	aria-hidden="true"
></div>

<style>
	@keyframes shimmer {
		0% { opacity: 0.4; }
		50% { opacity: 0.7; }
		100% { opacity: 0.4; }
	}
	div {
		animation: shimmer 1.8s ease-in-out infinite;
	}
</style>
