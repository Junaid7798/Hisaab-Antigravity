import type { BusinessCategory } from './terminology';

export interface BusinessFeatures {
  // Core features (can be toggled by user)
  hasPOS: boolean;
  hasEstimates: boolean;
  hasRecurring: boolean;
  hasSuppliers: boolean;
  hasPurchases: boolean;
  hasInventory: boolean;
  hasCustomers: boolean;
  
  // Tax features (based on registration)
  hasGST: boolean;
  
  // Document types available
  documentTypes: {
    hasInvoice: boolean;
    hasCashReceipt: boolean;
    hasEstimate: boolean;
    hasCreditNote: boolean;
    hasDebitNote: boolean;
  };
  
  // Business behavior
  isWalkIn: boolean;
  isService: boolean;
  isEducational: boolean;
}

const defaultFeatures: BusinessFeatures = {
  hasPOS: true,
  hasEstimates: true,
  hasRecurring: true,
  hasSuppliers: true,
  hasPurchases: true,
  hasInventory: true,
  hasCustomers: true,
  hasGST: true,
  documentTypes: {
    hasInvoice: true,
    hasCashReceipt: true,
    hasEstimate: true,
    hasCreditNote: true,
    hasDebitNote: true
  },
  isWalkIn: false,
  isService: false,
  isEducational: false
};

export const businessFeatures: Record<BusinessCategory, BusinessFeatures> = {
  // === RETAIL ===
  kirana_store: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  supermarket: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  clothing_store: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  electronics_store: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  mobile_shop: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  hardware_store: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  jewelry_store: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  stationery_store: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  footwear_store: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  furniture_store: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  medical_equipment: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: false
  },
  auto_parts: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  // === SERVICES & FREELANCE ===
  freelancer: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  consultant: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  marketing_agency: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  software_dev: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  event_planner: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  photography_studio: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  laundry_cleaning: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  repair_shop: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  pest_control: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === FOOD & BEVERAGE ===
  restaurant: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  cafe: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  bakery: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  sweet_shop: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  cloud_kitchen: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  caterer: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === EDUCATION ===
  school: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: true
  },
  coaching_center: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: true
  },
  tutor: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: true
  },
  music_dance_school: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: true
  },
  driving_school: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: false,
    isEducational: true
  },
  // === BEAUTY & WELLNESS ===
  salon: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  spa: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  makeup_artist: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  massage_therapy: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === HEALTHCARE (non-clinic style) ===
  medical_clinic: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  dental_clinic: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  pharmacy: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: true,
    hasInventory: true,
    hasCustomers: false,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: true,
    isService: false,
    isEducational: false
  },
  veterinary_clinic: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  physiotherapy: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  fitness_gym: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  yoga_studio: {
    hasPOS: false,
    hasEstimates: false,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === CONSTRUCTION & REAL ESTATE ===
  contractor: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  architect: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  interior_designer: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  plumber: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  electrician: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  real_estate_agent: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === TRANSPORTATION & AUTOMOTIVE ===
  transport_logistics: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  taxi_rental: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  auto_garage: {
    hasPOS: true,
    hasEstimates: true,
    hasRecurring: false,
    hasSuppliers: true,
    hasPurchases: false,
    hasInventory: true,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  car_wash: {
    hasPOS: true,
    hasEstimates: false,
    hasRecurring: false,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: false, hasCreditNote: true, hasDebitNote: false },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === PROFESSIONAL SERVICES ===
  ca_firm: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  law_firm: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  hr_recruitment: {
    hasPOS: false,
    hasEstimates: true,
    hasRecurring: true,
    hasSuppliers: false,
    hasPurchases: false,
    hasInventory: false,
    hasCustomers: true,
    hasGST: true,
    documentTypes: { hasInvoice: true, hasCashReceipt: true, hasEstimate: true, hasCreditNote: true, hasDebitNote: true },
    isWalkIn: false,
    isService: true,
    isEducational: false
  },
  // === OTHER ===
  other: defaultFeatures
};

export function getBusinessFeatures(category: string | undefined): BusinessFeatures {
  if (!category) return defaultFeatures;
  return businessFeatures[category as BusinessCategory] || defaultFeatures;
}

export const FEATURE_OVERRIDES_KEY = 'hisaab_feature_overrides';

export interface FeatureOverrides {
  [businessId: string]: {
    hasPOS?: boolean;
    hasEstimates?: boolean;
    hasRecurring?: boolean;
    hasSuppliers?: boolean;
    hasPurchases?: boolean;
    hasInventory?: boolean;
    hasCustomers?: boolean;
  };
}

export function getFeatureOverrides(businessId: string): FeatureOverrides[string] | null {
  try {
    const stored = localStorage.getItem(FEATURE_OVERRIDES_KEY);
    if (!stored) return null;
    const all = JSON.parse(stored) as FeatureOverrides;
    return all[businessId] || null;
  } catch {
    return null;
  }
}

export function saveFeatureOverrides(businessId: string, overrides: FeatureOverrides[string]): void {
  try {
    const stored = localStorage.getItem(FEATURE_OVERRIDES_KEY);
    const all = stored ? JSON.parse(stored) as FeatureOverrides : {};
    all[businessId] = overrides;
    localStorage.setItem(FEATURE_OVERRIDES_KEY, JSON.stringify(all));
  } catch {
    console.error('Failed to save feature overrides');
  }
}

export function getEffectiveFeatures(businessId: string | undefined, category: string | undefined): BusinessFeatures {
  const base = getBusinessFeatures(category);
  const overrides = businessId ? getFeatureOverrides(businessId) : null;
  
  if (!overrides) return base;
  
  return {
    ...base,
    hasPOS: overrides.hasPOS ?? base.hasPOS,
    hasEstimates: overrides.hasEstimates ?? base.hasEstimates,
    hasRecurring: overrides.hasRecurring ?? base.hasRecurring,
    hasSuppliers: overrides.hasSuppliers ?? base.hasSuppliers,
    hasPurchases: overrides.hasPurchases ?? base.hasPurchases,
    hasInventory: overrides.hasInventory ?? base.hasInventory,
    hasCustomers: overrides.hasCustomers ?? base.hasCustomers,
  };
}

export function getGSTEnabled(category: string | undefined, taxType: string | undefined): boolean {
  if (taxType === 'unregistered') return false;
  return getBusinessFeatures(category).hasGST;
}