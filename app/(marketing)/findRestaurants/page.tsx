import RestaurantPartner_Banner from "@/app/(marketing)/findRestaurants/components/rp_banner.client";
import RestaurantPartner_Card from "@/app/(marketing)/findRestaurants/components/rp_card.server";
import { fetchRestaurantPartners } from "@/app/(marketing)/findRestaurants/lib/restaurants";
import NearbyRestaurantPartners from "@/app/(marketing)/findRestaurants/components/nearby-restaurants.client";
import { RestaurantPartnerType } from "@/types";

async function getData() {
  //mapbox api
  return await fetchRestaurantPartners();
}

export default async function Home() {
  const restaurantPartners = await getData();

  // const restaurantPartnerId = "partner-restaurant";
  // const restaurantPartners = [
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  //   {
  //     name: "Partner Restaurant",
  //     imgUrl: "/static/cemta1.jpeg",
  //   },
  // ];

  return (
    <div className="mb-56 ">
      <main className="mx-auto mt-10 max-w-6xl px-4">
        <NearbyRestaurantPartners />
        <div className="mt-20">
          <h2 className="mt-8 pb-8 text-3xl font-bold text-black">
            Restaurant Partners
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-3 lg:gap-6">
            {restaurantPartners.map(
              (restaurantPartner: RestaurantPartnerType, idx: number) => (
                <RestaurantPartner_Card
                  key={`${restaurantPartner.name}-${restaurantPartner.id}`}
                  name={restaurantPartner.name}
                  imgUrl={restaurantPartner.imgUrl}
                  href={`/findRestaurants/restaurant/${restaurantPartner.id}?id=${idx}`}
                />
              ),
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
