<script lang="ts">
	import { getBusiness, getInvoices, getPatients } from '$lib/db/crud';
	import { activeBusinessId, activeTerminology } from '$lib/stores/session';
	import { formatINR, toRupees } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/helpers';
	import type { Invoice, Business } from '$lib/db/index';

	let business = $state<Business | null>(null);
	let invoices = $state<Invoice[]>([]);
	let patientMap = $state<Map<string, string>>(new Map());
	let loading = $state(true);

	// Filters
	let selectedFY = $state('');
	let selectedQuarter = $state('all');
	let selectedMonth = $state('');

	// Derived fiscal years from invoices
	let fiscalYears = $derived.by(() => {
		const fys = new Set<string>();
		invoices.forEach(inv => {
			const d = new Date(inv.issue_date);
			const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
			fys.add(`${year}-${String(year + 1).slice(-2)}`);
		});
		return Array.from(fys).sort().reverse();
	});

	// Filtered invoices
	let filteredInvoices = $derived.by(() => {
		return invoices.filter(inv => {
			if (!inv.cgst && !inv.sgst && !inv.igst) return false; // skip zero-tax
			const d = new Date(inv.issue_date);
			const month = d.getMonth(); // 0-indexed
			const year = d.getFullYear();
			const fyYear = month >= 3 ? year : year - 1;
			const fy = `${fyYear}-${String(fyYear + 1).slice(-2)}`;

			if (selectedFY && fy !== selectedFY) return false;

			if (selectedQuarter !== 'all') {
				// Q1: Apr-Jun (3-5), Q2: Jul-Sep (6-8), Q3: Oct-Dec (9-11), Q4: Jan-Mar (0-2)
				const quarters: Record<string, number[]> = {
					Q1: [3, 4, 5],
					Q2: [6, 7, 8],
					Q3: [9, 10, 11],
					Q4: [0, 1, 2]
				};
				if (!quarters[selectedQuarter]?.includes(month)) return false;
			}

			if (selectedMonth) {
				const [y, m] = selectedMonth.split('-').map(Number);
				if (year !== y || month + 1 !== m) return false;
			}

			return true;
		});
	});

	// Aggregated totals
	let totalTaxable = $derived(filteredInvoices.reduce((s, i) => s + (i.grand_total - i.cgst - i.sgst - i.igst), 0));
	let totalCGST = $derived(filteredInvoices.reduce((s, i) => s + i.cgst, 0));
	let totalSGST = $derived(filteredInvoices.reduce((s, i) => s + i.sgst, 0));
	let totalIGST = $derived(filteredInvoices.reduce((s, i) => s + i.igst, 0));
	let totalTax = $derived(totalCGST + totalSGST + totalIGST);
	let totalGross = $derived(filteredInvoices.reduce((s, i) => s + i.grand_total, 0));

	// Monthly breakdown
	let monthlyBreakdown = $derived.by(() => {
		const map = new Map<string, { label: string; taxable: number; cgst: number; sgst: number; igst: number; gross: number; count: number }>();
		filteredInvoices.forEach(inv => {
			const d = new Date(inv.issue_date);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
			if (!map.has(key)) map.set(key, { label, taxable: 0, cgst: 0, sgst: 0, igst: 0, gross: 0, count: 0 });
			const entry = map.get(key)!;
			entry.taxable += inv.grand_total - inv.cgst - inv.sgst - inv.igst;
			entry.cgst += inv.cgst;
			entry.sgst += inv.sgst;
			entry.igst += inv.igst;
			entry.gross += inv.grand_total;
			entry.count++;
		});
		return Array.from(map.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([, v]) => v);
	});

	// HSN/SAC breakdown from invoice items - we'll just show invoice-level for now
	// since items require additional fetching

	async function loadData(bizId: string) {
		loading = true;
		business = (await getBusiness(bizId)) || null;
		if (business) {
			const [all, patients] = await Promise.all([
				getInvoices(business.id),
				getPatients(business.id)
			]);
			invoices = all.filter(i => !i.is_deleted);
			patientMap = new Map(patients.map(p => [p.id, p.name]));
			if (fiscalYears.length > 0 && !selectedFY) {
				selectedFY = fiscalYears[0];
			}
		}
		loading = false;
	}

	$effect(() => {
		if ($activeBusinessId) loadData($activeBusinessId);
	});

	// When FY list loads, set default
	$effect(() => {
		if (fiscalYears.length > 0 && !selectedFY) {
			selectedFY = fiscalYears[0];
		}
	});

	function exportGSTCSV() {
		const rows = [
			['Invoice No', 'Date', 'Customer', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total'],
			...filteredInvoices.map(inv => [
				inv.invoice_number,
				inv.issue_date,
				patientMap.get(inv.patient_id) || '',
				toRupees(inv.grand_total - inv.cgst - inv.sgst - inv.igst).toFixed(2),
				toRupees(inv.cgst).toFixed(2),
				toRupees(inv.sgst).toFixed(2),
				toRupees(inv.igst).toFixed(2),
				toRupees(inv.cgst + inv.sgst + inv.igst).toFixed(2),
				toRupees(inv.grand_total).toFixed(2)
			])
		];
		const csv = rows.map(r => r.join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `gst-summary-${selectedFY || 'all'}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const isGSTRegistered = $derived(business?.tax_registration_type === 'gst_registered');
</script>

<svelte:head>
	<title>GST Summary | Hisaab</title>
</svelte:head>

<!-- Header -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
	<div>
		<h1 class="text-3xl font-headline font-extrabold text-on-surface tracking-tight">GST Summary</h1>
		<p class="text-on-surface-variant mt-1 text-sm">
			{#if business}
				{business.name}
				{#if business.gstin}
					• GSTIN: <span class="font-mono font-semibold">{business.gstin}</span>
				{/if}
			{/if}
		</p>
	</div>
	<button
		onclick={exportGSTCSV}
		disabled={filteredInvoices.length === 0}
		class="flex items-center gap-2 px-5 py-2.5 bg-surface border border-outline-variant text-on-surface rounded-xl font-semibold text-sm hover:bg-surface-container-low transition-all disabled:opacity-40 disabled:cursor-not-allowed"
	>
		<span class="material-symbols-outlined text-sm">download</span>
		Export CSV
	</button>
</div>

{#if !isGSTRegistered && business}
	<div class="mb-8 p-5 bg-warning-container rounded-xl border border-outline-variant/20 flex items-start gap-3">
		<span class="material-symbols-outlined text-on-warning-container mt-0.5">info</span>
		<div>
			<p class="font-bold text-on-warning-container text-sm">Not registered for GST</p>
			<p class="text-on-warning-container/80 text-xs mt-1">Your business is set to <strong>{business.tax_registration_type?.replace('_', ' ')}</strong>. GST data will only appear if your invoices include tax. You can update your tax registration in Settings.</p>
		</div>
	</div>
{/if}

<!-- Filters -->
<div class="flex flex-wrap gap-3 mb-8">
	<select
		bind:value={selectedFY}
		class="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
	>
		<option value="">All Years</option>
		{#each fiscalYears as fy}
			<option value={fy}>FY {fy}</option>
		{/each}
	</select>

	<select
		bind:value={selectedQuarter}
		onchange={() => selectedMonth = ''}
		class="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
	>
		<option value="all">All Quarters</option>
		<option value="Q1">Q1 (Apr–Jun)</option>
		<option value="Q2">Q2 (Jul–Sep)</option>
		<option value="Q3">Q3 (Oct–Dec)</option>
		<option value="Q4">Q4 (Jan–Mar)</option>
	</select>

	<input
		type="month"
		bind:value={selectedMonth}
		onchange={() => selectedQuarter = 'all'}
		class="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
	/>

	{#if selectedFY || selectedQuarter !== 'all' || selectedMonth}
		<button
			onclick={() => { selectedFY = fiscalYears[0] || ''; selectedQuarter = 'all'; selectedMonth = ''; }}
			class="px-4 py-2.5 text-primary text-sm font-semibold hover:bg-primary/5 rounded-xl transition-all"
		>
			Clear Filters
		</button>
	{/if}
</div>

{#if loading}
	<div class="flex items-center justify-center py-24">
		<span class="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
	</div>
{:else}
	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Invoices</p>
			<p class="text-2xl font-headline font-bold text-on-surface">{filteredInvoices.length}</p>
		</div>
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Taxable Value</p>
			<p class="text-xl font-headline font-bold text-on-surface">{formatINR(totalTaxable)}</p>
		</div>
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">CGST</p>
			<p class="text-xl font-headline font-bold text-secondary">{formatINR(totalCGST)}</p>
		</div>
		<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">SGST</p>
			<p class="text-xl font-headline font-bold text-secondary">{formatINR(totalSGST)}</p>
		</div>
		<div class="col-span-2 md:col-span-1 bg-primary/5 border border-primary/20 rounded-xl p-5 shadow-sm">
			<p class="text-[11px] font-bold text-primary/70 uppercase tracking-wider mb-1">Total Tax Collected</p>
			<p class="text-xl font-headline font-bold text-primary">{formatINR(totalTax)}</p>
			{#if totalIGST > 0}
				<p class="text-xs text-on-surface-variant mt-1">incl. IGST {formatINR(totalIGST)}</p>
			{/if}
		</div>
	</div>

	<!-- Monthly Breakdown Table -->
	<div class="bg-surface-container-lowest rounded-xl overflow-hidden mb-8 border border-outline-variant/20 shadow-sm">
		<div class="p-5 border-b border-outline-variant/20 flex items-center justify-between">
			<h2 class="font-headline font-bold text-lg">Monthly Breakdown</h2>
			<span class="text-xs text-on-surface-variant font-semibold">{monthlyBreakdown.length} months</span>
		</div>

		{#if monthlyBreakdown.length === 0}
			<div class="py-20 flex flex-col items-center gap-3 text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl opacity-30">receipt_long</span>
				<p class="font-semibold">No GST data for selected period</p>
				<p class="text-xs">Only invoices with GST (CGST/SGST/IGST > 0) are shown here.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse whitespace-nowrap">
					<thead>
						<tr class="bg-surface-container-low/30">
							<th class="px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Month</th>
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Invoices</th>
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Taxable Value</th>
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">CGST</th>
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">SGST</th>
							{#if totalIGST > 0}
								<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">IGST</th>
							{/if}
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tax</th>
							<th class="px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gross</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-outline-variant/10">
						{#each monthlyBreakdown as row}
							<tr class="hover:bg-surface-container-low/30 transition-colors">
								<td class="px-6 py-4 font-semibold text-on-surface text-sm">{row.label}</td>
								<td class="px-6 py-4 text-right text-on-surface-variant text-sm">{row.count}</td>
								<td class="px-6 py-4 text-right text-on-surface text-sm font-medium">{formatINR(row.taxable)}</td>
								<td class="px-6 py-4 text-right text-secondary text-sm font-medium">{formatINR(row.cgst)}</td>
								<td class="px-6 py-4 text-right text-secondary text-sm font-medium">{formatINR(row.sgst)}</td>
								{#if totalIGST > 0}
									<td class="px-6 py-4 text-right text-tertiary text-sm font-medium">{formatINR(row.igst)}</td>
								{/if}
								<td class="px-6 py-4 text-right text-primary font-bold text-sm">{formatINR(row.cgst + row.sgst + row.igst)}</td>
								<td class="px-6 py-4 text-right text-on-surface font-bold text-sm">{formatINR(row.gross)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="bg-surface-container-low/40 border-t-2 border-outline-variant/30">
							<td class="px-6 py-4 font-bold text-on-surface text-sm" colspan="2">Total</td>
							<td class="px-6 py-4 text-right font-bold text-on-surface text-sm">{formatINR(totalTaxable)}</td>
							<td class="px-6 py-4 text-right font-bold text-secondary text-sm">{formatINR(totalCGST)}</td>
							<td class="px-6 py-4 text-right font-bold text-secondary text-sm">{formatINR(totalSGST)}</td>
							{#if totalIGST > 0}
								<td class="px-6 py-4 text-right font-bold text-tertiary text-sm">{formatINR(totalIGST)}</td>
							{/if}
							<td class="px-6 py-4 text-right font-bold text-primary text-sm">{formatINR(totalTax)}</td>
							<td class="px-6 py-4 text-right font-bold text-on-surface text-sm">{formatINR(totalGross)}</td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</div>

	<!-- Invoice-level Detail Table -->
	<div class="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm">
		<div class="p-5 border-b border-outline-variant/20 flex items-center justify-between">
			<h2 class="font-headline font-bold text-lg">Invoice-wise Detail (GSTR-1 Style)</h2>
			<span class="text-xs text-on-surface-variant font-semibold">{filteredInvoices.length} records</span>
		</div>

		{#if filteredInvoices.length === 0}
			<div class="py-20 flex flex-col items-center gap-3 text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl opacity-30">table_view</span>
				<p class="font-semibold">No invoices with GST found</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse whitespace-nowrap text-sm">
					<thead>
						<tr class="bg-surface-container-low/30">
							<th class="px-5 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Invoice No.</th>
							<th class="px-5 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
							<th class="px-5 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">{$activeTerminology.person}</th>
							<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Taxable</th>
							<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">CGST</th>
							<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">SGST</th>
							{#if totalIGST > 0}
								<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">IGST</th>
							{/if}
							<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tax</th>
							<th class="px-5 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Grand Total</th>
							<th class="px-5 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Link</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-outline-variant/10">
						{#each filteredInvoices as inv}
							<tr class="hover:bg-surface-container-low/30 transition-colors">
								<td class="px-5 py-3 font-mono text-on-surface text-xs">{inv.invoice_number}</td>
								<td class="px-5 py-3 text-on-surface-variant">{formatDate(inv.issue_date)}</td>
								<td class="px-5 py-3 text-on-surface max-w-[140px] truncate">{patientMap.get(inv.patient_id) || '—'}</td>
								<td class="px-5 py-3 text-right text-on-surface">{formatINR(inv.grand_total - inv.cgst - inv.sgst - inv.igst)}</td>
								<td class="px-5 py-3 text-right text-secondary">{formatINR(inv.cgst)}</td>
								<td class="px-5 py-3 text-right text-secondary">{formatINR(inv.sgst)}</td>
								{#if totalIGST > 0}
									<td class="px-5 py-3 text-right text-tertiary">{formatINR(inv.igst)}</td>
								{/if}
								<td class="px-5 py-3 text-right text-primary font-semibold">{formatINR(inv.cgst + inv.sgst + inv.igst)}</td>
								<td class="px-5 py-3 text-right font-bold text-on-surface">{formatINR(inv.grand_total)}</td>
								<td class="px-5 py-3">
									<a href="/invoices/{inv.id}" class="text-primary text-xs font-semibold hover:underline flex items-center gap-0.5">
										View <span class="material-symbols-outlined text-[12px]">open_in_new</span>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
