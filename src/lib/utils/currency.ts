/**
 * Currency utilities for Indian Rupee formatting.
 * 
 * CRITICAL RULE: All monetary values are stored as INTEGER PAISE internally.
 * 1 rupee = 100 paise. This prevents all floating-point rounding errors.
 * 
 * Example: ₹1,24,500.75 is stored as 12450075 (integer)
 */

/** Convert a rupee amount (e.g. 1250.50) to paise (125050) */
export function toPaise(rupees: number): number {
	return Math.round(rupees * 100);
}

/** Convert paise (125050) to rupee amount (1250.50) */
export function toRupees(paise: number): number {
	return paise / 100;
}

/**
 * Format paise as Indian currency string.
 * Uses the Indian numbering system (lakhs and crores).
 * 
 * @example formatINR(12450075) → "₹1,24,500.75"
 * @example formatINR(250000) → "₹2,500.00"
 * @example formatINR(0) → "₹0.00"
 */
export function formatINR(paise: number): string {
	const rupees = paise / 100;
	const isNegative = rupees < 0;
	const absRupees = Math.abs(rupees);

	const [intPart, decPart] = absRupees.toFixed(2).split('.');

	// Indian grouping: last 3 digits, then groups of 2
	let formatted = '';
	const len = intPart.length;

	if (len <= 3) {
		formatted = intPart;
	} else {
		formatted = intPart.slice(-3);
		let remaining = intPart.slice(0, -3);
		while (remaining.length > 2) {
			formatted = remaining.slice(-2) + ',' + formatted;
			remaining = remaining.slice(0, -2);
		}
		if (remaining.length > 0) {
			formatted = remaining + ',' + formatted;
		}
	}

	return `${isNegative ? '-' : ''}₹${formatted}.${decPart}`;
}

/**
 * Format paise as a compact Indian currency string (no decimals).
 * @example formatINRCompact(12450075) → "₹1,24,501"
 */
export function formatINRCompact(paise: number): string {
	const rupees = Math.round(paise / 100);
	const isNegative = rupees < 0;
	const absRupees = Math.abs(rupees);
	const intPart = absRupees.toString();

	let formatted = '';
	const len = intPart.length;

	if (len <= 3) {
		formatted = intPart;
	} else {
		formatted = intPart.slice(-3);
		let remaining = intPart.slice(0, -3);
		while (remaining.length > 2) {
			formatted = remaining.slice(-2) + ',' + formatted;
			remaining = remaining.slice(0, -2);
		}
		if (remaining.length > 0) {
			formatted = remaining + ',' + formatted;
		}
	}

	return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Safe addition of paise values (avoids floating point issues).
 */
export function addPaise(...values: number[]): number {
	return values.reduce((sum, v) => sum + Math.round(v), 0);
}

/**
 * Safe multiplication for paise (quantity * rate).
 * Both inputs should be in their integer representations.
 */
export function multiplyPaise(paise: number, quantityX100: number): number {
	return Math.round((paise * quantityX100) / 100);
}
