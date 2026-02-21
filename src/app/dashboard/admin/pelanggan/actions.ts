'use server';

export async function fetchFromSheet() {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!url || url.includes('PASTE_YOUR_WEB_APP_URL_HERE')) {
    console.error('APPS_SCRIPT_WEB_APP_URL environment variable is not set.');
    throw new Error('URL Apps Script belum diatur di file .env server.');
  }

  try {
    console.log(`Fetching data from: ${url}`);
    // Menggunakan redirect: 'manual' untuk menangkap pengalihan (redirect)
    const response = await fetch(url, { cache: 'no-store', redirect: 'manual' });

    // Jika status adalah 3xx, itu berarti ada pengalihan, yang hampir pasti karena masalah izin
    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location') || 'tidak diketahui';
        console.error(`Request was redirected to: ${location}`);
        throw new Error(`Permintaan dialihkan ke halaman login Google. Ini adalah masalah izin di Apps Script. Pastikan Web App di-deploy dengan "Who has access" diatur ke "Anyone", dan Anda membuat "New version" setelah mengubahnya.`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Tidak bisa membaca respons error.');
      throw new Error(`Gagal mengambil data dari Google Sheet. Status: ${response.status}. Respons: ${errorText.substring(0, 200)}...`);
    }

    const text = await response.text();
    try {
        const data = JSON.parse(text);
        if (typeof data === 'object' && data !== null && data.error) {
          throw new Error(data.message || 'Apps Script melaporkan adanya galat.');
        }
        return data;
    } catch (jsonError: any) {
        if (text.trim().toLowerCase().startsWith('<!doctype html')) {
             throw new Error('Google mengirim halaman web, bukan data. Ini biasanya karena kesalahan izin. Pastikan Apps Script Web App Anda di-deploy dengan "Who has access" diatur ke "Anyone" dan membuat "New version" setelahnya.');
        }
        throw new Error(`Gagal mem-parsing data JSON dari Google: ${jsonError.message}`);
    }

  } catch (error: any) {
    console.error('Error fetching from sheet:', error);
    throw new Error(error.message);
  }
}
