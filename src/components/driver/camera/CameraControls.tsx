
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, Camera } from "lucide-react";

interface CameraControlsProps {
  capturedPhoto: string | null;
  videoReady: boolean;
  onCapture: () => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export function CameraControls({
  capturedPhoto,
  videoReady,
  onCapture,
  onRetake,
  onConfirm
}: CameraControlsProps) {
  return (
    <div className="p-6 bg-black/80">
      {capturedPhoto ? (
        <div className="flex gap-4">
          <Button
            onClick={onRetake}
            variant="outline"
            className="flex-1 bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Use Photo
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button
            onClick={onCapture}
            size="lg"
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black"
            disabled={!videoReady}
          >
            <Camera className="w-8 h-8" />
          </Button>
        </div>
      )}
    </div>
  );
}
