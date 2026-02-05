# Panduan Langkah-demi-Langkah untuk Reset Password

Rekan,

Berikut adalah cara menggunakan fitur reset password yang baru saja kita buat. Mohon ikuti langkah-langkah ini dengan saksama.

---

### **Langkah 1: Buka Email & SALIN Link**

1.  Buka email dari `noreply@studio-7759201113-b7263.firebaseapp.com`. Subjeknya biasanya berisi "reset your password".
2.  Anda akan melihat link berwarna biru yang panjang. **PENTING: JANGAN KLIK LANGSUNG LINK TERSEBUT.**
3.  **Klik kanan** pada link tersebut, lalu pilih **"Salin alamat link"** (atau "Copy link address" dalam bahasa Inggris).

### **Langkah 2: Ambil Kode Reset (`oobCode`)**

1.  Buka aplikasi seperti Notepad, atau cukup tempel (paste) link tadi ke kolom alamat browser Anda untuk melihat teks lengkapnya.
2.  Link tersebut akan terlihat seperti ini:
    `...firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=`**`[BAGIAN_INI_ADALAH_KODE_ANDA]`**`&apiKey=...`
3.  Salin **HANYA** teks yang berada di antara `oobCode=` dan `&apiKey=`. Berdasarkan contoh di email, kodenya adalah rangkaian teks yang panjang dan acak.

### **Langkah 3: Gunakan Kode di Aplikasi Anda**

1.  Buka aplikasi Anda dan navigasikan ke halaman `/reset-password`. (Contoh: `https://[alamat-aplikasi-anda].com/reset-password`)
2.  Tempel (paste) kode yang Anda salin dari Langkah 2 ke dalam kolom **"Kode Reset"**.
3.  Masukkan password baru Anda di kolom "Password Baru".
4.  Ketik ulang password baru Anda di kolom "Konfirmasi Password Baru".
5.  Klik tombol **"Set Password Baru"**.

Jika berhasil, Anda akan otomatis diarahkan ke halaman login dan bisa masuk dengan password baru Anda.

---

Semoga panduan ini membantu! Simpan file ini jika Anda memerlukannya lagi di masa depan.
