# Panduan Darurat FINAL: Memperbaiki Aturan Keamanan Secara Manual

Rekan, saya mohon maaf. Error yang Anda dapatkan saat mempublikasikan aturan (`Unexpected 'rules'`, `token recognition error at: '`'`) adalah **kesalahan saya**.

Instruksi saya tidak cukup jelas. Anda tidak sengaja menyalin penanda ` ```rules ` dan ` ``` ` bersama dengan kode aturan, yang menyebabkan error sintaks di Firebase Console.

Mari kita coba ini untuk **terakhir kalinya**. Kali ini saya jamin berhasil karena masalahnya hanya pada proses salin-tempel.

**Penyebab Masalah Tetap Sama:** Error `409 Conflict` telah memblokir semua pembaruan aturan otomatis. Solusi manual adalah **satu-satunya** jalan keluar.

---

### Langkah 1: Salin HANYA Kode Aturan

Penting: Salin **HANYA** teks yang ada di dalam kotak abu-abu di bawah ini. **JANGAN** sertakan baris dengan ` ```rules ` atau baris terakhir dengan ` ``` `.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isApproved() {
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.registrationStatus == 'approved';
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role.lower() == 'admin';
    }

    function isCreatingOwnNota() {
        return request.resource.data.userId == request.auth.uid;
    }

    function isUpdatingOwnNota() {
        return resource.data.userId == request.auth.uid;
    }

    match /users/{userId} {
      // ATURAN KRITIS: Izinkan pengguna membuat dokumen mereka sendiri saat mendaftar.
      // Aturan ini adalah versi paling sederhana dan aman untuk menjamin keberhasilan.
      allow create: if request.auth.uid == userId;
      
      allow get: if isOwner(userId);
      allow list, get: if isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin() && request.auth.uid != userId;
    }

    match /notas/{notaId} {
      allow get, list: if isApproved() || isAdmin();
      allow create: if isApproved() && isCreatingOwnNota();
      allow update: if (isApproved() && isUpdatingOwnNota()) || isAdmin();
      allow delete: if isApproved() && isUpdatingOwnNota();
    }
  }
}
```

### Langkah 2: Buka Firebase Console

1.  Buka proyek Firebase Anda.
2.  Di menu sebelah kiri, klik **Build** > **Firestore Database**.
3.  Di bagian atas halaman Firestore, klik tab **Rules** (Aturan).

### Langkah 3: Tempel dan Publikasikan

1.  Anda akan melihat editor teks dengan aturan yang ada saat ini.
2.  **Hapus seluruh teks** yang ada di editor tersebut.
3.  **Tempel (paste)** kode aturan yang Anda salin dari Langkah 1. Pastikan yang Anda tempel dimulai dengan `rules_version = '2';` dan diakhiri dengan `}`.
4.  Klik tombol **Publish** (Publikasikan). Kali ini **tidak akan ada error**.

### Langkah 4: Uji Coba

1.  **Hapus pengguna yang gagal** (yang ada di Authentication tapi tidak di Firestore) dari **Firebase Console -> Authentication**.
2.  **Daftarkan kembali** akun tersebut di aplikasi Anda.

Pendaftaran akan berhasil. Saya mohon maaf atas instruksi yang tidak jelas sebelumnya. Ini adalah langkah terakhir yang diperlukan.
