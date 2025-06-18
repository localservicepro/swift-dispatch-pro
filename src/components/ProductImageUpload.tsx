
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ProductImageUploadProps {
  productId?: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageUpload({ 
  productId, 
  images, 
  onImagesChange, 
  maxImages = 3 
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading image to product-images bucket:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${uploadError.message}`,
          variant: "destructive",
        });
        return null;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('Upload successful, public URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected upload error:', error);
      toast({
        title: "Upload failed",
        description: `Unexpected error uploading ${file.name}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const newImages: string[] = [];
    let successCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        });
        continue;
      }

      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        newImages.push(imageUrl);
        successCount++;
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);
      
      toast({
        title: "Upload successful",
        description: `${successCount} image(s) uploaded successfully!`,
      });
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = async (imageUrl: string) => {
    const updatedImages = images.filter(img => img !== imageUrl);
    onImagesChange(updatedImages);

    // Extract filename from URL and delete from storage
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const { error } = await supabase.storage
        .from('product-images')
        .remove([fileName]);

      if (error) {
        console.error('Error removing image from storage:', error);
      }
    } catch (error) {
      console.error('Error parsing image URL for deletion:', error);
    }

    toast({
      title: "Image removed",
      description: "Image has been removed successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Product Images (up to {maxImages})</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`Product image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
                onError={(e) => {
                  console.error('Failed to load image:', imageUrl);
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTggMTdIMTJNMTIgOUgxNk04IDE5SDE2QzE3LjEwNDYgMTkgMTggMTguMTA0NiAxOCAxN1Y3QzE4IDUuODk1NDMgMTcuMTA0NiA1IDE2IDVIOEMGLjg5NTQzIDUgNiA1Ljg5NTQzIDYgN1YxN0M2IDE4LjEwNDYgNi44OTU0MyAxOSA4IDE5WiIgc3Ryb2tlPSIjOUI5Qjk4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(imageUrl)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No images uploaded yet</p>
          <p className="text-sm text-gray-400">Click upload to add product images</p>
        </div>
      )}
    </div>
  );
}
