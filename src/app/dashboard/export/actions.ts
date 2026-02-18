
'use server';

// This is a server-only file.

export async function generateDocxAction(htmlString: string, documentOptions: any): Promise<string> {
    // Dynamically import the library to ensure it's only loaded on the server when needed.
    const htmlToDocx = (await import('html-to-docx')).default;

    // Directly pass the HTML string. The library, when run in a Node.js environment (which this is),
    // is responsible for fetching remote images from the `src` URLs.
    // The previous manual image fetching has been removed as it was interfering with the library's process.
    const fileBuffer = await htmlToDocx(htmlString, undefined, {
        ...documentOptions,
    });
    
    if (Buffer.isBuffer(fileBuffer)) {
        return fileBuffer.toString('base64');
    }
    
    // Fallback for Blob (less likely on server, but good practice)
    const arrayBuffer = await (fileBuffer as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}
