/**
 * GST Calculation Engine for Indian Billing.
 *
 * Rules:
 * - If business state_code === patient state_code → INTRA_STATE → CGST + SGST (each = rate/2)
 * - If business state_code !== patient state_code → INTER_STATE → IGST (full rate)
 * - If tax_rate === 0 → EXEMPT
 *
 * All amounts in INTEGER PAISE. Tax rates stored as integer x100 (e.g., 1200 = 12.00%).
 */

export const GST_RATES = [
	{ label: '0%', value: 0 },
	{ label: '5%', value: 500 },
	{ label: '12%', value: 1200 },
	{ label: '18%', value: 1800 },
	{ label: '28%', value: 2800 }
] as const;

export type TaxType = 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';

export interface LineItem {
	description: string;
	hsn_sac: string;
	quantity: number; // integer x100 (e.g. 100 = 1.00)
	rate: number; // paise
	tax_rate: number; // integer x100 (e.g. 1200 = 12%)
}

export interface TaxBreakdown {
	taxable_amount: number; // paise
	cgst_rate: number; // x100
	cgst_amount: number; // paise
	sgst_rate: number; // x100
	sgst_amount: number; // paise
	igst_rate: number; // x100
	igst_amount: number; // paise
	total_tax: number; // paise
	line_total: number; // taxable + tax, paise
}

export interface InvoiceTaxSummary {
	tax_type: TaxType;
	subtotal: number; // paise
	total_cgst: number;
	total_sgst: number;
	total_igst: number;
	total_tax: number;
	grand_total: number;
	line_breakdowns: TaxBreakdown[];
}

/**
 * Determine the tax type from state codes.
 */
export function determineTaxType(businessStateCode: string, patientStateCode: string): TaxType {
	if (!businessStateCode || !patientStateCode) return 'EXEMPT';
	return businessStateCode === patientStateCode ? 'INTRA_STATE' : 'INTER_STATE';
}

/**
 * Calculate tax breakdown for a single line item.
 */
export function calculateLineTax(item: LineItem, taxType: TaxType): TaxBreakdown {
	// taxable_amount = (rate * quantity) / 100  (since quantity is x100)
	const taxable_amount = Math.round((item.rate * item.quantity) / 100);

	if (item.tax_rate === 0 || taxType === 'EXEMPT') {
		return {
			taxable_amount,
			cgst_rate: 0,
			cgst_amount: 0,
			sgst_rate: 0,
			sgst_amount: 0,
			igst_rate: 0,
			igst_amount: 0,
			total_tax: 0,
			line_total: taxable_amount
		};
	}

	let cgst_amount = 0;
	let sgst_amount = 0;
	let igst_amount = 0;
	let cgst_rate = 0;
	let sgst_rate = 0;
	let igst_rate = 0;

	if (taxType === 'INTRA_STATE') {
		// Split tax equally between CGST and SGST
		const halfRate = Math.floor(item.tax_rate / 2);
		cgst_rate = halfRate;
		sgst_rate = halfRate;
		// tax = taxable_amount * rate / 10000  (rate is x100, so /10000 for percentage)
		cgst_amount = Math.round((taxable_amount * cgst_rate) / 10000);
		sgst_amount = Math.round((taxable_amount * sgst_rate) / 10000);
	} else {
		// Full IGST
		igst_rate = item.tax_rate;
		igst_amount = Math.round((taxable_amount * igst_rate) / 10000);
	}

	const total_tax = cgst_amount + sgst_amount + igst_amount;

	return {
		taxable_amount,
		cgst_rate,
		cgst_amount,
		sgst_rate,
		sgst_amount,
		igst_rate,
		igst_amount,
		total_tax,
		line_total: taxable_amount + total_tax
	};
}

/**
 * Calculate the full invoice tax summary from line items.
 */
export function calculateInvoiceTax(
	items: LineItem[],
	businessStateCode: string,
	patientStateCode: string
): InvoiceTaxSummary {
	const taxType = determineTaxType(businessStateCode, patientStateCode);

	const line_breakdowns = items.map((item) => calculateLineTax(item, taxType));

	const subtotal = line_breakdowns.reduce((sum, lb) => sum + lb.taxable_amount, 0);
	const total_cgst = line_breakdowns.reduce((sum, lb) => sum + lb.cgst_amount, 0);
	const total_sgst = line_breakdowns.reduce((sum, lb) => sum + lb.sgst_amount, 0);
	const total_igst = line_breakdowns.reduce((sum, lb) => sum + lb.igst_amount, 0);
	const total_tax = total_cgst + total_sgst + total_igst;
	const grand_total = subtotal + total_tax;

	return {
		tax_type: taxType,
		subtotal,
		total_cgst,
		total_sgst,
		total_igst,
		total_tax,
		grand_total,
		line_breakdowns
	};
}
