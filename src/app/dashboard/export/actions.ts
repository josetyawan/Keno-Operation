
'use server';

import htmlToDocx from 'html-to-docx';

// Helper function to fetch an image and convert it to a base64 data URI
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`, url);
      return null;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
}


// This function will run on the server and has access to Node.js modules.
export async function generateDocxAction(htmlString: string, documentOptions: any): Promise<string> {
    // Find all image URLs in the HTML string
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const imageUrls = [...htmlString.matchAll(imgRegex)].map(match => match[1]);
    const uniqueImageUrls = [...new Set(imageUrls)].filter(url => url && url.startsWith('https://firebasestorage.googleapis.com'));

    // Create a map of URL to its base64 representation
    const urlToBase64Map = new Map<string, string>();
    const conversionPromises = uniqueImageUrls.map(async (url) => {
        const dataUri = await imageToBase64(url);
        if (dataUri) {
            urlToBase64Map.set(url, dataUri);
        }
    });

    await Promise.all(conversionPromises);

    // Replace all image URLs in the HTML with their base64 data URI
    let htmlWithEmbeddedImages = htmlString;
    urlToBase64Map.forEach((base64, url) => {
        // Use a more specific regex for replacement to avoid replacing parts of other attributes or encoded URLs
        const regex = new RegExp(`src="${url}"`, 'g');
        htmlWithEmbeddedImages = htmlWithEmbeddedImages.replace(regex, `src="${base64}"`);
    });

    const fileBuffer = await htmlToDocx(htmlWithEmbeddedImages, undefined, documentOptions, undefined);
    
    // On the server, htmlToDocx is expected to return a Buffer.
    if (Buffer.isBuffer(fileBuffer)) {
        return fileBuffer.toString('base64');
    }
    
    // This part is a fallback, though it shouldn't be reached in a server environment.
    // If it returns a Blob, we need to read it as a buffer.
    const arrayBuffer = await (fileBuffer as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}
