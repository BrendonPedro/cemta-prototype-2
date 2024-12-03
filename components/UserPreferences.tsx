"use client";

import { useState, useEffect } from "react";
import { UserPreferences } from "@/interfaces/users/user-preferences";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/AuthProvider";

export default function PreferencesForm() {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<UserPreferences>({
    defaultValues: {
      allergens: [],
      dietary_restrictions: [],
      likes_spicy: false,
      vegetarian: false,
      vegan: false,
      favorite_cuisines: []
    }
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/preferences', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load preferences');
        }

        const preferences = await response.json();
        console.log('Loaded preferences:', preferences);
        
        form.reset({
          allergens: preferences.allergens || [],
          dietary_restrictions: preferences.dietary_restrictions || [],
          likes_spicy: Boolean(preferences.likes_spicy),
          vegetarian: Boolean(preferences.vegetarian),
          vegan: Boolean(preferences.vegan),
          favorite_cuisines: preferences.favorite_cuisines || []
        });
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            ...data,
            likes_spicy: Boolean(data.likes_spicy),
            vegetarian: Boolean(data.vegetarian),
            vegan: Boolean(data.vegan)
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast({
        title: "Preferences saved successfully",
      });

      const updatedResponse = await fetch('/api/preferences');
      if (updatedResponse.ok) {
        const updatedPreferences = await updatedResponse.json();
        form.reset(updatedPreferences);
      }
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="likes_spicy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer flex-1">
                  Likes Spicy Food
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vegetarian"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer flex-1">
                  Vegetarian
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vegan"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer flex-1">
                  Vegan
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormMessage />
        
        <Button 
          variant="ghostOutline" 
          className="w-full py-6 text-lg font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </Form>
  );
}

