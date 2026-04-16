import type { Invoice, Expense, Product, Patient } from '$lib/db/index';
import { toRupees, formatINRCompact } from './currency';

export interface Insight {
	id: string;
	type: 'success' | 'warning' | 'danger' | 'info' | 'achievement';
	title: string;
	description: string;
	value?: string;
	icon: string;
	action?: {
		label: string;
		href: string;
	};
	priority: number;
	metric?: string;
}

export interface BusinessMetrics {
	totalRevenue: number;
	totalExpenses: number;
	netProfit: number;
	profitMargin: number;
	avgTransactionValue: number;
	repeatCustomerRate: number;
	customerLifetimeValue: number;
	collectionRate: number;
	inventoryTurnover: number;
	topSellingItems: { name: string; quantity: number; revenue: number }[];
	customerRetentionRate: number;
	monthlyGrowthRate: number;
	seasonalTrend: 'up' | 'down' | 'stable';
	projectedRevenue: number;
}

export interface ComparativeData {
	currentMonth: number;
	previousMonth: number;
	percentChange: number;
	trend: 'up' | 'down' | 'stable';
}

function calculateGrowthRate(values: number[]): number {
	if (values.length < 2) return 0;
	const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
	const older = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
	if (older === 0) return recent > 0 ? 100 : 0;
	return ((recent - older) / older) * 100;
}

function calculateSeasonalTrend(values: number[]): 'up' | 'down' | 'stable' {
	if (values.length < 3) return 'stable';
	const recentAvg = values.slice(-2).reduce((a, b) => a + b, 0) / 2;
	const olderAvg = values.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
	const pctChange = ((recentAvg - olderAvg) / olderAvg) * 100;
	if (pctChange > 5) return 'up';
	if (pctChange < -5) return 'down';
	return 'stable';
}

