import { getFY } from './helpers';

/**
 * Generate the next invoice number for a business.
 * Format: INV-{FY}-{COUNTER} padded to 4 digits.
 * 
 * @example generateInvoiceNumber(1) → "INV-2526-0001"
 * @example generateInvoiceNumber(42) → "INV-2526-0042"
 */
export function generateInvoiceNumber(counter: number, date?: Date): string {
	const fy = getFY(date);
	const paddedCounter = counter.toString().padStart(4, '0');
	return `INV-${fy}-${paddedCounter}`;
}
