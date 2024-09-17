import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProcessingButtonsProps {
  onProcess: () => void;
  isProcessing: boolean;
  isDisabled: boolean;
}

const ProcessingButtons: React.FC<ProcessingButtonsProps> = ({
  onProcess,
  isProcessing,
  isDisabled,
}) => {
  return (
    <div className="inline-flex items-center w-full">
      <Button
        onClick={onProcess}
        disabled={isProcessing || isDisabled}
        variant="nextButton2"
        className="w-full"
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
