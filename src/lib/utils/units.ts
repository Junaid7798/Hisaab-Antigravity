export interface MeasurementUnit {
	id: string;
	name: string;
	shortName: string;
	type: 'weight' | 'volume' | 'length' | 'area' | 'count' | 'time' | 'packaging';
	icon: string;
	uqc: string;
	conversionFactor?: number;
	baseUnit?: string;
}

export interface UnitCategory {
	id: string;
	name: string;
	icon: string;
	units: MeasurementUnit[];
}

export const measurementUnits: UnitCategory[] = [
	{
		id: 'weight',
		name: 'Weight',
		icon: 'scale',
		units: [
			{ id: 'kg', name: 'Kilogram', shortName: 'kg', type: 'weight', icon: 'scale', uqc: 'KGS' },
			{ id: 'g', name: 'Gram', shortName: 'g', type: 'weight', icon: 'scale', uqc: 'GMS', conversionFactor: 1000, baseUnit: 'kg' },
			{ id: 'mg', name: 'Milligram', shortName: 'mg', type: 'weight', icon: 'scale', uqc: 'GMS', conversionFactor: 1000000, baseUnit: 'kg' },
			{ id: 'quintal', name: 'Quintal', shortName: 'q', type: 'weight', icon: 'scale', uqc: 'QTL', conversionFactor: 0.01, baseUnit: 'kg' },
			{ id: 'ton', name: 'Ton', shortName: 'ton', type: 'weight', icon: 'scale', uqc: 'TON', conversionFactor: 0.001, baseUnit: 'kg' },
			{ id: 'mt', name: 'Metric Ton', shortName: 'MT', type: 'weight', icon: 'scale', uqc: 'MTS', conversionFactor: 0.001, baseUnit: 'kg' },
			{ id: 'tola', name: 'Tola', shortName: 'tola', type: 'weight', icon: 'scale', uqc: 'GMS', conversionFactor: 0.0858, baseUnit: 'kg' },
			{ id: 'carat', name: 'Carat', shortName: 'ct', type: 'weight', icon: 'diamond', uqc: 'GMS', conversionFactor: 0.0002, baseUnit: 'kg' },
			{ id: 'maund', name: 'Maund', shortName: 'maund', type: 'weight', icon: 'scale', uqc: 'KGS', conversionFactor: 0.037324, baseUnit: 'kg' },
			{ id: 'seer', name: 'Seer', shortName: 'seer', type: 'weight', icon: 'scale', uqc: 'KGS', conversionFactor: 0.9331, baseUnit: 'kg' }
		]
	},
	{
		id: 'volume',
		name: 'Volume',
		icon: 'water_drop',
		units: [
			{ id: 'l', name: 'Litre', shortName: 'L', type: 'volume', icon: 'water_drop', uqc: 'LTR' },
			{ id: 'ml', name: 'Millilitre', shortName: 'mL', type: 'volume', icon: 'water_drop', uqc: 'MLT', conversionFactor: 1000, baseUnit: 'l' },
			{ id: 'kl', name: 'Kilolitre', shortName: 'kL', type: 'volume', icon: 'water_drop', uqc: 'KLR', conversionFactor: 0.001, baseUnit: 'l' },
			{ id: 'cbm', name: 'Cubic Meter', shortName: 'm³', type: 'volume', icon: 'view_in_ar', uqc: 'CBM', conversionFactor: 0.001, baseUnit: 'l' },
			{ id: 'ccm', name: 'Cubic Centimeter', shortName: 'cm³', type: 'volume', icon: 'view_in_ar', uqc: 'CCM', conversionFactor: 1000, baseUnit: 'l' },
			{ id: 'gallon_us', name: 'US Gallon', shortName: 'gal', type: 'volume', icon: 'water_drop', uqc: 'UGS', conversionFactor: 0.264172, baseUnit: 'l' },
			{ id: 'gallon_uk', name: 'UK Gallon', shortName: 'gal', type: 'volume', icon: 'water_drop', uqc: 'LTR', conversionFactor: 0.219969, baseUnit: 'l' }
		]
	},
	{
		id: 'length',
		name: 'Length',
		icon: 'straighten',
		units: [
			{ id: 'm', name: 'Meter', shortName: 'm', type: 'length', icon: 'straighten', uqc: 'MTR' },
			{ id: 'cm', name: 'Centimeter', shortName: 'cm', type: 'length', icon: 'straighten', uqc: 'CMS', conversionFactor: 100, baseUnit: 'm' },
			{ id: 'mm', name: 'Millimeter', shortName: 'mm', type: 'length', icon: 'straighten', uqc: 'CMS', conversionFactor: 1000, baseUnit: 'm' },
			{ id: 'km', name: 'Kilometer', shortName: 'km', type: 'length', icon: 'directions', uqc: 'KME', conversionFactor: 0.001, baseUnit: 'm' },
			{ id: 'inch', name: 'Inch', shortName: 'in', type: 'length', icon: 'straighten', uqc: 'MTR', conversionFactor: 39.3701, baseUnit: 'm' },
			{ id: 'ft', name: 'Feet', shortName: 'ft', type: 'length', icon: 'straighten', uqc: 'MTR', conversionFactor: 3.28084, baseUnit: 'm' },
			{ id: 'yd', name: 'Yard', shortName: 'yd', type: 'length', icon: 'straighten', uqc: 'YDS', conversionFactor: 1.09361, baseUnit: 'm' }
		]
	},
	{
		id: 'area',
		name: 'Area',
		icon: 'square_foot',
		units: [
			{ id: 'sqm', name: 'Square Meter', shortName: 'm²', type: 'area', icon: 'square_foot', uqc: 'SQM' },
			{ id: 'sqft', name: 'Square Feet', shortName: 'ft²', type: 'area', icon: 'square_foot', uqc: 'SQF', conversionFactor: 10.7639, baseUnit: 'sqm' },
			{ id: 'sqyd', name: 'Square Yard', shortName: 'yd²', type: 'area', icon: 'square_foot', uqc: 'SQY', conversionFactor: 1.19599, baseUnit: 'sqm' },
			{ id: 'acre', name: 'Acre', shortName: 'acre', type: 'area', icon: 'landscape', uqc: 'SQM', conversionFactor: 0.000247105, baseUnit: 'sqm' },
			{ id: 'hectare', name: 'Hectare', shortName: 'ha', type: 'area', icon: 'landscape', uqc: 'SQM', conversionFactor: 0.0001, baseUnit: 'sqm' },
			{ id: 'sqinch', name: 'Square Inch', shortName: 'in²', type: 'area', icon: 'square_foot', uqc: 'SQF', conversionFactor: 1550, baseUnit: 'sqm' }
		]
	},
	{
		id: 'count',
		name: 'Count / Numbers',
		icon: 'tag',
		units: [
			{ id: 'nos', name: 'Number', shortName: 'no', type: 'count', icon: 'tag', uqc: 'NOS' },
			{ id: 'pcs', name: 'Pieces', shortName: 'pcs', type: 'count', icon: 'inventory_2', uqc: 'PCS' },
			{ id: 'pair', name: 'Pair', shortName: 'pr', type: 'count', icon: 'compare_arrows', uqc: 'PRS' },
			{ id: 'dozen', name: 'Dozen', shortName: 'dz', type: 'count', icon: 'inventory', uqc: 'DOZ' },
			{ id: 'bunch', name: 'Bunch', shortName: 'bunch', type: 'count', icon: 'grass', uqc: 'NOS' },
			{ id: 'set', name: 'Set', shortName: 'set', type: 'count', icon: 'inventory_2', uqc: 'SET' },
			{ id: 'gross', name: 'Gross', shortName: 'grs', type: 'count', icon: 'inventory', uqc: 'GRS', conversionFactor: 0.0833, baseUnit: 'dozen' },
			{ id: 'great_gross', name: 'Great Gross', shortName: 'ggrs', type: 'count', icon: 'inventory', uqc: 'GGR', conversionFactor: 0.00694, baseUnit: 'dozen' },
			{ id: 'thousand', name: 'Thousand', shortName: 'k', type: 'count', icon: 'tag', uqc: 'THD' }
		]
	},
	{
		id: 'packaging',
		name: 'Packaging',
		icon: 'inventory_2',
		units: [
			{ id: 'box', name: 'Box', shortName: 'box', type: 'packaging', icon: 'inventory_2', uqc: 'BOX' },
			{ id: 'pack', name: 'Pack', shortName: 'pk', type: 'packaging', icon: 'inventory_2', uqc: 'PAC' },
			{ id: 'carton', name: 'Carton', shortName: 'ctn', type: 'packaging', icon: 'inventory_2', uqc: 'CTN' },
			{ id: 'bag', name: 'Bag', shortName: 'bag', type: 'packaging', icon: 'shopping_bag', uqc: 'BAG' },
			{ id: 'bottle', name: 'Bottle', shortName: 'btl', type: 'packaging', icon: 'local_drink', uqc: 'BTL' },
			{ id: 'can', name: 'Can', shortName: 'can', type: 'packaging', icon: 'inventory_2', uqc: 'CAN' },
			{ id: 'drum', name: 'Drum', shortName: 'drum', type: 'packaging', icon: 'inventory_2', uqc: 'DRM' },
			{ id: 'roll', name: 'Roll', shortName: 'rol', type: 'packaging', icon: 'rolled_up', uqc: 'ROL' },
			{ id: 'bundle', name: 'Bundle', shortName: 'bdl', type: 'packaging', icon: 'inventory_2', uqc: 'BDL' },
			{ id: 'tube', name: 'Tube', shortName: 'tube', type: 'packaging', icon: 'inventory_2', uqc: 'TUB' },
			{ id: 'pouch', name: 'Pouch', shortName: 'pouch', type: 'packaging', icon: 'inventory_2', uqc: 'PAC' },
			{ id: 'jar', name: 'Jar', shortName: 'jar', type: 'packaging', icon: 'inventory_2', uqc: 'BTL' }
		]
	},
	{
		id: 'time',
		name: 'Time / Services',
		icon: 'schedule',
		units: [
			{ id: 'hour', name: 'Hour', shortName: 'hr', type: 'time', icon: 'schedule', uqc: 'HRS' },
			{ id: 'minute', name: 'Minute', shortName: 'min', type: 'time', icon: 'schedule', uqc: 'HRS', conversionFactor: 60, baseUnit: 'hour' },
			{ id: 'day', name: 'Day', shortName: 'day', type: 'time', icon: 'calendar_today', uqc: 'HRS', conversionFactor: 0.0417, baseUnit: 'hour' },
			{ id: 'month', name: 'Month', shortName: 'mo', type: 'time', icon: 'calendar_month', uqc: 'HRS' },
			{ id: 'visit', name: 'Visit', shortName: 'visit', type: 'time', icon: 'how_to_reg', uqc: 'NOS' },
			{ id: 'session', name: 'Session', shortName: 'session', type: 'time', icon: 'groups', uqc: 'NOS' },
			{ id: 'job', name: 'Job', shortName: 'job', type: 'time', icon: 'construction', uqc: 'NOS' }
		]
	}
];

