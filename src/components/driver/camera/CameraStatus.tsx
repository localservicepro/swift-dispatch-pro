
import { Button } from "@/components/ui/button";

interface CameraStatusProps {
  videoReady: boolean;
  streamStatus: string;
  stream: MediaStream | null;
  onForceEnable: () => void;
}

export function CameraStatus({
  videoReady,
  streamStatus,
  stream,
  onForceEnable
}: CameraStatusProps) {
  if (videoReady) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <p className="text-sm">Preparing photo capture...</p>
        {streamStatus && <p className="text-xs mt-1 text-gray-300">{streamStatus}</p>}
        {stream && !videoReady && (
          <Button 
            onClick={onForceEnable}
            className="mt-3 bg-green-600 hover:bg-green-700 text-sm px-4 py-2"
          >
            Enable Camera Now
          </Button>
        )}
      </div>
    </div>
  );
}
