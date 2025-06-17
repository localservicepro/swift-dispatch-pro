
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { updateOrderStatus } from "@/services/orderStatusService";
import { handleOrderError } from "@/utils/errorHandler";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Camera, X, Upload } from "lucide-react";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface DeliveryActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  action: "delivered" | "cancelled";
  onStatusUpdate: () => void;
}

export function DeliveryActionDialog({ 
  open, 
  onOpenChange, 
  order, 
  action,
  onStatusUpdate 
}: DeliveryActionDialogProps) {
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isDelivered = action === "delivered";
  const title = isDelivered ? "Mark as Delivered" : "Cancel Delivery";
  const description = isDelivered 
    ? "Please add notes about the delivery. Photo is optional but recommended."
    : "Please explain why this delivery is being cancelled.";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      uploadPhoto(file);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      // Get current user
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user?.id) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}_${Date.now()}.${fileExt}`;
      // Updated path structure to include user ID for proper RLS handling
      const filePath = `${currentUser.data.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('delivery_photos')
        .insert({
          order_id: order.id,
          photo_url: filePath,
          driver_id: currentUser.data.user.id
        });

      if (dbError) throw dbError;

      setPhotoUploaded(true);
      toast({
        title: "Photo Uploaded",
        description: "Delivery photo has been uploaded successfully",
      });
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedPhoto = () => {
    setSelectedFile(null);
    setPhotoUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide notes before proceeding.",
        variant: "destructive",
      });
      return;
    }

    console.log(`DeliveryActionDialog: Updating order ${order.id} to status: ${action}`);
    console.log(`Order number: ${order.order_number}, Customer: ${order.customer_name}`);
    console.log(`Notes: ${notes.trim()}`);

    setUpdating(true);
    try {
      // Use the reliable orderStatusService instead of broken RPC
      const result = await updateOrderStatus(order.id, action as OrderStatus);
      
      console.log('Order status update successful:', result);

      // Insert delivery status update with notes
      const { error: statusUpdateError } = await supabase
        .from('delivery_status_updates')
        .insert({
          order_id: order.id,
          driver_id: (await supabase.auth.getUser()).data.user?.id,
          old_status: order.status,
          new_status: action as OrderStatus,
          notes: notes.trim()
        });

      if (statusUpdateError) {
        console.error('Failed to insert status update record:', statusUpdateError);
        // Don't fail the entire operation for this
      }

      toast({
        title: "Status Updated",
        description: `Order ${isDelivered ? 'marked as delivered' : 'cancelled'} successfully`,
      });

      onStatusUpdate();
      onOpenChange(false);
      setNotes("");
      setSelectedFile(null);
      setPhotoUploaded(false);
    } catch (error: any) {
      console.error(`Failed to update order status for ${order.order_number}:`, error);
      
      // Use centralized error handler
      handleOrderError({
        operation: `${isDelivered ? 'mark as delivered' : 'cancel delivery'}`,
        orderId: order.id,
        orderNumber: order.order_number,
        originalError: error
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDelivered ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Order: {order.order_number}
            <br />
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              placeholder={isDelivered 
                ? "e.g., Delivered to front door, customer was home, package secured..."
                : "e.g., Customer not available, address incorrect, weather conditions..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          {isDelivered && (
            <div className="space-y-2">
              <Label>Delivery Photo (Optional)</Label>
              
              {selectedFile && (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Selected delivery photo"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeSelectedPhoto}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={handlePhotoUploadClick}
                className="w-full"
                disabled={uploading || photoUploaded}
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : photoUploaded ? (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Photo Uploaded
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={updating || !notes.trim()}
            className={isDelivered ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {updating ? 'Processing...' : (isDelivered ? 'Complete Delivery' : 'Cancel Delivery')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
