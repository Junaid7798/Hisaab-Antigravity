/**
 * Bluetooth Thermal Printer Service
 * Connects to 58mm/80mm ESC/POS Bluetooth thermal printers
 * via the Web Bluetooth API.
 */

/// <reference lib="dom" />

// Web Bluetooth type declarations (if not available globally)
declare global {
	interface BluetoothDevice extends EventTarget {
		id: string;
		name?: string;
		readonly gatt?: BluetoothRemoteGATTServer;
	}

	interface BluetoothRemoteGATTServer {
		device: BluetoothDevice;
		connected: boolean;
		connect(): Promise<BluetoothRemoteGATTServer>;
		disconnect(): void;
		getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
	}

	interface BluetoothRemoteGATTService {
		device: BluetoothDevice;
		uuid: string;
		getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
		getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
	}

	interface BluetoothRemoteGATTCharacteristic {
		service: BluetoothRemoteGATTService;
		uuid: string;
		readonly value?: DataView;
		properties: { write?: boolean; writeWithoutResponse?: boolean };
		readValue(): Promise<DataView>;
		writeValue(value: BufferSource): Promise<void>;
		writeValueWithoutResponse(value: BufferSource): Promise<void>;
		writeValueWithResponse(value: BufferSource): Promise<void>;
		startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
		stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
	}

	interface Navigator {
		bluetooth?: {
			requestDevice(options: {
				filters?: { services?: string[] }[];
				optionalServices?: string[];
			}): Promise<BluetoothDevice>;
		} | undefined;
	}
}

// ESC/POS Command Constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
	INIT: new Uint8Array([ESC, 0x40]),                    // Initialize printer
	ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),      // Center align
	ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),        // Left align
	ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),       // Right align
	BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),           // Bold on
	BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),          // Bold off
	DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),     // Double height
	NORMAL_SIZE: new Uint8Array([ESC, 0x21, 0x00]),       // Normal size
	CUT: new Uint8Array([GS, 0x56, 0x00]),                // Full cut
	PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),        // Partial cut
	FEED_3: new Uint8Array([ESC, 0x64, 0x03]),            // Feed 3 lines
	OPEN_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]), // Open cash drawer
	LINE: new Uint8Array([0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, LF]) // 32 dashes + newline
};

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let isConnected = false;

// Common Bluetooth printer service/characteristic UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Fallback UUIDs for different printer brands
const FALLBACK_SERVICES = [
	'000018f0-0000-1000-8000-00805f9b34fb',
	'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
	'49535343-fe7d-4ae5-8fa9-9fafd205e455'
];

export function isBtPrintSupported(): boolean {
	return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function getConnectionStatus(): boolean {
	return isConnected;
}

export async function connectPrinter(): Promise<boolean> {
	if (!isBtPrintSupported()) {
		throw new Error('Web Bluetooth not supported on this device/browser');
	}

	try {
		// Request device — shows browser's Bluetooth picker
		if (!navigator.bluetooth) throw new Error('Web Bluetooth not supported');
		device = await navigator.bluetooth.requestDevice({
			filters: [
				{ services: [PRINTER_SERVICE_UUID] }
			],
			optionalServices: FALLBACK_SERVICES
		});

		if (!device.gatt) throw new Error('GATT not available');

		const server = await device.gatt.connect();

		// Try each service UUID until we find one
		let service: BluetoothRemoteGATTService | null = null;
		for (const uuid of FALLBACK_SERVICES) {
			try {
				service = await server.getPrimaryService(uuid);
				break;
			} catch {
				continue;
			}
		}

		if (!service) throw new Error('No compatible printer service found');

		// Get the writable characteristic
		const chars = await service.getCharacteristics();
		characteristic = chars.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.write || c.properties.writeWithoutResponse) || null;

		if (!characteristic) throw new Error('No writable characteristic found');

		isConnected = true;
		
		device.addEventListener('gattserverdisconnected', () => {
			isConnected = false;
			characteristic = null;
		});

		return true;
	} catch (err) {
		console.error('Bluetooth connect error:', err);
		isConnected = false;
		throw err;
	}
}

export function disconnectPrinter(): void {
	if (device?.gatt?.connected) {
		device.gatt.disconnect();
	}
	isConnected = false;
	characteristic = null;
	device = null;
}

