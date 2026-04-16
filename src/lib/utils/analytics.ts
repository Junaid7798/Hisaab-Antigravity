import type { Invoice, Expense, Product, Patient, InvoiceItem } from '$lib/db/index';
import { toRupees, formatINR, formatINRCompact } from './currency';

export interface FinancialRatios {
	currentRatio: number;
	quickRatio: number;
	grossMargin: number;
	netMargin: number;
	roi: number;
	roa: number;
	breakEvenUnits: number;
	breakEvenRevenue: number;
	cashRatio: number;
	workingCapital: number;
}

export interface ABCItem {
	product: Product;
	annualValue: number;
	cumulativeValue: number;
	cumulativePercent: number;
	category: 'A' | 'B' | 'C';
	rank: number;
}

export interface InventoryMetrics {
	abcAnalysis: ABCItem[];
	deadStock: Product[];
	overStocked: Product[];
	turnoverRate: number;
	safetyStock: number;
	reorderPoints: Map<string, number>;
	daysInventoryOutstanding: number;
	lowStockCount: number;
	totalInventoryValue: number;
}

export interface RFMScore {
	customer: Patient;
	recency: number;
	frequency: number;
	monetary: number;
	recencyScore: number;
	frequencyScore: number;
	monetaryScore: number;
	totalScore: number;
	segment: RFMSegment;
	segmentCode: string;
}

export type RFMSegment = 
	| 'Champions'
	| 'Loyal Customers'
	| 'Potential Loyalists'
	| 'At Risk'
	| 'Lost'
	| 'New Customers'
	| 'Big Spenders'
	| 'Need Attention';

export interface CustomerInsights {
	rfmScores: RFMScore[];
	segmentDistribution: Record<RFMSegment, number>;
	champions: Patient[];
	loyalCustomers: Patient[];
	atRisk: Patient[];
	lostCustomers: Patient[];
	totalCustomers: number;
	newCustomersThisMonth: number;
	returningRate: number;
	avgPurchaseFrequency: number;
	avgPurchaseValue: number;
	topCustomers: { customer: Patient; totalRevenue: number }[];
}

export interface OperationalMetrics {
	peakHours: { hour: number; count: number; percentage: number }[];
	peakDays: { day: string; count: number; percentage: number }[];
	avgTransactionValue: number;
	revenuePerCustomer: number;
	customerRetentionRate: number;
	totalTransactions: number;
	uniqueCustomers: number;
}

export interface ForecastingData {
	projectedRevenue: number[];
	projectedExpenses: number[];
	trendDirection: 'up' | 'down' | 'stable';
	trendPercentage: number;
	seasonalityIndex: number[];
	confidenceScore: number;
}

export interface GoalProgress {
	id: string;
	name: string;
	type: 'revenue' | 'profit' | 'customers';
	target: number;
	current: number;
	deadline: string;
	progress: number;
	status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'missed';
	predictedCompletion: number;
	daysRemaining: number;
	created_at?: string;
}

export interface AlertRule {
	id: string;
	name: string;
	metric: string;
	condition: 'above' | 'below' | 'change';
	threshold: number;
	enabled: boolean;
	lastTriggered?: string;
}

export interface DashboardMetrics {
	financial: FinancialRatios;
	inventory: InventoryMetrics;
	customers: CustomerInsights;
	operational: OperationalMetrics;
	forecasting: ForecastingData;
	goals: GoalProgress[];
	insights: string[];
	alerts: AlertRule[];
}

const ABC_THRESHOLDS = { a: 80, b: 95 };
const DEAD_STOCK_DAYS = 90;
const RFM_PERIOD_DAYS = 365;

function calculatePercentile(value: number, sortedValues: number[]): number {
	const sorted = [...sortedValues].sort((a, b) => a - b);
	let rank = sorted.findIndex(v => v >= value);
	if (rank === -1) rank = sorted.length - 1;
	return (rank / (sorted.length - 1)) * 100;
}

