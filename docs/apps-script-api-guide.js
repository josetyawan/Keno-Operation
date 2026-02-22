// ================== PENTING: ARSITEKTUR BARU ==================
// Metode lama menggunakan Web App (doGet) sudah tidak digunakan karena masalah izin yang tidak stabil.
// Metode BARU ini menggunakan SERVICE ACCOUNT untuk menulis data dari bot Telegram langsung ke Firestore.
// Ini lebih andal, aman, dan merupakan praktik terbaik.

// ================== LANGKAH 0: HUBUNGKAN KE PROYEK GOOGLE CLOUD (WAJIB) ==================
// 1.  Di editor Apps Script, klik ikon **Pengaturan Proyek** (roda gigi ⚙️) di sebelah kiri.
// 2.  Scroll ke bawah hingga Anda menemukan bagian "Proyek Google Cloud Platform (GCP)".
// 3.  Klik tombol **"Ubah proyek"**.
// 4.  Masukkan **Nomor Proyek GCP** Anda. Nomor Proyek untuk `studio-7759201113-b7263` adalah `536501296484`. Tempelkan nomor tersebut, lalu klik **"Setel proyek"**.
// 5.  Setelah terhubung, Anda bisa melanjutkan ke langkah berikutnya. Ini akan mengatasi galat "Tidak dapat mencari library".

// ================== LANGKAH 1: PERSIAPAN DI GOOGLE CLOUD & FIREBASE ==================
// 1.  **Aktifkan Firestore API**:
//     - Buka Google Cloud Console: https://console.cloud.google.com/
//     - Pastikan Anda berada di proyek yang benar (ID proyek: studio-7759201113-b7263).
//     - Cari "Firestore API" dan pastikan API tersebut sudah diaktifkan (Enabled).
//
// 2.  **Buat Service Account**:
//     - Di Google Cloud Console, navigasi ke "IAM & Admin" -> "Service Accounts".
//     - Klik "+ CREATE SERVICE ACCOUNT".
//     - Beri nama (misal: "bot-firestore-writer") dan deskripsi. Klik "CREATE AND CONTINUE".
//     - Di bagian "Grant this service account access to project", berikan peran (Role) **"Cloud Datastore User"**. Ini memberikan izin untuk membaca/menulis ke Firestore. Klik "CONTINUE".
//     - Lewati langkah ketiga (opsional), lalu klik "DONE".
//
// 3.  **Buat dan Unduh Kunci (Key)**:
//     - Temukan service account yang baru Anda buat di daftar, klik, lalu buka tab "KEYS".
//     - Klik "ADD KEY" -> "Create new key".
//     - Pilih tipe **JSON** dan klik "CREATE".
//     - Sebuah file JSON akan terunduh. **JAGA FILE INI DENGAN AMAN!** Ini adalah password untuk service account Anda.
//
// 4.  **Konfigurasi Skrip Apps Script**:
//     - Buka editor Apps Script Anda.
//     - Buat file baru dengan memilih **File > Baru > File Skrip**. Beri nama file `service-account-key.gs`.
//     - **HAPUS SEMUA** isi default di file baru tersebut.
//     - Salin baris kode **di bawah ini** dan tempelkan ke dalam file `service-account-key.gs`:
//
//       `const service_account_key_json = `
//
//     - **LANGSUNG SETELAH** tanda `=`, salin dan tempel **SELURUH ISI** file JSON yang Anda unduh dari Google Cloud.
//     - **PENTING**: Jangan menambahkan karakter `...` atau kurung siku `[]`.
//     - Hasil akhir di file `service-account-key.gs` Anda harus terlihat persis seperti ini (dengan nilai yang berbeda):
//       ```javascript
//       const service_account_key_json = {
//         "type": "service_account",
//         "project_id": "...",
//         "private_key_id": "...",
//         "private_key": "...",
//         "client_email": "...",
//         "client_id": "...",
//         "auth_uri": "...",
//         "token_uri": "...",
//         "auth_provider_x509_cert_url": "...",
//         "client_x509_cert_url": "...",
//         "universe_domain": "..."
//       };
//       ```
//
// 5.  **Tambahkan Library Firestore**:
//     - Di editor Apps Script, klik ikon "+" di sebelah "Libraries".
//     - Masukkan ID Skrip berikut: `1VUSl4b1r1L51_C5Yh-dC6a5M93wopeAi_hG-ZFNdqPEB1lT59i_lA2sT` (Ini adalah library "FirestoreGoogleAppsScript"). Klik "Cari".
//     - Pastikan identifier-nya adalah `Firestore`. Pilih versi terbaru, lalu klik "Tambahkan".

// ================== LANGKAH 2: KODE APPS SCRIPT BARU ==================
// Ganti kode di file skrip utama Anda (biasanya `Code.gs`) dengan kode di bawah ini.

// **PENTING**: Pastikan file `service-account-key.gs` Anda ada dan berisi variabel `service_account_key_json`.
const key = service_account_key_json;
const SERVICE_ACCOUNT_KEY = key.private_key;
const SERVICE_ACCOUNT_EMAIL = key.client_email;
const PROJECT_ID = key.project_id;


/**
 * Fungsi utama yang dipanggil oleh bot Telegram.
 * Menerima data gangguan dan menyimpannya ke Firestore.
 * @param {object} data - Objek berisi detail gangguan (noService, noTiket, teknisi, keterangan, tanggalLapor).
 */
function simpanRiwayatGangguan(data) {
  try {
    const firestore = FirestoreApp.getFirestore(SERVICE_ACCOUNT_EMAIL, SERVICE_ACCOUNT_KEY, PROJECT_ID);

    // Konversi tanggal jika ada, jika tidak biarkan null
    let tanggalLaporTimestamp = null;
    if (data.tanggalLapor) {
      const parsedDate = new Date(data.tanggalLapor);
      if (!isNaN(parsedDate.getTime())) {
        tanggalLaporTimestamp = parsedDate;
      }
    }
    
    // Data yang akan disimpan. Firestore akan otomatis membuat ID unik.
    const riwayatData = {
      noService: data.noService || '',
      noTiket: data.noTiket || '',
      teknisi: data.teknisi || '',
      keterangan: data.keterangan || '',
      tanggalLapor: tanggalLaporTimestamp, // Bisa jadi null atau objek Date
    };

    // 'riwayat-gangguan' adalah nama koleksi di Firestore.
    firestore.createDocument('riwayat-gangguan', riwayatData);
    
    return { success: true, message: `Data untuk tiket ${data.noTiket} berhasil disimpan.` };

  } catch (error) {
    Logger.log("Error di simpanRiwayatGangguan: " + error.toString());
    return { success: false, message: "Gagal menyimpan ke Firestore: " + error.toString() };
  }
}

// ================== CONTOH PENGGUNAAN DI BOT TELEGRAM ==================
/*
// Fungsi doPost ini memungkinkan bot Telegram Anda memanggil fungsi `simpanRiwayatGangguan`.
// Tempatkan ini di skrip utama Anda.

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    
    // Verifikasi bahwa fungsi yang diminta ada
    if (typeof this[params.function] !== 'function') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: 'Fungsi tidak ditemukan.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Panggil fungsi yang diminta dengan argumen yang diberikan
    const result = this[params.function].apply(null, params.parameters);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    Logger.log("Error di doPost: " + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: "Error pada server Apps Script: " + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Di dalam kode bot Telegram Anda (setelah mem-parsing pesan dari user):

function handleUserInput(text) {
    // ... logika parsing text dari user untuk mendapatkan detail gangguan ...
    const dataGangguan = {
        noService: '123456789',
        noTiket: 'INC12345',
        teknisi: 'Budi',
        keterangan: 'Kabel putus di tiang',
        tanggalLapor: new Date().toISOString() // Kirim sebagai string ISO 8601
    };

    // Ganti dengan URL eksekusi skrip Anda yang sudah di-deploy
    const url = "URL_DEPLOYMENT_APPS_SCRIPT_ANDA"; 
    
    const options = {
        method: 'post',
        contentType: 'application/json',
        // Kirim nama fungsi dan argumennya dalam payload
        payload: JSON.stringify({
            function: 'simpanRiwayatGangguan',
            parameters: [dataGangguan] // Argumen harus dalam bentuk array
        }),
        muteHttpExceptions: true // Penting untuk menangkap detail error
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
        // Kirim konfirmasi ke user
        bot.sendMessage(chatId, result.message);
    } else {
        // Kirim pesan error ke user
        bot.sendMessage(chatId, `Terjadi kesalahan: ${result.message}`);
    }
}
*/
