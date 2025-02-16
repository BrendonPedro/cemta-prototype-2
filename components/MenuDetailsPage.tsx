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
import { ChevronUp, ChevronDown, MapPin, Phone, Clock, Globe } from "lucide-react";
import ValidationBadge from "@/app/shared/components/ValidationBadge";
import { useUser } from "@clerk/nextjs";
import MenuSearch from "@/components/MenuSearch";
import Combobox from "@/components/ui/Combobox"; // Use Combobox instead of Autocomplete
import { Input } from "@/components/ui/input"; // Import Input component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { googleMapsConfig } from '@/config/googleMapsConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { 
  MenuData, 
  MenuDetails, 
  MenuSummary,
  MenuItemName,
  MenuDescription,
} from "@/app/services/menu/types";

interface RawMenuItem {
  name: MenuItemName;
  description?: MenuDescription;
  prices?: {
    regular?: string;
    small?: string;
    medium?: string;
    large?: string;
    xl?: string;
  };
}

interface MenuDetailsPageProps {
  id: string;
}

interface MenuDetailsState {
  menuData: MenuDetails | null;
  coordinates: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;
  isImageCollapsed: boolean;
  restaurantNameInput: string;
  restaurantSuggestions: string[];
  isLoadingSuggestions: boolean;
  alert: {
    type: "default" | "destructive";
    message: string;
    lastUpdated?: string;
  } | null;
  isEditingName: boolean;
  associatedMenus: MenuSummary[];
  showLinkDialog: boolean;
  franchiseOptions: string[];
  selectedFranchise: string;
  previewUrl: string | null;
  signedImageUrl: string | null;
  imageError: boolean;
  isDetailsCollapsed: boolean;
  showPreview: boolean;
  activeTab: string;
}