export function calculateFinancialRatios(
	revenue: number,
	expenses: number,
	currentAssets: number,
	currentLiabilities: number,
	inventory: number,
	totalAssets: number,
	fixedCosts: number,
	averagePrice: number,
	variableCostPerUnit: number,
	products: Product[] = [],
	invoiceItems: InvoiceItem[] = []
): FinancialRatios {
	const cogs = products.length > 0 ? products.reduce((sum, p) => {
		const soldQty = invoiceItems.filter(i => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0);
		return sum + (p.purchase_price * (soldQty / 100)) / 100;
	}, 0) : revenue * 0.6;
	const grossProfit = revenue - cogs;
	const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
	const netProfit = revenue - expenses;
	const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
	
	const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
	const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
	const cashRatio = currentLiabilities > 0 ? (currentAssets - inventory * 0.5) / currentLiabilities : 0;
	const workingCapital = currentAssets - currentLiabilities;
	
	const roi = netProfit > 0 && fixedCosts > 0 ? (netProfit / fixedCosts) * 100 : 0;
	const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
	
	const contributionMargin = averagePrice - variableCostPerUnit;
	const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
	const breakEvenRevenue = breakEvenUnits * averagePrice;
	
	return {
		currentRatio: Math.round(currentRatio * 100) / 100,
		quickRatio: Math.round(quickRatio * 100) / 100,
		grossMargin: Math.round(grossMargin * 10) / 10,
		netMargin: Math.round(netMargin * 10) / 10,
		roi: Math.round(roi * 10) / 10,
		roa: Math.round(roa * 10) / 10,
		breakEvenUnits: Math.ceil(breakEvenUnits),
		breakEvenRevenue: Math.round(breakEvenRevenue),
		cashRatio: Math.round(cashRatio * 100) / 100,
		workingCapital: Math.round(workingCapital)
	};
}

export function calculateABCAnalysis(
	products: Product[],
	invoices: Invoice[],
	invoiceItems: InvoiceItem[] = [],
	thresholdA: number = ABC_THRESHOLDS.a,
	thresholdB: number = ABC_THRESHOLDS.b
): ABCItem[] {
	const validInvoiceIds = new Set(
		invoices.filter(i => i.document_type === 'INVOICE' && i.status === 'PAID').map(i => i.id)
	);
	
	const productSales = new Map<string, number>();
	for (const item of invoiceItems) {
		if (item.product_id && validInvoiceIds.has(item.invoice_id)) {
			productSales.set(item.product_id, (productSales.get(item.product_id) || 0) + item.amount);
		}
	}
	
	const abcItems: ABCItem[] = products
		.filter(p => !p.is_deleted && !p.is_service)
		.map(product => {
			const annualValue = (productSales.get(product.id) || 0) / 100;
			return {
				product,
				annualValue,
				cumulativeValue: 0,
				cumulativePercent: 0,
				category: 'C' as const,
				rank: 0
			};
		})
		.sort((a, b) => b.annualValue - a.annualValue);
	
	const totalValue = abcItems.reduce((sum, item) => sum + item.annualValue, 0);
	
	let cumulative = 0;
	let rank = 0;
	
	for (const item of abcItems) {
		rank++;
		item.rank = rank;
		cumulative += item.annualValue;
		item.cumulativeValue = cumulative;
		item.cumulativePercent = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
		
		if (item.cumulativePercent <= thresholdA) {
			item.category = 'A';
		} else if (item.cumulativePercent <= thresholdB) {
			item.category = 'B';
		} else {
			item.category = 'C';
		}
	}
	
	return abcItems;
}

