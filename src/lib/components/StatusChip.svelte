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

<span class="px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wide leading-none inline-flex items-center {styles[status] || styles['UNPAID']}">
	{$_(`status.${status.toLowerCase()}`, { default: status })}
</span>
