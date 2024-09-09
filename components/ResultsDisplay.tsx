import React from "react";
import Image from "next/image";
import DocumentAiResultsDisplay from "./DocumentAiResultsDisplay";
import VertexAiResultsDisplay from "./vertexAiResultsDisplay";

interface ResultsDisplayProps {
  userId: string;
  processType: "none" | "documentAI" | "vertexAI";
  menuImageUrl: string | null;
  previewImageUrl: string | null;
  isUploaded: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  userId,
  processType,
  menuImageUrl,
  previewImageUrl,
  isUploaded,
}) => {
  if (processType === "documentAI") {
    return <DocumentAiResultsDisplay userId={userId} />;
  }

  if (processType === "vertexAI") {
    return <VertexAiResultsDisplay userId={userId} />;
  }

  if (previewImageUrl) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {isUploaded ? "Uploaded Image" : "Image Preview"}
        </h2>
        <Image
          src={previewImageUrl}
          alt={isUploaded ? "Uploaded Menu" : "Menu Preview"}
          width={400}
          height={400}
          objectFit="contain"
        />
        {!isUploaded && (
          <p className="mt-2 text-gray-600">
            Click &quot;Upload Menu Image&quot; to proceed with processing.
          </p>
        )}
        {isUploaded && (
          <p className="mt-2 text-gray-600">
            Select a processing option to analyze the menu.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <p className="text-gray-600">
        Upload a menu image and select a processing option to view results.
      </p>
    </div>
  );
};

export default ResultsDisplay;
