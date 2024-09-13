import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProcessingButtonsProps {
  onProcess: () => void;
  isProcessing: boolean;
}

const ProcessingButtons: React.FC<ProcessingButtonsProps> = ({
  onProcess,
  isProcessing,
}) => {
  return (
    <div className="mt-4">
      <Button
        onClick={onProcess}
        disabled={isProcessing}
        className="w-full"
        variant="nextButton2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Process with Vertex AI"
        )}
      </Button>
    </div>
  );
};

export default ProcessingButtons;
