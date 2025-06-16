
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhotoUpload } from "./PhotoUpload";
import { Database } from "@/integrations/supabase/types";
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
import { CheckCircle, XCircle, Camera } from "lucide-react";

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
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const { toast } = useToast();

  const isDelivered = action === "delivered";
  const title = isDelivered ? "Mark as Delivered" : "Cancel Delivery";
  const description = isDelivered 
    ? "Please add notes about the delivery. Photo is optional but recommended."
    : "Please explain why this delivery is being cancelled.";

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide notes before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.rpc('update_order_status', {
        order_id: order.id,
        new_status: action as OrderStatus,
        notes: notes.trim()
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order ${isDelivered ? 'marked as delivered' : 'cancelled'} successfully`,
      });

      onStatusUpdate();
      onOpenChange(false);
      setNotes("");
      setPhotoUploaded(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUploaded = () => {
    setShowPhotoUpload(false);
    setPhotoUploaded(true);
    toast({
      title: "Photo Uploaded",
      description: "Delivery photo has been uploaded successfully",
    });
  };

  return (
    <>
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
                <div className="flex items-center justify-between">
                  <Label>Delivery Photo (Optional)</Label>
                  {photoUploaded && (
                    <span className="text-sm text-green-600">✓ Photo uploaded</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPhotoUpload(true)}
                  className="w-full"
                  disabled={photoUploaded}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {photoUploaded ? "Photo Uploaded" : "Upload Photo"}
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

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <PhotoUpload
          orderId={order.id}
          onPhotoUploaded={handlePhotoUploaded}
          onCancel={() => setShowPhotoUpload(false)}
        />
      )}
    </>
  );
}
