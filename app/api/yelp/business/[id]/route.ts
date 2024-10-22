// app/api/yelp/business/[id]/route.ts

import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Yelp business ID is required" },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.YELP_API_KEY!;
    const response = await axios.get(
      `https://api.yelp.com/v3/businesses/${id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching Yelp business details:", error);
    return NextResponse.json(
      { error: "Failed to fetch Yelp business details" },
      { status: 500 }
    );
  }
}
