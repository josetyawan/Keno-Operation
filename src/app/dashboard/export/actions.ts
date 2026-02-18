
'use server';

// Library is dynamically imported below to ensure it's only loaded on the server.

// This function will run on the server and has access to Node.js modules.
export async function generateDocxAction(htmlString: string, documentOptions: any): Promise<string> {
    // Dynamically import the library INSIDE the server action.
    // This prevents the module from being bundled into the client-side code.
    const htmlToDocx = (await import('html-to-docx')).default;

    const fileBuffer = await htmlToDocx(htmlString, undefined, {
        ...documentOptions,
        // The library running on Node.js will fetch these URLs itself.
        // No need for complex client-side fetching or manual embedding.
    });
    
    // On the server, htmlToDocx is expected to return a Buffer.
    if (Buffer.isBuffer(fileBuffer)) {
        return fileBuffer.toString('base64');
    }
    
    // This part is a fallback, though it shouldn't be reached in a server environment.
    // If it returns a Blob, we need to read it as a buffer.
    const arrayBuffer = await (fileBuffer as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}

