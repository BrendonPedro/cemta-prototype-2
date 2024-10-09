import { NextRequest, NextResponse } from 'next/server';
import { getMenuDetails, saveVertexAiResults } from '@/app/services/firebaseFirestore';
import { POST as vertexAiPost } from '../vertex-ai/route';

export async function POST(request: NextRequest) {
  const { menuId } = await request.json();

  try {
    const menuDetails = await getMenuDetails(menuId);
    
    if (!menuDetails) {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }

    // Create a new request object with the necessary data for Vertex AI processing
    const vertexAIRequest = new Request(request.url, {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: menuDetails.imageUrl,
        userId: menuDetails.userId,
        menuName: menuId,
        forceReprocess: true // Add this if you always want to reprocess
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Process the menu using the Vertex AI route
const vertexAIResponse = await vertexAiPost(vertexAIRequest as unknown as NextRequest);
    const vertexAIResult = await vertexAIResponse.json();

    if (!vertexAIResponse.ok) {
      throw new Error(vertexAIResult.error || 'Failed to process with Vertex AI');
    }

    // Update the menu data in Firestore
    const updatedProcessingId = await saveVertexAiResults(
      menuDetails.userId,
      vertexAIResult.menuData,
      menuId,
      vertexAIResult.menuData.restaurant_info?.name?.original || 'Unknown Restaurant'
    );

    return NextResponse.json({
      success: true,
      data: vertexAIResult.menuData,
      processingId: updatedProcessingId,
    });
  } catch (error) {
    console.error('Error reprocessing menu:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reprocess menu'
    }, { status: 500 });
  }
}