export function calculateInventoryMetrics(
	products: Product[],
	invoices: Invoice[],
	invoiceItems: InvoiceItem[] = []
): InventoryMetrics {
	const abcAnalysis = calculateABCAnalysis(products, invoices, invoiceItems);
	
	const today = new Date();
	const deadline = new Date(today);
	deadline.setDate(deadline.getDate() - DEAD_STOCK_DAYS);
	
	const recentInvoiceIds = new Set(
		invoices
			.filter(i => i.document_type === 'INVOICE' && new Date(i.issue_date) >= deadline)
			.map(i => i.id)
	);
	const soldRecentlyProductIds = new Set(
		invoiceItems.filter(i => recentInvoiceIds.has(i.invoice_id)).map(i => i.product_id)
	);
	
	const deadStock = products.filter(p => {
		if (p.is_deleted || p.is_service) return false;
		return p.stock_quantity > 0 && !soldRecentlyProductIds.has(p.id);
	});
	
	const overStocked = products.filter(p => {
		if (p.is_deleted || p.is_service) return false;
		return p.stock_quantity > (p.low_stock_threshold * 10);
	});
	
	const totalInventoryValue = products
		.filter(p => !p.is_deleted && !p.is_service)
		.reduce((sum, p) => sum + (p.selling_price * p.stock_quantity) / 100, 0);
	
	const avgInventory = totalInventoryValue / Math.max(products.filter(p => !p.is_deleted && !p.is_service).length, 1);
	
	const cogs = products.length > 0 ? products.reduce((sum, p) => {
		const soldQty = invoiceItems.filter(i => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0);
		return sum + (p.purchase_price * (soldQty / 100)) / 100;
	}, 0) : totalInventoryValue * 0.6;
	
	const turnoverRate = avgInventory > 0 ? cogs / avgInventory : 0;
	const dio = turnoverRate > 0 ? 365 / turnoverRate : 0;
	
	const reorderPoints = new Map<string, number>();
	const safetyStock = 0;
	
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const recent30DaysInvoiceIds = new Set(
		invoices.filter(i => i.document_type === 'INVOICE' && new Date(i.issue_date) >= thirtyDaysAgo).map(i => i.id)
	);
	
	for (const product of products.filter(p => !p.is_deleted && !p.is_service)) {
		const soldIn30Days = invoiceItems
			.filter(i => i.product_id === product.id && recent30DaysInvoiceIds.has(i.invoice_id))
			.reduce((sum, i) => sum + i.quantity, 0) / 100;
			
		const avgDailySales = soldIn30Days / 30;
		const leadTime = 7;
		const safetyStockCalc = (10 * leadTime) - (avgDailySales * leadTime);
		reorderPoints.set(product.id, Math.ceil((avgDailySales * leadTime) + Math.max(0, safetyStockCalc)));
	}
	
	const lowStockCount = products.filter(p => 
		!p.is_deleted && !p.is_service && 
		p.stock_quantity <= p.low_stock_threshold
	).length;
	
	return {
		abcAnalysis,
		deadStock,
		overStocked,
		turnoverRate: Math.round(turnoverRate * 10) / 10,
		safetyStock: Math.round(safetyStock),
		reorderPoints,
		daysInventoryOutstanding: Math.round(dio),
		lowStockCount,
		totalInventoryValue: Math.round(totalInventoryValue)
	};
}

