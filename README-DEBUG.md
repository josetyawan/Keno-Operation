# Panduan Menambahkan Password ke Akun Google Anda

Rekan,

Saya mengerti Anda tidak bisa login ke aplikasi yang sudah di-publish. Ini karena akun admin Anda dibuat dengan Google, sehingga belum memiliki password.

Anda **bisa** menambahkan password ke akun Anda agar bisa login dengan dua cara (Google dan password). Ikuti langkah-langkah berikut **dengan sangat teliti**:

---

### **Langkah 1: Minta Link Reset Password**

1.  Buka aplikasi Anda dan pergi ke halaman **Lupa Password**. Anda bisa klik link "Lupa password?" di halaman login.
2.  Masukkan email admin Anda: `jokowahyusisnaker123@gmail.com`
3.  Klik tombol "Kirim Tautan Reset".

---

### **Langkah 2: Salin Kode dari Email**

1.  Buka email dari `noreply@...firebaseapp.com`.
2.  Anda akan melihat link yang panjang. **Jangan klik link tersebut.**
3.  Cari bagian teks di dalam link yang terlihat seperti ini: `oobCode=KODE_PANJANG_ACAK_DISINI&apiKey=...`
4.  **Salin (copy) hanya `KODE_PANJANG_ACAK_DISINI`**. Ini adalah kode reset Anda.

**Contoh Link di Email:**
`https://nama-aplikasi.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=**jTYTLL5rgaSYS5pYwKxyn2nqlqbW8hE4eCGqGFdbpzUAAAGcmgDijw**&apiKey=...`

Dari contoh di atas, yang Anda salin adalah bagian yang dicetak tebal.

---

### **Langkah 3: Set Password Baru Anda**

1.  Sekarang, buka halaman **Reset Password** di aplikasi Anda (biasanya `/reset-password`).
2.  Tempel (paste) kode yang sudah Anda salin ke dalam kolom **"Kode Reset"**.
3.  Masukkan password baru yang Anda inginkan (`izinakses123`) di kolom "Password Baru" dan "Konfirmasi Password Baru".
4.  Klik tombol **"Set Password Baru"**.

Setelah ini, Anda akan bisa login ke **semua versi aplikasi** menggunakan email `jokowahyusisnaker123@gmail.com` dan password `izinakses123`.
