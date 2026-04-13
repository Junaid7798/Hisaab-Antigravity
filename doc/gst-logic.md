# Hisaab — GST Calculation Logic

> Last updated: 2026-04-14

## Source: `src/lib/utils/gst.ts`

## Rules

### Tax Type Determination
```
IF business.state_code === patient.state_code
  → INTRA_STATE (CGST + SGST)
ELSE
  → INTER_STATE (IGST)
IF either state_code is missing
  → EXEMPT
```

### Tax Rate Split
For **INTRA_STATE**:
- CGST = tax_rate / 2
- SGST = tax_rate / 2
- IGST = 0

For **INTER_STATE**:
- CGST = 0
- SGST = 0
- IGST = tax_rate

### Available Tax Rates
| Label | Internal Value (x100) |
|-------|-----------------------|
| 0%    | 0                     |
| 5%    | 500                   |
| 12%   | 1200                  |
| 18%   | 1800                  |
| 28%   | 2800                  |

### Calculation Formula
```
taxable_amount = (rate_paise × quantity_x100) / 100
tax_amount = (taxable_amount × tax_rate_x100) / 10000
line_total = taxable_amount + tax_amount
```

All values are **integers** (paise). No floating point anywhere in the chain.

## API

### `determineTaxType(businessStateCode, patientStateCode): TaxType`
Returns `'INTRA_STATE'`, `'INTER_STATE'`, or `'EXEMPT'`.

### `calculateLineTax(item: LineItem, taxType: TaxType): TaxBreakdown`
Computes CGST/SGST/IGST for a single line item.

### `calculateInvoiceTax(items: LineItem[], businessState, patientState): InvoiceTaxSummary`
Full invoice summary with subtotal, tax breakdowns, and grand total.

## Examples

### Intra-state (Maharashtra → Maharashtra)
- Consultation: ₹800.00, 12% tax
- CGST (6%): ₹48.00
- SGST (6%): ₹48.00
- Total: ₹896.00

### Inter-state (Maharashtra → Gujarat)
- Consultation: ₹800.00, 12% tax
- IGST (12%): ₹96.00
- Total: ₹896.00
