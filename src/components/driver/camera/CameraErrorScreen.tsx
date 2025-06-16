
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";

interface CameraErrorScreenProps {
  error: string | null;
  streamStatus: string;
  stream: MediaStream | null;
  onForceEnable: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export function CameraErrorScreen({
  error,
  streamStatus,
  stream,
  onForceEnable,
  onRefresh,
  onRetry,
  onCancel
}: CameraErrorScreenProps) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
        <div className="text-red-600 mb-4">
          <Camera className="w-12 h-12 mx-auto mb-2" />
          <p className="font-medium">{error}</p>
          {streamStatus && <p className="text-sm mt-2 text-gray-600">Status: {streamStatus}</p>}
        </div>
        <div className="space-y-2">
          {stream && (
            <Button onClick={onForceEnable} className="w-full bg-green-600 hover:bg-green-700">
              Force Enable Camera
            </Button>
          )}
          <Button onClick={onRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Camera
          </Button>
          <Button onClick={onRetry} variant="outline" className="w-full">
            Try Again
          </Button>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
