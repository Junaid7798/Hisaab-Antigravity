<script lang="ts">
	import Modal from './Modal.svelte';
	import { _ } from 'svelte-i18n';

	let { 
		show = false, 
		title = 'Confirm Action', 
		message = 'Are you sure you want to proceed?', 
		confirmText = 'Confirm', 
		cancelText = 'Cancel',
		destructive = false,
		onConfirm, 
		onCancel 
	} = $props();

	function handleConfirm() {
		if (onConfirm) onConfirm();
	}

	function handleCancel() {
		if (onCancel) onCancel();
	}
</script>

<Modal {show} {title} onclose={handleCancel}>
	<div class="px-6 pb-6 pt-2">
		<p class="text-on-surface-variant font-body mb-6">{message}</p>
		
		<div class="flex justify-end gap-3">
			<button 
				type="button" 
				class="px-6 py-2.5 font-bold text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
				onclick={handleCancel}
			>
				{cancelText}
			</button>
			<button 
				type="button" 
				class="px-6 py-2.5 font-bold text-sm rounded-lg transition-transform active:scale-[0.98] shadow-sm 
					{destructive ? 'bg-error text-on-error hover:opacity-90' : 'bg-primary text-on-primary hover:opacity-90'}"
				onclick={handleConfirm}
			>
				{confirmText}
			</button>
		</div>
	</div>
</Modal>
