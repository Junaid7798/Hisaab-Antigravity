import type { BusinessCategory } from './terminology';

export interface CategoryDefaults {
	expenseCategories: string[];
}

export const categoryDefaults: Record<BusinessCategory, CategoryDefaults> = {
	// Healthcare & Wellness
	pharmacy: { expenseCategories: ['Medicine Purchase', 'Supplier Payment', 'Rent', 'Staff Salary', 'Utilities', 'Packaging'] },
	veterinary_clinic: { expenseCategories: ['Veterinary Supplies', 'Pet Food', 'Rent', 'Staff Salary', 'Utilities'] },
	physiotherapy: { expenseCategories: ['Therapy Equipment', 'Lotions & Oils', 'Rent', 'Staff Salary', 'Utilities'] },
	fitness_gym: { expenseCategories: ['Gym Equipment', 'Maintenance', 'Rent', 'Trainer Salary', 'Utilities'] },
	yoga_studio: { expenseCategories: ['Mats & Props', 'Rent', 'Instructor Salary', 'Utilities', 'Marketing'] },
	
	// Retail
	kirana_store: { expenseCategories: ['Wholesale Purchase', 'Transport', 'Rent', 'Staff', 'Packaging', 'Spoilage'] },
	supermarket: { expenseCategories: ['Inventory Purchase', 'Logistics', 'Rent', 'Staff', 'Maintenance', 'Marketing'] },
	clothing_store: { expenseCategories: ['Garment Purchase', 'Tailoring', 'Rent', 'Staff', 'Packaging', 'Marketing'] },
	electronics_store: { expenseCategories: ['Electronics Purchase', 'Warranty Claims', 'Rent', 'Staff', 'Marketing'] },
	mobile_shop: { expenseCategories: ['Device Purchase', 'Accessories', 'Repair Parts', 'Rent', 'Staff'] },
	hardware_store: { expenseCategories: ['Material Purchase', 'Transport', 'Rent', 'Staff'] },
	jewelry_store: { expenseCategories: ['Gold/Silver Purchase', 'Making Charges', 'Security', 'Rent', 'Staff', 'Insurance'] },
	stationery_store: { expenseCategories: ['Stationery Purchase', 'Printing Supplies', 'Rent', 'Staff'] },
	footwear_store: { expenseCategories: ['Footwear Purchase', 'Rent', 'Staff', 'Packaging'] },
	furniture_store: { expenseCategories: ['Furniture Purchase', 'Raw Materials', 'Transport', 'Rent', 'Staff'] },
	medical_equipment: { expenseCategories: ['Equipment Purchase', 'Maintenance', 'Transport', 'Rent', 'Staff'] },
	auto_parts: { expenseCategories: ['Parts Purchase', 'Transport', 'Rent', 'Staff'] },

	// Services
	freelancer: { expenseCategories: ['Software Subscriptions', 'Internet', 'Travel', 'Co-working', 'Marketing', 'Hardware'] },
	consultant: { expenseCategories: ['Travel', 'Client Meetings', 'Software', 'Office Supplies', 'Marketing'] },
	marketing_agency: { expenseCategories: ['Ad Spend', 'Software Tools', 'Freelancer Payments', 'Office Rent', 'Staff'] },
	software_dev: { expenseCategories: ['Cloud Hosting', 'Software Licenses', 'Hardware', 'Office Rent', 'Staff'] },
	event_planner: { expenseCategories: ['Venue Booking', 'Catering', 'Decorations', 'Travel', 'Staff', 'Marketing'] },
	photography_studio: { expenseCategories: ['Camera Equipment', 'Studio Rent', 'Travel', 'Editing Software', 'Props'] },
	laundry_cleaning: { expenseCategories: ['Detergents', 'Equipment Maintenance', 'Water/Electricity', 'Rent', 'Staff'] },
	repair_shop: { expenseCategories: ['Spare Parts', 'Tools', 'Rent', 'Staff', 'Utilities'] },
	pest_control: { expenseCategories: ['Chemicals', 'Safety Gear', 'Transport', 'Staff', 'Marketing'] },

	// Food & Beverage
	restaurant: { expenseCategories: ['Raw Materials', 'Kitchen Gas', 'Packaging', 'Delivery', 'Rent', 'Staff'] },
	cafe: { expenseCategories: ['Coffee Beans', 'Dairy', 'Bakery Items', 'Packaging', 'Rent', 'Staff'] },
	bakery: { expenseCategories: ['Flour & Ingredients', 'Oven Gas', 'Packaging', 'Rent', 'Staff'] },
	sweet_shop: { expenseCategories: ['Ingredients', 'Packaging', 'Gas/Electricity', 'Rent', 'Staff'] },
	cloud_kitchen: { expenseCategories: ['Raw Materials', 'Gas', 'Delivery Commissions', 'Packaging', 'Rent', 'Staff'] },
	caterer: { expenseCategories: ['Raw Materials', 'Transport', 'Staff', 'Equipment Rental', 'Gas'] },

	// Education & Coaching
	coaching_center: { expenseCategories: ['Teacher Salaries', 'Study Materials', 'Rent', 'Utilities', 'Marketing'] },
	tutor: { expenseCategories: ['Study Materials', 'Travel', 'Internet', 'Software'] },
	music_dance_school: { expenseCategories: ['Instruments/Equipment', 'Rent', 'Instructor Salaries', 'Marketing'] },

	// Beauty & Wellness
	salon: { expenseCategories: ['Beauty Products', 'Equipment Maintenance', 'Rent', 'Staff', 'Utilities'] },
	spa: { expenseCategories: ['Oils & Lotions', 'Laundry', 'Rent', 'Staff', 'Utilities'] },
	makeup_artist: { expenseCategories: ['Makeup Products', 'Travel', 'Marketing'] },
	massage_therapy: { expenseCategories: ['Oils & Lotions', 'Laundry', 'Rent', 'Staff'] },

	// Construction & Real Estate
	contractor: { expenseCategories: ['Raw Materials', 'Labor Payments', 'Equipment Rental', 'Transport'] },
	architect: { expenseCategories: ['Software Licenses', 'Travel', 'Office Rent', 'Printing'] },
	interior_designer: { expenseCategories: ['Materials', 'Furniture', 'Labor', 'Travel', 'Software'] },
	plumber: { expenseCategories: ['Pipes & Fittings', 'Tools', 'Travel', 'Labor'] },
	electrician: { expenseCategories: ['Wires & Fittings', 'Tools', 'Travel', 'Labor'] },
	real_estate_agent: { expenseCategories: ['Marketing', 'Travel', 'Phone/Internet', 'Office Rent'] },

	// Transportation & Auto
	transport_logistics: { expenseCategories: ['Fuel', 'Vehicle Maintenance', 'Driver Salaries', 'Tolls/Taxes', 'Insurance'] },
	taxi_rental: { expenseCategories: ['Fuel', 'Vehicle Maintenance', 'Driver Salaries', 'Insurance', 'Platform Commissions'] },
	auto_garage: { expenseCategories: ['Spare Parts', 'Tools', 'Rent', 'Staff', 'Utilities'] },

	// Professional Services
	ca_firm: { expenseCategories: ['Software Subscriptions', 'Office Rent', 'Staff Salary', 'Travel', 'Printing'] },
	law_firm: { expenseCategories: ['Books/Subscriptions', 'Office Rent', 'Staff Salary', 'Travel', 'Printing'] },
	hr_recruitment: { expenseCategories: ['Job Portal Subscriptions', 'Phone/Internet', 'Office Rent', 'Staff Salary', 'Marketing'] },

	// Default/Other
	other: { expenseCategories: ['Rent', 'Staff Salary', 'Utilities', 'Marketing', 'Office Supplies', 'Travel'] },
};

export function getDefaultExpenseCategories(category: string | undefined): string[] {
	if (!category) return categoryDefaults.other.expenseCategories;
	
	const defs = categoryDefaults[category as BusinessCategory];
	if (defs && defs.expenseCategories) return defs.expenseCategories;
	
	return categoryDefaults.other.expenseCategories;
}
