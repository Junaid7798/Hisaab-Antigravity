export type BusinessCategory =
	// Healthcare
	| 'medical_clinic'
	| 'dental_clinic'
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
	// Services
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
	// Education
	| 'school'
	| 'coaching_center'
	| 'tutor'
	| 'music_dance_school'
	| 'driving_school'
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
	| 'car_wash'
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
}

const defaultTerminology: Terminology = {
	person: 'Customer',
	people: 'Customers',
	document: 'Invoice',
	action: 'Orders',
	item: 'Item',
	items: 'Items',
};

export const terminologyMap: Record<BusinessCategory, Terminology> = {
	// Healthcare
	medical_clinic: { person: 'Patient', people: 'Patients', document: 'Prescription', action: 'Appointments', item: 'Treatment', items: 'Treatments' },
	dental_clinic: { person: 'Patient', people: 'Patients', document: 'Prescription', action: 'Appointments', item: 'Treatment', items: 'Treatments' },
	pharmacy: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Medicine', items: 'Medicines' },
	veterinary_clinic: { person: 'Client', people: 'Clients', document: 'Prescription', action: 'Appointments', item: 'Treatment', items: 'Treatments' },
	physiotherapy: { person: 'Patient', people: 'Patients', document: 'Prescription', action: 'Sessions', item: 'Therapy', items: 'Therapies' },
	fitness_gym: { person: 'Member', people: 'Members', document: 'Invoice', action: 'Memberships', item: 'Plan', items: 'Plans' },
	yoga_studio: { person: 'Student', people: 'Students', document: 'Invoice', action: 'Classes', item: 'Session', items: 'Sessions' },
	// Retail
	kirana_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products' },
	supermarket: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products' },
	clothing_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items' },
	electronics_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Product', items: 'Products' },
	mobile_shop: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Device/Accessory', items: 'Devices & Accessories' },
	hardware_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Material', items: 'Materials' },
	jewelry_store: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Item', items: 'Items' },
	stationery_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items' },
	footwear_store: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items' },
	furniture_store: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Item', items: 'Items' },
	medical_equipment: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Orders', item: 'Equipment', items: 'Equipment' },
	auto_parts: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Part', items: 'Parts' },
	// Services
	freelancer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services' },
	consultant: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Consultation', items: 'Consultations' },
	marketing_agency: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Campaigns', item: 'Service', items: 'Services' },
	software_dev: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services' },
	event_planner: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Events', item: 'Service', items: 'Services' },
	photography_studio: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Shoots', item: 'Package', items: 'Packages' },
	laundry_cleaning: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Service', items: 'Services' },
	repair_shop: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Repairs', item: 'Service/Part', items: 'Services & Parts' },
	pest_control: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Services', item: 'Treatment', items: 'Treatments' },
	// Food & Beverage
	restaurant: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Dish', items: 'Dishes' },
	cafe: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items' },
	bakery: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Item', items: 'Items' },
	sweet_shop: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Sweet/Snack', items: 'Sweets & Snacks' },
	cloud_kitchen: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Orders', item: 'Dish', items: 'Dishes' },
	caterer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Events', item: 'Package', items: 'Packages' },
	// Education
	school: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Fee', items: 'Fees' },
	coaching_center: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Course', items: 'Courses' },
	tutor: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Classes', item: 'Session', items: 'Sessions' },
	music_dance_school: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Class', items: 'Classes' },
	driving_school: { person: 'Student', people: 'Students', document: 'Fee Receipt', action: 'Enrollments', item: 'Course', items: 'Courses' },
	// Beauty & Wellness
	salon: { person: 'Client', people: 'Clients', document: 'Bill', action: 'Appointments', item: 'Service', items: 'Services' },
	spa: { person: 'Client', people: 'Clients', document: 'Bill', action: 'Appointments', item: 'Therapy', items: 'Therapies' },
	makeup_artist: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Bookings', item: 'Service', items: 'Services' },
	massage_therapy: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Sessions', item: 'Therapy', items: 'Therapies' },
	// Construction & Real Estate
	contractor: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service/Material', items: 'Services & Materials' },
	architect: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service', items: 'Services' },
	interior_designer: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Projects', item: 'Service/Material', items: 'Services & Materials' },
	plumber: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Jobs', item: 'Service/Part', items: 'Services & Parts' },
	electrician: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Jobs', item: 'Service/Part', items: 'Services & Parts' },
	real_estate_agent: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Deals', item: 'Service/Commission', items: 'Services & Commissions' },
	// Transportation & Auto
	transport_logistics: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Shipments', item: 'Freight', items: 'Freights' },
	taxi_rental: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Bookings', item: 'Trip/Rental', items: 'Trips & Rentals' },
	auto_garage: { person: 'Customer', people: 'Customers', document: 'Invoice', action: 'Repairs', item: 'Service/Part', items: 'Services & Parts' },
	car_wash: { person: 'Customer', people: 'Customers', document: 'Bill', action: 'Services', item: 'Service', items: 'Services' },
	// Professional Services
	ca_firm: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Cases', item: 'Service', items: 'Services' },
	law_firm: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Cases', item: 'Service', items: 'Services' },
	hr_recruitment: { person: 'Client', people: 'Clients', document: 'Invoice', action: 'Placements', item: 'Service', items: 'Services' },
	// Default/Other
	other: defaultTerminology,
};

export function getTerminology(category: string | undefined): Terminology {
	if (!category) return defaultTerminology;
	return terminologyMap[category as BusinessCategory] || defaultTerminology;
}

export const categoryGroups = [
	{
		sector: 'Healthcare',
		icon: 'medical_services',
		items: [
			{ id: 'medical_clinic', label: 'Medical Clinic' },
			{ id: 'dental_clinic', label: 'Dental Clinic' },
			{ id: 'pharmacy', label: 'Pharmacy' },
			{ id: 'veterinary_clinic', label: 'Veterinary Clinic' },
			{ id: 'physiotherapy', label: 'Physiotherapy' },
			{ id: 'fitness_gym', label: 'Fitness / Gym' },
			{ id: 'yoga_studio', label: 'Yoga Studio' }
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
			{ id: 'restaurant', label: 'Restaurant' },
			{ id: 'cafe', label: 'Cafe' },
			{ id: 'bakery', label: 'Bakery' },
			{ id: 'sweet_shop', label: 'Sweet Shop' },
			{ id: 'cloud_kitchen', label: 'Cloud Kitchen' },
			{ id: 'caterer', label: 'Caterer' }
		]
	},
	{
		sector: 'Education',
		icon: 'school',
		items: [
			{ id: 'school', label: 'School' },
			{ id: 'coaching_center', label: 'Coaching Center' },
			{ id: 'tutor', label: 'Tutor' },
			{ id: 'music_dance_school', label: 'Music/Dance School' },
			{ id: 'driving_school', label: 'Driving School' }
		]
	},
	{
		sector: 'Beauty & Wellness',
		icon: 'spa',
		items: [
			{ id: 'salon', label: 'Salon' },
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
			{ id: 'auto_garage', label: 'Auto Garage' },
			{ id: 'car_wash', label: 'Car Wash' }
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
