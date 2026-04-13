<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('help.title')} | Hisaab</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="mb-10">
		<h2 class="text-3xl font-headline font-bold text-on-surface">{$_('help.title')}</h2>
		<p class="text-on-surface-variant font-body mt-1">{$_('help.subtitle')}</p>
	</div>

	<div class="space-y-6">
		<div class="bg-surface-container-lowest p-8 rounded-xl">
			<h3 class="font-headline font-bold text-lg mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">play_circle</span>
				{$_('help.getting_started')}
			</h3>
			<div class="space-y-3 text-sm text-on-surface-variant">
				<p><strong class="text-on-surface">{$_('help.gs_1')}</strong> {$_('help.gs_1_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gs_2')}</strong> {$_('help.gs_2_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gs_3')}</strong> {$_('help.gs_3_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gs_4')}</strong> {$_('help.gs_4_desc')}</p>
			</div>
		</div>

		<div class="bg-surface-container-lowest p-8 rounded-xl">
			<h3 class="font-headline font-bold text-lg mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">calculate</span>
				{$_('help.gst_rules')}
			</h3>
			<div class="space-y-3 text-sm text-on-surface-variant">
				<p><strong class="text-on-surface">{$_('help.gst_1')}</strong> {$_('help.gst_1_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gst_2')}</strong> {$_('help.gst_2_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gst_3')}</strong> {$_('help.gst_3_desc')}</p>
				<p><strong class="text-on-surface">{$_('help.gst_4')}</strong> {$_('help.gst_4_desc')}</p>
			</div>
		</div>

		<div class="bg-surface-container-lowest p-8 rounded-xl">
			<h3 class="font-headline font-bold text-lg mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">cloud_off</span>
				{$_('help.offline_mode')}
			</h3>
			<div class="space-y-3 text-sm text-on-surface-variant">
				<p>{$_('help.off_1')}</p>
				<p>{$_('help.off_2')}</p>
				<p>{$_('help.off_3')}</p>
			</div>
		</div>
	</div>
</div>
