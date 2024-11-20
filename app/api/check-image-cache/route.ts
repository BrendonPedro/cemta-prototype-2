// app/api/check-image-cache/route.ts

import { NextRequest, NextResponse } from "next/server";
import admin from "@/config/firebaseAdmin";
import { getCachedImageUrl } from "@/app/services/firebaseFirestore";

export async function POST(req: NextRequest) {
  console.log("check-image-cache API route hit");
  
  try {
    // 1. Improved Authentication Check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("Missing or invalid authorization header");
      return NextResponse.json(
        { message: "Unauthorized - Invalid header format" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      console.warn("No token found in authorization header");
      return NextResponse.json(
        { message: "Unauthorized - Token missing" },
        { status: 401 }
      );
    }

    // 2. Token Verification with Better Error Handling
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 3. Request Body Parsing with Error Handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return NextResponse.json(
        { message: "Invalid request body - JSON parsing failed" },
        { status: 400 }
      );
    }

    // 4. Improved Input Validation
    const { fileName } = body;
    if (!fileName || typeof fileName !== 'string') {
      console.warn("Invalid or missing fileName in request:", body);
      return NextResponse.json(
        { 
          message: "Bad Request - fileName is required and must be a string",
          received: body 
        },
        { status: 400 }
      );
    }

    // 5. Cache Check with Error Handling
    try {
      const cachedUrl = await getCachedImageUrl(decodedToken.uid, fileName);
      
      if (cachedUrl) {
        console.log("Cache hit for fileName:", fileName);
        return NextResponse.json({
          exists: true,
          url: cachedUrl,
          fileName: fileName
        });
      }

      console.log("Cache miss for fileName:", fileName);
      return NextResponse.json({
        exists: false,
        fileName: fileName
      });

    } catch (error) {
      console.error("Error checking cache:", error);
      return NextResponse.json(
        { message: "Failed to check image cache" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Unhandled error in check-image-cache API route:", error);
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}