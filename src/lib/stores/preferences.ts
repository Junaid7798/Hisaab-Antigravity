import { writable } from 'svelte/store';

export interface UserPreferences {
	theme: 'light' | 'dark' | 'auto';
	accentColor: string;
	compactMode: boolean;
	fontSize: 'small' | 'medium' | 'large';
	animations: 'full' | 'reduced' | 'none';
	sidebarCollapsed: boolean;
	currency: string;
	currencySymbol: string;
	dateFormat: 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd';
	timeFormat: '12h' | '24h';
	weekStart: 'sunday' | 'monday';
	numberFormat: 'indian' | 'western';
	invoicePrefix: string;
	invoiceNumberPadding: number;
	defaultPaymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
	defaultPaymentTerms: number;
	defaultNotes: string;
	defaultTerms: string;
	autoInvoiceTax: boolean;
	autoInvoiceDiscount: boolean;
	allowPartialPayment: boolean;
	defaultPartialPercent: number;
	analyticsRFM: boolean;
	analyticsABC: boolean;
	analyticsForecasting: boolean;
	analyticsGoals: boolean;
	analyticsAlerts: boolean;
	analyticsRatios: boolean;
	analyticsOperations: boolean;
	defaultTaxRate: number;
	defaultDiscountRate: number;
	defaultCreditDays: number;
	lowStockThreshold: number;
	deadStockDays: number;
	reorderPointDays: number;
	customerGroups: boolean;
	showInactiveCustomers: boolean;
	autoBackup: boolean;
	backupFrequency: 'daily' | 'weekly' | 'monthly';
	lastBackupDate: string;
}

const defaultPreferences: UserPreferences = {
	theme: 'auto',
	accentColor: '#003f87',
	compactMode: false,
	fontSize: 'medium',
	animations: 'full',
	sidebarCollapsed: false,
	currency: 'INR',
	currencySymbol: '₹',
	dateFormat: 'dd-mm-yyyy',
	timeFormat: '12h',
	weekStart: 'monday',
	numberFormat: 'indian',
	invoicePrefix: 'INV',
	invoiceNumberPadding: 4,
	defaultPaymentMethod: 'cash',
	defaultPaymentTerms: 0,
	defaultNotes: '',
	defaultTerms: 'Payment due within 30 days',
	autoInvoiceTax: true,
	autoInvoiceDiscount: true,
	allowPartialPayment: true,
	defaultPartialPercent: 50,
	analyticsRFM: false,
	analyticsABC: false,
	analyticsForecasting: false,
	analyticsGoals: false,
	analyticsAlerts: false,
	analyticsRatios: false,
	analyticsOperations: false,
	defaultTaxRate: 18,
	defaultDiscountRate: 0,
	defaultCreditDays: 30,
	lowStockThreshold: 10,
	deadStockDays: 90,
	reorderPointDays: 7,
	customerGroups: false,
	showInactiveCustomers: false,
	autoBackup: false,
	backupFrequency: 'weekly',
	lastBackupDate: ''
};

function getInitialPreferences(): UserPreferences {
	if (typeof window === 'undefined') return defaultPreferences;
	
	const saved = localStorage.getItem('preferences');
	if (saved) {
		try {
			return { ...defaultPreferences, ...JSON.parse(saved) };
		} catch {
			return defaultPreferences;
		}
	}
	return defaultPreferences;
}

function applyPreferencesToDOM(value: UserPreferences) {
	if (typeof window === 'undefined') return;
	
	document.documentElement.style.setProperty('--sys-primary', value.accentColor);
	
	document.documentElement.classList.toggle('compact', value.compactMode);
	
	document.documentElement.classList.remove('font-small', 'font-medium', 'font-large');
	document.documentElement.classList.add(`font-${value.fontSize}`);
	
	document.documentElement.classList.remove('animations-full', 'animations-reduced', 'animations-none');
	document.documentElement.classList.add(`animations-${value.animations}`);
	
	if (value.animations === 'none') {
		document.documentElement.classList.add('reduce-motion');
	} else {
		document.documentElement.classList.remove('reduce-motion');
	}
	
	document.documentElement.style.setProperty('--currency-symbol', value.currencySymbol);
}

export const preferences = writable<UserPreferences>(getInitialPreferences());

if (typeof window !== 'undefined') {
	preferences.subscribe((value) => {
		localStorage.setItem('preferences', JSON.stringify(value));
		applyPreferencesToDOM(value);
	});
}

export function resetPreferences() {
	preferences.set(defaultPreferences);
}

export function getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
	let result: UserPreferences[K] = defaultPreferences[key];
	preferences.subscribe(p => { result = p[key]; })();
	return result;
}