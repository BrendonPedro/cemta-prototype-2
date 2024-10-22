// components/ui/menu-warning-dialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";

interface MenuWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantId: string;
}

export function MenuWarningDialog({
  isOpen,
  onClose,
  restaurantName,
  restaurantId,
}: MenuWarningDialogProps) {
  const router = useRouter();

  const handleUpload = () => {
    router.push(
      `/upload-menu?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(
        restaurantName
      )}`
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>No Menu Found</AlertDialogTitle>
          <AlertDialogDescription>
            We could not find a menu for {restaurantName} in our sources. Would
            you like to upload one? Your contribution will help other users find
            menus for this restaurant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Menu
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
