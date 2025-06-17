import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ActivityLog } from "./settings/ActivityLog";

export function Settings() {
  const [businessInfo, setBusinessInfo] = useState({
    name: "Premium Delivery Co.",
    address: "123 Business St, City, State 12345",
    phone: "+1 (555) 123-4567",
    email: "contact@premiumdelivery.com",
    website: "www.premiumdelivery.com"
  });

  const [notifications, setNotifications] = useState({
    orderConfirmation: true,
    paymentReceived: true,
    deliveryUpdates: true,
    systemAlerts: true,
    weeklyReports: false,
    monthlyReports: true
  });

  const { toast } = useToast();

  const handleSaveBusinessInfo = () => {
    toast({
      title: "Business Information Updated",
      description: "Your business profile has been saved successfully",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Updated",
      description: "Your email preferences have been saved",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-600 mt-1">Manage your business profile, preferences, and activity logs</p>
      </div>

      {/* Business Profile */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessInfo.name}
                onChange={(e) => setBusinessInfo({...businessInfo, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo({...businessInfo, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessPhone">Phone Number</Label>
              <Input
                id="businessPhone"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="businessWebsite">Website</Label>
              <Input
                id="businessWebsite"
                value={businessInfo.website}
                onChange={(e) => setBusinessInfo({...businessInfo, website: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea
              id="businessAddress"
              value={businessInfo.address}
              onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSaveBusinessInfo}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Save Business Information
          </Button>
        </CardContent>
      </Card>

      {/* Email Notification Preferences */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Email Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="orderConfirmation">Order Confirmation Emails</Label>
                <p className="text-sm text-slate-500">Send confirmation emails when new orders are created</p>
              </div>
              <Switch
                id="orderConfirmation"
                checked={notifications.orderConfirmation}
                onCheckedChange={(checked) => setNotifications({...notifications, orderConfirmation: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="paymentReceived">Payment Notifications</Label>
                <p className="text-sm text-slate-500">Notify when payments are received</p>
              </div>
              <Switch
                id="paymentReceived"
                checked={notifications.paymentReceived}
                onCheckedChange={(checked) => setNotifications({...notifications, paymentReceived: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="deliveryUpdates">Delivery Status Updates</Label>
                <p className="text-sm text-slate-500">Send updates when delivery status changes</p>
              </div>
              <Switch
                id="deliveryUpdates"
                checked={notifications.deliveryUpdates}
                onCheckedChange={(checked) => setNotifications({...notifications, deliveryUpdates: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="systemAlerts">System Alerts</Label>
                <p className="text-sm text-slate-500">Important system notifications and alerts</p>
              </div>
              <Switch
                id="systemAlerts"
                checked={notifications.systemAlerts}
                onCheckedChange={(checked) => setNotifications({...notifications, systemAlerts: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weeklyReports">Weekly Reports</Label>
                <p className="text-sm text-slate-500">Receive weekly business performance reports</p>
              </div>
              <Switch
                id="weeklyReports"
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="monthlyReports">Monthly Reports</Label>
                <p className="text-sm text-slate-500">Receive monthly business summaries</p>
              </div>
              <Switch
                id="monthlyReports"
                checked={notifications.monthlyReports}
                onCheckedChange={(checked) => setNotifications({...notifications, monthlyReports: checked})}
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveNotifications}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            Save Notification Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <ActivityLog />

      {/* System Information */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">System Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Application Version</p>
              <p className="font-medium">v2.1.0</p>
            </div>
            <div>
              <p className="text-slate-500">Last Backup</p>
              <p className="font-medium">2024-01-15 03:00 AM</p>
            </div>
            <div>
              <p className="text-slate-500">Database Status</p>
              <p className="font-medium text-green-600">Healthy</p>
            </div>
            <div>
              <p className="text-slate-500">Support Contact</p>
              <p className="font-medium">support@adminpanel.com</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