export function generateInsights(
	invoices: Invoice[],
	expenses: Expense[],
	products: Product[],
	patients: Patient[],
	revenueByMonth: { label: string; value: number }[],
	expensesByMonth: { label: string; value: number }[]
): Insight[] {
	const insights: Insight[] = [];
	const today = new Date();
	const thisMonth = today.getMonth();
	const thisYear = today.getFullYear();

	const totalRevenue = invoices
		.filter(i => i.document_type === 'INVOICE')
		.reduce((sum, i) => sum + i.grand_total, 0);

	const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
	const netProfit = totalRevenue - totalExpenses;
	const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

	const paidInvoices = invoices.filter(i => i.status === 'PAID');
	const totalInvoices = invoices.filter(i => i.document_type === 'INVOICE');
	const collectionRate = totalInvoices.length > 0 ? (paidInvoices.length / totalInvoices.length) * 100 : 0;

	const avgSaleValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

	const uniqueCustomers = new Set(paidInvoices.map(i => i.patient_id)).size;
	const repeatCustomers = paidInvoices.reduce((map, inv) => {
		if (!inv.patient_id) return map;
		map.set(inv.patient_id, (map.get(inv.patient_id) || 0) + 1);
		return map;
	}, new Map<string, number>());
	const customersWithMultiple = Array.from(repeatCustomers.values()).filter(v => v > 1).length;
	const repeatRate = uniqueCustomers > 0 ? (customersWithMultiple / uniqueCustomers) * 100 : 0;

	const topSelling = products
		.filter(p => !p.is_service)
		.sort((a, b) => b.stock_quantity - a.stock_quantity)
		.slice(0, 5)
		.map(p => ({
			name: p.name,
			quantity: p.stock_quantity,
			revenue: p.selling_price * p.stock_quantity
		}));

	const lowStock = products.filter(p => !p.is_service && p.stock_quantity <= p.low_stock_threshold);
	const overStocked = products.filter(p => !p.is_service && p.stock_quantity > (p.low_stock_threshold * 10));

	const overdueInvoices = invoices.filter(i => {
		if (i.document_type !== 'INVOICE' || i.status === 'PAID') return false;
		if (!i.due_date) return false;
		return i.due_date < today.toISOString().split('T')[0];
	});

	const revenueGrowth = calculateGrowthRate(revenueByMonth.map(r => r.value));
	const expenseGrowth = calculateGrowthRate(expensesByMonth.map(e => e.value));

	const projectedRevenue = revenueByMonth.length >= 3
		? revenueByMonth.slice(-3).reduce((a, b) => a + b.value, 0) / 3 * (1 + revenueGrowth / 100)
		: totalRevenue;

	const seasonalTrend = calculateSeasonalTrend(revenueByMonth.map(r => r.value));

	if (profitMargin >= 30) {
		insights.push({
			id: 'high_margin',
			type: 'achievement',
			title: 'Excellent Profit Margin!',
			description: `Your profit margin of ${profitMargin.toFixed(1)}% is outstanding. This puts you in the top tier of businesses in your category.`,
			value: `${profitMargin.toFixed(1)}%`,
			icon: 'emoji_events',
			priority: 1
		});
	} else if (profitMargin >= 15) {
		insights.push({
			id: 'good_margin',
			type: 'success',
			title: 'Healthy Profit Margin',
			description: `You're maintaining a solid ${profitMargin.toFixed(1)}% profit margin. Keep optimizing costs to reach excellence.`,
			value: `${profitMargin.toFixed(1)}%`,
			icon: 'trending_up',
			priority: 2
		});
	} else if (profitMargin > 0) {
		insights.push({
			id: 'low_margin',
			type: 'warning',
			title: 'Profit Margin Needs Attention',
			description: `At ${profitMargin.toFixed(1)}%, consider reviewing your pricing or reducing operational costs.`,
			value: `${profitMargin.toFixed(1)}%`,
			icon: 'trending_down',
			priority: 3
		});
	} else {
		insights.push({
			id: 'loss',
			type: 'danger',
			title: 'Operating at a Loss',
			description: 'Your expenses exceed revenue. Immediate action needed to review pricing and costs.',
			icon: 'warning',
			priority: 1
		});
	}

	if (collectionRate >= 90) {
		insights.push({
			id: 'excellent_collection',
			type: 'achievement',
			title: 'Outstanding Collection Rate',
			description: `${collectionRate.toFixed(0)}% of your invoices are paid! Your customers value your service.`,
			value: `${collectionRate.toFixed(0)}%`,
			icon: 'verified',
			priority: 2
		});
	} else if (collectionRate >= 70) {
		insights.push({
			id: 'good_collection',
			type: 'info',
			title: 'Decent Collection Rate',
			description: `${collectionRate.toFixed(0)}% collection rate. Focus on reducing overdue payments to improve cash flow.`,
			value: `${collectionRate.toFixed(0)}%`,
			icon: 'account_balance',
			priority: 4
		});
	}

	if (repeatRate >= 40) {
		insights.push({
			id: 'loyal_customers',
			type: 'success',
			title: 'Strong Customer Loyalty',
			description: `${repeatRate.toFixed(0)}% of customers return for repeat business. Your service quality is appreciated!`,
			value: `${repeatRate.toFixed(0)}%`,
			icon: 'group',
			priority: 3
		});
	}

	if (overdueInvoices.length > 0) {
		const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.grand_total, 0);
		insights.push({
			id: 'overdue_invoices',
			type: 'warning',
			title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''}`,
			description: `₹${formatINRCompact(toRupees(overdueAmount))} is pending collection. Prompt follow-ups can improve cash flow significantly.`,
			value: formatINRCompact(toRupees(overdueAmount)),
			icon: 'schedule',
			action: { label: 'View Invoices', href: '/invoices' },
			priority: 2
		});
	}

	if (lowStock.length > 0) {
		insights.push({
			id: 'low_stock',
			type: 'warning',
			title: `${lowStock.length} Item${lowStock.length > 1 ? 's' : ''} Running Low`,
			description: `Restock soon: ${lowStock.slice(0, 3).map(p => p.name).join(', ')}${lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''}`,
			icon: 'inventory',
			action: { label: 'View Inventory', href: '/inventory' },
			priority: 3
		});
	}

	if (overStocked.length > 5) {
		insights.push({
			id: 'overstocked',
			type: 'info',
			title: 'Consider Discounting Excess Stock',
			description: `${overStocked.length} items are overstocked. Running promotions can free up capital and storage.`,
			icon: 'inventory_2',
			priority: 5
		});
	}

	if (revenueGrowth > 20) {
		insights.push({
			id: 'revenue_spike',
			type: 'success',
			title: 'Revenue Surging!',
			description: `Your revenue is up ${revenueGrowth.toFixed(0)}% compared to last period. This growth trajectory is impressive!`,
			value: `+${revenueGrowth.toFixed(0)}%`,
			icon: 'rocket_launch',
			priority: 1
		});
	} else if (revenueGrowth < -20) {
		insights.push({
			id: 'revenue_decline',
			type: 'danger',
			title: 'Revenue Decline Alert',
			description: `Revenue dropped ${Math.abs(revenueGrowth).toFixed(0)}% recently. Consider analyzing the cause and launching promotions.`,
			value: `${revenueGrowth.toFixed(0)}%`,
			icon: 'trending_down',
			priority: 1
		});
	}

	if (expenseGrowth > revenueGrowth && expenseGrowth > 20) {
		insights.push({
			id: 'expense_concern',
			type: 'warning',
			title: 'Expenses Growing Faster Than Revenue',
			description: `While revenue grew ${revenueGrowth.toFixed(0)}%, expenses jumped ${expenseGrowth.toFixed(0)}%. Review your cost structure.`,
			icon: 'receipt_long',
			priority: 2
		});
	}

	if (seasonalTrend === 'up' && revenueByMonth.length >= 3) {
		insights.push({
			id: 'seasonal_up',
			type: 'success',
			title: ' Riding the Wave',
			description: `Your business shows strong momentum heading into the next season. Capitalize on this trend!`,
			icon: 'waves',
			priority: 4
		});
	}

	if (avgSaleValue > 0 && avgSaleValue < 500) {
		insights.push({
			id: 'low_ticket',
			type: 'info',
			title: 'Opportunity to Increase Average Sale Value',
			description: `Your average transaction is ₹${Math.round(avgSaleValue)}. Upselling or bundling could significantly boost revenue.`,
			value: formatINRCompact(toRupees(avgSaleValue)),
			icon: 'add_shopping_cart',
			priority: 5
		});
	}

	if (patients.length > 0 && uniqueCustomers > patients.length * 0.8) {
		insights.push({
			id: 'new_customers',
			type: 'success',
			title: 'Strong Customer Acquisition',
			description: `Most of your revenue comes from new customers. Focus on retention strategies to build a loyal base.`,
			icon: 'person_add',
			priority: 4
		});
	}

	const daysSinceLastSale = (() => {
		if (paidInvoices.length === 0) return 999;
		const lastSale = paidInvoices.sort((a, b) => 
			new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
		)[0];
		const diff = today.getTime() - new Date(lastSale.issue_date).getTime();
		return Math.floor(diff / (1000 * 60 * 60 * 24));
	})();

	if (daysSinceLastSale > 30) {
		insights.push({
			id: 'inactive',
			type: 'warning',
			title: 'No Sales Lately',
			description: `It's been ${daysSinceLastSale} days since your last invoice. Consider reaching out to past customers or running a promotion.`,
			icon: 'notifications_off',
			priority: 2
		});
	}

	insights.sort((a, b) => a.priority - b.priority);
	return insights.slice(0, 8);
}

