export interface UserPreferences {
   allergens: string[];
   dietary_restrictions: string[];
   likes_spicy: boolean;
   vegetarian: boolean;
   vegan: boolean;
   favorite_cuisines: string[];
   updatedAt?: Date;
}