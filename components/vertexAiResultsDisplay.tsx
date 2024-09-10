import React, { useState, useEffect } from "react";
import {
  getVertexAiResults,
  updateVertexAiResults,
  getVertexAiHistory,
} from "@/app/services/firebaseFirestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
}

interface ParsedRow {
  original: string;
  price: string;
  pinyin: string;
  english: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  menuName: string;
}

const VertexAiResultsDisplay: React.FC<VertexAiResultsDisplayProps> = ({
  userId,
  latestProcessingId,
}) => {
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!latestProcessingId) {
        setIsLoading(false);
        setError(
          "No processing ID available. Please try processing the image again."
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await getVertexAiResults(userId, latestProcessingId);
        if (results && results.ocrText) {
          setOcrText(results.ocrText);
          setEditedText(results.ocrText);
          setSelectedHistoryId(latestProcessingId);
        } else {
          setError("No OCR text found in the results.");
        }
      } catch (error) {
        console.error("Error fetching Vertex AI results:", error);
        setError("Failed to fetch Vertex AI results. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const historyData = await getVertexAiHistory(userId);
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchResults();
    fetchHistory();
  }, [userId, latestProcessingId]);

  const parseRows = (text: string): ParsedRow[] => {
    const rows = text.split("\n").filter((row) => {
      const trimmedRow = row.trim();
      return trimmedRow !== "" && !trimmedRow.match(/^[-|]+$/); // Remove rows with only dashes or pipes
    });
    // Remove the header row if it exists
    if (
      rows[0].toLowerCase().includes("original") &&
      rows[0].toLowerCase().includes("price")
    ) {
      rows.shift();
    }
    return rows.map((row) => {
      const columns = row.split("|").map((col) => col.trim());
      return {
        original: columns[1] || "",
        price: columns[2] || "",
        pinyin: columns[3] || "",
        english: columns[4] || "",
      };
    });
  };

  const handleEdit = (
    rowIndex: number,
    field: keyof ParsedRow,
    value: string
  ) => {
    const rows = parseRows(editedText);
    rows[rowIndex][field] = value;
    setEditedText(
      rows
        .map(
          (row) => `|${row.original}|${row.price}|${row.pinyin}|${row.english}`
        )
        .join("\n")
    );
  };

  const handleSave = async () => {
    if (selectedHistoryId) {
      await updateVertexAiResults(userId, selectedHistoryId, editedText);
      setOcrText(editedText);
      setIsEditing(false);
    }
  };

  const handleHistorySelect = async (value: string) => {
    setSelectedHistoryId(value);
    setIsLoading(true);
    try {
      const results = await getVertexAiResults(userId, value);
      if (results && results.ocrText) {
        setOcrText(results.ocrText);
        setEditedText(results.ocrText);
      }
    } catch (error) {
      console.error("Error fetching historical results:", error);
      setError("Failed to fetch historical results.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Vertex AI Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Processing image, please wait...</p>
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Vertex AI Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!ocrText) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Vertex AI Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No OCR text available. Please try processing the image again.</p>
        </CardContent>
      </Card>
    );
  }

  const parsedRows = parseRows(isEditing ? editedText : ocrText);

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Vertex AI Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select
            onValueChange={handleHistorySelect}
            value={selectedHistoryId || undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select historical result" />
            </SelectTrigger>
            <SelectContent>
              {history.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.menuName} - {new Date(item.timestamp).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Pinyin</TableHead>
                <TableHead>English</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {(Object.keys(row) as Array<keyof ParsedRow>).map((field) => (
                    <TableCell key={field}>
                      {isEditing ? (
                        <Input
                          value={row[field]}
                          onChange={(e) =>
                            handleEdit(rowIndex, field, e.target.value)
                          }
                        />
                      ) : (
                        row[field]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-end">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="mr-2">
                Save
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditedText(ocrText);
                }}
                variant="cemta"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VertexAiResultsDisplay;