export function getUnitsByType(type: MeasurementUnit['type']): MeasurementUnit[] {
	return measurementUnits
		.flatMap(cat => cat.units)
		.filter(unit => unit.type === type);
}

export function getUnitById(id: string): MeasurementUnit | undefined {
	return measurementUnits
		.flatMap(cat => cat.units)
		.find(unit => unit.id === id);
}

export function getUQCForUnit(unitId: string): string {
	const unit = getUnitById(unitId);
	return unit?.uqc || 'OTH';
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
	const from = getUnitById(fromUnit);
	const to = getUnitById(toUnit);
	
	if (!from || !to) return value;
	if (from.baseUnit !== to.baseUnit && from.uqc !== to.uqc) return value;
	
	if (from.conversionFactor && to.conversionFactor) {
		const baseValue = value / from.conversionFactor;
		return baseValue * to.conversionFactor;
	}
	
	return value;
}

export function getRecommendedUnits(businessCategory: string): string[] {
	const recommendations: Record<string, string[]> = {
		medical_clinic: ['pcs', 'box', 'pack', 'ml', 'l', 'g', 'kg'],
		pharmacy: ['pcs', 'box', 'pack', 'ml', 'l', 'g', 'kg', 'tube', 'bottle'],
		kirana_store: ['kg', 'g', 'l', 'ml', 'pack', 'bag', 'box', 'pcs'],
		supermarket: ['kg', 'g', 'l', 'ml', 'pack', 'box', 'pcs', 'dozen'],
		clothing_store: ['pcs', 'pair', 'dozen', 'meter', 'ft'],
		electronics_store: ['pcs', 'pair', 'box'],
		mobile_shop: ['pcs', 'box', 'pair'],
		hardware_store: ['kg', 'g', 'm', 'ft', 'pcs', 'bag', 'box'],
		jewelry_store: ['pcs', 'carat', 'g', 'tola'],
		furniture_store: ['pcs', 'sqm', 'sqft'],
		restaurant: ['pcs', 'pack', 'l', 'ml', 'kg', 'g'],
		cafe: ['pcs', 'pack', 'l', 'ml', 'g'],
		bakery: ['pcs', 'kg', 'g', 'pack', 'box'],
		sweet_shop: ['kg', 'g', 'pcs', 'pack', 'box'],
		cloud_kitchen: ['pcs', 'pack', 'box', 'kg'],
		fitness_gym: ['month', 'visit', 'session', 'pcs'],
		salon: ['visit', 'session', 'pcs', 'ml'],
		spa: ['visit', 'session', 'hour', 'ml', 'l'],
		school: ['month', 'pcs', 'set'],
		coaching_center: ['month', 'session', 'hour', 'pcs'],
		tutor: ['hour', 'month', 'session', 'visit'],
		freelancer: ['hour', 'day', 'job', 'month'],
		consultant: ['hour', 'day', 'job', 'month'],
		photography_studio: ['hour', 'day', 'session', 'pcs'],
		event_planner: ['event', 'day', 'pcs', 'set'],
		laundry_cleaning: ['kg', 'pcs', 'pack', 'dozen'],
		repair_shop: ['hour', 'job', 'pcs'],
		contractor: ['sqm', 'sqft', 'kg', 'ton', 'm', 'job', 'day'],
		plumber: ['hour', 'job', 'pcs', 'ft', 'm'],
		electrician: ['hour', 'job', 'pcs', 'm', 'ft'],
		auto_garage: ['hour', 'job', 'pcs', 'l', 'ml'],
		car_wash: ['pcs', 'car', 'set'],
		taxi_rental: ['km', 'day', 'hour', 'trip'],
		transport_logistics: ['ton', 'kg', 'cbm', 'trip', 'km']
	};
	
	return recommendations[businessCategory] || ['pcs', 'kg', 'l', 'm', 'nos'];
}

export function getUnitIcon(unitId: string): string {
	const unit = getUnitById(unitId);
	return unit?.icon || 'tag';
}
