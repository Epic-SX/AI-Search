import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API route to proxy image requests to bypass CORS issues
 * Usage: /api/proxy-image?url=https://example.com/image.jpg
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    // If no URL is provided, return an error
    if (!url) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }
    
    // Log the request
    console.log(`Proxying image request for: ${url}`);
    
    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.amazon.com/',
      },
    });
    
    // If the fetch failed, return an error
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }
    
    // Get the image data
    const imageData = await response.arrayBuffer();
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Return the image with the appropriate content type
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Error proxying image', { status: 500 });
  }
} 