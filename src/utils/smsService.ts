
import { supabase } from "@/integrations/supabase/client";

interface SMSNotificationData {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  messageType: 'order_confirmation' | 'delivery_status' | 'driver_assignment';
  orderStatus?: string;
  driverName?: string;
  estimatedTime?: string;
}

export const smsService = {
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('sms_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching SMS settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('SMS settings fetch error:', error);
      return null;
    }
  },

  async sendNotification(data: SMSNotificationData) {
    try {
      console.log('Attempting to send SMS notification:', data);

      const settings = await this.getSettings();
      if (!settings || settings.connection_status !== 'connected') {
        console.log('SMS not configured or not connected, skipping notification');
        return;
      }

      // Check if customer has opted out of SMS
      const { data: customer } = await supabase
        .from('customers')
        .select('sms_notifications_enabled')
        .eq('phone', data.customerPhone)
        .single();

      if (customer && !customer.sms_notifications_enabled) {
        console.log('Customer has opted out of SMS notifications');
        return;
      }

      // Generate message content based on type
      let messageContent = '';
      switch (data.messageType) {
        case 'order_confirmation':
          messageContent = `Hi ${data.customerName}, your order ${data.orderNumber} has been confirmed and is being prepared. We'll keep you updated on the delivery status.`;
          break;
        case 'delivery_status':
          messageContent = `Hi ${data.customerName}, your order ${data.orderNumber} status has been updated to: ${data.orderStatus?.replace('_', ' ')}`;
          if (data.driverName) {
            messageContent += `. Your driver is ${data.driverName}`;
          }
          if (data.estimatedTime) {
            messageContent += `. Estimated delivery: ${data.estimatedTime}`;
          }
          break;
        case 'driver_assignment':
          messageContent = `Hi ${data.customerName}, ${data.driverName} has been assigned to deliver your order ${data.orderNumber}`;
          if (data.estimatedTime) {
            messageContent += `. Estimated delivery: ${data.estimatedTime}`;
          }
          break;
      }

      // Call edge function to send SMS
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: data.customerPhone,
          message: messageContent,
          messageType: data.messageType,
          orderNumber: data.orderNumber,
          customerName: data.customerName
        }
      });

      if (error) {
        console.error('SMS sending error:', error);
        throw error;
      }

      console.log('SMS notification sent successfully');
    } catch (error: any) {
      console.error('SMS service error:', error);
      // Don't throw to avoid breaking the main flow
    }
  },

  async sendOrderConfirmation(customerName: string, customerPhone: string, orderNumber: string) {
    return this.sendNotification({
      customerName,
      customerPhone,
      orderNumber,
      messageType: 'order_confirmation'
    });
  },

  async sendDeliveryStatusUpdate(customerName: string, customerPhone: string, orderNumber: string, orderStatus: string, driverName?: string) {
    return this.sendNotification({
      customerName,
      customerPhone,
      orderNumber,
      messageType: 'delivery_status',
      orderStatus,
      driverName
    });
  },

  async sendDriverAssignment(customerName: string, customerPhone: string, orderNumber: string, driverName: string, estimatedTime?: string) {
    return this.sendNotification({
      customerName,
      customerPhone,
      orderNumber,
      messageType: 'driver_assignment',
      driverName,
      estimatedTime
    });
  }
};
