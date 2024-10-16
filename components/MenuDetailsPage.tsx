// components/MenuDetailsPage.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  getVertexAiResults,
  updateValidationStatus,
  searchRestaurantsByName,
  updateRestaurantNameInFirestore,
  linkRestaurantToFranchise,
  getMenusByRestaurantId,
} from "@/app/services/firebaseFirestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import MenuDataDisplay from "@/components/MenuDataDisplay";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ChevronUp, ChevronDown } from "lucide-react";
import ValidationBadge from "@/app/shared/components/ValidationBadge";
import { useUser } from "@clerk/nextjs";
import MenuSearch from "@/components/MenuSearch";
import Combobox from "@/components/ui/Combobox"; // Use Combobox instead of Autocomplete
import { Input } from "@/components/ui/input"; // Import Input component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MenuData {
  menuData: {
    restaurant_info: {
      name: { original: string; english?: string };
      address?: { original: string };
      phone_number?: string;
      operating_hours?: string;
      validation_status?: "community" | "restaurant" | "validator" | "cemta";
    };
    categories: Array<{
      name: { original: string; english?: string; pinyin?: string };
      items: Array<{
        name: { original: string; english?: string; pinyin?: string };
        description?: { original?: string; english?: string };
        price?: { amount: number; currency: string };
      }>;
    }>;
    other_info?: string;
  };
  imageUrl?: string;
  timestamp?: string;
  restaurantValidated?: boolean;
  validatorValidated?: boolean;
  restaurantName?: string; // Added restaurantName
  restaurantId?: string;  
}

interface MenuSummary {
  id: string;
  menuName: string;
  timestamp: Date; // You might want to use a more specific type here, like Date or string
}

interface MenuDetailsPageProps {
  id: string;
}

