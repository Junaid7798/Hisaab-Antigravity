import { formatINR } from './currency';
import { formatDate } from './helpers';

export interface WhatsAppInvoiceData {
	customerName: string;
	invoiceNumber: string;
	grandTotal: number;
	issueDate: string;
	dueDate?: string;
	businessName: string;
	businessPhone?: string;
	upiId?: string;
	locale?: string;
}

export function buildWhatsAppInvoiceMessage(data: WhatsAppInvoiceData): string {
	const isHindi = data.locale === 'hi' || data.locale === 'mr';

	const amount = formatINR(data.grandTotal);
	const date = formatDate(data.issueDate);
	const due = data.dueDate ? formatDate(data.dueDate) : null;

	// Prefer explicit upi_id; fall back to phone@upi if phone is provided
	const upiHint = data.upiId || (data.businessPhone ? `${data.businessPhone}@upi` : null);

	if (isHindi) {
		const lines = [
			`Namaskar *${data.customerName}* ji 🙏`,
			'',
			`*${data.businessName}* ki taraf se aapka invoice ready hai:`,
			'',
			`📄 *Invoice:* ${data.invoiceNumber}`,
			`💰 *Amount:* ${amount}`,
			`📅 *Date:* ${date}`,
			...(due ? [`⏰ *Due Date:* ${due}`] : []),
			...(upiHint ? [``, `💳 UPI: ${upiHint}`] : []),
			'',
			'Shukriya! 🙏'
		];
		return lines.join('\n');
	}

	const lines = [
		`Hello *${data.customerName}*,`,
		'',
		`Here is your invoice from *${data.businessName}*:`,
		'',
		`📄 *Invoice:* ${data.invoiceNumber}`,
		`💰 *Amount:* ${amount}`,
		`📅 *Date:* ${date}`,
		...(due ? [`⏰ *Due Date:* ${due}`] : []),
		...(upiHint ? [``, `💳 Pay via UPI: ${upiHint}`] : []),
		'',
		'Thank you! 🙏'
	];
	return lines.join('\n');
}
