<script lang="ts">
	import { _ } from 'svelte-i18n';
	let { status }: { status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' } = $props();

	const styles: Record<string, string> = {
		PAID: 'bg-secondary-container text-secondary',
		UNPAID: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
		PARTIAL: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
		OVERDUE: 'bg-error-container text-error'
	};
</script>

<span class="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide {styles[status] || styles['UNPAID']}">
	{$_(`status.${status.toLowerCase()}`, { default: status })}
</span>