const MenuDetailsPage: React.FC<MenuDetailsPageProps> = ({ id }) => {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isImageCollapsed, setIsImageCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantNameInput, setRestaurantNameInput] = useState("");
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [alert, setAlert] = useState<{
    type: "default" | "destructive";
    message: string;
    lastUpdated?: string;
  } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [associatedMenus, setAssociatedMenus] = useState<MenuSummary[]>([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [franchiseOptions, setFranchiseOptions] = useState<string[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const fetchMenuData = useCallback(
    async (menuId: string) => {
      if (!userId) return;
      try {
        setIsLoading(true);
        const data = await getVertexAiResults(userId, menuId);
        if (data) {
          const restaurantValidated = data.restaurantValidated || false;
          const validatorValidated = data.validatorValidated || false;

          let validation_status:
            | "community"
            | "restaurant"
            | "validator"
            | "cemta" = "community";
          if (restaurantValidated && validatorValidated) {
            validation_status = "cemta";
          } else if (validatorValidated) {
            validation_status = "validator";
          } else if (restaurantValidated) {
            validation_status = "restaurant";
          }

          data.menuData.restaurant_info.validation_status = validation_status;
          data.restaurantValidated = restaurantValidated;
          data.validatorValidated = validatorValidated;

          setMenuData(data as MenuData);
          setRestaurantNameInput(data.restaurantName || data.menuData.restaurant_info.name.original || "");
          setPreviewUrl(data.imageUrl || null);
        } else {
          setError("Menu data not found.");
        }
      } catch (error) {
        console.error("Error fetching menu data:", error);
        setError((error as Error).message || "Failed to fetch menu data");
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (id && userId) {
      fetchMenuData(id);
    }
  }, [id, userId, fetchMenuData]);

  useEffect(() => {
    if (menuData && menuData.menuData.restaurant_info.address?.original) {
      const address = menuData.menuData.restaurant_info.address.original;
      const geocodeAddress = async () => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            console.error("Google Maps API key not set");
            return;
          }
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
              address
            )}&key=${apiKey}`
          );
          const data = await response.json();
          if (data.status === "OK") {
            const location = data.results[0].geometry.location;
            setCoordinates({ lat: location.lat, lng: location.lng });
          } else {
            console.error("Geocoding failed:", data.status);
          }
        } catch (error) {
          console.error("Error geocoding address:", error);
        }
      };
      geocodeAddress();
    }
  }, [menuData]);

  useEffect(() => {
    if (menuData) {
      const existingRestaurantName =
        menuData.restaurantName || menuData.menuData.restaurant_info.name.original || "Unknown";
      setRestaurantNameInput(existingRestaurantName);
    }
  }, [menuData]);

  const handleReprocess = useCallback(async () => {
    if (id && userId) {
      await fetchMenuData(id);
    }
  }, [id, userId, fetchMenuData]);

  const toggleImageCollapse = () => {
    setIsImageCollapsed(!isImageCollapsed);
  };

  const handleValidateMenu = async () => {
    if (!userId) return;

    let userRoles: string[] = [];

    if (user?.publicMetadata?.roles) {
      if (Array.isArray(user.publicMetadata.roles)) {
        userRoles = user.publicMetadata.roles as string[];
      } else if (typeof user.publicMetadata.roles === "object") {
        userRoles = Object.keys(user.publicMetadata.roles);
      }
    }

    try {
      if (userRoles.includes("validator")) {
        await updateValidationStatus(id, { validatorValidated: true });
      } else if (userRoles.includes("restaurant")) {
        await updateValidationStatus(id, { restaurantValidated: true });
      } else if (userRoles.includes("admin")) {
        await updateValidationStatus(id, {
          validatorValidated: true,
          restaurantValidated: true,
        });
      } else {
        console.error("User is not authorized to validate");
        return;
      }

      await fetchMenuData(id);
    } catch (error) {
      console.error("Error updating validation status:", error);
    }
  };

const handleRestaurantNameInputChange = async (inputValue: string) => {
  setRestaurantNameInput(inputValue);
  if (inputValue && inputValue.length > 1) {
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await searchRestaurantsByName(inputValue);
      setRestaurantSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching restaurant suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  } else {
    setRestaurantSuggestions([]);
  }
};

   useEffect(() => {
    if (menuData?.restaurantId) {
      getMenusByRestaurantId(menuData.restaurantId).then(setAssociatedMenus);
    }
  }, [menuData]);

  const handleRestaurantNameChange = async () => {
    if (!restaurantNameInput.trim()) {
      setAlert({
        type: "destructive",
        message: "Restaurant name cannot be empty.",
      });
      return;
    }

    try {
      await updateRestaurantNameInFirestore(id, restaurantNameInput);
      setMenuData((prev) => {
        if (prev) {
          return {
            ...prev,
            restaurantName: restaurantNameInput,
            menuData: {
              ...prev.menuData,
              restaurant_info: {
                ...prev.menuData.restaurant_info,
                name: {
                  ...prev.menuData.restaurant_info.name,
                  original: restaurantNameInput,
                },
              },
            },
          };
        }
        return prev;
      });
      setAlert({
        type: "default",
        message: "Restaurant name updated successfully.",
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating restaurant name:", error);
      setAlert({
        type: "destructive",
        message: "Failed to update restaurant name.",
      });
    }
  };


  const handleFranchiseSearch = async (input: string) => {
    if (input.length > 1) {
      const options = await searchRestaurantsByName(input);
      setFranchiseOptions(options);
    } else {
      setFranchiseOptions([]);
    }
  };

  const handleLinkToFranchise = async () => {
    if (selectedFranchise && menuData) {
      try {
        await linkRestaurantToFranchise(id, selectedFranchise);
        setAlert({
          type: "default",
          message: "Restaurant linked to franchise successfully.",
        });
        setShowLinkDialog(false);
      } catch (error) {
        console.error("Error linking restaurant to franchise:", error);
        setAlert({
          type: "destructive",
          message: "Failed to link restaurant to franchise.",
        });
      }
    }
  };

  if (!id) {
    return <div>No menu ID provided</div>;
  }

 if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="mr-2 h-6 w-6 text-teal-500" />
        <span>Loading menu data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="p-4">
        <p>No menu data available. Please try again later.</p>
      </div>
    );
  }

  const { menuData: menu, timestamp, imageUrl } = menuData;
  const { restaurant_info } = menu;

  let userRoles: string[] = [];

  if (user?.publicMetadata?.roles) {
    if (Array.isArray(user.publicMetadata.roles)) {
      userRoles = user.publicMetadata.roles as string[];
    } else if (typeof user.publicMetadata.roles === "object") {
      userRoles = Object.keys(user.publicMetadata.roles);
    }
  }

  const isAdminOrValidator = ["admin", "validator", "restaurant"].some((role) =>
    userRoles.includes(role)
  );

  const validationStatus = restaurant_info.validation_status || "community";

  return (
    <div className="menu-details-page">
      <Card className="w-full mt-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:space-x-6">
            {/* Left Side - Image Preview */}
            <div className="w-full md:w-1/2">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>Menu Preview</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImageCollapsed(!isImageCollapsed)}
                  >
                    {isImageCollapsed ? (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" /> Show
                      </>
                    ) : (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" /> Hide
                      </>
                    )}
                  </Button>
                </CardHeader>
         {!isImageCollapsed && menuData.imageUrl && (
  <CardContent>
    <div className="flex justify-center items-center bg-gray-100 rounded-lg p-2">
      <Image
        src={menuData.imageUrl}
        alt="Menu Preview"
        width={400}
        height={600}
        style={{ objectFit: "contain" }}
        className="max-w-full h-auto max-h-[60vh]"
      />
    </div>
  </CardContent>
)}
              </Card>
            </div>

            {/* Right Side - Restaurant Info and Actions */}
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold mb-2">
                    {isEditingName ? (
                      <Combobox
                        value={restaurantNameInput}
                        onChange={setRestaurantNameInput}
                        suggestions={restaurantSuggestions}
                        onInputChange={handleRestaurantNameInputChange}
                        isLoading={isLoadingSuggestions}
                        placeholder="Enter or select a restaurant name"
                      />
                    ) : (
                      menuData.restaurantName || "Unknown"
                    )}
                  </CardTitle>
                  {validationStatus && (
                    <ValidationBadge status={validationStatus} />
                  )}
                </CardHeader>
                <CardContent>
                  {/* Restaurant Info */}
                  <div className="space-y-2 mb-4">
                    {menuData.menuData.restaurant_info.address?.original && (
                      <p className="text-gray-700">
                        <strong>Address:</strong>{" "}
                        {menuData.menuData.restaurant_info.address.original}
                      </p>
                    )}
                    {menuData.menuData.restaurant_info.phone_number && (
                      <p className="text-gray-700">
                        <strong>Phone:</strong>{" "}
                        {menuData.menuData.restaurant_info.phone_number}
                      </p>
                    )}
                    {menuData.menuData.restaurant_info.operating_hours && (
                      <p className="text-gray-700">
                        <strong>Operating Hours:</strong>{" "}
                        {menuData.menuData.restaurant_info.operating_hours}
                      </p>
                    )}
                    <p className="text-gray-600">
                      <strong>Processed on:</strong>{" "}
                      {timestamp
                        ? format(new Date(timestamp), "PPpp")
                        : "Unknown"}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {isEditingName ? (
                      <div className="flex space-x-2">
                        <Button onClick={handleRestaurantNameChange}>Save</Button>
                        <Button variant="nextButton2" onClick={() => setIsEditingName(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsEditingName(true)}>Edit Restaurant Name</Button>
                    )}
                    <Button
                      onClick={handleReprocess}
                      variant="default"
                      className="w-full"
                    >
                      Update Menu
                    </Button>
                    {isAdminOrValidator && (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleValidateMenu}
                      >
                        Validate Menu
                      </Button>
                    )}
                    <Button onClick={() => setShowLinkDialog(true)} className="w-full">
                      Link to Franchise
                    </Button>
                  </div>

                  {/* Map */}
                  {isLoaded && coordinates && (
                    <div className="mt-4">
                      <div className="h-48 w-full">
                        <GoogleMap
                          mapContainerStyle={{ width: "100%", height: "100%" }}
                          center={coordinates}
                          zoom={16}
                        >
                          <Marker position={coordinates} />
                        </GoogleMap>
                      </div>
                    </div>
                  )}

                  {/* Search Functionality */}
                  <div className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Find Other Menus</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MenuSearch />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Messages */}
              {alert && (
                <Alert variant={alert.type} className="mt-4">
                  <AlertTitle>
                    {alert.type === "default" ? "Notice" : "Error"}
                  </AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Menu Data Display */}
          <div className="w-full mt-6">
            <MenuDataDisplay
              menuData={menuData.menuData}
              menuName={`${menuData.restaurantName || menuData.menuData.restaurant_info.name.original}${
                menuData.menuData.restaurant_info.name.english
                  ? ` - ${menuData.menuData.restaurant_info.name.english}`
                  : ""
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Link to Franchise Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Franchise</DialogTitle>
            <DialogDescription>
              Search for a franchise to link this restaurant to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="franchise" className="text-right">
                Franchise
              </Label>
              <Combobox
                value={selectedFranchise}
                onChange={setSelectedFranchise}
                suggestions={franchiseOptions}
                onInputChange={handleFranchiseSearch}
                placeholder="Search for a franchise"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleLinkToFranchise}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuDetailsPage;