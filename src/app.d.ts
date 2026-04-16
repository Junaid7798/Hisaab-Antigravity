// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Web Bluetooth API types
interface BluetoothDevice extends EventTarget {
	id: string;
	name?: string;
	readonly gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
	device: BluetoothDevice;
	connected: boolean;
	getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
	device: BluetoothDevice;
	uuid: string;
	getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
	service: BluetoothRemoteGATTService;
	uuid: string;
	readonly value?: DataView;
	readValue(): Promise<DataView>;
	writeValue(value: BufferSource): Promise<void>;
	startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
	stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothUUID {
	canonicalUUID(id: number): string;
}

declare var BluetoothUUID: BluetoothUUID;

interface Navigator {
	bluetooth?: Bluetooth;
}

interface Bluetooth {
	requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
}

interface BluetoothRequestDeviceOptions {
	filters?: BluetoothLEScanFilter[];
	optionalServices?: BluetoothServiceUUID[];
}

interface BluetoothLEScanFilter {
	services?: BluetoothServiceUUID[];
	name?: string;
	namePrefix?: string;
}

type BluetoothServiceUUID = string | number;
type BluetoothCharacteristicUUID = string | number;

export {};
