
'use server';

import htmlToDocx from 'html-to-docx';

// This function will run on the server and has access to Node.js modules.
export async function generateDocxAction(htmlString: string, documentOptions: any): Promise<string> {
    const fileBuffer = await htmlToDocx(htmlString, undefined, documentOptions, undefined);
    
    // On the server, htmlToDocx is expected to return a Buffer.
    if (Buffer.isBuffer(fileBuffer)) {
        return fileBuffer.toString('base64');
    }
    
    // This part is a fallback, though it shouldn't be reached in a server environment.
    // If it returns a Blob, we need to read it as a buffer.
    const arrayBuffer = await (fileBuffer as Blob).arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}
