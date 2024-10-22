// app/api/process-menu-image/route.ts
import { NextResponse } from "next/server";
import admin from "@/config/firebaseAdmin";
import { uploadImageToBucket } from "@/app/services/gcpBucketStorage";
import { saveVertexAiResults } from "@/app/services/firebaseFirestore.server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { restaurantId, restaurantName, menuImageUrl, yelpBusinessId } = await request.json();

    // Download the Yelp image
    const imageResponse = await axios.get(menuImageUrl, {
      responseType: 'arraybuffer'
    });

    // Upload to your GCP bucket
    const fileName = `${restaurantId}_menu_${Date.now()}.jpg`;
    const storedImageUrl = await uploadImageToBucket(
      fileName,
      Buffer.from(imageResponse.data),
      'image/jpeg'
    );

    // Create initial menu data structure
    const menuData = {
      restaurant_info: {
        name: { 
          original: restaurantName, 
          english: restaurantName 
        },
        yelp_id: yelpBusinessId, // Store Yelp ID for future reference
      },
      categories: [],
      source: 'yelp'
    };

    // Save to Firestore using your existing function
    const menuId = await saveVertexAiResults(
      decodedToken.uid,
      menuData,
      restaurantId,
      restaurantId,
      `${restaurantName} Menu`,
      storedImageUrl,
      restaurantName
    );

    return NextResponse.json({ 
      success: true, 
      menuId,
      imageUrl: storedImageUrl 
    });

  } catch (error) {
    console.error("Error processing menu image:", error);
    return NextResponse.json(
      { error: "Failed to process menu image" },
      { status: 500 }
    );
  }
}