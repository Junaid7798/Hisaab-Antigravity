import { db, type Product } from './index';
import { now } from '$lib/utils/helpers';

export interface StockWarning {
	productId: string;
	productName: string;
	requested: number;
	available: number;
}

export interface StockAdjustment {
	productId: string;
	delta: number;
	reason: string;
}

/**
 * Validates stock availability for a list of items and returns warnings for any
 * items that would fall below zero stock.
 */
export async function validateStock(items: { productId: string; quantity: number }[]): Promise<StockWarning[]> {
	const warnings: StockWarning[] = [];
	
	for (const item of items) {
		const product = await db.products.get(item.productId);
		if (product) {
			const available = product.stock_quantity / 100; // Stock is typically stored x100
			if (available - item.quantity < 0) {
				warnings.push({
					productId: product.id,
					productName: product.name,
					requested: item.quantity,
					available: available
				});
			}
		}
	}
	
	return warnings;
}

/**
 * Adjusts the stock of a single product. Positive delta increases stock, negative decreases.
 * Note: Should be called within a Dexie transaction if part of a larger operation.
 */
export async function adjustStock(productId: string, delta: number, reason: string): Promise<void> {
	await bulkAdjustStock([{ productId, delta, reason }]);
}

/**
 * Bulk adjusts stock for multiple products. Positive delta increases stock.
 * Note: Should be called within a Dexie transaction if part of a larger operation.
 */
export async function bulkAdjustStock(adjustments: StockAdjustment[]): Promise<void> {
	if (adjustments.length === 0) return;
	
	const productIds = adjustments.map(a => a.productId);
	const products = await db.products.where('id').anyOf(productIds).toArray();
	
	const productMap = new Map<string, Product>();
	for (const p of products) {
		productMap.set(p.id, p);
	}
	
	const updates = [];
	
	for (const adj of adjustments) {
		const p = productMap.get(adj.productId);
		if (p) {
			// Ensure delta is scaled if stock is stored x100.
			// Assuming delta passed in is the UI quantity.
			const scaledDelta = Math.round(adj.delta * 100);
			p.stock_quantity += scaledDelta;
			p.last_modified = now();
			updates.push(p);
		}
	}
	
	if (updates.length > 0) {
		await db.products.bulkPut(updates);
	}
}
