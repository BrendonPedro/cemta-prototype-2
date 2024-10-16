import { MapboxType } from "@/types";

const transformRestaurantData = (result: MapboxType) => {
  return {
    id: result.id,
    address: result.properties?.address || "",
    name: result.text,
    imgUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  };
};

export const fetchRestaurantPartners = async () => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/restaurant.json?limit=6&proximity=ip&access_token=${process.env.MAPBOX_API}`,
    );
    const data = await response.json();

    return data.features.map((result: MapboxType) =>
      transformRestaurantData(result),
    );
  } catch (error) {
    console.error("Error while fetching restaurants", error);
  }
};

export const fetchRestaurantPartner = async (id: string, queryId: string) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${id}.json?proximity=ip&access_token=${process.env.MAPBOX_API}`,
    );
    const data = await response.json();
    // const photos = await getListOfRestaurantPhotos();

    const restaurantPartner = data.features.map(
      (result: MapboxType, idx: number) =>
        transformRestaurantData(parseInt(queryId), result, photos),
    );
    return restaurantPartner.length > 0 ? restaurantPartner[0] : {};
  } catch (error) {
    console.error("Error while fetching restaurants", error);
  }
};

// import { MapboxType } from '@/types';

// const getListOfRestaurantPhotos = async () => {
//   try {
//     const response = await fetch(
//       `https://api.unsplash.com/search/photos/?client_id=${process.env.UNSPLASH_ACCESS_KEY}&query="coffee shop"&page=1&perPage=10&orientation=landscape`
//     );
//     const photos = await response.json();
//     const results = photos?.results || [];
//     return results?.map((result: { urls: any }) => result.urls['small']);
//   } catch (error) {
//     console.error('Error retrieving a photo', error);
//   }
// };

// const transformRestaurantData = (
//   idx: number,
//   result: MapboxType,
//   photos: Array<string>
// ) => {
//   return {
//     id: result.id,
//     address: result.properties?.address || '',
//     name: result.text,
//     imgUrl: photos.length > 0 ? photos[idx] : '',
//   };
// };

// export const fetchRestaurantPartners = async (longLat: string, limit: number) => {
//   try {
//     const response = await fetch(
//       `https://api.mapbox.com/geocoding/v5/mapbox.places/coffee.json?limit=${limit}&proximity=${longLat}&access_token=${process.env.MAPBOX_API}`
//     );
//     const data = await response.json();
//     const photos = await getListOfRestaurantPhotos();

//     return data.features.map((result: MapboxType, idx: number) =>
//       transformRestaurantData(idx, result, photos)
//     );
//   } catch (error) {
//     console.error('Error while fetching coffee stores', error);
//   }
// };

// export const fetchRestaurantPartner = async (id: string, queryId: string) => {
//   try {
//     const response = await fetch(
//       `https://api.mapbox.com/geocoding/v5/mapbox.places/${id}.json?proximity=ip&access_token=${process.env.MAPBOX_API}`
//     );
//     const data = await response.json();
//     const photos = await getListOfRestaurantPhotos();

//     const restaurantPartner = data.features.map((result: MapboxType, idx: number) =>
//       transformRestaurantData(parseInt(queryId), result, photos)
//     );
//     return restaurantPartner.length > 0 ? restaurantPartner[0] : {};
//   } catch (error) {
//     console.error('Error while fetching restaurants', error);
//   }
// };
