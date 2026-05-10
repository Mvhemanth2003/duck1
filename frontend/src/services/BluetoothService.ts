import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { BLE_SERVICE_UUID, BLE_CHARACTERISTIC_UUID } from '../utils/constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

class BluetoothService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private onMessageCallback: ((message: string) => void) | null = null;
  private isScanning: boolean = false;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Request Bluetooth permissions on Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED,
        );

        console.log('Bluetooth permissions:', allGranted ? 'granted' : 'denied');
        return allGranted;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (message: string) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Scan for BLE devices offering our service
   */
  async scanForDevices(
    onDeviceFound: (device: Device) => void,
  ): Promise<void> {
    const permGranted = await this.requestPermissions();
    if (!permGranted) {
      throw new Error('Bluetooth permissions not granted');
    }

    if (this.isScanning) {
      console.log('Already scanning...');
      return;
    }

    this.isScanning = true;
    console.log('🔍 Starting BLE scan...');

    this.manager.startDeviceScan(
      null, // scan for all services (filter by UUID can be unreliable on some devices)
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error.message);
          this.isScanning = false;
          return;
        }

        if (device && device.name) {
          console.log(`📱 Found device: ${device.name} (${device.id})`);
          onDeviceFound(device);
        }
      },
    );

    // Auto-stop scan after 30 seconds
    setTimeout(() => {
      this.stopScan();
    }, 30000);
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('🛑 Scan stopped');
    }
  }

  /**
   * Connect to a BLE device
   */
  async connectToDevice(device: Device): Promise<boolean> {
    try {
      console.log(`🔗 Connecting to ${device.name}...`);

      const connected = await device.connect();
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      this.connectedDevice = discovered;

      // Monitor for incoming messages
      this.monitorMessages();

      console.log(`✅ Connected to ${device.name}`);
      return true;
    } catch (error: any) {
      console.error('Connection error:', error.message);
      return false;
    }
  }

  /**
   * Monitor incoming BLE messages (notifications)
   */
  private monitorMessages(): void {
    if (!this.connectedDevice) return;

    this.connectedDevice.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_CHARACTERISTIC_UUID,
      (error: any, characteristic: Characteristic | null) => {
        if (error) {
          console.error('Monitor error:', error.message);
          return;
        }

        if (characteristic?.value) {
          // Decode base64 value
          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          console.log('📩 BLE message received:', decoded);

          if (this.onMessageCallback) {
            this.onMessageCallback(decoded);
          }
        }
      },
    );
  }

  /**
   * Send a message via BLE
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.connectedDevice) {
      console.error('No device connected');
      return false;
    }

    try {
      // Encode message to base64
      const encoded = Buffer.from(message, 'utf-8').toString('base64');

      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHARACTERISTIC_UUID,
        encoded,
      );

      console.log('📤 BLE message sent:', message);
      return true;
    } catch (error: any) {
      console.error('Send error:', error.message);
      return false;
    }
  }

  /**
   * Disconnect from the current device
   */
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
        console.log('🔌 Disconnected');
      } catch (error: any) {
        console.log('Disconnect error:', error.message);
      }
      this.connectedDevice = null;
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  /**
   * Destroy the BLE manager
   */
  destroy(): void {
    this.stopScan();
    this.disconnect();
    this.manager.destroy();
  }
}

export default new BluetoothService();
