<script lang="ts">
	import { getInitials } from '$lib/utils/helpers';

	let { name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' } = $props();

	const sizes: Record<string, string> = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-9 h-9 text-sm',
		lg: 'w-12 h-12 text-base'
	};
</script>

<div class="rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold {sizes[size]}">
	{getInitials(name)}
</div>
