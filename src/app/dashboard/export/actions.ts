
'use server';

import { JSDOM } from 'jsdom';

/**
 * Fetches an image from a URL and converts it to a base64 data URI.
 * This is run on the server, so it can bypass CORS issues.
 */
async function imageToDataURI(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Gagal mengambil gambar: ${response.statusText} untuk URL: ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
}


export async function generateDocxAction(htmlString: string, documentOptions: any): Promise<string> {
    // Dynamically import the library INSIDE the server action.
    const htmlToDocx = (await import('html-to-docx')).default;

    // Use JSDOM to parse the HTML string on the server
    const dom = new JSDOM(htmlString);
    const document = dom.window.document;
    const images = Array.from(document.getElementsByTagName('img'));

    // Create an array of promises for fetching and converting images
    const imageProcessingPromises = images.map(async (img) => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('https://')) {
            try {
                // Fetch the image and convert it to a base64 data URI
                const dataUri = await imageToDataURI(src);
                // Replace the original source with the embedded data URI
                img.setAttribute('src', dataUri);
            } catch (error) {
                console.error(`Gagal memproses gambar ${src}:`, error);
                // If an image fails, we will simply remove it to prevent a broken document.
                img.remove();
            }
        }
    });

    // Wait for all image processing to complete
    await Promise.all(imageProcessingPromises);

    // Get the modified HTML string with embedded images
    const processedHtmlString = dom.serialize();

    const fileBuffer = await htmlToDocx(processedHtmlString, undefined, {
        ...documentOptions,
    });
    
    if (Buffer.isBuffer(fileBuffer)) {
        return fileBuffer.toString('base64');
    }
    
    // Fallback for Blob (less likely on server)
    const arrayBuffer = await (fileBuffer as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}
