// ================== PENTING: ID SPREADSHEET ==================
// Ganti dengan ID Spreadsheet Anda yang benar
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "YOUR_SHEET_NAME_HERE"; // Contoh: 'Laporan Bot'
const SPREADSHEET_B2B = "YOUR_SECOND_SPREADSHEET_ID_HERE"; // Ganti jika Anda menggunakannya


// ================== FIRESTORE: SIMPAN DATA LAPORAN ==================
/**
 * Menyimpan data laporan gangguan langsung ke Firestore.
 * Fungsi ini memerlukan library FirestoreApp dan kredensial service account.
 */
function saveToFirestore(data, chatId) {
  try {
    // Ambil kredensial dari Script Properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const privateKey = scriptProperties.getProperty('private_key');
    const clientEmail = scriptProperties.getProperty('client_email');
    const projectId = scriptProperties.getProperty('project_id');

    // Validasi kredensial
    if (!privateKey || !clientEmail || !projectId) {
      throw new Error("Properti Firestore (private_key, client_email, project_id) belum diatur di Script Properties.");
    }

    // Inisialisasi koneksi ke Firestore
    const firestore = FirestoreApp.getFirestore(clientEmail, privateKey, projectId);

    // Siapkan data yang akan dikirim, sesuaikan dengan struktur di aplikasi Anda
    const firestoreData = {
      noService: { stringValue: data.no_service || '' },
      tanggalLapor: { timestampValue: new Date().toISOString() }, // FirestoreApp menggunakan format ini
      noTiket: { stringValue: data.no_tiket || '' },
      teknisi: { stringValue: data.teknisi || '' },
      keterangan: { stringValue: data.keterangan || '' },
      pelangganId: { stringValue: '' } // Sesuai dengan struktur lama
    };

    // Kirim data ke koleksi 'riwayat-gangguan'
    firestore.createDocument('riwayat-gangguan', firestoreData);
    
    Logger.log("✅ Data berhasil disimpan ke Firestore.");

  } catch (e) {
    Logger.log("❌ Gagal menyimpan ke Firestore: " + e.toString());
    // Kirim notifikasi error ke pengguna Telegram
    sendText(chatId, "❌ Terjadi galat saat menyimpan data ke database. Silakan laporkan ke admin.\nError: " + e.message);
  }
}


// ================== FUNGSI UTAMA ==================
/**
 * Fungsi utama yang dipanggil untuk menyimpan semua data.
 * Sekarang memanggil saveToFirestore secara langsung.
 */
function saveToSheetReturnRow(data, chatId) {
  try {
    const now = new Date();

    // ===== 1. SIMPAN KE GOOGLE SHEET (LOGGING) =====
    const sheet1 = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const lastRow1 = sheet1.getLastRow() + 1;
    sheet1.getRange(lastRow1, 1, 1, 7).setValues([[
      lastRow1 - 1, now, data.no_tiket || '', data.no_service || '',
      data.segmen_wo || '', data.teknisi || '', data.keterangan || ''
    ]]);
    Logger.log("✅ Data dicatat di Google Sheet utama.");

    // ===== 2. SIMPAN KE DATABASE APLIKASI (FIRESTORE) =====
    // Ini adalah langkah kunci untuk menampilkan data di aplikasi.
    saveToFirestore(data, chatId);

    // ===== 3. UPDATE SHEET B2B (Logika Tambahan Anda) =====
    const noServiceBaru = (data.no_service || '').toString().trim();
    const keteranganBaru = (data.keterangan || '').toString().trim();
    if (keteranganBaru && SPREADSHEET_B2B) {
      try {
        const sheet2 = SpreadsheetApp.openById(SPREADSHEET_B2B).getSheetByName("TABEL");
        const lastRow2 = sheet2.getLastRow();
        if (lastRow2 > 1) {
          const serviceNoValues = sheet2.getRange(2, 8, lastRow2 - 1, 1).getValues();
          for (let i = 0; i < serviceNoValues.length; i++) {
            if ((serviceNoValues[i][0] ? serviceNoValues[i][0].toString().trim() : "") === noServiceBaru) {
              sheet2.getRange(i + 2, 15).setValue(keteranganBaru);
              Logger.log("✅ Update Sheet B2B berhasil.");
              break;
            }
          }
        }
      } catch (sheetError) {
          Logger.log("⚠️ Gagal update Sheet B2B: " + sheetError.toString());
          // Tidak mengirim pesan error ke user agar tidak membingungkan
      }
    }

    return lastRow1;

  } catch (e) {
    Logger.log("❌ Error di fungsi utama (saveToSheetReturnRow): " + e.toString());
    sendText(chatId, '❌ Gagal total saat memproses data. Silakan coba lagi atau hubungi admin.');
    return null;
  }
}


// ================== FUNGSI PEMBANTU TELEGRAM ==================
function sendText(chatId, text) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
    if (!token) {
        Logger.log("TELEGRAM_BOT_TOKEN tidak ditemukan di Script Properties.");
        return;
    }
    const url = "https://api.telegram.org/bot" + token + "/sendMessage?chat_id=" + chatId + "&text=" + encodeURIComponent(text);
    UrlFetchApp.fetch(url);
  } catch(e) {
    Logger.log("Gagal mengirim pesan Telegram: " + e.toString());
  }
}

// Tambahkan fungsi doGet, doPost, dll. yang Anda gunakan untuk menerima update dari Telegram di sini
// ...
// Contoh:
/*
function doPost(e) {
  // Parsing data dari Telegram
  const contents = JSON.parse(e.postData.contents);
  const chatId = contents.message.chat.id;
  const text = contents.message.text;

  // Lakukan sesuatu dengan data
  // Misalnya, memanggil saveToSheetReturnRow
  const mockData = {
    no_service: "12345",
    keterangan: text
  };
  saveToSheetReturnRow(mockData, chatId);

  return ContentService.createTextOutput("OK");
}
*/
