/**
 * Generate a UUID v4 on the client.
 * Used for all record IDs to prevent offline sync collisions.
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Get current ISO timestamp string.
 */
export function now(): string {
	return new Date().toISOString();
}

/**
 * Extract initials from a name (max 2 characters).
 * @example getInitials("Rajesh Kumar") → "RK"
 * @example getInitials("Anita") → "AN"
 */
export function getInitials(name: string): string {
	if (!name) return '??';
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

/**
 * Format an ISO date string to a human-readable Indian format.
 * @example formatDate("2026-04-13") → "13 Apr 2026"
 */
export function formatDate(isoDate: string): string {
	if (!isoDate) return '—';
	const d = new Date(isoDate);
	return d.toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
}

/**
 * Format an ISO date string with time.
 * @example formatDateTime("2026-04-13T14:30:00Z") → "13 Apr 2026, 2:30 PM"
 */
export function formatDateTime(isoDate: string): string {
	if (!isoDate) return '—';
	const d = new Date(isoDate);
	return d.toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

/**
 * Get today's date as ISO string (date only).
 */
export function today(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Get current financial year string.
 * Indian FY runs Apr 1 – Mar 31.
 * @example getFY() → "2526" (for April 2026)
 */
export function getFY(date?: Date): string {
	const d = date || new Date();
	const year = d.getFullYear();
	const month = d.getMonth(); // 0-indexed
	const fyStart = month >= 3 ? year : year - 1; // Apr(3) onwards = current year
	const fyEnd = fyStart + 1;
	return `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`;
}

/**
 * Relative time from now.
 * @example timeAgo("2026-04-13T17:00:00Z") → "2 hours ago"
 */
export function timeAgo(isoDate: string): string {
	const now = Date.now();
	const then = new Date(isoDate).getTime();
	const diffMs = now - then;

	const seconds = Math.floor(diffMs / 1000);
	if (seconds < 60) return 'just now';

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;

	return formatDate(isoDate);
}

/**
 * Indian state codes for GST.
 * Sorted by code.
 */
export const INDIAN_STATES = [
	{ code: '01', name: 'Jammu & Kashmir' },
	{ code: '02', name: 'Himachal Pradesh' },
	{ code: '03', name: 'Punjab' },
	{ code: '04', name: 'Chandigarh' },
	{ code: '05', name: 'Uttarakhand' },
	{ code: '06', name: 'Haryana' },
	{ code: '07', name: 'Delhi' },
	{ code: '08', name: 'Rajasthan' },
	{ code: '09', name: 'Uttar Pradesh' },
	{ code: '10', name: 'Bihar' },
	{ code: '11', name: 'Sikkim' },
	{ code: '12', name: 'Arunachal Pradesh' },
	{ code: '13', name: 'Nagaland' },
	{ code: '14', name: 'Manipur' },
	{ code: '15', name: 'Mizoram' },
	{ code: '16', name: 'Tripura' },
	{ code: '17', name: 'Meghalaya' },
	{ code: '18', name: 'Assam' },
	{ code: '19', name: 'West Bengal' },
	{ code: '20', name: 'Jharkhand' },
	{ code: '21', name: 'Odisha' },
	{ code: '22', name: 'Chhattisgarh' },
	{ code: '23', name: 'Madhya Pradesh' },
	{ code: '24', name: 'Gujarat' },
	{ code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
	{ code: '27', name: 'Maharashtra' },
	{ code: '28', name: 'Andhra Pradesh (Old)' },
	{ code: '29', name: 'Karnataka' },
	{ code: '30', name: 'Goa' },
	{ code: '31', name: 'Lakshadweep' },
	{ code: '32', name: 'Kerala' },
	{ code: '33', name: 'Tamil Nadu' },
	{ code: '34', name: 'Puducherry' },
	{ code: '35', name: 'Andaman & Nicobar Islands' },
	{ code: '36', name: 'Telangana' },
	{ code: '37', name: 'Andhra Pradesh' },
	{ code: '38', name: 'Ladakh' }
] as const;

/**
 * Common HSN/SAC codes for business billing.
 */
export const COMMON_SAC_CODES = [
	{ code: '999311', description: 'General Medical / GP Consultation' },
	{ code: '999312', description: 'Specialist Medical Consultation' },
	{ code: '999313', description: 'Dental Services' },
	{ code: '999323', description: 'Physiotherapy Services' },
	{ code: '999341', description: 'Pharmacy / Dispensing' },
	{ code: '998311', description: 'Legal Advisory Services' },
	{ code: '998312', description: 'Accounting & Tax Services' },
	{ code: '998313', description: 'Management Consulting' },
	{ code: '998314', description: 'IT / Software Services' },
	{ code: '998511', description: 'Education & Training' },
	{ code: '998551', description: 'Coaching & Tutoring' },
	{ code: '996311', description: 'Restaurant / Food Service' },
	{ code: '996331', description: 'Catering Services' },
	{ code: '997212', description: 'Real Estate Brokerage' },
	{ code: '999721', description: 'Beauty & Salon Services' },
	{ code: '999722', description: 'Spa & Wellness Services' },
	{ code: '998711', description: 'Photography / Videography' },
	{ code: '999611', description: 'Fitness / Gym Services' }
] as const;

/**
 * Expense categories for business operations.
 * Designed to work across industries.
 */
export const EXPENSE_CATEGORIES = [
	'Supplies & Materials',
	'Utilities',
	'Rent & Lease',
	'Payroll & Wages',
	'Equipment & Tools',
	'Maintenance & Repairs',
	'Insurance',
	'Marketing & Ads',
	'Travel & Transport',
	'Subscriptions & Software',
	'Professional Fees',
	'Inventory / Stock Purchase',
	'Food & Refreshments',
	'Taxes & Compliance',
	'Others'
] as const;

