// components/ProcessingButtons.tsx

import React from "react";
import { Button } from "@/components/ui/button";

interface ProcessingButtonsProps {
  onProcess: () => void;
  onReprocess?: () => void;
  isProcessing: boolean;
  isDisabled: boolean;
  isCached: boolean;
  isUploaded: boolean;
}

const ProcessingButtons: React.FC<ProcessingButtonsProps> = ({
  onProcess,
  onReprocess,
  isProcessing,
  isDisabled,
  isCached,
  isUploaded,
}) => {
  let buttonText = "Process with Vertex AI";
  let buttonAction = onProcess;

  if (isUploaded && !isProcessing) {
    buttonText = "Analyze Menu";
    buttonAction = onProcess;
  } else if (isCached && onReprocess) {
    buttonText = "Reprocess with Vertex AI";
    buttonAction = onReprocess;
  }

  return (
    <div className="inline-flex items-center w-full mt-4">
      <Button
        onClick={() => buttonAction()}
        disabled={isProcessing || isDisabled}
        variant="nextButton2"
        className="w-full"
      >
        {buttonText}
      </Button>
    </div>
  );
};

export default ProcessingButtons;
