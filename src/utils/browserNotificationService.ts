interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryTime?: string;
  deliveryDate?: string;
  status?: string;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private notificationSound: HTMLAudioElement | null = null;

  private constructor() {
    this.initializeNotificationSound();
  }

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  private initializeNotificationSound() {
    try {
      // Create notification sound element
      this.notificationSound = new Audio();
      // Use a data URL for a simple notification beep
      this.notificationSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYeCAGX5e6h';
      this.notificationSound.volume = 0.3;
      this.notificationSound.preload = 'auto';
    } catch (error) {
      console.warn('Failed to initialize notification sound:', error);
    }
  }

  private playNotificationSound() {
    if (this.notificationSound) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }

  private focusDriverPortal() {
    try {
      // Try to focus the current window/tab
      window.focus();
      
      // If the page is in background, bring it to foreground
      if (document.hidden) {
        document.dispatchEvent(new Event('visibilitychange'));
      }
    } catch (error) {
      console.warn('Failed to focus driver portal:', error);
    }
  }

  sendOrderAssignmentNotification(orderData: OrderNotificationData): void {
    if (!this.isNotificationSupported() || !this.hasPermission()) {
      return;
    }

    const { orderNumber, customerName, deliveryTime, deliveryDate } = orderData;
    
    let body = `New order assigned: ${orderNumber}`;
    if (customerName) {
      body += `\nCustomer: ${customerName}`;
    }
    if (deliveryDate && deliveryTime) {
      body += `\nDelivery: ${deliveryDate} at ${deliveryTime}`;
    } else if (deliveryDate) {
      body += `\nDelivery: ${deliveryDate}`;
    }

    const options: NotificationOptions = {
      title: '🚛 New Order Assigned',
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `order-${orderData.orderId}`,
      requireInteraction: true,
      data: {
        type: 'order_assignment',
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
      }
    };

    this.sendNotification(options);
  }

  sendStatusUpdateNotification(orderData: OrderNotificationData): void {
    if (!this.isNotificationSupported() || !this.hasPermission()) {
      return;
    }

    const { orderNumber, status } = orderData;
    
    const options: NotificationOptions = {
      title: '📦 Order Status Updated',
      body: `Order ${orderNumber} status: ${status}`,
      icon: '/favicon.ico',
      tag: `status-${orderData.orderId}`,
      requireInteraction: false,
      data: {
        type: 'status_update',
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        status: status,
      }
    };

    this.sendNotification(options);
  }

  private sendNotification(options: NotificationOptions): void {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
        data: options.data,
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        this.focusDriverPortal();
        notification.close();
        
        // Handle specific notification actions based on type
        if (options.data?.type === 'order_assignment') {
          console.log('Order assignment notification clicked:', options.data);
        }
      };

      // Auto-close notification after 8 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 8000);
      }

      // Play notification sound for important notifications
      if (options.data?.type === 'order_assignment') {
        this.playNotificationSound();
      }

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  hasPermission(): boolean {
    return this.isNotificationSupported() && Notification.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.isNotificationSupported() ? Notification.permission : 'denied';
  }
}

export const browserNotificationService = BrowserNotificationService.getInstance();