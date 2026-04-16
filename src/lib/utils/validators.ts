import { z } from 'zod';

export const BusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).or(z.literal('')),
  state_code: z.string().length(2),
  phone: z.string().max(15).or(z.literal('')),
  email: z.string().email().or(z.literal('')),
  address: z.string(),
  logo_base64: z.string()
}).passthrough();

export const InvoiceSchema = z.object({
  id: z.string().optional(),
  business_id: z.string().optional(),
  patient_id: z.string(),
  issue_date: z.string(),
  due_date: z.string(),
  tax_type: z.enum(['INTRA_STATE', 'INTER_STATE', 'EXEMPT']),
  subtotal: z.number().int().min(0, 'Subtotal cannot be negative'),
  total_tax: z.number().int().min(0, 'Tax cannot be negative'),
  grand_total: z.number().int().min(0, 'Total cannot be negative'),
  cgst: z.number().int().min(0),
  sgst: z.number().int().min(0),
  igst: z.number().int().min(0),
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
  document_type: z.enum(['INVOICE', 'ESTIMATE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE']).optional()
}).passthrough();

export const PaymentSchema = z.object({
  amount: z.number().int().positive('Payment amount must be greater than 0'),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK', 'CHEQUE', 'OTHER']),
  payment_date: z.string(),
  reference_no: z.string().optional(),
  notes: z.string().optional()
}).passthrough();

export const ProductSchema = z.object({
	name: z.string().min(1, 'Product name is required'),
	selling_price: z.number().int().min(0, 'Selling price cannot be negative'),
	purchase_price: z.number().int().min(0, 'Purchase price cannot be negative'),
	stock_quantity: z.number().int().min(0, 'Stock cannot be negative')
}).passthrough();

export const ExpenseSchema = z.object({
	amount: z.number().int().positive('Expense amount must be positive'),
	category: z.string().min(1, 'Category is required'),
	expense_date: z.string(),
	description: z.string().optional()
}).passthrough();
