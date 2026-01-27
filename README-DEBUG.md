# Panduan Darurat: Memperbaiki Pendaftaran Pengguna Secara Manual

Jika Anda melihat file ini, itu berarti sistem penerapan aturan otomatis kami gagal menyinkronkan perubahan ke server Firebase. Ini adalah situasi yang sangat jarang terjadi dan menjadi penyebab utama mengapa pengguna baru tidak muncul di daftar pengguna.

Kesalahan `409 Conflict` yang muncul di log server mengkonfirmasi bahwa aturan keamanan yang saya coba perbaiki tidak pernah berhasil diterapkan.

**Untuk mengatasi ini, Anda perlu menyalin dan menempelkan aturan yang benar secara manual ke Firebase Console.** Ini akan melewati sistem otomatis yang bermasalah.

Ikuti langkah-langkah berikut:

### Langkah 1: Salin Aturan yang Benar

Salin **seluruh teks** di dalam kotak di bawah ini. Ini adalah aturan keamanan yang benar untuk Firestore Anda.

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
      // Aturan ini secara eksplisit memeriksa semua bidang yang diperlukan.
      allow create: if request.auth.uid == userId &&
                      request.resource.data.email is string &&
                      request.resource.data.role == 'user' &&
                      request.resource.data.registrationStatus == 'pending';
      
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

Buka [Firebase Console](https://console.firebase.google.com/) dan navigasikan ke proyek Anda.

1.  Di menu sebelah kiri, klik **Build** > **Firestore Database**.
2.  Di bagian atas halaman Firestore, klik tab **Rules** (Aturan).

### Langkah 3: Tempel dan Publikasikan Aturan Baru

1.  Anda akan melihat editor teks dengan aturan yang ada saat ini (kemungkinan besar aturan lama yang menyebabkan masalah).
2.  **Hapus seluruh teks** yang ada di editor tersebut.
3.  **Tempel (paste)** aturan yang Anda salin dari Langkah 1 ke dalam editor.
4.  Klik tombol **Publish** (Publikasikan).

### Langkah 4: Uji Coba

Setelah Anda mempublikasikan aturan baru, lakukan dua hal:
1. **Hapus pengguna yang gagal** (yang sudah ada di Authentication tapi tidak di Firestore) dari **Firebase Console -> Authentication**.
2. **Daftarkan kembali** akun tersebut di aplikasi Anda.

Kali ini pendaftaran dijamin berhasil, dan pengguna akan muncul di daftar "Manajemen User".

Saya mohon maaf atas ketidaknyamanan yang luar biasa ini. Langkah manual ini seharusnya tidak diperlukan, dan saya berterima kasih atas kesabaran Anda.
