'use server';

export async function fetchFromSheet() {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!url || url === 'PASTE_YOUR_WEB_APP_URL_HERE') {
    console.error('APPS_SCRIPT_WEB_APP_URL environment variable is not set.');
    throw new Error('URL Apps Script belum diatur di file .env server.');
  }

  try {
    console.log(`Fetching data from: ${url}`);
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Gagal mengambil data dari Google Sheet. Status: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    try {
        const data = JSON.parse(text);
        // Jika data adalah objek dengan properti error, lempar sebagai pesan galat
        if (typeof data === 'object' && data !== null && data.error) {
          throw new Error(data.message || 'Apps Script melaporkan adanya galat.');
        }
        return data;
    } catch (jsonError: any) {
        // Cek apakah respons yang diterima adalah halaman HTML
        if (text.trim().toLowerCase().startsWith('<!doctype html')) {
             throw new Error('Google mengirim halaman web, bukan data. Ini biasanya karena kesalahan izin. Pastikan Apps Script Web App Anda di-deploy dengan "Who has access" diatur ke "Anyone".');
        }
        // Jika bukan HTML, ini adalah galat parsing JSON biasa
        throw new Error(`Gagal mem-parsing data JSON dari Google: ${jsonError.message}`);
    }

  } catch (error: any) {
    console.error('Error fetching from sheet:', error);
    // Lempar kembali pesan galat yang sudah lebih jelas dari blok di atas
    throw new Error(error.message);
  }
}