export function getBusinessMetrics(
	invoices: Invoice[],
	expenses: Expense[],
	products: Product[],
	patients: Patient[],
	revenueByMonth: { label: string; value: number }[]
): BusinessMetrics {
	const totalRevenue = invoices
		.filter(i => i.document_type === 'INVOICE')
		.reduce((sum, i) => sum + i.grand_total, 0);

	const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
	const netProfit = totalRevenue - totalExpenses;
	const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

	const paidInvoices = invoices.filter(i => i.status === 'PAID');
	const avgTransactionValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

	const uniqueCustomers = new Set(paidInvoices.map(i => i.patient_id));
	const repeatCustomers = paidInvoices.reduce((map, inv) => {
		map.set(inv.patient_id, (map.get(inv.patient_id) || 0) + 1);
		return map;
	}, new Map<string, number>());
	const customersWithMultiple = Array.from(repeatCustomers.values()).filter(v => v > 1).length;
	const repeatCustomerRate = uniqueCustomers.size > 0 ? (customersWithMultiple / uniqueCustomers.size) * 100 : 0;

	const totalPurchases = products
		.filter(p => !p.is_service)
		.reduce((sum, p) => sum + p.purchase_price * p.stock_quantity, 0);
	const inventoryTurnover = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

	const paidAmount = paidInvoices.reduce((sum, i) => sum + i.grand_total, 0);
	const totalInvoiced = invoices.filter(i => i.document_type === 'INVOICE').reduce((sum, i) => sum + i.grand_total, 0);
	const collectionRate = totalInvoiced > 0 ? (paidAmount / totalInvoiced) * 100 : 0;

	const topSellingItems = products
		.filter(p => !p.is_service)
		.sort((a, b) => b.stock_quantity - a.stock_quantity)
		.slice(0, 5)
		.map(p => ({
			name: p.name,
			quantity: p.stock_quantity,
			revenue: p.selling_price * p.stock_quantity
		}));

	const customerLifetimeValue = uniqueCustomers.size > 0 ? totalRevenue / uniqueCustomers.size : 0;

	const monthlyGrowthRate = calculateGrowthRate(revenueByMonth.map(r => r.value));
	const seasonalTrend = calculateSeasonalTrend(revenueByMonth.map(r => r.value));

	const projectedRevenue = revenueByMonth.length >= 3
		? revenueByMonth.slice(-3).reduce((a, b) => a + b.value, 0) / 3 * (1 + monthlyGrowthRate / 100)
		: totalRevenue;

	return {
		totalRevenue,
		totalExpenses,
		netProfit,
		profitMargin,
		avgTransactionValue,
		repeatCustomerRate,
		customerLifetimeValue,
		collectionRate,
		inventoryTurnover,
		topSellingItems,
		customerRetentionRate: repeatCustomerRate,
		monthlyGrowthRate,
		seasonalTrend,
		projectedRevenue
	};
}

