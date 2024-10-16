"use client";

import React, { useState, useEffect } from "react";

const RestaurantList = ({ restaurants }: { restaurants: any[] }) => {
  return (
    <div>
      <h2>Nearby Restaurants</h2>
      <ul>
        {restaurants.map((restaurant, index) => (
          <li key={index}>
            <a href={`/restaurants/${restaurant.id}`}>{restaurant.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RestaurantList;
