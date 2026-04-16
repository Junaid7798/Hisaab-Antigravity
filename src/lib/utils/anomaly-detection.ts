import { db } from '$lib/db/index';
import type { Invoice, InvoiceItem, Expense, Product } from '$lib/db/index';

export interface AnomalyWarning {
	type: 'warning' | 'error';
	message: string;
}

export async function detectExpenseAnomaly(expense: Partial<Expense>): Promise<AnomalyWarning[]> {
	if (!expense.amount || !expense.category || !expense.business_id) return [];
	const warnings: AnomalyWarning[] = [];
	
	const pastExpenses = await db.expenses
		.where('business_id')
		.equals(expense.business_id)
		.filter(e => e.category === expense.category && !e.is_deleted)
		.toArray();
		
	if (pastExpenses.length >= 3) {
		const avgCategoryAmount = pastExpenses.reduce((sum, e) => sum + e.amount, 0) / pastExpenses.length;
		if (expense.amount > avgCategoryAmount * 3) {
			warnings.push({
				type: 'warning',
				message: `Expense amount is unusually high for category "${expense.category}" (>300% above average).`
			});
		}
	}
	return warnings;
}

export async function detectDuplicateInvoice(invoice: Partial<Invoice>): Promise<AnomalyWarning[]> {
	if (!invoice.patient_id || !invoice.issue_date || !invoice.grand_total || !invoice.business_id) return [];
	const warnings: AnomalyWarning[] = [];
	
	const samePatientInvoices = await db.invoices
		.where('business_id')
		.equals(invoice.business_id)
		.filter(i => 
			!i.is_deleted && 
			i.patient_id === invoice.patient_id && 
			i.issue_date === invoice.issue_date &&
			i.id !== invoice.id // prevent matching itself on update
		)
		.toArray();
		
	const tenPercent = invoice.grand_total * 0.1;
	const lowerBound = invoice.grand_total - tenPercent;
	const upperBound = invoice.grand_total + tenPercent;
	
	const isDuplicate = samePatientInvoices.some(i => i.grand_total >= lowerBound && i.grand_total <= upperBound);
	if (isDuplicate) {
		warnings.push({
			type: 'warning',
			message: `A similar invoice for this customer on the same date already exists.`
		});
	}
	return warnings;
}

export async function detectInvoiceAnomalies(invoice: Partial<Invoice>, items: Partial<InvoiceItem>[]): Promise<AnomalyWarning[]> {
	const warnings = await detectDuplicateInvoice(invoice);
	
	if (!invoice.business_id) return warnings;
	
	const products = await db.products
		.where('business_id')
		.equals(invoice.business_id)
		.toArray();
		
	for (const item of items) {
		if (!item.product_id) continue;
		const product = products.find(p => p.id === item.product_id);
		if (!product) continue;
		
		// Negative margin detection
		if (product.purchase_price > 0 && item.rate && item.rate < product.purchase_price) {
			warnings.push({
				type: 'warning',
				message: `Item "${product.name}" is being sold below its purchase price.`
			});
		}
		
		// Impossible quantity detection
		if (!product.is_service && item.quantity && item.quantity > product.stock_quantity) {
			warnings.push({
				type: 'warning',
				message: `Requested quantity for "${product.name}" exceeds current stock.`
			});
		}
	}
	
	return warnings;
}
