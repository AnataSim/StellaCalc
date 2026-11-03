# ⚡ StellaCalc — Stella Sora Combat & Damage Theorycrafter

StellaCalc adalah kalkulator komputasi dan simulator *theorycrafting* untuk game **Stella Sora (ステラソラ)**. Aplikasi ini dirancang agar pemain dapat merancang build karakter, mengoptimalkan sinergi tim (1 Main Trekker + 2 Support), menghitung damage *Expected Hit* & *Combat DPS* secara presisi, serta menyimpan preset build tanpa hambatan.

---

## 🧭 Struktur Direktori Proyek

Seluruh aset dan database game telah dikonsolidasikan ke dalam folder `database/` agar repositori tetap rapi dan terstruktur:

```text
StellaCalc/
├── database/                 # Seluruh database game hasil datamine & tabel lokalisasi
│   ├── CN/, EN/, JP/, KR/, TW/ # Raw Unity game binary tables per bahasa
│   ├── hotfix/               # Data patch & hotfix analyzer
│   ├── character.json        # Database karakter, skill multiplier, dan talent tree
│   ├── disc.json             # Database Disc (Memory / Equipment)
│   ├── emblem.json           # Database sub-stat dan pool emblem
│   ├── query.js              # Fast CLI query engine untuk lookup data cepat
│   └── ...                   # JSON & JS parser pendukung lainnya
├── web/                      # Kode sumber aplikasi web (Frontend React + Vite)
│   ├── src/                  # Komponen UI, kalkulator damage, service auth & security
│   ├── public/               # Asset statis web (icons, notes, emblems)
│   └── package.json          # Dependensi frontend
├── scripts/                  # Script helper automasi (e.g. fetch notes asset)
├── query.js                  # Root proxy CLI untuk menjalankan database query engine
├── firebase.json             # Konfigurasi deployment & hosting Firebase
├── firestore.rules           # Aturan keamanan database Cloud Firestore
└── README.md
```

---

## 🎮 Fitur Utama StellaCalc

### 1. Komputasi Combat DPS & Formula Hit
* **Kalkulasi Tiap Skill**: Auto Attack, Main Skill, Support Skill, dan Ultimate Burst dihitung secara mendalam berdasarkan:
  $$\text{Hit DMG} = \text{Scaling Stat} \times \text{Skill Multiplier} \times (1 + \text{Elem DMG}) \times (1 + \text{Skill Type Bonus}) \times (1 + \text{Vuln}) \times \text{Crit Multiplier}$$
* **Expected Average Damage**: Menghitung rata-rata damage dengan menggabungkan peluang Crit Rate dan Crit DMG multiplier.
* **Support Synergy**: Menghitung buff pasif, donasi stat, dan sinergi dari Support 1 dan Support 2 ke Main Trekker secara otomatis.

### 2. Interactive Breakdown & Auto-Navigation (QoL)
* Saat melihat rincian stat di kartu **Combat Stats** atau **Combat DPS**, setiap baris buff dapat diklik.
* Aplikasi akan langsung:
  1. Berpindah ke slot Trekker yang memberikan buff tersebut (Main, Support 1, atau Support 2).
  2. Membuka dropdown / tier yang bersangkutan (Talent, Disc slot tertentu, Skill, atau Emblem).
  3. Menggeser layar (*smooth scroll*) dan memicu **Amber Pulse Ring** untuk menyorot sumber stat tersebut secara visual.

### 3. Presets Recall Terintegrasi (Tanpa Modal Overlay)
* **18 Slot Preset**: 6 Elemen (Ignis, Aqua, Ventus, Terra, Lux, Umbra) × 3 Slot Preset per elemen.
* **Akses Bersamaan**: Presets Recall disematkan langsung pada halaman utama di bawah Team Bar tanpa backdrop gelap, sehingga pengguna bisa mengubah konfigurasi build dan menguji preset secara bersamaan (*main bisa akses, save juga bisa akses*).
* Dilengkapi *hover overlay* interaktif: slot aktif memunculkan tombol **Save / Overwrite**, sedangkan slot lain memunculkan tombol **Switch / Load**.

### 4. Zero-Trust Security & Remember Me
* **IP Address Dibungkus Kriptografis**: Alamat IP pengguna tidak pernah disimpan mentah atau dikirim dalam bentuk plaintext ke server. Setiap IP langsung dienkripsi menjadi *salted cryptographic hash* (`sec_net_<hash>`).
* **Auto-Login via Hardware Fingerprint**: Menggunakan token persisten multi-storage (*Evercookie pattern* via `IndexedDB` + `localStorage`). Pengguna yang kembali setelah offline lama akan otomatis melewati (*skip*) login tanpa perlu mengetik ulang kredensial.
* **Anti-Tamper & Self-XSS Defense**: Objek sesi dibekukan (`Object.freeze`) dan console inspect diproteksi terhadap upaya injeksi script.

---

## 🛠️ Menjalankan Proyek Secara Lokal

### Menjalankan Web Application:
```bash
# Pindah ke direktori web
cd web

# Install dependensi
npm install

# Jalankan server lokal Vite
npm run dev

# Jalankan uji kompilasi produksi
npm run build
```

### Menggunakan Query CLI Database:
Untuk mencari data karakter, disc, atau item secara instan tanpa membebani memori:
```bash
# Cek info karakter
node query.js character Amber

# Cek detail multiplier skill karakter
node query.js character "Firstlight Noya" --skills

# Lookup Disc
node query.js disc "Crisp Morning"
```

---

## ⚖️ Kredit, Hak Hierarki Database & Disclaimer

### 👑 Kredit & Hak Hierarki Penuh Pemilik Database:
* Proyek ini menggunakan basis data dan struktur ekstraksi yang bersumber dari repositori **[AutumnVN/ss-data](https://github.com/AutumnVN/ss-data)** yang dikelola oleh **[AutumnVN](https://github.com/AutumnVN)**.
* **Pemberitahuan Hierarki Takedown Penuh**:
  > **Owner dari database GitHub ([AutumnVN](https://github.com/AutumnVN)) memiliki hak dan wewenang hierarki penuh atas database, file data, dan aset terkait yang digunakan dalam repositori ini. Apabila sewaktu-waktu pemilik database meminta penghapusan (*takedown*), penarikan repositori, atau penutupan proyek StellaCalc, pihak pengembang StellaCalc ([AnataSim](https://github.com/AnataSim)) berkomitmen untuk mematuhi dan mengeksekusi permintaan tersebut secara hierarkis tanpa syarat.**

### 🏢 Hak Cipta Game:
* Seluruh nama karakter, gambar, audio, logo, dan materi game **Stella Sora (ステラソラ)** adalah hak cipta dan merek dagang milik **YOSTAR GAMES (悠星网络)**.
* Proyek ini dibuat secara independen oleh komunitas penggemar untuk tujuan edukasi, analisis data, dan riset *theorycrafting* non-komersial.