async function writeData(data: Uint8Array): Promise<void> {
	if (!characteristic) throw new Error('Printer not connected');

	// Bluetooth has a max packet size (~512 bytes). Chunk it.
	const CHUNK_SIZE = 100;
	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);
		if (characteristic.properties.writeWithoutResponse) {
			await characteristic.writeValueWithoutResponse(chunk);
		} else {
			await characteristic.writeValueWithResponse(chunk);
		}
		// Small delay between chunks for printer buffer
		await new Promise(r => setTimeout(r, 30));
	}
}

function textToBytes(text: string): Uint8Array {
	return new TextEncoder().encode(text + '\n');
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
	const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}

function padRight(str: string, len: number): string {
	return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
	return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

export interface ReceiptData {
	businessName: string;
	businessAddress?: string;
	businessPhone?: string;
	gstin?: string;
	invoiceNumber: string;
	date: string;
	customerName: string;
	items: { name: string; qty: number; rate: number; amount: number }[];
	subtotal: number;
	tax: number;
	grandTotal: number;
	paymentMethod?: string;
	notes?: string;
}

export async function printReceipt(receipt: ReceiptData): Promise<void> {
	const COL_WIDTH = 32; // characters for 58mm printer

	const formatINR = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

	const data = concatBytes(
		CMD.INIT,
		// Header
		CMD.ALIGN_CENTER,
		CMD.BOLD_ON,
		CMD.DOUBLE_HEIGHT,
		textToBytes(receipt.businessName),
		CMD.NORMAL_SIZE,
		CMD.BOLD_OFF,
		...(receipt.businessAddress ? [textToBytes(receipt.businessAddress)] : []),
		...(receipt.businessPhone ? [textToBytes(`Ph: ${receipt.businessPhone}`)] : []),
		...(receipt.gstin ? [textToBytes(`GSTIN: ${receipt.gstin}`)] : []),
		CMD.LINE,

		// Invoice info
		CMD.ALIGN_LEFT,
		CMD.BOLD_ON,
		textToBytes(`Invoice: ${receipt.invoiceNumber}`),
		CMD.BOLD_OFF,
		textToBytes(`Date: ${receipt.date}`),
		textToBytes(`Customer: ${receipt.customerName}`),
		CMD.LINE,

		// Items header
		CMD.BOLD_ON,
		textToBytes(padRight('Item', 16) + padLeft('Qty', 4) + padLeft('Amt', 12)),
		CMD.BOLD_OFF,
		CMD.LINE,

		// Items
		...receipt.items.flatMap(item => [
			textToBytes(
				padRight(item.name.substring(0, 16), 16) +
				padLeft(item.qty.toString(), 4) +
				padLeft(formatINR(item.amount), 12)
			)
		]),

		CMD.LINE,

		// Totals
		CMD.ALIGN_RIGHT,
		textToBytes(`Subtotal: ${formatINR(receipt.subtotal)}`),
		textToBytes(`Tax: ${formatINR(receipt.tax)}`),
		CMD.BOLD_ON,
		CMD.DOUBLE_HEIGHT,
		textToBytes(`TOTAL: ${formatINR(receipt.grandTotal)}`),
		CMD.NORMAL_SIZE,
		CMD.BOLD_OFF,
		CMD.LINE,

		// Footer
		CMD.ALIGN_CENTER,
		...(receipt.paymentMethod ? [textToBytes(`Paid via: ${receipt.paymentMethod}`)] : []),
		...(receipt.notes ? [textToBytes(receipt.notes)] : []),
		textToBytes('Thank you for your business!'),
		textToBytes('Powered by Hisaab'),

		// Feed and cut
		CMD.FEED_3,
		CMD.PARTIAL_CUT
	);

	await writeData(data);
}

export async function openCashDrawer(): Promise<void> {
	await writeData(CMD.OPEN_DRAWER);
}

export async function printTestPage(): Promise<void> {
	const data = concatBytes(
		CMD.INIT,
		CMD.ALIGN_CENTER,
		CMD.BOLD_ON,
		CMD.DOUBLE_HEIGHT,
		textToBytes('HISAAB'),
		CMD.NORMAL_SIZE,
		CMD.BOLD_OFF,
		textToBytes('Printer Connected!'),
		CMD.LINE,
		textToBytes('This is a test receipt.'),
		textToBytes('If you can read this,'),
		textToBytes('your printer is working.'),
		CMD.FEED_3,
		CMD.PARTIAL_CUT
	);
	await writeData(data);
}
