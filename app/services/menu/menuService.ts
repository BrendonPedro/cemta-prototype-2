import { db } from "@/config/firebaseConfig";
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  updateDoc 
} from "firebase/firestore";
import type { 
  MenuDetails, 
  MenuData, 
  MenuSummary,
  MenuValidationStatus,
Category,
MenuItem,
  MenuItemName,
  MenuDescription
} from "./types";


export async function getMenuDetails(menuId: string): Promise<MenuDetails | null> {
  try {
    const menuRef = doc(db, "menus", menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      return null;
    }

    return {
      id: menuDoc.id,
      ...menuDoc.data()
    } as MenuDetails;
  } catch (error) {
    console.error("Error fetching menu details:", error);
    return null;
  }
}

export async function getMenusByRestaurantId(
  restaurantId: string
): Promise<MenuSummary[]> {
  try {
    const menusRef = collection(db, "menus");
    const q = query(
      menusRef, 
      where("restaurantId", "==", restaurantId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        menuName: data.menuName || "Unnamed Menu",
        imageUrl: data.imageUrl,
        timestamp: new Date(data.timestamp),
        restaurantName: data.restaurantName
      };
    });
  } catch (error) {
    console.error("Error fetching restaurant menus:", error);
    return [];
  }
}

export async function updateValidationStatus(
  menuId: string,
  status: MenuValidationStatus
): Promise<boolean> {
  try {
    const menuRef = doc(db, "menus", menuId);
    const updateData = Object.entries(status).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as { [key: string]: boolean | undefined });
    
    await updateDoc(menuRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating validation status:", error);
    return false;
  }
}

export async function getRecentMenus(userId: string): Promise<MenuSummary[]> {
  try {
    const menusRef = collection(db, "menus");
    const q = query(
      menusRef,
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        menuName: data.menuName || "Unnamed Menu",
        imageUrl: data.imageUrl,
        timestamp: new Date(data.timestamp),
        restaurantName: data.restaurantName
      };
    });
  } catch (error) {
    console.error("Error fetching recent menus:", error);
    return [];
  }
}

interface RawCategory {
  name?: {
    original: string;
    english?: string;
    pinyin?: string;
  } | string;
  items?: MenuItem[] | { [key: string]: MenuItem };
}

interface RawMenuData extends Omit<MenuData, 'categories'> {
  categories: { [key: string]: RawCategory } | Category[];
}

export function normalizeMenuData(menuData: any): MenuData {
  const normalizeMenuName = (name: string | MenuItemName | undefined): MenuItemName => {
    if (!name) return { original: '', english: '', pinyin: '' };
    if (typeof name === 'string') return { original: name, english: '', pinyin: '' };
    
    // Take only the first translation for each type
    const english = name.english?.split('\n')
      .filter(line => line.trim())[0] || '';
    const pinyin = name.pinyin?.split('\n')
      .filter(line => line.trim())[0] || '';

    return {
      original: name.original,
      english: english.trim(),
      pinyin: pinyin.trim()
    };
  };

  const normalizePrice = (price: any): MenuItem['prices'] => {
    if (!price) return undefined;
    if (typeof price === 'object' && 'amount' in price && 'currency' in price) {
      return {
        regular: String(price.amount),
        currency: String(price.currency)
      };
    }
    if (typeof price === 'string') {
      return { regular: price };
    }
    return undefined;
  };

  const normalizeDescription = (description: any): MenuDescription => {
    if (!description) {
      return { original: '', english: '' };
    }
    // Take only the first English translation if multiple exist
    if (typeof description === 'string') {
      return { original: description.trim(), english: '' };
    }
    // Clean up and deduplicate translations
    const english = description.english?.split('\n')
      .filter((line: string) => line.trim())
      .filter((line: string, index: number, self: string[]) => 
        self.indexOf(line.trim()) === index
      )[0] || '';

    return {
      original: description.original?.trim() || '',
      english: english.trim()
    };
  };

  const normalizeCategory = (category: any): Category => {
    const items = category.items || {};
    
    // Helper to check if items are related (same base item with variations)
    const areItemsRelated = (item1: any, item2: any) => {
      // If either item has no name, they're not related
      if (!item1.name?.original || !item2.name?.original) return false;

      // If they have the same name, they're related
      if (item1.name.original === item2.name.original) return true;

      // If one is a variant of the other (e.g., one has "Custom" or additional details)
      const name1 = item1.name.original.toLowerCase();
      const name2 = item2.name.original.toLowerCase();
      return name1.includes(name2) || name2.includes(name1);
    };

    // Process items, filtering out duplicates and merging related items
    const processedItems = Array.isArray(items)
      ? items
      : Object.values(items);

    const mergedItems = processedItems.reduce((acc: MenuItem[], item: any) => {
      // Find if there's a related item already in the accumulator
      const existingItemIndex = acc.findIndex(existing => areItemsRelated(existing, item));

      if (existingItemIndex >= 0) {
        // If this item has more information than the existing one, update it
        const existingItem = acc[existingItemIndex];
        if (item.description?.original && !existingItem.description?.original) {
          existingItem.description = normalizeDescription(item.description);
        }
        if (item.prices?.regular && !existingItem.prices?.regular) {
          existingItem.prices = normalizePrice(item.prices);
        }
        return acc;
      }
      
      // Add new unique items
      acc.push(normalizeMenuItem(item));
      return acc;
    }, []);

    return {
      name: normalizeMenuName(category.name),
      items: mergedItems
    };
  };

  const normalizeMenuItem = (item: any): MenuItem => ({
    name: normalizeMenuName(item.name),
    description: normalizeDescription(item.description),
    prices: normalizePrice(item.prices),
    popular: !!item.popular,
    chef_recommended: !!item.chef_recommended,
    spice_level: item.spice_level || '',
    allergy_alert: item.allergy_alert || '',
    upgrades: item.upgrades || []
  });

  return {
    restaurant_info: {
      name: normalizeMenuName(menuData.restaurant_info?.name),
      address: normalizeMenuName(menuData.restaurant_info?.address) || {
        original: '',
        english: '',
        pinyin: ''
      },
      operating_hours: menuData.restaurant_info?.operating_hours || '',
      phone_number: menuData.restaurant_info?.phone_number || '',
      website: menuData.restaurant_info?.website || '',
      social_media: menuData.restaurant_info?.social_media || '',
      description: normalizeDescription(menuData.restaurant_info?.description),
      additional_notes: menuData.restaurant_info?.additional_notes || ''
    },
    categories: Array.isArray(menuData.categories)
      ? menuData.categories.map(normalizeCategory)
      : Object.values(menuData.categories || {}).map(normalizeCategory),
    items: menuData.items || [],
    other_info: (menuData.other_info || '').trim()
  };
}

const calculateItemPrice = (item: MenuItem): number => {
  if (!item.prices) return 0;
  return parseFloat(item.prices.regular || '0');
};

const sortByPrice = (items: MenuItem[]): MenuItem[] => {
  return [...items].sort((a, b) => {
    const priceA = a.prices?.regular ? parseFloat(a.prices.regular) : 0;
    const priceB = b.prices?.regular ? parseFloat(b.prices.regular) : 0;
    return priceA - priceB;
  });
}; 