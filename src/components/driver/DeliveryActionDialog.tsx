
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
    ? "Please upload a delivery photo. Notes are optional but recommended for additional context."
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
    // Validation: For delivered orders, require photo; for cancelled orders, require notes
    if (isDelivered && !photoUploaded) {
      toast({
        title: "Photo Required",
        description: "Please upload a delivery photo before marking as delivered.",
        variant: "destructive",
      });
      return;
    }

    if (!isDelivered && !notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please explain why this delivery is being cancelled.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.rpc('update_order_status', {
        order_id: order.id,
        new_status: action as OrderStatus,
        notes: notes.trim() || null
      });

      if (error) throw error;

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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Determine if submit button should be disabled
  const isSubmitDisabled = updating || (isDelivered ? !photoUploaded : !notes.trim());

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
            <Label htmlFor="notes">
              Notes {!isDelivered && "*"}
            </Label>
            <Textarea
              id="notes"
              placeholder={isDelivered 
                ? "e.g., Delivered to front door, customer was home, package secured... (optional)"
                : "e.g., Customer not available, address incorrect, weather conditions..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          {isDelivered && (
            <div className="space-y-2">
              <Label>Delivery Photo *</Label>
              
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
            disabled={isSubmitDisabled}
            className={isDelivered ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {updating ? 'Processing...' : (isDelivered ? 'Complete Delivery' : 'Cancel Delivery')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
