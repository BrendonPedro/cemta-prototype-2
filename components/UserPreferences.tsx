// components/UserPreferences.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPreferences } from "@/interfaces/users/user-preferences";

const ALLERGENS = [
  { id: "peanuts", label: "Peanuts" },
  { id: "tree_nuts", label: "Tree Nuts" },
  { id: "dairy", label: "Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "soy", label: "Soy" },
  { id: "wheat", label: "Wheat" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "sesame", label: "Sesame" }
] as const;

const DIETARY_RESTRICTIONS = [
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten_free", label: "Gluten-Free" },
  { id: "lactose_free", label: "Lactose-Free" },
  { id: "low_carb", label: "Low Carb" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" }
] as const;

const CUISINES = [
  "Italian",
  "Japanese",
  "Chinese",
  "Mexican",
  "Indian",
  "Thai",
  "Mediterranean",
  "French",
  "Korean",
  "American",
  "Greek",
  "Spanish",
  "Caribbean",
  "African",
  "Indonesian",
  "Vietnamese",
  "Russian",
] as const;

const SPICE_LEVELS = [
  { id: "none" as const, label: "No Spice" },
  { id: "mild" as const, label: "Mild" },
  { id: "medium" as const, label: "Medium" },
  { id: "hot" as const, label: "Hot" },
  { id: "extra_hot" as const, label: "Extra Hot" }
];

const DEFAULT_PREFERENCES: UserPreferences = {
  allergens: [],
  dietary_restrictions: [],
  spice_level: "medium",
  vegetarian: false,
  vegan: false,
  favorite_cuisines: [],
  no_onions: false,
  no_garlic: false,
  low_sodium: false,
  preferred_protein: "any",
  meal_size_preference: "regular"
};

export default function PreferencesForm() {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<UserPreferences>({
    defaultValues: DEFAULT_PREFERENCES
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) throw new Error('Failed to load preferences');
        const preferences = await response.json();
        form.reset(preferences);
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast({
          title: "Error loading preferences",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [userId, form, toast]);

  const onSubmit = async (data: UserPreferences) => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: data }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      toast({
        title: "Preferences saved successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading preferences...</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="allergies" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="dietary">Dietary</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="cuisines">Cuisines</TabsTrigger>
          </TabsList>

          <TabsContent value="allergies" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Allergies & Intolerances</h3>
              <div className="grid grid-cols-2 gap-4">
                {ALLERGENS.map((allergen) => (
                  <FormField
                    key={allergen.id}
                    control={form.control}
                    name="allergens"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(allergen.id)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...(field.value || []), allergen.id]
                                : (field.value || []).filter((value) => value !== allergen.id);
                              field.onChange(newValue);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{allergen.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dietary" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Dietary Restrictions</h3>
              <div className="grid grid-cols-2 gap-4">
                {DIETARY_RESTRICTIONS.map((restriction) => (
                  <FormField
                    key={restriction.id}
                    control={form.control}
                    name="dietary_restrictions"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(restriction.id)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...(field.value || []), restriction.id]
                                : (field.value || []).filter((value) => value !== restriction.id);
                              field.onChange(newValue);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{restriction.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Food Preferences</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="spice_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spice Level Preference</FormLabel>
                      <div className="flex gap-4 mt-2">
                        {SPICE_LEVELS.map((level) => (
                          <FormControl key={level.id}>
                            <div
                              className={`cursor-pointer p-2 rounded-lg border ${
                                field.value === level.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background'
                              }`}
                              onClick={() => field.onChange(level.id)}
                            >
                              {level.label}
                            </div>
                          </FormControl>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vegetarian"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Vegetarian</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vegan"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Vegan</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cuisines" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Favorite Cuisines</h3>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((cuisine) => (
                  <FormField
                    key={cuisine}
                    control={form.control}
                    name="favorite_cuisines"
                    render={({ field }) => (
                      <Badge
                        variant={field.value?.includes(cuisine) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newValue = field.value?.includes(cuisine)
                            ? (field.value || []).filter((value) => value !== cuisine)
                            : [...(field.value || []), cuisine];
                          field.onChange(newValue);
                        }}
                      >
                        {cuisine}
                      </Badge>
                    )}
                  />
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Button 
          type="submit"
          className="w-full py-6 text-lg font-semibold rounded-xl"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </Form>
  );
}