<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('login.title')}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6 bg-surface" style="background-image: radial-gradient(var(--color-outline-variant) 1px, transparent 1px); background-size: 24px 24px;">
	<main class="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
		<!-- Branding -->
		<section class="hidden lg:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
			<div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(135deg, #003f87 0%, #0056b3 100%);"></div>
			<div class="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary-container rounded-full blur-3xl opacity-30"></div>

			<div class="relative z-10">
				<div class="flex items-center gap-3 mb-12">
					<div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary">
						<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
					</div>
					<span class="font-headline font-extrabold text-2xl text-white tracking-tight">Hisaab</span>
				</div>
				<h1 class="font-headline font-extrabold text-4xl text-white leading-tight mb-4">
					{@html $_('login.precision')}
				</h1>
				<p class="text-on-primary-container text-lg font-medium max-w-xs">
					{$_('login.architect')}
				</p>
			</div>

			<div class="relative z-10">
				<div class="p-6 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
					<div class="flex gap-1 mb-2">
						{#each Array(5) as _}
							<span class="material-symbols-outlined text-secondary-container" style="font-variation-settings: 'FILL' 1;">star</span>
						{/each}
					</div>
					<p class="text-white text-sm font-medium italic mb-4">
						{$_('login.testimonial')}
					</p>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">RM</div>
						<div>
							<p class="text-white text-xs font-bold">{$_('login.dr_name')}</p>
							<p class="text-on-primary-container text-[10px] uppercase tracking-wider">{$_('login.dr_role')}</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Auth Form -->
		<section class="p-8 lg:p-16 flex flex-col justify-center">
			<div class="lg:hidden flex items-center gap-2 mb-8">
				<span class="font-headline font-extrabold text-2xl text-primary tracking-tight">Hisaab</span>
			</div>

			<div class="mb-10">
				<h2 class="font-headline font-bold text-3xl text-on-surface mb-2">{$_('login.welcome')}</h2>
				<p class="text-on-surface-variant font-medium">{$_('login.sign_in_desc')}</p>
			</div>

			<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); goto('/dashboard'); }}>
				<div class="space-y-2">
					<label class="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1">{$_('login.label_email')}</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<span class="material-symbols-outlined text-outline text-xl">mail</span>
						</div>
						<input
							type="text"
							placeholder="admin@clinic.com"
							class="w-full pl-11 pr-4 py-3.5 bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/20 font-body text-sm placeholder:text-outline"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label class="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{$_('login.label_pwd')}</label>
						<a class="text-primary text-xs font-bold hover:underline" href="/login">{$_('login.forgot_pwd')}</a>
					</div>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<span class="material-symbols-outlined text-outline text-xl">lock</span>
						</div>
						<input
							type="password"
							placeholder="••••••••"
							class="w-full pl-11 pr-12 py-3.5 bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/20 font-body text-sm placeholder:text-outline"
						/>
					</div>
				</div>

				<div class="flex items-center gap-3 px-1">
					<input type="checkbox" id="remember" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary-container" />
					<label for="remember" class="text-sm text-on-surface-variant font-medium cursor-pointer">{$_('login.remember')}</label>
				</div>

				<button type="submit" class="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
					<span>{$_('login.btn_signin')}</span>
					<span class="material-symbols-outlined">arrow_forward</span>
				</button>
			</form>

			<div class="relative my-10">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-surface-container-highest"></div>
				</div>
				<div class="relative flex justify-center text-xs uppercase tracking-[0.2em]">
					<span class="bg-surface-container-lowest px-4 text-outline font-bold">{$_('login.or_continue')}</span>
				</div>
			</div>

			<button type="button" class="w-full py-3.5 bg-surface-container-low hover:bg-surface-container border-none text-on-surface font-semibold rounded-lg transition-colors flex items-center justify-center gap-3">
				<svg class="w-5 h-5" viewBox="0 0 24 24">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
				</svg>
				<span>{$_('login.btn_google')}</span>
			</button>

			<p class="mt-12 text-center text-sm text-on-surface-variant">
				{$_('login.need_account')} <a class="text-primary font-bold hover:underline" href="/login">{$_('login.contact_sales')}</a>
			</p>
		</section>
	</main>

	<footer class="fixed bottom-8 left-0 right-0 text-center">
		<p class="text-[10px] uppercase tracking-widest text-outline font-bold">
			© 2026 Hisaab • Secure 256-bit Encryption • Made in India
		</p>
	</footer>
</div>