export function calculateRFM(
	customers: Patient[],
	invoices: Invoice[],
	analysisDays: number = RFM_PERIOD_DAYS
): CustomerInsights {
	const today = new Date();
	const analysisStart = new Date(today);
	analysisStart.setDate(analysisStart.getDate() - analysisDays);
	
	const customerMetrics = new Map<string, {
		lastPurchase: Date | null;
		purchaseCount: number;
		totalSpend: number;
	}>();
	
	for (const customer of customers) {
		if (customer.is_deleted) continue;
		customerMetrics.set(customer.id, {
			lastPurchase: null,
			purchaseCount: 0,
			totalSpend: 0
		});
	}
	
	for (const invoice of invoices) {
		if (invoice.document_type !== 'INVOICE' || invoice.status !== 'PAID') continue;
		if (!invoice.patient_id) continue;
		
		const metrics = customerMetrics.get(invoice.patient_id);
		if (!metrics) continue;
		
		const invoiceDate = new Date(invoice.issue_date);
		if (invoiceDate < analysisStart) continue;
		
		metrics.purchaseCount++;
		metrics.totalSpend += invoice.grand_total;
		
		if (!metrics.lastPurchase || invoiceDate > metrics.lastPurchase) {
			metrics.lastPurchase = invoiceDate;
		}
	}
	
	const rfmScores: RFMScore[] = [];
	const recencyValues: number[] = [];
	const frequencyValues: number[] = [];
	const monetaryValues: number[] = [];
	
	for (const customer of customers) {
		if (customer.is_deleted) continue;
		
		const metrics = customerMetrics.get(customer.id);
		if (!metrics || metrics.purchaseCount === 0) continue;
		
		const recency = metrics.lastPurchase 
			? Math.floor((today.getTime() - metrics.lastPurchase.getTime()) / 86400000)
			: 999;
		
		const frequency = metrics.purchaseCount;
		const monetary = metrics.totalSpend / 100;
		
		recencyValues.push(recency);
		frequencyValues.push(frequency);
		monetaryValues.push(monetary);
		
		rfmScores.push({
			customer,
			recency,
			frequency,
			monetary,
			recencyScore: 0,
			frequencyScore: 0,
			monetaryScore: 0,
			totalScore: 0,
			segment: 'Need Attention',
			segmentCode: ''
		});
	}
	
	rfmScores.sort((a, b) => a.recency - b.recency);
	const recencyQuintiles = [20, 40, 60, 80, 100];
	
	for (let i = 0; i < rfmScores.length; i++) {
		const percentile = ((i + 1) / rfmScores.length) * 100;
		let score = 1;
		for (let j = 0; j < recencyQuintiles.length; j++) {
			if (percentile <= recencyQuintiles[j]) {
				score = 5 - j;
				break;
			}
		}
		if (score === 0) score = 1;
		rfmScores[i].recencyScore = score;
	}
	
	rfmScores.sort((a, b) => b.frequency - a.frequency);
	for (let i = 0; i < rfmScores.length; i++) {
		const percentile = ((i + 1) / rfmScores.length) * 100;
		let score = 1;
		for (let j = 0; j < recencyQuintiles.length; j++) {
			if (percentile <= recencyQuintiles[j]) {
				score = j + 1;
				break;
			}
		}
		rfmScores[i].frequencyScore = score;
	}
	
	rfmScores.sort((a, b) => b.monetary - a.monetary);
	for (let i = 0; i < rfmScores.length; i++) {
		const percentile = ((i + 1) / rfmScores.length) * 100;
		let score = 1;
		for (let j = 0; j < recencyQuintiles.length; j++) {
			if (percentile <= recencyQuintiles[j]) {
				score = j + 1;
				break;
			}
		}
		rfmScores[i].monetaryScore = score;
	}
	
	for (const score of rfmScores) {
		score.totalScore = score.recencyScore + score.frequencyScore + score.monetaryScore;
		score.segmentCode = `${score.recencyScore}${score.frequencyScore}${score.monetaryScore}`;
		
		const { recencyScore, frequencyScore, monetaryScore } = score;
		
		if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
			score.segment = 'Champions';
		} else if (recencyScore >= 3 && frequencyScore >= 4) {
			score.segment = 'Loyal Customers';
		} else if (recencyScore >= 3 && frequencyScore >= 3) {
			score.segment = 'Potential Loyalists';
		} else if (recencyScore <= 2 && frequencyScore >= 3) {
			score.segment = 'At Risk';
		} else if (recencyScore <= 1 && frequencyScore <= 2) {
			score.segment = 'Lost';
		} else if (frequencyScore === 1 && monetaryScore >= 4) {
			score.segment = 'Big Spenders';
		} else if (recencyScore >= 4 && frequencyScore <= 2) {
			score.segment = 'New Customers';
		} else {
			score.segment = 'Need Attention';
		}
	}
	
	const segmentDistribution = {
		'Champions': 0,
		'Loyal Customers': 0,
		'Potential Loyalists': 0,
		'At Risk': 0,
		'Lost': 0,
		'New Customers': 0,
		'Big Spenders': 0,
		'Need Attention': 0
	};
	
	const champions: Patient[] = [];
	const loyalCustomers: Patient[] = [];
	const atRisk: Patient[] = [];
	const lostCustomers: Patient[] = [];
	
	for (const score of rfmScores) {
		segmentDistribution[score.segment]++;
		
		switch (score.segment) {
			case 'Champions':
				champions.push(score.customer);
				break;
			case 'Loyal Customers':
				loyalCustomers.push(score.customer);
				break;
			case 'At Risk':
				atRisk.push(score.customer);
				break;
			case 'Lost':
				lostCustomers.push(score.customer);
				break;
		}
	}
	
	const totalRevenue = rfmScores.reduce((sum, s) => sum + s.monetary, 0);
	const totalTransactions = rfmScores.reduce((sum, s) => sum + s.frequency, 0);
	
	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
	const newCustomersThisMonth = customers.filter(c => {
		if (c.is_deleted) return false;
		const created = new Date(c.created_at);
		return created >= monthStart;
	}).length;
	
	const returningRate = rfmScores.length > 0 
		? (rfmScores.filter(s => s.frequency > 1).length / rfmScores.length) * 100 
		: 0;
	
	const topCustomers = rfmScores
		.sort((a, b) => b.monetary - a.monetary)
		.slice(0, 10)
		.map(s => ({ customer: s.customer, totalRevenue: s.monetary }));
	
	return {
		rfmScores,
		segmentDistribution,
		champions,
		loyalCustomers,
		atRisk,
		lostCustomers,
		totalCustomers: rfmScores.length,
		newCustomersThisMonth,
		returningRate: Math.round(returningRate * 10) / 10,
		avgPurchaseFrequency: rfmScores.length > 0 ? Math.round((totalTransactions / rfmScores.length) * 10) / 10 : 0,
		avgPurchaseValue: rfmScores.length > 0 ? Math.round((totalRevenue / totalTransactions) * 10) / 10 : 0,
		topCustomers
	};
}

