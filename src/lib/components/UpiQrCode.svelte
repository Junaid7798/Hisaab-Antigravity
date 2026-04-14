<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { formatINR } from '$lib/utils/currency';
	import { fade } from 'svelte/transition';

	interface Props {
		upiId: string;          // e.g. "merchant@upi"
		payeeName: string;      // Business name
		amount: number;         // Amount in paise
		invoiceNumber?: string; // Transaction reference
	}

	let { upiId, payeeName, amount, invoiceNumber }: Props = $props();

	let qrDataUrl = $state('');
	let upiUrl = $state('');
	let copied = $state(false);
	let error = $state('');

	$effect(() => {
		generateQR();
	});

	async function generateQR() {
		if (!upiId || amount <= 0) {
			error = 'UPI ID or amount missing';
			return;
		}

		const amountInRupees = (amount / 100).toFixed(2);
		const txnNote = invoiceNumber ? `Payment for ${invoiceNumber}` : 'Payment via Hisaab';

		// UPI deep link format (standard spec)
		upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountInRupees}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

		try {
			qrDataUrl = await QRCode.toDataURL(upiUrl, {
				width: 280,
				margin: 2,
				color: {
					dark: '#1C1B1F',
					light: '#FFFFFF'
				},
				errorCorrectionLevel: 'M'
			});
		} catch (err) {
			console.error('QR generation error:', err);
			error = 'Failed to generate QR code';
		}
	}

	async function copyUpiId() {
		try {
			await navigator.clipboard.writeText(upiId);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			// Fallback
		}
	}
</script>

{#if qrDataUrl}
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center print:shadow-none print:border print:border-gray-200" in:fade={{ duration: 300 }}>
		<p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Scan to Pay</p>

		<!-- QR Code -->
		<div class="inline-block p-3 bg-white rounded-xl border-2 border-gray-100">
			<img src={qrDataUrl} alt="UPI Payment QR Code" class="w-56 h-56 mx-auto" />
		</div>

		<!-- Amount -->
		<div class="mt-4">
			<p class="text-sm text-gray-500">Amount Due</p>
			<p class="text-3xl font-extrabold text-gray-900 tracking-tight">{formatINR(amount)}</p>
		</div>

		<!-- UPI ID with copy -->
		<div class="mt-3 flex items-center justify-center gap-2">
			<span class="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-1.5 rounded-lg">{upiId}</span>
			<button
				onclick={copyUpiId}
				class="text-xs text-primary font-bold hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors print:hidden"
			>
				{copied ? '✓ Copied' : 'Copy'}
			</button>
		</div>

		<!-- Supported apps hint -->
		<p class="text-[10px] text-gray-400 mt-3 print:hidden">Works with Google Pay, PhonePe, Paytm & all UPI apps</p>

		<!-- Deep link button (mobile only) -->
		<a
			href={upiUrl}
			class="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-[0.97] print:hidden"
		>
			<span class="material-symbols-outlined text-sm">account_balance</span>
			Pay with UPI App
		</a>
	</div>
{:else if error}
	<div class="text-center py-4 text-sm text-red-500">{error}</div>
{/if}
