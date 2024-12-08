import { Star, MapPin, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Restaurant } from "@/interfaces/restaurant/types";
import { OpeningHours } from "@/interfaces/restaurant/types";

// Update the OperatingHours component props type
interface OperatingHoursProps {
  openingHours: OpeningHours | null | undefined;
}

const OperatingHours: React.FC<OperatingHoursProps> = ({ openingHours }) => {
  if (!openingHours) return null;

  // Get current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const now = new Date();
  const today = now.getDay();

  return (
    <div className="space-y-1 bg-gray-50 rounded-lg p-3">
      {/* Open/Closed Status */}
      <div className={`text-sm font-medium mb-2 ${
        openingHours.openNow ? 'text-green-600' : 'text-red-600'
      }`}>
        {openingHours.openNow ? '● Open Now' : '○ Closed'}
      </div>

      {/* Weekly Schedule */}
      {openingHours.weekdayText && (
        <div className="space-y-1">
          {openingHours.weekdayText.map((hours: string, index: number) => {
            // Convert index to match JavaScript's getDay() (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            const adjustedIndex = (index + 1) % 7; // Shift Monday (0) to 1, Sunday (6) to 0
            const isToday = adjustedIndex === today;
            const [day, time] = hours.split(': ');
            
            return (
              <div 
                key={index}
                className={`
                  flex justify-between py-1.5 px-2 rounded-md text-sm
                  ${isToday ? 'bg-customTeal/10 text-customTeal font-medium' : 'hover:bg-gray-100'}
                  transition-colors duration-200
                `}
              >
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-customTeal animate-pulse" />
                  )}
                  <span>{day}</span>
                </div>
                <span className={isToday ? 'text-customTeal' : 'text-gray-600'}>
                  {time}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Update the restaurant prop type in RestaurantDetails
interface RestaurantDetailsProps {
  restaurant: Restaurant;
  onReset: () => void;
}

export const RestaurantDetails: React.FC<RestaurantDetailsProps> = ({ 
  restaurant, 
  onReset 
}) => {
  return (
    <div className="text-center space-y-3">
      {/* Name and Rating in one line */}
      <div className="flex items-center justify-center gap-3">
        <h3 className="font-semibold text-lg text-gray-900">
          {restaurant.name}
        </h3>
        {restaurant.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
            <span className="text-gray-700">
              {restaurant.rating.toFixed(1)}
              {restaurant.priceLevel && (  // This is showing as a number instead of $ symbols
                <span className="ml-1">{restaurant.priceLevel}</span>
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Address and Google Maps Link */}
<div className="space-y-1">
  <span className="text-gray-700 text-sm block">
    {restaurant.address}
  </span>
  <a
    href={`https://www.google.com/maps/search/${encodeURIComponent(
      `${restaurant.name} ${restaurant.address} ${restaurant.county} ${restaurant.townName}`
    )}/@${restaurant.latitude},${restaurant.longitude},17z`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-customTeal hover:underline flex items-center justify-center text-sm"
  >
    <MapPin className="mr-1 h-4 w-4" />
    View on Google Maps
  </a>
</div>

      {/* Menu Count - only show if there are menus */}
      {restaurant.menuCount > 0 && (
        <div className="text-sm text-gray-600">
          Available Menus: {restaurant.menuCount}
        </div>
      )}

      {/* Opening Hours Section */}
      {restaurant.openingHours && (
        <div className="mt-2">
          <h4 className="font-semibold text-gray-800 flex items-center justify-center gap-2 mb-1 text-sm">
            <Clock className="h-4 w-4 text-customTeal" />
            Opening Hours
          </h4>
          <OperatingHours openingHours={restaurant.openingHours} />
        </div>
      )}

      {/* Reset Button */}
      <div className="pt-1">
        <Button
          onClick={onReset}
          size="sm"
          variant="ghost"
          className="text-customTeal hover:bg-customTeal/10"
        >
          Show All Restaurants
        </Button>
      </div>
    </div>
  );
};