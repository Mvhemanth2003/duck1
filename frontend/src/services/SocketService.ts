import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants';
import { ChatMessage, UserStatus } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private onUserStatusCallback: ((status: UserStatus) => void) | null = null;
  private onDeliveryStatusCallback: ((status: any) => void) | null = null;
  private isConnected: boolean = false;

  /**
   * Connect to the Socket.io server
   */
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io(SERVER_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
          console.log('🌐 Socket connected:', this.socket?.id);
          this.isConnected = true;
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Socket disconnected');
          this.isConnected = false;
        });

        // Listen for incoming messages
        this.socket.on('new-message', (data: ChatMessage) => {
          console.log('📨 Socket message received:', data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        });

        // Listen for user status updates
        this.socket.on('user-status', (data: UserStatus) => {
          console.log('👤 User status:', data);
          if (this.onUserStatusCallback) {
            this.onUserStatusCallback(data);
          }
        });

        // Listen for delivery status
        this.socket.on('delivery-status', (data: any) => {
          console.log('📬 Delivery status:', data);
          if (this.onDeliveryStatusCallback) {
            this.onDeliveryStatusCallback(data);
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.error('Socket init error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Register with the server as a specific role
   */
  register(role: string, name: string): void {
    if (this.socket) {
      this.socket.emit('register', { role, name });
      console.log(`📝 Registered as ${role}: ${name}`);
    }
  }

  /**
   * Send message from relay to online user (forwarding offline user's message)
   */
  relayToOnline(content: string, senderName: string): void {
    if (this.socket) {
      this.socket.emit('relay-to-online', { content, senderName });
      console.log(`📤 Relaying to online: "${content}"`);
    }
  }

  /**
   * Send message from online user to relay (for offline user)
   */
  onlineToRelay(content: string, senderName: string): void {
    if (this.socket) {
      this.socket.emit('online-to-relay', { content, senderName });
      console.log(`📤 Sending to relay: "${content}"`);
    }
  }

  /**
   * Send a direct message
   */
  sendMessage(sender: string, senderName: string, receiver: string, content: string): void {
    if (this.socket) {
      this.socket.emit('send-message', { sender, senderName, receiver, content });
    }
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (message: ChatMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for user status changes
   */
  onUserStatus(callback: (status: UserStatus) => void): void {
    this.onUserStatusCallback = callback;
  }

  /**
   * Set callback for delivery status
   */
  onDeliveryStatus(callback: (status: any) => void): void {
    this.onDeliveryStatusCallback = callback;
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 Socket service disconnected');
    }
  }
}

export default new SocketService();