const MenuDetailsPage: React.FC<MenuDetailsPageProps> = ({ id }) => {
  const router = useRouter();
  const { userId, firebaseToken } = useAuth();
  const { user } = useUser();
  const [menuData, setMenuData] = useState<MenuDetails | null>(null);
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
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const { isLoaded } = useJsApiLoader(googleMapsConfig);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("menu");

  // Define fetchSignedUrl function
  const fetchSignedUrl = useCallback(
    async (imageUrl: string) => {
      if (!firebaseToken || !imageUrl) return;
      try {
        const response = await fetch(
          `/api/get-signed-url?filePath=${encodeURIComponent(imageUrl)}`,
          {
            headers: {
              Authorization: `Bearer ${firebaseToken}`,
            },
          }
        );
        if (response.ok) {
          const { signedUrl } = await response.json();
          setSignedImageUrl(signedUrl);
          setImageError(false); // Reset error state if successful
        } else {
          console.error("Failed to fetch signed URL");
          setSignedImageUrl(imageUrl); // Fallback to original URL
          setImageError(false); // We'll still try to load the image
        }
      } catch (error) {
        console.error("Error fetching signed URL:", error);
        setSignedImageUrl(imageUrl); // Fallback to original URL
        setImageError(false); // We'll still try to load the image
      }
    },
    [firebaseToken]
  );
  
  // useEffect for fetching the signed URL
  useEffect(() => {
    if (menuData?.imageUrl) {
      fetchSignedUrl(menuData.imageUrl);
    }
  }, [menuData, fetchSignedUrl]);

  const fetchMenuData = useCallback(async (menuId: string) => {
      if (!userId) return;

        setIsLoading(true);
    setError(null);

    try {
      const result = await getVertexAiResults(userId, menuId);
      if (result) {
        const menuDetails: MenuDetails = {
          id: menuId,
          userId: userId,
          menuId: menuId,
          restaurantId: result.restaurantId || menuId,
          menuName: result.restaurantName || 'Untitled Menu',
          menuData: {
            restaurant_info: {
              ...result.menuData.restaurant_info,
              address: result.menuData.restaurant_info.address || {
                original: '',
                english: '',
                pinyin: ''
              },
              description: {
                original: result.menuData.restaurant_info.description?.original || '',
                english: result.menuData.restaurant_info.description?.english || ''
              }
            },
            categories: result.menuData.categories.map(category => ({
              ...category,
              items: Array.isArray(category.items) 
                ? category.items.map((item: RawMenuItem) => ({
                    ...item,
                    prices: item.prices || { regular: '' },
                    description: item.description || { original: '', english: '' }
                  }))
                : Object.values(category.items as Record<string, RawMenuItem>).map(item => ({
                    ...item,
                    prices: item.prices || { regular: '' },
                    description: item.description || { original: '', english: '' }
                  }))
            })),
            items: result.menuData.items || [],
            other_info: (result.menuData.other_info || '').trim()
          },
          timestamp: result.timestamp || new Date().toISOString(),
          ...(result.imageUrl && { imageUrl: result.imageUrl }),
          restaurantName: result.restaurantName,
          restaurantValidated: result.restaurantValidated,
          validatorValidated: result.validatorValidated
        };

        setMenuData(menuDetails);
        setRestaurantNameInput(result.restaurantName || result.menuData?.restaurant_info?.name?.original || '');
        setPreviewUrl(result.imageUrl || null);

        // Set coordinates if address is available
        if (result.menuData?.restaurant_info?.address?.original) {
          const address = result.menuData.restaurant_info.address.original;
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
      } else {
        setError("No menu data found");
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      setError("Failed to fetch menu data");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (id && userId) {
      fetchMenuData(id);
    }
  }, [id, userId, fetchMenuData]);

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

  const fetchAssociatedMenus = useCallback(async () => {
    if (!menuData?.restaurantId) return;
    
    try {
      const menus = await getMenusByRestaurantId(menuData.restaurantId);
      setAssociatedMenus(menus.map(menu => ({
        ...menu,
        menuName: typeof menu.menuName === 'string' 
          ? menu.menuName 
          : `${menu.menuName.original}${menu.menuName.english ? ` - ${menu.menuName.english}` : ''}`
      })));
    } catch (error) {
      console.error("Error fetching associated menus:", error);
    }
  }, [menuData?.restaurantId]);

  useEffect(() => {
    if (menuData?.restaurantId) {
      fetchAssociatedMenus();
    }
  }, [menuData, fetchAssociatedMenus]);

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


  // Handle image updates
  const handleImageUpdate = (newImageUrl: string) => {
    setMenuData(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
    fetchSignedUrl(newImageUrl);
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

  // Helper function to handle name fields
  const getName = (name: MenuItemName | string): MenuItemName => {
    if (typeof name === 'string') {
      return { original: name, english: '', pinyin: '' };
    }
    return name;
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

  const handleValidationUpdate = async (status: boolean) => {
    if (!menuData?.id) return;

    try {
      await updateValidationStatus(menuData.id, {
        restaurantValidated: status
      });
      setMenuData(prev => prev ? {
        ...prev,
        restaurantValidated: status
      } : null);
      setAlert({
        type: "default",
        message: `Menu ${status ? "validated" : "unvalidated"} successfully`,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      setAlert({
        type: "destructive",
        message: "Failed to update validation status"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Find Other Menus</CardTitle>
        </CardHeader>
        <CardContent>
          <MenuSearch />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Menu Preview */}
        <Card className="lg:sticky lg:top-4 h-fit">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Menu Preview</CardTitle>
          <Button
              variant="ghost"
            size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Preview
              </>
            ) : (
              <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Preview
              </>
            )}
          </Button>
        </CardHeader>
          {showPreview && imageUrl && (
        <CardContent>
              <div className="relative w-full h-[calc(100vh-300px)] min-h-[500px]">
                <Image
                  src={signedImageUrl || imageUrl}
                  alt="Menu Preview"
                  fill
                  className="object-contain rounded-lg"
                  onError={() => setImageError(true)}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Right Column - Menu Data Display */}
                <Card>
                  <CardHeader>
            <CardTitle>Menu Analysis</CardTitle>
            {validationStatus && <ValidationBadge status={validationStatus} />}
                  </CardHeader>
                  <CardContent>
            <Tabs defaultValue="menu" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="menu">Menu Items</TabsTrigger>
                <TabsTrigger value="restaurant">Restaurant Info</TabsTrigger>
                <TabsTrigger value="additional">Additional Info</TabsTrigger>
              </TabsList>

              <TabsContent value="menu" className="mt-4">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <MenuDataDisplay
                    menuData={menuData?.menuData}
                    menuName={`${
                      menuData?.restaurantName ||
                      getName(menuData?.menuData.restaurant_info.name).original
                    }${
                      getName(menuData?.menuData.restaurant_info.name).english
                        ? ` - ${getName(menuData?.menuData.restaurant_info.name).english}`
                        : ""
                    }`}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="restaurant" className="mt-4">
                <div className="space-y-4">
                  {restaurant_info.name && (
                    <div className="flex items-start space-x-2">
                      <Globe className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{getName(restaurant_info.name).original}</div>
                        {getName(restaurant_info.name).english && (
                          <div className="text-sm text-muted-foreground">
                            {getName(restaurant_info.name).english}
                          </div>
                        )}
                      </div>
                      </div>
                    )}

                  {restaurant_info.address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{restaurant_info.address.original}</div>
                        {restaurant_info.address.english && (
                          <div className="text-sm text-muted-foreground">
                            {restaurant_info.address.english}
              </div>
                        )}
                      </div>
                    </div>
                  )}

                  {restaurant_info.phone_number && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{restaurant_info.phone_number}</span>
                    </div>
                  )}

                  {restaurant_info.operating_hours && (
                    <div className="flex items-start space-x-2">
                      <Clock className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div className="whitespace-pre-line">
                        {restaurant_info.operating_hours}
                        </div>
                    </div>
                  )}

                    {/* Map */}
                    {isLoaded && coordinates && (
                    <div className="mt-4 h-[300px] w-full rounded-lg overflow-hidden">
                          <GoogleMap
                            mapContainerStyle={{
                              width: "100%",
                              height: "100%",
                            }}
                            center={coordinates}
                            zoom={16}
                          >
                            <Marker position={coordinates} />
                          </GoogleMap>
                        </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="additional" className="mt-4">
                <div className="space-y-4">
                  {restaurant_info.description?.original && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground">
                        {restaurant_info.description.original}
                        {restaurant_info.description.english && (
                          <span className="block mt-1 text-sm">
                            {restaurant_info.description.english}
                          </span>
                        )}
                      </p>
                      </div>
                    )}
                  {restaurant_info.additional_notes && (
                    <div>
                      <h3 className="font-medium mb-2">Additional Notes</h3>
                      <p className="text-muted-foreground">
                        {restaurant_info.additional_notes}
                      </p>
                    </div>
                )}
              </div>
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      </div>

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
}

export default MenuDetailsPage;