export function calculateOperationalMetrics(
	invoices: Invoice[],
	customers: Patient[]
): OperationalMetrics {
	const hourCounts = new Map<number, number>();
	const dayCounts = new Map<string, number>();
	const customerIds = new Set<string>();
	let totalRevenue = 0;
	let totalTransactions = 0;
	
	for (const invoice of invoices) {
		if (invoice.document_type !== 'INVOICE' || invoice.status !== 'PAID') continue;
		
		const date = new Date(invoice.created_at || invoice.issue_date);
		const hour = date.getHours();
		const day = date.toLocaleDateString('en-US', { weekday: 'long' });
		
		hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
		dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
		
		if (invoice.patient_id) {
			customerIds.add(invoice.patient_id);
		}
		
		totalRevenue += invoice.grand_total;
		totalTransactions++;
	}
	
	const totalEvents = Array.from(hourCounts.values()).reduce((a, b) => a + b, 0);
	const peakHours = Array.from(hourCounts.entries())
		.map(([hour, count]) => ({
			hour,
			count,
			percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);
	
	const totalDayEvents = Array.from(dayCounts.values()).reduce((a, b) => a + b, 0);
	const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const peakDays = dayNames
		.map(day => ({
			day,
			count: dayCounts.get(day) || 0,
			percentage: totalDayEvents > 0 ? Math.round(((dayCounts.get(day) || 0) / totalDayEvents) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count);
	
	const uniqueCustomers = customerIds.size;
	const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
	const revenuePerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
	
	const returningCustomers = invoices.filter(i => 
		i.document_type === 'INVOICE' && 
		i.status === 'PAID'
	).reduce((map, inv) => {
		if (!inv.patient_id) return map;
		map.set(inv.patient_id, (map.get(inv.patient_id) || 0) + 1);
		return map;
	}, new Map<string, number>());
	
	const returningCount = Array.from(returningCustomers.values()).filter(c => c > 1).length;
	const customerRetentionRate = uniqueCustomers > 0 ? (returningCount / uniqueCustomers) * 100 : 0;
	
	return {
		peakHours,
		peakDays,
		avgTransactionValue: Math.round(avgTransactionValue),
		revenuePerCustomer: Math.round(revenuePerCustomer),
		customerRetentionRate: Math.round(customerRetentionRate * 10) / 10,
		totalTransactions,
		uniqueCustomers
	};
}

export function calculateForecasting(
	revenueByMonth: { label: string; value: number }[],
	expensesByMonth: { label: string; value: number }[]
): ForecastingData {
	if (revenueByMonth.length < 3) {
		return {
			projectedRevenue: [],
			projectedExpenses: [],
			trendDirection: 'stable',
			trendPercentage: 0,
			seasonalityIndex: [],
			confidenceScore: 0
		};
	}
	
	const values = revenueByMonth.map(r => r.value);
	const n = values.length;
	
	let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
	for (let i = 0; i < n; i++) {
		sumX += i;
		sumY += values[i];
		sumXY += i * values[i];
		sumX2 += i * i;
	}
	
	const slope = n > 0 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
	const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;
	
	const avgY = sumY / n;
	const ssTotal = values.reduce((acc, y) => acc + Math.pow(y - avgY, 2), 0);
	const ssRes = values.reduce((acc, y, i) => acc + Math.pow(y - (slope * i + intercept), 2), 0);
	const r2 = ssTotal > 0 ? 1 - (ssRes / ssTotal) : 0;
	
	const projectedRevenue: number[] = [];
	const projectedExpenses: number[] = [];
	
	for (let i = 1; i <= 3; i++) {
		const projected = Math.max(0, slope * (n + i) + intercept);
		projectedRevenue.push(Math.round(projected));
	}
	
	const expenseValues = expensesByMonth.map(e => e.value);
	const avgExpense = expenseValues.length > 0 
		? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length 
		: 0;
	
	for (let i = 1; i <= 3; i++) {
		const growthFactor = avgY > 0 ? (slope / avgY) * i : 0;
		projectedExpenses.push(Math.round(avgExpense * (1 + growthFactor)));
	}
	
	const trendPercentage = avgY > 0 ? (slope / avgY) * 100 : 0;
	const trendDirection = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';
	
	const seasonalityIndexValues = values.map((v, i) => {
		const movingAvg = i > 0 && i < n - 1 
			? (values[i - 1] + values[i] + values[i + 1]) / 3 
			: values[i];
		return movingAvg > 0 ? Math.round((v / movingAvg) * 100) : 100;
	});
	
	return {
		projectedRevenue,
		projectedExpenses,
		trendDirection,
		trendPercentage: Math.round(trendPercentage * 10) / 10,
		seasonalityIndex: seasonalityIndexValues,
		confidenceScore: Math.round(Math.max(0, r2 * 100))
	};
}

export function calculateGoalProgress(
	goals: GoalProgress[],
	currentRevenue: number,
	currentProfit: number,
	currentCustomers: number
): GoalProgress[] {
	const today = new Date();
	
	return goals.map(goal => {
		const deadline = new Date(goal.deadline);
		const createdDate = goal.created_at ? new Date(goal.created_at) : new Date(deadline.getTime() - 30 * 86400000);
		
		const daysTotal = Math.max(1, Math.ceil((deadline.getTime() - createdDate.getTime()) / 86400000));
		const daysElapsed = Math.max(0, Math.ceil((today.getTime() - createdDate.getTime()) / 86400000));
		
		let current = 0;
		switch (goal.type) {
			case 'revenue': current = currentRevenue; break;
			case 'profit': current = currentProfit; break;
			case 'customers': current = currentCustomers; break;
		}
		
		const progress = goal.target > 0 ? Math.min(100, (current / goal.target) * 100) : 0;
		const expectedProgress = Math.min(100, (daysElapsed / daysTotal) * 100);
		const requiredDaily = goal.target / daysTotal;
		const actualDaily = daysElapsed > 0 ? current / daysElapsed : 0;
		const predictedCompletion = requiredDaily > 0 ? (actualDaily / requiredDaily) * 100 : 100;
		
		const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000));
		
		let status: GoalProgress['status'] = 'at_risk';
		if (progress >= 100) status = 'achieved';
		else if (daysRemaining <= 0) status = 'missed';
		else if (predictedCompletion >= 100) status = 'on_track';
		else if (predictedCompletion >= 70) status = 'at_risk';
		else status = 'behind';
		
		return {
			...goal,
			current,
			progress: Math.round(progress),
			status,
			predictedCompletion: Math.round(predictedCompletion),
			daysRemaining: Math.max(0, daysTotal)
		};
	});
}

export function generateInsights(
	financial: FinancialRatios,
	inventory: InventoryMetrics,
	customers: CustomerInsights,
	operational: OperationalMetrics,
	forecasting: ForecastingData
): string[] {
	const insights: string[] = [];
	
	if (financial.currentRatio < 1.2) {
		insights.push('⚠️ Low liquidity: Current ratio below 1.2. Consider improving collections or reducing liabilities.');
	} else if (financial.currentRatio > 3) {
		insights.push('💡 High liquidity: Consider investing excess cash to improve returns.');
	}
	
	if (financial.netMargin >= 30) {
		insights.push('🎯 Excellent profit margin of ' + financial.netMargin.toFixed(1) + '%! Your pricing is strong.');
	} else if (financial.netMargin < 10) {
		insights.push('📊 Consider reviewing costs - net margin is below 10%.');
	}
	
	const aItems = inventory.abcAnalysis.filter(i => i.category === 'A');
	if (aItems.length > 0) {
		insights.push('⭐ ' + aItems.length + ' A-grade products drive most of your revenue. Prioritize these in stock.');
	}
	
	if (inventory.deadStock.length > 0) {
		insights.push('📦 ' + inventory.deadStock.length + ' items have no stock. Consider discounting to clear.');
	}
	
	if (inventory.lowStockCount > 0) {
		insights.push('⚡ ' + inventory.lowStockCount + ' items are low on stock. Reorder soon to avoid stockouts.');
	}
	
	const champions = customers.segmentDistribution['Champions'];
	const atRisk = customers.segmentDistribution['At Risk'] + customers.segmentDistribution['Lost'];
	
	if (champions > 0) {
		insights.push('👑 ' + champions + ' champion customers. Reward their loyalty!');
	}
	
	if (atRisk > champions) {
		insights.push('⚠️ More at-risk customers than champions. Launch retention campaigns.');
	}
	
	if (operational.peakDays.length > 0) {
		const busiest = operational.peakDays[0];
		insights.push('📅 ' + busiest.day + ' is your busiest day (' + busiest.percentage + '% of sales).');
	}
	
	if (forecasting.trendDirection === 'up') {
		insights.push('📈 Revenue trending up! ' + forecasting.trendPercentage.toFixed(1) + '% growth expected.');
	} else if (forecasting.trendDirection === 'down') {
		insights.push('📉 Revenue declining. Review pricing and customer retention.');
	}
	
	return insights;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
	{ id: 'low_stock', name: 'Low Stock Alert', metric: 'stock', condition: 'below', threshold: 10, enabled: false },
	{ id: 'overdue_inv', name: 'Overdue Invoices', metric: 'overdue', condition: 'above', threshold: 5, enabled: false },
	{ id: 'expense_spike', name: 'Expense Spike', metric: 'expense', condition: 'change', threshold: 20, enabled: false },
	{ id: 'revenue_drop', name: 'Revenue Drop', metric: 'revenue', condition: 'change', threshold: -10, enabled: false },
	{ id: 'dead_stock', name: 'Dead Stock', metric: 'dead_stock', condition: 'above', threshold: 5, enabled: false }
];

export function checkAlerts(
	rules: AlertRule[],
	inventory: InventoryMetrics,
	overdueInvoices: number[],
	expenseChange: number,
	revenueChange: number
): AlertRule[] {
	const triggeredAlerts: AlertRule[] = [];
	
	for (const rule of rules) {
		if (!rule.enabled) continue;
		
		let isTriggered = false;
		
		switch (rule.metric) {
			case 'stock':
				isTriggered = inventory.lowStockCount >= rule.threshold;
				break;
			case 'overdue':
				isTriggered = overdueInvoices.length >= rule.threshold;
				break;
			case 'expense':
				isTriggered = expenseChange >= rule.threshold;
				break;
			case 'revenue':
				isTriggered = revenueChange <= rule.threshold;
				break;
			case 'dead_stock':
				isTriggered = inventory.deadStock.length >= rule.threshold;
				break;
		}
		
		if (isTriggered) {
			triggeredAlerts.push({ ...rule, lastTriggered: new Date().toISOString() });
		}
	}
	
	return triggeredAlerts;
}

export function formatSegmentLabel(segment: RFMSegment): string {
	const labels: Record<RFMSegment, string> = {
		'Champions': 'Best customers who buy often and recently',
		'Loyal Customers': 'Regular buyers with good frequency',
		'Potential Loyalists': 'Promising customers, encourage repeat',
		'At Risk': 'Used to buy frequently, need attention',
		'Lost': 'Haven\'t purchased in a long time',
		'New Customers': 'Recent first-time buyers',
		'Big Spenders': 'High value but may buy infrequently',
		'Need Attention': 'Average customers, room to improve'
	};
	return labels[segment];
}

export function getSegmentColor(segment: RFMSegment): string {
	const colors: Record<RFMSegment, string> = {
		'Champions': 'bg-emerald-500',
		'Loyal Customers': 'bg-blue-500',
		'Potential Loyalists': 'bg-cyan-500',
		'At Risk': 'bg-amber-500',
		'Lost': 'bg-red-500',
		'New Customers': 'bg-purple-500',
		'Big Spenders': 'bg-pink-500',
		'Need Attention': 'bg-gray-500'
	};
	return colors[segment];
}

export function getHealthRecommendations(
	financial: FinancialRatios,
	customers: CustomerInsights,
	inventory: InventoryMetrics
): string[] {
	const recommendations: string[] = [];
	
	if (financial.currentRatio < 1.5) {
		recommendations.push('Improve cash flow by offering early payment discounts');
	}
	
	if (financial.netMargin < 15) {
		recommendations.push('Review pricing strategy - margins are below industry average');
	}
	
	if (customers.returningRate < 30) {
		recommendations.push('Focus on customer retention programs');
	}
	
	if (inventory.lowStockCount > 5) {
		recommendations.push('Set up automatic reorder points for critical items');
	}
	
	if (inventory.deadStock.length > 0) {
		recommendations.push('Run clearance sales for dead stock to free up capital');
	}
	
	const atRiskCount = customers.segmentDistribution['At Risk'] + customers.segmentDistribution['Lost'];
	if (atRiskCount > customers.totalCustomers * 0.3) {
		recommendations.push('Launch win-back campaign for at-risk customers');
	}
	
	return recommendations;
}
