// app/api/saveVertexAiResults/route.ts

import { NextRequest, NextResponse } from "next/server";
import admin from "@/config/firebaseAdmin";
import { saveVertexAiResults } from "@/app/services/firebaseFirestore.server";

export async function POST(req: NextRequest) {
  try {
    // Log the incoming request
    console.log("Received save request");
    
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Unauthorized: Invalid header format" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      console.warn("No token found");
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Parse request body
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { menuData, menuId, restaurantId, menuName, imageUrl } = body;

    // Validate required fields
    const requiredFields = { menuData, menuId, restaurantId, menuName, imageUrl };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.warn("Missing required fields:", missingFields);
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(", ")}`,
          received: body
        },
        { status: 400 }
      );
    }

    // Extract restaurant name
    const restaurantName = menuData?.restaurant_info?.name?.original || menuName;
    console.log("Using restaurant name:", restaurantName);

    // Save the data
    try {
      await saveVertexAiResults(
        decodedToken.uid,
        menuData,
        menuId,
        restaurantId,
        menuName,
        imageUrl,
        restaurantName
      );

      console.log("Menu data saved successfully:", menuId);
      
      return NextResponse.json({
        message: "Menu data saved successfully",
        menuId,
        restaurantName
      });

    } catch (error) {
      console.error("Error in saveVertexAiResults:", error);
      return NextResponse.json(
        { 
          error: "Failed to save menu data",
          details: error instanceof Error ? error.message : "Unknown error",
          menuId 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Unhandled error in save route:", error);
    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}