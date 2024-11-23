import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/app/services/firebaseFirestore";

export const RestaurantDetails = ({ 
  restaurant, 
  onReset 
}: { 
  restaurant: Restaurant;
  onReset: () => void;
}) => {
  return (
    <div className="text-center space-y-2">
      <h3 className="font-semibold text-lg text-gray-900">
        {restaurant.name}
      </h3>
      <span className="text-gray-700 block">
        Address: {restaurant.address}
      </span>

      {restaurant.openingHours && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-800">Opening Hours</h4>
          <div className="p-2 bg-gray-50 rounded-lg mt-2">
            {restaurant.openingHours.openNow !== undefined && (
              <div className={`text-sm font-medium ${
                restaurant.openingHours.openNow ? 'text-green-600' : 'text-red-600'
              }`}>
                {restaurant.openingHours.openNow ? 'Open Now' : 'Closed'}
              </div>
            )}
            
            {restaurant.openingHours.weekdayText && (
              <div className="mt-2 text-sm text-left">
                {restaurant.openingHours.weekdayText.map((hours, index) => (
                  <div 
                    key={index}
                    className="py-1 border-b last:border-b-0 border-gray-200"
                  >
                    {hours}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {restaurant.rating > 0 && (
        <div className="flex items-center justify-center gap-1">
          <Star className="h-4 w-4 text-yellow-400" />
          <span className="text-gray-700">
            {restaurant.rating.toFixed(1)}
          </span>
        </div>
      )}

      {restaurant.menuCount > 0 && (
        <div className="text-sm text-gray-600">
          Available Menus: {restaurant.menuCount}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-customTeal hover:underline flex items-center justify-center"
        >
          <MapPin className="mr-1 h-4 w-4" />
          View on Google Maps
        </a>
        <Button
          onClick={onReset}
          size="sm"
          className="w-auto mt-2 text-customTeal hover:bg-customTeal/10"
        >
          Show All Restaurants
        </Button>
      </div>
    </div>
  );
};