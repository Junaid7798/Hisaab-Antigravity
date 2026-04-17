export type BusinessCategory =
	// Healthcare & Wellness
	| 'pharmacy'
	| 'veterinary_clinic'
	| 'physiotherapy'
	| 'fitness_gym'
	| 'yoga_studio'
	// Retail
	| 'kirana_store'
	| 'supermarket'
	| 'clothing_store'
	| 'electronics_store'
	| 'mobile_shop'
	| 'hardware_store'
	| 'jewelry_store'
	| 'stationery_store'
	| 'footwear_store'
	| 'furniture_store'
	| 'medical_equipment'
	| 'auto_parts'
	// Services & Freelance
	| 'freelancer'
	| 'consultant'
	| 'marketing_agency'
	| 'software_dev'
	| 'event_planner'
	| 'photography_studio'
	| 'laundry_cleaning'
	| 'repair_shop'
	| 'pest_control'
	// Food & Beverage
	| 'restaurant'
	| 'cafe'
	| 'bakery'
	| 'sweet_shop'
	| 'cloud_kitchen'
	| 'caterer'
	// Education & Coaching
	| 'coaching_center'
	| 'tutor'
	| 'music_dance_school'
	// Beauty & Wellness
	| 'salon'
	| 'spa'
	| 'makeup_artist'
	| 'massage_therapy'
	// Construction & Real Estate
	| 'contractor'
	| 'architect'
	| 'interior_designer'
	| 'plumber'
	| 'electrician'
	| 'real_estate_agent'
	// Transportation & Auto
	| 'transport_logistics'
	| 'taxi_rental'
	| 'auto_garage'
	// Professional Services
	| 'ca_firm'
	| 'law_firm'
	| 'hr_recruitment'
	// Default/Other
	| 'other';

export type TaxRegistrationType = 'gst_registered' | 'composition' | 'unregistered';

export interface Terminology {
	person: string;         // e.g., "Patient", "Customer", "Client", "Student"
	people: string;         // e.g., "Patients", "Customers", "Clients", "Students"
	document: string;       // e.g., "Prescription", "Bill", "Invoice", "Fee Receipt"
	action: string;         // e.g., "Appointments", "Orders", "Projects", "Enrollments"
	item: string;           // e.g., "Treatment", "Product", "Service", "Course"
	items: string;          // e.g., "Treatments", "Products", "Services", "Courses"
	venue: string;         // e.g., "Clinic", "Store", "Restaurant", "Institute"
}

const defaultTerminology: Terminology = {
	person: 'Customer',
	people: 'Customers',
	document: 'Invoice',
	action: 'Orders',
	item: 'Item',
	items: 'Items',
	venue: 'Business',
};

