<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Html5Qrcode } from 'html5-qrcode';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		onScan: (code: string) => void;
		onClose: () => void;
	}

	let { onScan, onClose }: Props = $props();

	let scanner: Html5Qrcode | null = null;
	let scanning = $state(false);
	let error = $state('');
	let lastScanned = $state('');
	let cameras = $state<{ id: string; label: string }[]>([]);
	let selectedCamera = $state('');
	let torchOn = $state(false);

	onMount(async () => {
		try {
			const devices = await Html5Qrcode.getCameras();
			cameras = devices;
			// Prefer rear camera
			const rear = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
			selectedCamera = rear?.id || devices[0]?.id || '';
			if (selectedCamera) {
				await startScanning(selectedCamera);
			}
		} catch (err) {
			error = 'Camera access denied. Please allow camera permissions.';
			console.error(err);
		}
	});

	onDestroy(() => {
		stopScanning();
	});

	async function startScanning(cameraId: string) {
		if (scanner) {
			await stopScanning();
		}

		scanning = true;
		error = '';

		scanner = new Html5Qrcode('barcode-reader');

		try {
			await scanner.start(
				cameraId,
				{
					fps: 10,
					qrbox: { width: 250, height: 150 },
					aspectRatio: 1.0
				},
				(decodedText) => {
					// Debounce — don't fire same code twice in 2 seconds
					if (decodedText === lastScanned) return;
					lastScanned = decodedText;

					// Vibrate on success
					if (navigator.vibrate) navigator.vibrate(100);

					onScan(decodedText);

					// Reset debounce after 2s
					setTimeout(() => { lastScanned = ''; }, 2000);
				},
				() => {
					// Ignore scan failures (these fire constantly when no code is in view)
				}
			);
		} catch (err) {
			error = 'Failed to start camera. Try a different one.';
			scanning = false;
			console.error(err);
		}
	}

	async function stopScanning() {
		if (scanner) {
			try {
				await scanner.stop();
				scanner.clear();
			} catch {
				// Ignore stop errors
			}
			scanner = null;
		}
		scanning = false;
	}

	async function switchCamera() {
		const idx = cameras.findIndex(c => c.id === selectedCamera);
		const next = cameras[(idx + 1) % cameras.length];
		if (next) {
			selectedCamera = next.id;
			await startScanning(next.id);
		}
	}

	function handleClose() {
		stopScanning();
		onClose();
	}
</script>

<!-- Full-screen scanner overlay -->
<div class="fixed inset-0 z-[150] bg-black flex flex-col" in:fade={{ duration: 200 }}>
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
		<h2 class="text-white font-headline font-bold text-lg flex items-center gap-2">
			<span class="material-symbols-outlined text-primary">qr_code_scanner</span>
			Scan Barcode
		</h2>
		<div class="flex items-center gap-2">
			{#if cameras.length > 1}
				<button onclick={switchCamera} class="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
					<span class="material-symbols-outlined text-lg">flip_camera_android</span>
				</button>
			{/if}
			<button onclick={handleClose} class="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
				<span class="material-symbols-outlined text-lg">close</span>
			</button>
		</div>
	</div>

	<!-- Scanner View -->
	<div class="flex-1 relative flex items-center justify-center overflow-hidden">
		<div id="barcode-reader" class="w-full h-full"></div>

		{#if !scanning && !error}
			<div class="absolute inset-0 flex items-center justify-center bg-black/80">
				<div class="animate-spin">
					<span class="material-symbols-outlined text-4xl text-primary">progress_activity</span>
				</div>
			</div>
		{/if}

		<!-- Scanning Guide Overlay -->
		{#if scanning}
			<div class="absolute inset-0 pointer-events-none flex items-center justify-center">
				<div class="w-64 h-40 border-2 border-primary rounded-2xl relative">
					<!-- Corner brackets -->
					<div class="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg"></div>
					<div class="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg"></div>
					<div class="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg"></div>
					<div class="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br-lg"></div>
					<!-- Scanning line animation -->
					<div class="absolute left-2 right-2 h-0.5 bg-primary/80 animate-scan-line"></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="px-4 py-3 bg-red-500/20 text-red-300 text-sm text-center" in:fly={{ y: 20, duration: 200 }}>
			<span class="material-symbols-outlined text-sm align-middle mr-1">error</span>
			{error}
		</div>
	{/if}

	<!-- Last Scanned -->
	{#if lastScanned}
		<div class="px-4 py-3 bg-emerald-500/20 text-emerald-300 text-sm text-center font-mono" in:fly={{ y: 20, duration: 200 }}>
			<span class="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
			Scanned: {lastScanned}
		</div>
	{/if}

	<!-- Footer hint -->
	<div class="px-4 py-4 bg-black/80 text-center">
		<p class="text-white/50 text-xs">Point camera at a barcode or QR code</p>
		<p class="text-white/30 text-[10px] mt-1">Supports EAN-13, EAN-8, UPC-A, Code-128, QR Code</p>
	</div>
</div>

<style>
	@keyframes scan-line {
		0% { top: 10%; }
		50% { top: 85%; }
		100% { top: 10%; }
	}
	.animate-scan-line {
		animation: scan-line 2s ease-in-out infinite;
	}
	/* Hide html5-qrcode branding */
	:global(#barcode-reader img[alt="Info icon"]),
	:global(#barcode-reader__dashboard_section),
	:global(#barcode-reader__status_span) {
		display: none !important;
	}
	:global(#barcode-reader video) {
		border-radius: 0 !important;
		border: none !important;
		object-fit: cover !important;
		width: 100% !important;
		height: 100% !important;
	}
	:global(#barcode-reader) {
		border: none !important;
	}
</style>
