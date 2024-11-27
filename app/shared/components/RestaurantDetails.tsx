import { Star, MapPin, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/app/services/firebaseFirestore";
import { OpeningHours } from "@/lib/database-builder/types";

// Update the OperatingHours component with proper typing
const OperatingHours: React.FC<{ openingHours: OpeningHours }> = ({ openingHours }) => {
  const today = new Date().getDay();
  const daysMap: { [key: number]: string } = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
  };

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
            const isToday = index === today;
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

export const RestaurantDetails = ({ 
  restaurant, 
  onReset 
}: { 
  restaurant: Restaurant;
  onReset: () => void;
}) => {
  return (
    <div className="text-center space-y-4">
      {/* Name */}
      <h3 className="font-semibold text-lg text-gray-900">
        {restaurant.name}
      </h3>
      
      {/* Address and Google Maps Link */}
      <div className="space-y-2">
        <span className="text-gray-700 block">
          {restaurant.address}
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-customTeal hover:underline flex items-center justify-center text-sm"
        >
          <MapPin className="mr-1 h-4 w-4" />
          View on Google Maps
        </a>
      </div>

      {/* Rating */}
      {restaurant.rating > 0 && (
        <div className="flex items-center justify-center gap-1">
          <Star className="h-4 w-4 text-yellow-400" />
          <span className="text-gray-700">
            {restaurant.rating.toFixed(1)}
          </span>
        </div>
      )}

      {/* Menu Count */}
      {restaurant.menuCount > 0 && (
        <div className="text-sm text-gray-600">
          Available Menus: {restaurant.menuCount}
        </div>
      )}

      {/* Opening Hours Section */}
      <div className="mt-4">
        <h4 className="font-semibold text-gray-800 flex items-center justify-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-customTeal" />
          Opening Hours
        </h4>
        {restaurant.openingHours ? (
          <OperatingHours openingHours={restaurant.openingHours} />
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500 flex items-center justify-center gap-2">
            <Info className="h-4 w-4" />
            Operating hours not available
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="pt-2">
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