export function getHealthScore(metrics: BusinessMetrics): { score: number; label: string; color: string; advice: string } {
	let score = 50;

	if (metrics.profitMargin >= 30) score += 25;
	else if (metrics.profitMargin >= 15) score += 15;
	else if (metrics.profitMargin > 0) score += 5;

	if (metrics.collectionRate >= 90) score += 15;
	else if (metrics.collectionRate >= 70) score += 10;
	else if (metrics.collectionRate < 50) score -= 15;

	if (metrics.repeatCustomerRate >= 40) score += 10;
	else if (metrics.repeatCustomerRate >= 20) score += 5;

	if (metrics.monthlyGrowthRate > 10) score += 10;
	else if (metrics.monthlyGrowthRate < -10) score -= 10;

	const stockIssues = metrics.topSellingItems.filter(i => i.quantity <= 10).length;
	if (stockIssues === 0) score += 5;
	else score -= stockIssues * 2;

	score = Math.max(0, Math.min(100, score));

	if (score >= 85) {
		return {
			score,
			label: 'Excellent',
			color: 'text-emerald-400',
			advice: 'Your business is thriving! Keep up the great work and focus on scaling.'
		};
	}
	if (score >= 70) {
		return {
			score,
			label: 'Good',
			color: 'text-blue-400',
			advice: 'Solid performance. Focus on customer retention to reach the next level.'
		};
	}
	if (score >= 50) {
		return {
			score,
			label: 'Fair',
			color: 'text-amber-400',
			advice: 'Room for improvement. Review costs and customer acquisition strategies.'
		};
	}
	return {
		score,
		label: 'Needs Attention',
		color: 'text-red-400',
		advice: 'Immediate action needed. Prioritize cash flow and customer retention.'
	};
}
