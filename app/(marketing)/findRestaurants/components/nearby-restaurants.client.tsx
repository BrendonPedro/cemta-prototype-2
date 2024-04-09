'use client'

import RestaurantPartner_Banner from "@/app/(marketing)/findRestaurants/components/rp_banner.client";
import useTrackLocation from "../hooks/use-track-location";
import RestaurantPartner_Card from "./rp_card.server";
import { RestaurantPartnerType } from "@/types";

export default function NearbyRestaurantPartners() {
    const { handleTrackLocation, isFindingLocation, longLat, locationErrorMsg } = useTrackLocation();
    
    const handleOnClick = () => {
        handleTrackLocation();
    };
    
    return (
      <div>
        <RestaurantPartner_Banner
          handleOnClick={handleOnClick}
          buttonText={
            isFindingLocation ? "Locating" : "View restuarants nearby"
          }
        />
        {locationErrorMsg && <p>Error: {locationErrorMsg}</p>}

        <div className="mt-20">
          <h2 className="mt-8 pb-8 text-3xl font-bold text-black">
            Restaurants Near Me 🍽
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-3 lg:gap-6">
            {[].map((restaurantPartner: RestaurantPartnerType, idx: number) => (
              <RestaurantPartner_Card
                key={`${restaurantPartner.name}-${restaurantPartner.id}`}
                name={restaurantPartner.name}
                imgUrl={restaurantPartner.imgUrl}
                href={`/findRestaurants/restaurant/${restaurantPartner.id}?id=${idx}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
}
