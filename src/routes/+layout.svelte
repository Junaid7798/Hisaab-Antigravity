<script lang="ts">
	import './layout.css';
	import { setupI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { initSyncEngine } from '$lib/db/sync';
	import { preferences } from '$lib/stores/preferences';
	import { theme } from '$lib/stores/theme';
	import { supabase } from '$lib/db/supabase';
	import { currentUser, currentSession, authLoading } from '$lib/stores/auth';

	let { children } = $props();

	setupI18n();

	onMount(async () => {
		// Bootstrap theme
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
		if (savedTheme) theme.set(savedTheme);

		// Check if Supabase is configured
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
		const isSupabaseConfigured = supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co';

		if (!isSupabaseConfigured) {
			// Dev bypass: no auth required when Supabase is not configured
			authLoading.set(false);
			initSyncEngine();
			return;
		}

		// Bootstrap Supabase session
		try {
			const { data } = await supabase.auth.getSession();
			currentSession.set(data.session);
			currentUser.set(data.session?.user ?? null);

			// Listen for auth state changes (login, logout, token refresh)
			supabase.auth.onAuthStateChange((_event, session) => {
				currentSession.set(session);
				currentUser.set(session?.user ?? null);
			});
		} catch {
			// Supabase not configured — offline-only mode, proceed without auth
		} finally {
			authLoading.set(false);
		}

		initSyncEngine();
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
	<meta name="theme-color" content="#003f87" media="(prefers-color-scheme: light)">
	<meta name="theme-color" content="#0f1416" media="(prefers-color-scheme: dark)">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
</svelte:head>

{#if $isLoading || $authLoading}
	<div class="h-screen w-screen flex items-center justify-center bg-surface">
		<div class="animate-pulse flex flex-col items-center gap-4">
			<div class="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
			<p class="text-sm font-label text-on-surface-variant tracking-widest font-bold uppercase">Loading Hisaab...</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	:global(html) {
		--viewport-height: 100vh;
	}
</style>
