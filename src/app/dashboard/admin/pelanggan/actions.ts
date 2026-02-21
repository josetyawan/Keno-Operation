'use server';

// This is a Server Action. It runs only on the server and is safe from CORS issues.
export async function fetchFromSheet() {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!url || url === 'PASTE_YOUR_WEB_APP_URL_HERE') {
    console.error('APPS_SCRIPT_WEB_APP_URL environment variable is not set.');
    throw new Error('URL Apps Script belum diatur di server. Mohon periksa file apphosting.yaml.');
  }

  try {
    console.log(`Fetching data from: ${url}`);
    // Using 'no-store' to prevent caching of the response.
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Gagal mengambil data dari Google Sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching from sheet:', error);
    // Re-throw the error with a user-friendly message
    throw new Error(`Gagal terhubung ke API Google Sheet: ${error.message}`);
  }
}
