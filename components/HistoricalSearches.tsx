// app/(marketing)/cemtaTeam/menuAnalyzer/HistoricalSearches.tsx

import React from "react";

const HistoricalSearches = () => {
  // This is a placeholder. You'll need to implement the logic to fetch and display
  // the user's top ten historical searches.
  const historicalSearches = [
    { id: 1, restaurantName: "Restaurant A", score: 85 },
    { id: 2, restaurantName: "Restaurant B", score: 92 },
    // ... more items
  ];

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Historical Searches</h2>
      <ul className="space-y-2">
        {historicalSearches.map((search) => (
          <li key={search.id} className="bg-gray-100 p-2 rounded">
            <span className="font-medium">{search.restaurantName}</span>
            <span className="ml-2 text-sm text-gray-600">
              Score: {search.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoricalSearches;
