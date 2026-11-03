<div align="center">

# ⚡ StellaCalc
### Advanced Damage Calculator & Build Theorycrafting Engine for Stella Sora (ステラソラ)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

[Fitur Utama](#-fitur-utama) • [Instalasi](#-instalasi--menjalankan-aplikasi) • [Keamanan](#-arsitektur-keamanan--anti-exploit) • [Kredit](#-kredit--acknowledgements) • [Disclaimer](#-disclaimer)

</div>

---

## 📖 Tentang StellaCalc

**StellaCalc** adalah kalkulator komputasi damage dan simulator *build theorycrafting* mutakhir untuk game **Stella Sora**. Dirancang khusus bagi para pemain dan theorycrafter untuk menghitung scaling stat, sinergi 1 Main Trekker + 2 Support Squad, multiplier skill, bonus elemen, hingga estimasi akurat **Combat DPS & Expected Hits** secara *real-time*.

---

## ✨ Fitur Utama

### 1. ⚔️ Real-Time Combat DPS & Damage Engine
* **Perhitungan Lengkap**: Menghitung rata-rata damage *Auto Attack*, *Main Skill*, *Support Skill*, hingga *Ultimate Burst*.
* **Formula Akurat**: Mengintegrasikan Base ATK/HP Scaling, Skill Multipliers (% & hits count), Elemental DMG (Lux, Ignis, Aqua, Ventus, Terra, Umbra), Skill Type Bonus %, Enemy Vulnerability (Vuln %), serta rasio Critical Rate & Critical Damage.
* **Non-Crit vs. Crit**: Membandingkan angka damage pukulan normal, pukulan kritikal, dan nilai ekspektasi rata-rata (*Average Expected Hit*).

### 2. 🔍 Interactive Breakdown Navigation & Visual Highlighting (QoL)
* Setiap baris rincian buff stat pada **Combat Stats** dan **Combat DPS** dapat diklik secara interaktif.
* Mengklik breakdown akan otomatis memindahkan slot Trekker tujuan, membuka dropdown terkait (Talent, Disc slot spesifik, Skill, atau Emblem), melakukan *smooth scroll*, dan memicu animasi **Amber Pulse Ring** untuk menyorot sumber buff yang bersangkutan.

### 3. 🛡️ Sinergi Tim: 1 Main + 2 Supports Squad
* Mendukung konfigurasi tim penuh dengan 1 Main Trekker dan 2 Support Trekkers.
* Mengkalkulasi efek pasif timbal-balik, donasi stat persen antar-karakter, dan buff harmonisasi tim secara instan.

### 4. 💿 Sistem Discs & Harmony Melodies (Harmony Notes)
* Konfigurasi 6 Discs: 3 Main Discs + 3 Support Discs dengan tingkatan Crescendo (C1–C6).
* 13 Melodi Stella Sora (Support Notes) dengan sinkronisasi level (1–99) dan kalkulasi stat bonus langsung ke karakter.

### 5. 💎 Emblem Matrix System
* Konfigurasi 3 jenis Emblem: **Defender's Spike (Lv.70)**, **Devotee's Rhombus (Lv.80)**, dan **Pathfinder's Starlight (Lv.90)**.
* Mendukung kustomisasi 4 sub-stat per emblem dengan tingkatan T1–T4 Rainbow max level.

### 6. 💾 Embedded Build Presets Recall (Tanpa Modal Overlay)
* **18 Slot Preset Instan**: 6 Elemen (Ignis, Aqua, Ventus, Terra, Lux, Umbra) × 3 Slot Preset per elemen.
* **Terintegrasi di Main Page**: Presets Recall disematkan langsung di halaman utama tanpa latar gelap yang menghalangi navigasi, memungkinkan pemain mengedit build dan menguji preset secara bersamaan.
* Dilengkapi visual hover overlay (*Save/Overwrite* pada slot aktif, *Switch/Load* pada slot lain), peringatan perubahan belum tersimpan (*Unsaved Changes Banner*), dan dialog konfirmasi aman.

---

## 🔒 Arsitektur Keamanan & Anti-Exploit

StellaCalc dibangun dengan standar keamanan *client-side zero-trust*:

1. **IP Address Hashed & Masked Sedalam Mungkin**:
   * Alamat IP pengguna **tidak pernah disimpan mentah** atau diekspos dalam bentuk plaintext di memory, `localStorage`, maupun Firestore.
   * Setiap IP otomatis di-hash menggunakan algoritma *cryptographic salted one-way digest* (`SHA-256` + private salt) menjadi token acak (`sec_net_<hash>`).
2. **Persistent Remember Me (Auto-Login Perangkat)**:
   * Menggunakan token kriptografis multi-storage (*Evercookie pattern*: `localStorage` + `IndexedDB`) yang terikat pada composite hardware fingerprint.
   * Memungkinkan pengguna yang offline lama langsung melewati (*skip*) proses login saat kembali membuka aplikasi.
3. **Anti-Tamper & Self-XSS Console Defense**:
   * Dilengkapi proteksi konsol terhadap manipulasi script berbahaya via Inspect DevTools.
   * Seluruh objek session dan device identity dibekukan dengan `Object.freeze` untuk mencegah *prototype pollution* dan *monkey patching*.

---

## 🚀 Instalasi & Menjalankan Aplikasi

Pastikan Anda telah menginstal **Node.js 18+** di komputer Anda.

```bash
# 1. Clone repository
git clone https://github.com/AnataSim/StellaCalc.git
cd StellaCalc/web

# 2. Instal dependensi
npm install

# 3. Jalankan server pengembangan lokal (Vite)
npm run dev

# 4. Build untuk tahap produksi (Production Build)
npm run build
```

---

## 🤝 Kredit & Acknowledgements

* **Special Thanks & Credit:** Kepada [AutumnVN](https://github.com/AutumnVN) atas penyediaan repositori data awal serta aset Stella Sora di [AutumnVN/ss-data](https://github.com/AutumnVN/ss-data) yang menjadi fondasi awal proyek ini.
* Dikembangkan dan disempurnakan oleh [AnataSim](https://github.com/AnataSim).

---

## ⚠️ Disclaimer

* Seluruh aset grafis, nama karakter, logo, dan hak cipta intelektual terkait game **Stella Sora (ステラソラ)** adalah milik penuh **YOSTAR GAMES (悠星网络)** dan pemilik resminya.
* **StellaCalc** adalah proyek *fan-made* non-komersial yang dibuat 100% untuk tujuan edukasi, analisis, dan *theorycrafting*. Penulis tidak bertanggung jawab atas kerugian atau sanksi apa pun akibat penggunaan tools atau data turunan ini.
