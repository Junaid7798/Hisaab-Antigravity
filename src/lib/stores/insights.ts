import { writable, derived, get } from 'svelte/store';
import type { Insight } from '$lib/utils/insights';
import { generateInsights } from '$lib/utils/insights';
import { getCachedInvoices, getCachedExpenses, getCachedProducts, getCachedCustomers } from '$lib/utils/cache';
import { getRevenueByMonth, getExpensesByMonth } from '$lib/db/crud';
import { db } from '$lib/db/index';
import { formatINRCompact, toRupees } from '$lib/utils/currency';

export const insights = writable<Insight[]>([]);
export const insightsLoading = writable(false);
export const insightsBusinessId = writable<string | null>(null);

// Count of actionable (warning + danger) insights — used for nav badge
export const insightAlertCount = derived(insights, ($insights) =>
	$insights.filter(i => i.type === 'warning' || i.type === 'danger').length
);

// Top single insight for dashboard banner — danger first, then warning
export const topInsight = derived(insights, ($insights) => {
	const danger = $insights.find(i => i.type === 'danger');
	if (danger) return danger;
	return $insights.find(i => i.type === 'warning') ?? null;
});

export async function refreshInsights(businessId: string | null): Promise<void> {
	if (!businessId) return;

	// Skip if already computed for this business
	if (get(insightsBusinessId) === businessId) return;

	insightsLoading.set(true);

	try {
		// Load all data in parallel using existing cache functions
		const [invoices, expenses, products, patients, revenueByMonth, expensesByMonth] =
			await Promise.all([
				getCachedInvoices(businessId),
				getCachedExpenses(businessId),
				getCachedProducts(businessId),
				getCachedCustomers(businessId),
				getRevenueByMonth(businessId, 6),
				getExpensesByMonth(businessId, 6)
			]);

		// Base insights from existing generateInsights()
		const base = generateInsights(invoices, expenses, products, patients, revenueByMonth, expensesByMonth);

		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];
		const extra: Insight[] = [];

		// ── Customer churn risk ────────────────────────────────────────────────
		const invoicesByPatient = new Map<string, { last: string; count: number }>();
		for (const inv of invoices) {
			if (inv.document_type !== 'INVOICE' || inv.is_deleted) continue;
			const existing = invoicesByPatient.get(inv.patient_id);
			if (!existing) {
				invoicesByPatient.set(inv.patient_id, { last: inv.issue_date, count: 1 });
			} else {
				invoicesByPatient.set(inv.patient_id, {
					last: inv.issue_date > existing.last ? inv.issue_date : existing.last,
					count: existing.count + 1
				});
			}
		}
		const cutoff60 = new Date(today);
		cutoff60.setDate(cutoff60.getDate() - 60);
		const cutoff60Str = cutoff60.toISOString().split('T')[0];

		let churnCount = 0;
		for (const [, data] of invoicesByPatient) {
			if (data.count >= 2 && data.last < cutoff60Str) churnCount++;
		}
		if (churnCount > 0) {
			extra.push({
				id: 'churn_risk',
				type: 'warning',
				title: `${churnCount} customer${churnCount > 1 ? 's' : ''} at risk of leaving`,
				description: `${churnCount > 1 ? 'They haven\'t' : 'Hasn\'t'} purchased in 60+ days despite being repeat buyers.`,
				icon: 'person_off',
				action: { label: 'View Customers', href: '/patients' },
				priority: 2
			});
		}

		// ── Overdue collection buckets ─────────────────────────────────────────
		const cut30 = new Date(today); cut30.setDate(cut30.getDate() - 30);
		const cut60 = new Date(today); cut60.setDate(cut60.getDate() - 60);
		const cut30Str = cut30.toISOString().split('T')[0];
		const cut60Str = cut60.toISOString().split('T')[0];

		let bucket30to60Count = 0; let bucket30to60Amt = 0;
		let bucket60plusCount = 0; let bucket60plusAmt = 0;

		for (const inv of invoices) {
			if (inv.document_type !== 'INVOICE' || inv.is_deleted || inv.status === 'PAID' || !inv.due_date) continue;
			if (inv.due_date >= cut30Str) continue; // not yet 30 days overdue
			if (inv.due_date >= cut60Str) {
				bucket30to60Count++;
				bucket30to60Amt += inv.grand_total;
			} else {
				bucket60plusCount++;
				bucket60plusAmt += inv.grand_total;
			}
		}

		if (bucket60plusCount > 0) {
			extra.push({
				id: 'collection_60plus',
				type: 'danger',
				title: `${bucket60plusCount} invoice${bucket60plusCount > 1 ? 's' : ''} overdue 60+ days`,
				description: `₹${formatINRCompact(toRupees(bucket60plusAmt))} at serious risk. Follow up urgently.`,
				icon: 'crisis_alert',
				action: { label: 'View Invoices', href: '/invoices' },
				priority: 1
			});
		}
		if (bucket30to60Count > 0) {
			extra.push({
				id: 'collection_30_60',
				type: 'warning',
				title: `${bucket30to60Count} invoice${bucket30to60Count > 1 ? 's' : ''} overdue 30–60 days`,
				description: `₹${formatINRCompact(toRupees(bucket30to60Amt))} pending. Send reminders now.`,
				icon: 'schedule',
				action: { label: 'View Invoices', href: '/invoices' },
				priority: 2
			});
		}

		// ── Projected inflow this week ─────────────────────────────────────────
		const nextWeek = new Date(today);
		nextWeek.setDate(nextWeek.getDate() + 7);
		const nextWeekStr = nextWeek.toISOString().split('T')[0];

		let inflowCount = 0; let inflowAmt = 0;
		for (const inv of invoices) {
			if (inv.document_type !== 'INVOICE' || inv.is_deleted || inv.status === 'PAID' || !inv.due_date) continue;
			if (inv.due_date >= todayStr && inv.due_date <= nextWeekStr) {
				inflowCount++;
				inflowAmt += inv.grand_total;
			}
		}
		if (inflowCount > 0) {
			extra.push({
				id: 'projected_inflow',
				type: 'info',
				title: `₹${formatINRCompact(toRupees(inflowAmt))} expected this week`,
				description: `${inflowCount} invoice${inflowCount > 1 ? 's' : ''} due in the next 7 days if customers pay on time.`,
				icon: 'savings',
				action: { label: 'View Invoices', href: '/invoices' },
				priority: 4
			});
		}

		// ── Days to stockout for fast-moving products ──────────────────────────
		const physicalProducts = products.filter(p => !p.is_service && !p.is_deleted && p.stock_quantity > 0);
		if (physicalProducts.length > 0) {
			const cut30Items = new Date(today);
			cut30Items.setDate(cut30Items.getDate() - 30);
			const cut30ItemsStr = cut30Items.toISOString().split('T')[0];

			// Get invoice IDs for last 30 days
			const recentInvoiceIds = new Set(
				invoices
					.filter(i => !i.is_deleted && i.document_type === 'INVOICE' && i.issue_date >= cut30ItemsStr)
					.map(i => i.id)
			);

			if (recentInvoiceIds.size > 0) {
				// Load invoice items for recent invoices
				const recentItems = await db.invoice_items
					.filter(item => !item.is_deleted && recentInvoiceIds.has(item.invoice_id))
					.toArray();

				// Sum sold quantity per product (x100 stored)
				const soldQty = new Map<string, number>();
				for (const item of recentItems) {
					if (!item.product_id) continue;
					soldQty.set(item.product_id, (soldQty.get(item.product_id) ?? 0) + item.quantity);
				}

				// Compute days to stockout
				const urgent: { name: string; days: number }[] = [];
				for (const product of physicalProducts) {
					const sold30 = soldQty.get(product.id) ?? 0;
					if (sold30 === 0) continue; // not a fast mover, skip
					const avgDaily = (sold30 / 100) / 30; // convert x100, divide by 30 days
					const daysLeft = Math.floor((product.stock_quantity / 100) / avgDaily);
					if (daysLeft < 14) {
						urgent.push({ name: product.name, days: daysLeft });
					}
				}

				// Sort by urgency, take top 3
				urgent.sort((a, b) => a.days - b.days);
				const top3 = urgent.slice(0, 3);

				if (top3.length > 0) {
					extra.push({
						id: 'stockout_imminent',
						type: top3[0].days < 5 ? 'danger' : 'warning',
						title: `${top3.length} product${top3.length > 1 ? 's' : ''} running out soon`,
						description: top3.map(p => `${p.name} (~${p.days}d left)`).join(', '),
						icon: 'production_quantity_limits',
						action: { label: 'View Inventory', href: '/inventory' },
						priority: top3[0].days < 5 ? 1 : 2
					});
				}
			}
		}

		// Merge: remove duplicates from base that extra covers (overdue_invoices)
		const extraIds = new Set(extra.map(e => e.id));
		const filtered = base.filter(b => {
			// Remove base overdue_invoices if we have more specific bucket insights
			if (b.id === 'overdue_invoices' && (extraIds.has('collection_60plus') || extraIds.has('collection_30_60'))) return false;
			return true;
		});

		const all = [...extra, ...filtered].sort((a, b) => a.priority - b.priority);
		insights.set(all);
		insightsBusinessId.set(businessId);
	} catch (err) {
		console.error('Failed to compute insights:', err);
	} finally {
		insightsLoading.set(false);
	}
}

// Call this when business switches to force recompute
export function invalidateInsights(): void {
	insightsBusinessId.set(null);
	insights.set([]);
}
