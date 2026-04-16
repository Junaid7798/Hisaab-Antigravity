<script lang="ts">
	import { supabase } from '$lib/db/supabase';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleReset(e: Event) {
		e.preventDefault();
		if (!email) { error = 'Please enter your email.'; return; }
		loading = true;
		error = '';
		try {
			const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/update-password`
			});
			if (authError) { error = authError.message; return; }
			sent = true;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to send reset email.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Reset Password | Hisaab</title></svelte:head>

<div class="min-h-screen flex items-center justify-center p-6 bg-surface" style="background-image: radial-gradient(var(--color-outline-variant) 1px, transparent 1px); background-size: 24px 24px;">
	<main class="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 shadow-sm">
		<div class="flex items-center gap-3 mb-8">
			<a href="/login" class="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Back to login">
				<span class="material-symbols-outlined">arrow_back</span>
			</a>
			<div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
				<span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
			</div>
			<span class="font-headline font-extrabold text-xl text-primary tracking-tight">Hisaab</span>
		</div>

		<h2 class="font-headline font-bold text-2xl text-on-surface mb-2">Reset Password</h2>
		<p class="text-on-surface-variant text-sm mb-8">Enter your email and we'll send you a link to reset your password.</p>

		{#if sent}
			<div class="p-4 bg-primary/10 rounded-xl text-primary text-sm font-medium flex items-start gap-3">
				<span class="material-symbols-outlined text-xl flex-shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">mark_email_read</span>
				<span>Check your inbox — we've sent a reset link to <strong>{email}</strong>.</span>
			</div>
			<a
				href="/login"
				class="mt-6 block text-center text-sm font-semibold text-primary hover:underline"
			>
				Back to sign in
			</a>
		{:else}
			{#if error}
				<div class="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleReset} class="space-y-5">
				<div>
					<label for="reset-email" class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Email</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<span class="material-symbols-outlined text-outline text-xl">mail</span>
						</div>
						<input
							id="reset-email"
							type="email"
							bind:value={email}
							placeholder="admin@business.com"
							autocomplete="email"
							class="w-full pl-11 pr-4 py-3.5 bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-3.5 bg-primary text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
				>
					{#if loading}
						<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					{:else}
						<span class="material-symbols-outlined text-lg">send</span>
						Send Reset Link
					{/if}
				</button>

				<a href="/login" class="block text-center text-sm text-on-surface-variant hover:text-on-surface transition-colors">
					Back to sign in
				</a>
			</form>
		{/if}
	</main>
</div>
