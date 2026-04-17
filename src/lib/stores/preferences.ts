import { writable } from 'svelte/store';

export interface UserPreferences {
	theme: 'light' | 'dark' | 'auto';
	themeId: string;
	accentColor: string;
	accentContainer: string;
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
	cloudSyncEnabled: boolean;
}

const defaultPreferences: UserPreferences = {
	theme: 'light',
	themeId: 'arctic',
	accentColor: '#1e3a5f',
	accentContainer: '#2d5282',
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
	lastBackupDate: '',
	cloudSyncEnabled: true
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

export interface AppTheme {
	id: string;
	name: string;
	label: string;
	dark: boolean;
	surface: string;         // page bg
	card: string;            // card bg
	sidebar: string;         // sidebar bg
	accent: string;          // primary
	accentContainer: string; // primary-container
	preview: { bg: string; card: string; sidebar: string; dot: string };
}

export const APP_THEMES: AppTheme[] = [
	{
		id: 'arctic', name: 'Arctic', label: 'Light',
		dark: false,
		surface: '#f4f6f9', card: '#ffffff', sidebar: '#eef1f6',
		accent: '#1e3a5f', accentContainer: '#2d5282',
		preview: { bg: '#f4f6f9', card: '#ffffff', sidebar: '#dde3ed', dot: '#1e3a5f' }
	},
	{
		id: 'pearl', name: 'Pearl', label: 'Light',
		dark: false,
		surface: '#faf9f7', card: '#ffffff', sidebar: '#f2efe9',
		accent: '#44403c', accentContainer: '#57534e',
		preview: { bg: '#faf9f7', card: '#ffffff', sidebar: '#e8e3da', dot: '#44403c' }
	},
	{
		id: 'sage', name: 'Sage', label: 'Light',
		dark: false,
		surface: '#f4f7f5', card: '#ffffff', sidebar: '#e8f0eb',
		accent: '#14532d', accentContainer: '#166534',
		preview: { bg: '#f4f7f5', card: '#ffffff', sidebar: '#d4e6da', dot: '#14532d' }
	},
	{
		id: 'lavender', name: 'Lavender', label: 'Light',
		dark: false,
		surface: '#f6f5fb', card: '#ffffff', sidebar: '#eeecf8',
		accent: '#3730a3', accentContainer: '#4338ca',
		preview: { bg: '#f6f5fb', card: '#ffffff', sidebar: '#e0dcf5', dot: '#3730a3' }
	},
	{
		id: 'midnight', name: 'Midnight', label: 'Dark',
		dark: true,
		surface: '#0e1117', card: '#161b24', sidebar: '#131720',
		accent: '#acc7ff', accentContainer: '#4a90d9',
		preview: { bg: '#0e1117', card: '#1e2535', sidebar: '#161b24', dot: '#acc7ff' }
	},
	{
		id: 'obsidian', name: 'Obsidian', label: 'Dark',
		dark: true,
		surface: '#111110', card: '#1c1b18', sidebar: '#161614',
		accent: '#d4c5a9', accentContainer: '#8a7660',
		preview: { bg: '#111110', card: '#1c1b18', sidebar: '#161614', dot: '#d4c5a9' }
	},
	{
		id: 'forest-night', name: 'Forest', label: 'Dark',
		dark: true,
		surface: '#0d1410', card: '#141f17', sidebar: '#111a14',
		accent: '#86efac', accentContainer: '#166534',
		preview: { bg: '#0d1410', card: '#1a2e1e', sidebar: '#141f17', dot: '#86efac' }
	},
	{
		id: 'aurora', name: 'Aurora', label: 'Dark',
		dark: true,
		surface: '#0f0f1a', card: '#16162a', sidebar: '#13132200',
		accent: '#c4b5fd', accentContainer: '#5b21b6',
		preview: { bg: '#0f0f1a', card: '#1e1e35', sidebar: '#16162a', dot: '#c4b5fd' }
	},
];

function applyPreferencesToDOM(value: UserPreferences) {
	if (typeof window === 'undefined') return;

	document.documentElement.style.setProperty('--sys-primary', value.accentColor);
	document.documentElement.style.setProperty('--sys-primary-container', value.accentContainer || value.accentColor);

	// Apply full theme if themeId is set
	const appTheme = APP_THEMES.find(t => t.id === value.themeId);
	if (appTheme) {
		if (appTheme.dark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		document.documentElement.style.setProperty('--sys-surface', appTheme.surface);
		document.documentElement.style.setProperty('--sys-background', appTheme.surface);
		document.documentElement.style.setProperty('--sys-surface-container-lowest', appTheme.card);
		document.documentElement.style.setProperty('--sys-surface-container-low', appTheme.sidebar);
		document.documentElement.style.setProperty('--sys-surface-container', appTheme.sidebar);
	}

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