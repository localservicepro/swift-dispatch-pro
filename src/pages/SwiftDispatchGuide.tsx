import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SwiftDispatchGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">SwiftDispatch Guide</h1>
      </div>
      <div className="bg-background rounded-lg border overflow-hidden">
        <iframe
          src="https://scribehow.com/page-embed/Swiftdispatch_Guide__oBvM9QTDRWSzFwoboJrbnQ"
          width="100%"
          height="800"
          allow="fullscreen"
          style={{ border: 0, minHeight: 640 }}
          title="SwiftDispatch Guide"
        />
      </div>
    </div>
  );
};

export default SwiftDispatchGuide;
