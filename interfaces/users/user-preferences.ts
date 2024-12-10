// interfaces/users/user-preferences.ts

// TODO: Add a field for the user's dietary preferences

export interface UserPreferences {
  allergens: string[];
  dietary_restrictions: string[];
  spice_level: 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
  vegetarian: boolean;
  vegan: boolean;
  favorite_cuisines: string[];
  no_onions?: boolean;
  no_garlic?: boolean;
  low_sodium?: boolean;
  preferred_protein?: string;
  meal_size_preference?: string;
  updatedAt?: Date | null;
}