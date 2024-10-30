"use client";

import React, { useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const MapComponent = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
    });

    loader.load().then(() => {
      const google = window.google;
      const map = new google.maps.Map(
        document.getElementById("map") as HTMLElement,
        {
          center: { lat: -34.397, lng: 150.644 },
          zoom: 8,
        },
      );
      setMap(map);
    });
  }, []);

  return <div id="map" style={{ width: "100%", height: "500px" }} />;
};

export default MapComponent;
