import { db } from '$lib/db/index';
import type { Business, Patient, Invoice, Product, Expense } from '$lib/db/index';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

class DataCache {
	private cache = new Map<string, CacheEntry<any>>();
	private maxSize = 50;
	private defaultTTL = 30000;

	set<T>(key: string, data: T, ttl = this.defaultTTL): void {
		if (this.cache.size >= this.maxSize) {
			const oldest = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
			this.cache.delete(oldest[0]);
		}
		this.cache.set(key, { data, timestamp: Date.now(), ttl });
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}
		return entry.data as T;
	}

	has(key: string): boolean {
		return this.cache.has(key) && Date.now() - (this.cache.get(key)?.timestamp || 0) <= (this.cache.get(key)?.ttl || 0);
	}

	invalidate(pattern?: string): void {
		if (!pattern) {
			this.cache.clear();
			return;
		}
		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) {
				this.cache.delete(key);
			}
		}
	}

	invalidatePrefix(prefix: string): void {
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
			}
		}
	}
}

export const cache = new DataCache();

export async function getCachedInvoices(businessId: string, force = false): Promise<Invoice[]> {
	const key = `invoices:${businessId}`;
	if (!force) {
		const cached = cache.get<Invoice[]>(key);
		if (cached) return cached;
	}
	const invoices = await db.invoices
		.where('business_id')
		.equals(businessId)
		.filter(inv => !inv.is_deleted)
		.sortBy('issue_date');
	cache.set(key, invoices, 15000);
	return invoices;
}

export async function getCachedCustomers(businessId: string, force = false): Promise<Patient[]> {
	const key = `customers:${businessId}`;
	if (!force) {
		const cached = cache.get<Patient[]>(key);
		if (cached) return cached;
	}
	const patients = await db.patients
		.where('business_id')
		.equals(businessId)
		.filter(p => !p.is_deleted)
		.sortBy('name');
	cache.set(key, patients, 30000);
	return patients;
}

export async function getCachedProducts(businessId: string, force = false): Promise<Product[]> {
	const key = `products:${businessId}`;
	if (!force) {
		const cached = cache.get<Product[]>(key);
		if (cached) return cached;
	}
	const products = await db.products
		.where('business_id')
		.equals(businessId)
		.filter(p => !p.is_deleted)
		.sortBy('name');
	cache.set(key, products, 20000);
	return products;
}

export async function getCachedExpenses(businessId: string, force = false): Promise<Expense[]> {
	const key = `expenses:${businessId}`;
	if (!force) {
		const cached = cache.get<Expense[]>(key);
		if (cached) return cached;
	}
	const expenses = await db.expenses
		.where('business_id')
		.equals(businessId)
		.filter(e => !e.is_deleted)
		.sortBy('expense_date');
	cache.set(key, expenses, 15000);
	return expenses;
}

export async function getCachedBusiness(id: string): Promise<Business | undefined> {
	const key = `business:${id}`;
	const cached = cache.get<Business>(key);
	if (cached) return cached;
	const business = await db.businesses.get(id);
	if (business && !business.is_deleted) {
		cache.set(key, business, 60000);
		return business;
	}
	return undefined;
}

export function invalidateBusinessCache(businessId: string): void {
	cache.invalidatePrefix(`invoices:${businessId}`);
	cache.invalidatePrefix(`customers:${businessId}`);
	cache.invalidatePrefix(`products:${businessId}`);
	cache.invalidatePrefix(`expenses:${businessId}`);
	cache.invalidate(`business:${businessId}`);
}