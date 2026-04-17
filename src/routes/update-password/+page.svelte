<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/db/supabase';

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let isSaving = $state(false);
	let errorMsg = $state('');
	let success = $state(false);
	let sessionReady = $state(false);

	onMount(async () => {
		// Supabase sends the session via URL hash when user clicks the reset link
		const { data, error } = await supabase.auth.getSession();
		if (error || !data.session) {
			// Try to exchange the hash fragment (PKCE flow)
			const hashParams = new URLSearchParams(window.location.hash.slice(1));
			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');
			if (accessToken && refreshToken) {
				await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
				sessionReady = true;
			} else {
				errorMsg = 'Invalid or expired reset link. Please request a new one.';
			}
		} else {
			sessionReady = true;
		}
	});

	async function handleUpdatePassword() {
		if (!password) { errorMsg = 'Please enter a new password.'; return; }
		if (password.length < 8) { errorMsg = 'Password must be at least 8 characters.'; return; }
		if (password !== confirmPassword) { errorMsg = 'Passwords do not match.'; return; }

		isSaving = true;
		errorMsg = '';
		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;
			success = true;
			setTimeout(() => goto('/dashboard'), 2500);
		} catch (e: any) {
			errorMsg = e.message || 'Failed to update password. Please try again.';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Update Password | Hisaab</title>
</svelte:head>

<div class="min-h-screen bg-surface flex items-center justify-center px-4">
	<div class="w-full max-w-md">
		<!-- Logo -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container text-primary mb-4">
				<span class="material-symbols-outlined text-3xl">lock_reset</span>
			</div>
			<h1 class="text-3xl font-headline font-bold text-on-surface">Set New Password</h1>
			<p class="text-on-surface-variant mt-2 text-sm">Choose a strong password for your Hisaab account.</p>
		</div>

		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 shadow-sm">
			{#if success}
				<div class="text-center space-y-4">
					<div class="w-16 h-16 rounded-full bg-tertiary-container flex items-center justify-center mx-auto">
						<span class="material-symbols-outlined text-3xl text-tertiary">check_circle</span>
					</div>
					<h2 class="text-xl font-bold text-on-surface">Password Updated!</h2>
					<p class="text-on-surface-variant text-sm">Your password has been changed successfully. Redirecting to dashboard...</p>
				</div>
			{:else if !sessionReady && !errorMsg}
				<div class="flex items-center justify-center gap-3 py-8 text-on-surface-variant">
					<span class="material-symbols-outlined animate-spin text-2xl">refresh</span>
					<span>Verifying reset link...</span>
				</div>
			{:else if errorMsg && !sessionReady}
				<div class="text-center space-y-4">
					<div class="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mx-auto">
						<span class="material-symbols-outlined text-3xl text-error">link_off</span>
					</div>
					<p class="text-sm text-error font-semibold">{errorMsg}</p>
					<a href="/forgot-password" class="inline-block px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm">
						Request New Link
					</a>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} class="space-y-5">
					{#if errorMsg}
						<div class="p-4 bg-error-container/50 border border-error/20 rounded-xl text-sm text-error font-semibold">
							{errorMsg}
						</div>
					{/if}

					<div>
						<label for="new-password" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">New Password</label>
						<div class="relative">
							<input
								id="new-password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								placeholder="Minimum 8 characters"
								required
								autocomplete="new-password"
								class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 pr-12 text-on-surface font-medium transition-all outline-none"
							/>
							<button
								type="button"
								onclick={() => showPassword = !showPassword}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
							>
								<span class="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
							</button>
						</div>
					</div>

					<div>
						<label for="confirm-password" class="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">Confirm Password</label>
						<input
							id="confirm-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Re-enter your new password"
							required
							autocomplete="new-password"
							class="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary rounded-t-lg px-4 py-3 text-on-surface font-medium transition-all outline-none"
						/>
					</div>

					<!-- Password strength hint -->
					{#if password.length > 0}
						{@const strength = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'strong' : password.length >= 8 ? 'medium' : 'weak'}
						<div class="flex items-center gap-2">
							<div class="flex gap-1 flex-1">
								{#each [1,2,3] as i}
									<div class="h-1 flex-1 rounded-full transition-colors
										{strength === 'strong' ? 'bg-tertiary' : strength === 'medium' && i <= 2 ? 'bg-primary' : i === 1 ? 'bg-error' : 'bg-surface-container'}">
									</div>
								{/each}
							</div>
							<span class="text-xs font-semibold {strength === 'strong' ? 'text-tertiary' : strength === 'medium' ? 'text-primary' : 'text-error'}">
								{strength === 'strong' ? 'Strong' : strength === 'medium' ? 'Medium' : 'Weak'}
							</span>
						</div>
					{/if}

					<button
						type="submit"
						disabled={isSaving}
						class="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
					>
						{#if isSaving}
							<span class="material-symbols-outlined animate-spin">refresh</span>
							Updating...
						{:else}
							<span class="material-symbols-outlined">lock</span>
							Update Password
						{/if}
					</button>
				</form>
			{/if}
		</div>

		<p class="text-center mt-6 text-sm text-on-surface-variant">
			<a href="/login" class="text-primary font-semibold hover:underline">Back to Sign In</a>
		</p>
	</div>
</div>