export const terminologyMap: Record<BusinessCategory, Terminology> = {
	// Healthcare & Wellness
	pharmacy: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Medicine', items: 'Medicines', venue: 'Pharmacy' },
	veterinary_clinic: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Appointments', item: 'Treatment', items: 'Treatments', venue: 'Clinic' },
	physiotherapy: { person: 'Patient', people: 'Patients', document: 'Invoice', action: 'Sessions', item: 'Therapy', items: 'Therapies', venue: 'Center' },
	fitness_gym: { person: 'Member', people: 'Members', document: 'Invoice', action: 'Memberships', item: 'Plan', items: 'Plans', venue: 'Gym' },
	yoga_studio: { person: 'Student', people: 'Students', document: 'Invoice', action: 'Classes', item: 'Session', items: 'Sessions', venue: 'Studio' },
	// Retail
	kirana_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products', venue: 'Store' },
	supermarket: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products', venue: 'Store' },
	clothing_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items', venue: 'Store' },
	electronics_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products', venue: 'Store' },
	mobile_shop: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Device/Accessory', items: 'Devices & Accessories', venue: 'Shop' },
	hardware_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Material', items: 'Materials', venue: 'Store' },
	jewelry_store: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Item', items: 'Items', venue: 'Store' },
	stationery_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items', venue: 'Store' },
	footwear_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items', venue: 'Store' },
	furniture_store: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Item', items: 'Items', venue: 'Showroom' },
	medical_equipment: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Equipment', items: 'Equipment', venue: 'Store' },
	auto_parts: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Part', items: 'Parts', venue: 'Store' },
	// Services & Freelance
	freelancer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services', venue: 'Practice' },
	consultant: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Consultation', items: 'Consultations', venue: 'Practice' },
	marketing_agency: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Campaigns', item: 'Service', items: 'Services', venue: 'Agency' },
	software_dev: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services', venue: 'Studio' },
	event_planner: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Events', item: 'Service', items: 'Services', venue: 'Company' },
	photography_studio: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Shoots', item: 'Package', items: 'Packages', venue: 'Studio' },
	laundry_cleaning: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Service', items: 'Services', venue: 'Service' },
	repair_shop: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Repairs', item: 'Service/Part', items: 'Services & Parts', venue: 'Workshop' },
	pest_control: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Services', item: 'Treatment', items: 'Treatments', venue: 'Company' },
	// Food & Beverage
	restaurant: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Dish', items: 'Dishes', venue: 'Restaurant' },
	cafe: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items', venue: 'Cafe' },
	bakery: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items', venue: 'Bakery' },
	sweet_shop: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Sweet/Snack', items: 'Sweets & Snacks', venue: 'Shop' },
	cloud_kitchen: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Dish', items: 'Dishes', venue: 'Kitchen' },
	caterer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Events', item: 'Package', items: 'Packages', venue: 'Service' },
	// Education & Coaching
	coaching_center: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Course', items: 'Courses', venue: 'Center' },
	tutor: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Classes', item: 'Session', items: 'Sessions', venue: 'Practice' },
	music_dance_school: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Class', items: 'Classes', venue: 'Academy' },
	// Beauty & Wellness
	salon: { person: 'Client', people: 'Clients', document: 'Bill', action: 'Appointments', item: 'Service', items: 'Services', venue: 'Salon' },
	spa: { person: 'Client', people: 'Clients', document: 'Bill', action: 'Appointments', item: 'Therapy', items: 'Therapies', venue: 'Spa' },
	makeup_artist: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Bookings', item: 'Service', items: 'Services', venue: 'Service' },
	massage_therapy: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Sessions', item: 'Therapy', items: 'Therapies', venue: 'Center' },
	// Construction & Real Estate
	contractor: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service/Material', items: 'Services & Materials', venue: 'Company' },
	architect: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services', venue: 'Studio' },
	interior_designer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service/Material', items: 'Services & Materials', venue: 'Studio' },
	plumber: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Jobs', item: 'Service/Part', items: 'Services & Parts', venue: 'Service' },
	electrician: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Jobs', item: 'Service/Part', items: 'Services & Parts', venue: 'Service' },
	real_estate_agent: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Deals', item: 'Service/Commission', items: 'Services & Commissions', venue: 'Agency' },
	// Transportation & Auto
	transport_logistics: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Shipments', item: 'Freight', items: 'Freights', venue: 'Company' },
	taxi_rental: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Bookings', item: 'Trip/Rental', items: 'Trips & Rentals', venue: 'Service' },
	auto_garage: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Repairs', item: 'Service/Part', items: 'Services & Parts', venue: 'Garage' },
	// Professional Services
	ca_firm: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Cases', item: 'Service', items: 'Services', venue: 'Firm' },
	law_firm: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Cases', item: 'Service', items: 'Services', venue: 'Firm' },
	hr_recruitment: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Placements', item: 'Service', items: 'Services', venue: 'Agency' },
	// Default/Other
	other: defaultTerminology,
};

export function getTerminology(category: string | undefined): Terminology {
	if (!category) return defaultTerminology;
	return terminologyMap[category as BusinessCategory] || defaultTerminology;
}

// Person label options that a business owner can pick from at onboarding
export const personLabelOptions = [
	{ singular: 'Customer', plural: 'Customers' },
	{ singular: 'Client', plural: 'Clients' },
	{ singular: 'Patient', plural: 'Patients' },
	{ singular: 'Member', plural: 'Members' },
	{ singular: 'Student', plural: 'Students' },
	{ singular: 'Guest', plural: 'Guests' },
	{ singular: 'Buyer', plural: 'Buyers' },
];

/** Returns the suggested person label for a given category */
export function getSuggestedPersonLabel(category: BusinessCategory | null): { singular: string; plural: string } {
	if (!category) return { singular: 'Customer', plural: 'Customers' };
	const t = terminologyMap[category] ?? defaultTerminology;
	return { singular: t.person, plural: t.people };
}

