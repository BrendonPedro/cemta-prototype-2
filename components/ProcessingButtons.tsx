import React from "react";
import { Button } from "@/components/ui/button";

interface ProcessingButtonsProps {
  onProcess: (type: "documentAI" | "vertexAI") => void;
  isProcessing: boolean;
}

const ProcessingButtons: React.FC<ProcessingButtonsProps> = ({
  onProcess,
  isProcessing,
}) => {
  return (
    <div className="space-x-4 mt-4">
      <Button onClick={() => onProcess("documentAI")} disabled={isProcessing}>
        Process with Document AI
      </Button>
      <Button onClick={() => onProcess("vertexAI")} disabled={isProcessing}>
        Process with Vertex AI
      </Button>
    </div>
  );
};

export default ProcessingButtons;
