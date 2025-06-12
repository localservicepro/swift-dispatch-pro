
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, Check } from "lucide-react";

interface PhotoUploadProps {
  orderId: string;
  onPhotoUploaded: () => void;
  onCancel: () => void;
}

export function PhotoUpload({ orderId, onPhotoUploaded, onCancel }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${orderId}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('delivery_photos')
        .insert({
          order_id: orderId,
          driver_id: user.id,
          photo_url: publicUrl,
          photo_type: 'proof_of_delivery'
        });

      if (dbError) throw dbError;

      toast({
        title: "Photo Uploaded",
        description: "Proof of delivery photo uploaded successfully",
      });

      onPhotoUploaded();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proof of Delivery</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Take a photo to confirm delivery completion
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img 
                  src={preview} 
                  alt="Delivery proof preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setSelectedFile(null);
                  }}
                  className="flex-1"
                >
                  Retake
                </Button>
                <Button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={openCamera}
                  className="aspect-square flex flex-col items-center justify-center p-4"
                >
                  <Camera className="w-8 h-8 mb-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={openGallery}
                  className="aspect-square flex flex-col items-center justify-center p-4"
                >
                  <Upload className="w-8 h-8 mb-2" />
                  From Gallery
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