export const categoryGroups = [
	{
		sector: 'Healthcare & Wellness',
		icon: 'medical_services',
		items: [
			{ id: 'pharmacy', label: 'Pharmacy' },
			{ id: 'veterinary_clinic', label: 'Veterinary Clinic' },
			{ id: 'physiotherapy', label: 'Physiotherapy Center' },
			{ id: 'fitness_gym', label: 'Fitness / Gym' },
			{ id: 'yoga_studio', label: 'Yoga / Meditation Studio' }
		]
	},
	{
		sector: 'Retail',
		icon: 'storefront',
		items: [
			{ id: 'kirana_store', label: 'Kirana / General Store' },
			{ id: 'supermarket', label: 'Supermarket' },
			{ id: 'clothing_store', label: 'Clothing & Apparel' },
			{ id: 'electronics_store', label: 'Electronics & Appliances' },
			{ id: 'mobile_shop', label: 'Mobile Shop' },
			{ id: 'hardware_store', label: 'Hardware Store' },
			{ id: 'jewelry_store', label: 'Jewelry Store' },
			{ id: 'stationery_store', label: 'Stationery' },
			{ id: 'footwear_store', label: 'Footwear' },
			{ id: 'furniture_store', label: 'Furniture' },
			{ id: 'medical_equipment', label: 'Medical Equipment' },
			{ id: 'auto_parts', label: 'Auto Parts' }
		]
	},
	{
		sector: 'Services & Freelance',
		icon: 'design_services',
		items: [
			{ id: 'freelancer', label: 'Freelancer' },
			{ id: 'consultant', label: 'Consultant' },
			{ id: 'marketing_agency', label: 'Marketing Agency' },
			{ id: 'software_dev', label: 'Software Development' },
			{ id: 'event_planner', label: 'Event Planner' },
			{ id: 'photography_studio', label: 'Photography' },
			{ id: 'laundry_cleaning', label: 'Laundry & Cleaning' },
			{ id: 'repair_shop', label: 'Repair Shop' },
			{ id: 'pest_control', label: 'Pest Control' }
		]
	},
	{
		sector: 'Food & Beverage',
		icon: 'restaurant',
		items: [
			{ id: 'restaurant', label: 'Restaurant / Dhaba' },
			{ id: 'cafe', label: 'Cafe / Tea Stall' },
			{ id: 'bakery', label: 'Bakery' },
			{ id: 'sweet_shop', label: 'Sweet Shop / Mithai' },
			{ id: 'cloud_kitchen', label: 'Cloud Kitchen' },
			{ id: 'caterer', label: 'Caterer' }
		]
	},
	{
		sector: 'Education & Coaching',
		icon: 'school',
		items: [
			{ id: 'coaching_center', label: 'Coaching Center' },
			{ id: 'tutor', label: 'Tutor / Home Classes' },
			{ id: 'music_dance_school', label: 'Music / Dance Academy' }
		]
	},
	{
		sector: 'Beauty & Wellness',
		icon: 'spa',
		items: [
			{ id: 'salon', label: 'Salon / Parlour' },
			{ id: 'spa', label: 'Spa' },
			{ id: 'makeup_artist', label: 'Makeup Artist' },
			{ id: 'massage_therapy', label: 'Massage Therapy' }
		]
	},
	{
		sector: 'Construction & Real Estate',
		icon: 'architecture',
		items: [
			{ id: 'contractor', label: 'Contractor' },
			{ id: 'architect', label: 'Architect' },
			{ id: 'interior_designer', label: 'Interior Designer' },
			{ id: 'plumber', label: 'Plumber' },
			{ id: 'electrician', label: 'Electrician' },
			{ id: 'real_estate_agent', label: 'Real Estate Agent' }
		]
	},
	{
		sector: 'Transportation & Automotive',
		icon: 'local_shipping',
		items: [
			{ id: 'transport_logistics', label: 'Transport / Logistics' },
			{ id: 'taxi_rental', label: 'Taxi / Rental' },
			{ id: 'auto_garage', label: 'Auto Garage / Workshop' }
		]
	},
	{
		sector: 'Professional Services',
		icon: 'business_center',
		items: [
			{ id: 'ca_firm', label: 'CA / Accounting Firm' },
			{ id: 'law_firm', label: 'Law Firm' },
			{ id: 'hr_recruitment', label: 'HR / Recruitment' }
		]
	},
	{
		sector: 'Other',
		icon: 'category',
		items: [
			{ id: 'other', label: 'Other Business Type' }
		]
	}
];
