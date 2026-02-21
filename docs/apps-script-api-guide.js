// ================== PENTING: KONFIGURASI ==================
// Ganti dengan ID Spreadsheet dan Nama Sheet Anda yang benar.
const SPREADSHEET_ID = "1I_5nlRnoumDktvvIB6LbNKTfSLP-1G5xsYyjpRuDL5s";
const SHEET_NAME = "Februari 2026"; // Contoh: 'Riwayat Gangguan'

/**
 * Fungsi ini akan dijalankan setiap kali Web App URL Anda diakses dengan metode GET.
 * Ini berfungsi sebagai API untuk aplikasi Firebase Anda.
 * 
 * @param {GoogleAppsScript.Events.DoGet} e - Objek event dari permintaan GET.
 * @returns {GoogleAppsScript.Content.TextOutput} - Data dalam format JSON.
 */
function doGet(e) {
  try {
    // 1. Buka spreadsheet berdasarkan ID dan nama sheet.
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Periksa apakah sheet ditemukan
    if (!sheet) {
      return createJsonResponse({ error: true, message: `Sheet dengan nama "${SHEET_NAME}" tidak ditemukan.` });
    }

    // 2. Ambil semua data dari sheet.
    const data = sheet.getDataRange().getValues();

    // Periksa apakah ada data
    if (data.length <= 1) { // <= 1 untuk menghitung baris header
      return createJsonResponse([]); // Kembalikan array kosong jika hanya ada header atau tidak ada data sama sekali
    }

    // 3. Ubah data menjadi format JSON yang lebih mudah digunakan.
    // Baris pertama (data[0]) dianggap sebagai header (kunci).
    const headers = data[0];
    const jsonData = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // 4. Kembalikan data sebagai respons JSON.
    return createJsonResponse(jsonData);

  } catch (error) {
    // Tangani jika terjadi error saat proses
    Logger.log("Error di doGet: " + error.toString());
    return createJsonResponse({ error: true, message: "Terjadi kesalahan di server Apps Script: " + error.toString() });
  }
}

/**
 * Helper function untuk membuat respons JSON.
 * @param {object | any[]} data - Objek atau array yang akan diubah menjadi JSON.
 * @returns {GoogleAppsScript.Content.TextOutput} - Objek TextOutput.
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============== CARA DEPLOY SEBAGAI WEB APP ==============
// 1. Simpan file ini (Ctrl + S).
// 2. Klik tombol biru "Deploy" di pojok kanan atas, lalu pilih "New deployment".
// 3. Klik ikon Roda Gigi (⚙️) di sebelah "Select type", lalu pilih "Web app".
// 4. Di bagian "Configuration":
//    - Beri deskripsi (opsional, misal: "API Data Riwayat Gangguan v1").
//    - "Execute as": Biarkan "Me".
//    - "Who has access": **WAJIB** pilih "Anyone". Ini penting agar aplikasi Anda bisa mengaksesnya.
// 5. Klik tombol biru "Deploy".
// 6. Jika diminta, klik "Authorize access" dan ikuti alur untuk memberikan izin pada akun Google Anda.
// 7. Setelah selesai, Anda akan mendapatkan "Web app URL". **SALIN ULANG URL INI** bahkan jika terlihat sama.
// 8. Tempelkan URL tersebut ke dalam file `.env` di aplikasi Anda pada variabel `APPS_SCRIPT_WEB_APP_URL`.
// =========================================================

// =========== CARA MEMPERBARUI DEPLOYMENT (PENTING!) ===========
// 1. Setelah mengubah kode, simpan file (Ctrl + S).
// 2. Klik "Deploy" -> "Manage deployments".
// 3. Pilih deployment aktif Anda, lalu klik ikon pensil (Edit).
// 4. Di bagian "Version", pilih "New version".
// 5. Klik "Deploy". Perubahan Anda kini sudah aktif.
// =============================================================
