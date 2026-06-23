process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
// Fungsi untuk menahan bot agar jadi "Zombie" dan nge-spam error di console
function tahanConsole(tipe, error) {
    console.log(`\n\n🚨🚨🚨 BOT MENGALAMI CRASH (${tipe}) 🚨🚨🚨`);
    console.log('TAPI SAYA TAHAN AGAR CONSOLE TIDAK TERTUTUP!');
    console.log('SILAKAN BACA ERROR DI BAWAH INI:\n');
    console.log(error.stack || error);
    console.log('\n=================================================');
    
    // Ini yang bikin bot ga mati dan terus nge-spam error tiap 5 detik
    setInterval(() => {
        console.log(`[ZOMBIE MODE] Penyebab Crash:`, error.message || error);
    }, 5000);
}

process.on('uncaughtException', function(err) {
    tahanConsole('UNCAUGHT EXCEPTION', err);
});

process.on('unhandledRejection', function(reason, promise) {
    tahanConsole('UNHANDLED REJECTION', reason);
});

const TelegramBot = require("node-telegram-bot-api");
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { Client } = require('ssh2');
const QRCode = require('qrcode');
const express = require('express');
const { exec } = require("child_process");
const ffmpeg = require('fluent-ffmpeg');
const path = require("path")
const axios = require("axios");
const settings = require("./database/settings.js");
const SMM_BASE = settings.smm.baseUrl;
const SMM_KEY = settings.smm.apiKey;
const SMM_ID = settings.smm.apiId;
const smmMode = new Set(); // user yg lagi mode cari kategori
// Mengambil adminId dari folder database/settings.js
const { adminId } = require('./database/settings'); 
const owner = settings.adminId;
const botToken = settings.token;
const adminfile = "./database/adminID.json";
const premiumUsersFile = "./database/premiumUsers.json";
const ASSEMBLY_API_KEY = "./database/settings.assemblyApiKey";
const domain = settings.domain;
const plta = settings.plta;
const pltc = settings.pltc;
let premiumUsers = [];
try {
  premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
} catch (error) {
  console.error("Error reading premiumUsers file:", error);
}
const bot = new TelegramBot(botToken, { polling: true });
let adminUsers = [];
try {
  adminUsers = JSON.parse(fs.readFileSync(adminfile));
} catch (error) {
  console.error("Error reading adminUsers file:", error);
}
// Fungsi untuk mengambil data dari database timed
function getTimedServers() {
    const path = './database/timed_servers.json';
    try {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify({ slots: [], trialHistory: {} }));
        }
        let data = JSON.parse(fs.readFileSync(path));
        
        // Memaksa format menjadi Object jika data lama berbentuk Array
        if (Array.isArray(data)) data = { slots: data, trialHistory: {} };
        
        // Memastikan properti penting tidak kosong (Anti-Undefined)
        if (!data.slots) data.slots = [];
        if (!data.trialHistory) data.trialHistory = {};
        
        return data;
    } catch (e) {
        // Jika file rusak, kembalikan struktur default
        return { slots: [], trialHistory: {} };
    }
}
const SMM_FILE = path.join(__dirname, 'smm_services.json');

let globalServices = []; // cache 703 data di RAM

const FILE_TASK = path.join(__dirname, 'taskUser.json');

const campaigns = [
  {
    id: 'gmail',
    name: 'Buat Akun Gmail',
    photo: 'https://cdn.phototourl.com/member/2026-06-20-59db53e6-1c71-400e-af87-6c7c9d059ba8.png',
    bayaran: 1600,
    password: 'Ajax1122*',
    desc: `Buatkan Akun Gmail baru dengan nama Amerika Laki laki atau Perempuan, Ambil namanya wajib dari sini :\n\n• https://www.fakenamegenerator.com/gen-male-en-uk.php (Laki laki)\n• https://www.fakenamegenerator.com/gen-female-us-us.php (Perempuan)\n\nGunakan Password : Ajax1122*\n\nSetelah kirim tugas pastikan anda sudah Logout (menghapus akun dari perangkat anda) Jika tidak maka tugas akan di tolak.`
  }
  // nanti kalo ada campaign lain tinggal tambah di sini
];

const userState = {};
const smmCache = {};

const PET_IMAGES = {
  blaze: { // ganti dari egg
    baby: 'https://cdn.phototourl.com/member/2026-06-18-1096b0c3-6027-46dc-8e8b-85b5c9e59eb7.png',
    grown: 'https://cdn.phototourl.com/member/2026-06-18-854bab91-550e-4912-ad47-0d5d76ae3926.png',
    adult: 'https://cdn.phototourl.com/member/2026-06-18-dc895406-294e-4fd1-94fa-10c7f604477d.png'
  },
  leafy: { // ganti dari tree
    baby: 'https://cdn.phototourl.com/member/2026-06-18-5d2714d6-8cd2-43ca-a4c2-5979a7dfef2f.jpg',
    grown: 'https://cdn.phototourl.com/member/2026-06-18-9230e686-0c6b-4437-be4f-ec7c3b03d29e.png',
    adult: 'https://cdn.phototourl.com/member/2026-06-18-3c92c8dd-73d9-43b8-82df-6d85b23680fb.webp'
  },
  pawsy: { // ganti dari cat
    baby: 'https://cdn.phototourl.com/member/2026-06-18-5e0d7a24-1e3b-4792-97bd-4757af668870.jpg',
    grown: 'https://cdn.phototourl.com/member/2026-06-18-c7b304ea-3822-4d99-b877-2229e6bc180f.jpg',
    adult: 'https://cdn.phototourl.com/member/2026-06-18-cf2676ee-af6e-4655-b6e0-2f4b09da243a.jpg'
  }
}

function getPetImage(pet) {
  const typeMap = {
    egg: 'blaze',
    tree: 'leafy',
    cat: 'pawsy',
    blaze: 'blaze',
    leafy: 'leafy',
    pawsy: 'pawsy'
  }

  const type = (pet.type || 'blaze').toLowerCase()
  const key = typeMap[type] || 'blaze' // convert egg -> blaze
  const imgs = PET_IMAGES[key]

  if(!imgs) return 'https://via.placeholder.com/400x400.png?text=Pet'

  const maxLevel = pet.maxLevel || 10
  const level = pet.level || 0
  const halfLevel = Math.floor(maxLevel / 2)

  if(level >= maxLevel) return imgs.adult
  if(level >= halfLevel) return imgs.grown
  return imgs.baby
}

function getRemainingXP(pet, mode = 'next') {
  if(mode === 'next') {
    // Sisa XP buat naik level selanjutnya
    const needLevel = (pet.level + 1) * 10
    return needLevel - pet.xp
  } 
  if(mode === 'max') {
    // Sisa XP sampe level max
    const totalXP = pet.maxLevel * 10
    const currentXP = pet.level * 10 + pet.xp
    return totalXP - currentXP
  }
}


const DB_PATH = './database/pets.json' // bikin folder database kalo belum ada

// Load DB JSON
function loadDB() {
  if(!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '{}') // bikin file kosong kalo belum ada
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

// Simpen DB JSON
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function cleanDesc(desc) {
  if (!desc) return 'Tidak ada deskripsi';

  // Hapus tag HTML, ganti <br> <p> jadi \n
  desc = desc.replace(/<br\s*\/?>/gi, '\n');
  desc = desc.replace(/<\/p>/gi, '\n');
  desc = desc.replace(/<[^>]+>/g, '');

  // Ganti simbol • jadi quote Telegram
  desc = desc.replace(/•/g, '▫️');

  // Hapus spasi berlebih
  desc = desc.replace(/\n\s*\n/g, '\n').trim();

  return desc;
}

//Load Fayupedia
async function loadSMMServices() {
  try {
    // Cek file JSON ada ga
    if (fs.existsSync(SMM_FILE)) {
      const data = fs.readFileSync(SMM_FILE, 'utf8');
      globalServices = JSON.parse(data);
      console.log(`✅ Load ${globalServices.length} layanan dari smm_services.json`);

      // Auto refresh di background tiap 1 jam
      setInterval(refreshServices, 3600000);
      return;
    }

    // Kalo file ga ada, fetch baru
    await refreshServices();
    setInterval(refreshServices, 3600000);
  } catch (e) {
    console.error('Gagal load services:', e);
  }
}

async function refreshServices() {
  console.log('⏳ Refresh 703 layanan dari API...');
  try {
    const res = await axios.post(`${SMM_BASE}/services`, {
      api_id: SMM_ID,
      api_key: SMM_KEY,
      action: 'services'
    });

    if (res.data.status === true) {
      globalServices = res.data.services;
      fs.writeFileSync(SMM_FILE, JSON.stringify(globalServices));
      console.log(`✅ Berhasil refresh & simpan ${globalServices.length} layanan`);
    }
  } catch (e) {
    console.error('Gagal refresh services:', e.message);
  }
}

// Panggil pas bot nyala
loadSMMServices();
// Ambil data user
async function getUserPet(userId) {
  const db = getPets()
  const id = String(userId)

  if(!db[id]) {
    db[id] = { userId: id, pet: null } // bikin user baru kalo belum ada
    saveDB(db)
  }
  return db[id]
}

// Update data pet user
async function savePet(userId, pet) {
  const db = loadDB()
  const id = String(userId)

  if(!db[id]) db[id] = { userId: id }
  db[id].pet = pet
  saveDB(db)
}

// 1. Helper tanggal native
function today() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}` // format: 2026-04-17
}

function getWeekId() {
  const now = new Date()
  const year = now.getFullYear()
  const start = new Date(year, 0, 1)
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((days + start.getDay() + 1) / 7)
  return `${year}-W${week}` // format: 2026-W16
}

// Fungsi untuk menyimpan data ke database timed
function saveTimedServers(data) {
    const path = './database/timed_servers.json';
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}
const dbPath = './database/timed_slots.json';
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ slots: [], history: [] }));
}

function getTimedDB() { return JSON.parse(fs.readFileSync(dbPath)); }
function saveTimedDB(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }
// Database untuk melacak server yang akan dihapus otomatis
const timedDatabasePath = './database/timed_servers.json';
if (!fs.existsSync(timedDatabasePath)) fs.writeFileSync(timedDatabasePath, JSON.stringify([]));

// Generator Username & PW Acak
const genRandom = (length) => Math.random().toString(36).substring(2, 2 + length);
// Jalankan pengecekan setiap 60 detik (1 menit)
setInterval(async () => {
    try {
        const dbTimed = getTimedServers();
        const now = new Date();

        // Pastikan ada data slots
        if (!dbTimed.slots || dbTimed.slots.length === 0) return;

        // Ambil daftar yang sudah melewati waktu expired
        const toDelete = dbTimed.slots.filter(s => now > new Date(s.expiredAt));

        if (toDelete.length > 0) {
            console.log(`[SYSTEM] Menemukan ${toDelete.length} panel expired. Memulai penghapusan...`);
        }

        for (const srv of toDelete) {
            try {
                // 1. Hapus Server di Pterodactyl
                const resSrv = await fetch(`${settings.domain}/api/application/servers/${srv.serverId}`, {
                    method: "DELETE",
                    headers: { 
                        "Authorization": `Bearer ${settings.plta}`,
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                // 2. Hapus User di Pterodactyl
                const resUsr = await fetch(`${settings.domain}/api/application/users/${srv.userId}`, {
                    method: "DELETE",
                    headers: { 
                        "Authorization": `Bearer ${settings.plta}`,
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                // 3. Kirim Notifikasi ke User
                const msg = `<blockquote>⌛ <b>ᴜᴊɪ ᴄᴏʙᴀ ꜱᴇʟᴇꜱᴀɪ</b>\n\nᴡᴀᴋᴛᴜ 1 ᴊᴀᴍ ᴜᴊɪ ᴄᴏʙᴀ ᴀɴᴅᴀ ᴛᴇʟᴀʜ ʜᴀʙɪꜱ. ᴘᴀɴᴇʟ ᴏᴛᴏᴍᴀᴛɪꜱ ᴅɪʜᴀᴘᴜꜱ ᴏʟᴇʜ ꜱɪꜱᴛᴇᴍ.\n\nꜱɪʟᴀᴋᴀɴ ᴜᴘɢʀᴀᴅᴇ ᴋᴇ ᴘᴀᴋᴇᴛ ᴘʀᴇᴍɪᴜᴍ ᴜɴᴛᴜᴋ ᴅᴜʀᴀꜱɪ ᴘᴇʀᴍᴀɴᴇɴ!</blockquote>`;
                await bot.sendMessage(srv.chatId, msg, { parse_mode: "HTML" }).catch(() => {});

                // 4. Log Admin
                bot.sendMessage(settings.adminId, `🗑 <b>AUTO DELETE:</b> Panel ${srv.type} milik ${srv.chatId} telah dihapus.`);
                
            } catch (err) {
                console.log(`[ERROR] Gagal menghapus panel ${srv.serverId}:`, err.message);
            }
        }

        // 5. Update database: BUANG yang sudah dihapus dari list
        dbTimed.slots = dbTimed.slots.filter(s => now <= new Date(s.expiredAt));
        saveTimedServers(dbTimed);

    } catch (error) {
        console.log("[CRITICAL ERROR] Auto-delete interval error:", error.message);
    }
}, 60000); // 1 menit sekali
const sendMessage = (chatId, text) => bot.sendMessage(chatId, text);
const patunganPath = './database/patungan.json'; 
// Jalankan pengecekan setiap 10 menit
setInterval(() => {
    let dbPatungan = getPatungan();
    let dbUsers = getUsers();
    const now = new Date();

    Object.keys(dbPatungan).forEach(roomId => {
        const room = dbPatungan[roomId];
        const expiredDate = new Date(room.expiresAt);

        if (room.status === "OPEN" && now > expiredDate) {
            // PATUNGAN GAGAL - KEMBALIKAN SALDO KE PROFIL
            room.members.forEach(member => {
                if (!dbUsers[member.id]) dbUsers[member.id] = { saldo: 0 };
                
                // Refund ke saldo profil bot
                dbUsers[member.id].saldo = (dbUsers[member.id].saldo || 0) + member.amount;
                
                bot.sendMessage(member.id, `<blockquote>⚠️ <b>PATUNGAN EXPIRED</b>\n━━━━━━━━━━━━━━━━━━\nDana untuk Room <code>${roomId}</code> tidak terpenuhi hingga batas waktu.\n\nSaldo <b>Rp ${member.amount.toLocaleString()}</b> telah dikembalikan ke Profil Anda.</blockquote>`, { parse_mode: "HTML" });
            });

            room.status = "FAILED_EXPIRED";
            bot.sendMessage(settings.adminId, `⚠️ <b>PATUNGAN GAGAL:</b> Room <code>${roomId}</code> kedaluwarsa. Saldo member telah direfund.`);
        }
    });

    savePatungan(dbPatungan);
    saveUsers(dbUsers);
}, 10 * 60 * 1000);
// Fungsi Ambil Data Patungan
function getPatungan() {
    // Jika file belum ada, buat dengan objek kosong
    if (!fs.existsSync(patunganPath)) {
        fs.writeFileSync(patunganPath, JSON.stringify({}));
        return {};
    }

    try {
        // Baca file dan parse JSON
        const data = fs.readFileSync(patunganPath, 'utf8');
        // Jika isi file kosong, kembalikan objek kosong
        if (!data.trim()) return {};
        return JSON.parse(data);
    } catch (error) {
        // Jika terjadi error (misal format salah), reset file
        console.error('Error membaca file patungan, mereset data...', error.message);
        fs.writeFileSync(patunganPath, JSON.stringify({}));
        return {};
    }
}


// Fungsi Simpan Data Patungan
function savePatungan(data) {
    fs.writeFileSync(patunganPath, JSON.stringify(data, null, 2));
}

// Inisialisasi variabel agar tidak error (PENTING!)
let patunganRooms = getPatungan();
const startTime = Date.now(); 
//Fungsi Patungan
function sendJoinNotification(room, newUser) {
    const sisa = room.harga - room.current;
    const textNotif = `<b>🆕 MEMBER PATUNGAN BARU!</b>\n` +
                      `----------------------------------\n` +
                      `👤 <b>Username:</b> @${newUser.username}\n` +
                      `🆔 <b>ID Profil:</b> <code>${newUser.id}</code>\n` +
                      `🎖 <b>Role:</b> <b>${newUser.role}</b>\n\n` +
                      `💰 Kontribusi: Rp ${newUser.amount.toLocaleString()}\n` +
                      `📉 Sisa Dibutuhkan: Rp ${sisa > 0 ? sisa.toLocaleString() : "LUNAS"} lagi!`;

    // Kirim notif ke semua orang yang sudah bergabung di room tersebut
    room.members.forEach(member => {
        bot.sendMessage(member.id, textNotif, { parse_mode: "HTML" }).catch(()=>{});
    });
}
// Fungsi menentukan Role berdasarkan urutan
function getRoleByCount(count) {
    if (count === 0) return "CEO";
    if (count === 1) return "Partner";
    if (count === 2) return "Admin";
    if (count === 3) return "Reseller";
    return "Member";
}

// Fungsi bawaan asli Anda
function getRuntime() {
  const uptime = process.uptime(); 
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours} Jam ${minutes} Menit ${seconds} Detik`;
}
// 1. BUAT VARIABEL UNTUK MENYIMPAN DATA SEMENTARA (Taruh di luar/di atas command)
const osDataCache = {}; 
const OS_PER_PAGE = 7; // Maksimal data per halaman
//fungsi saveUser

//Fungsi bulan 

function parseFlexibleDate(dateStr) {
    if (!dateStr) return new Date(NaN);

    // Jika formatnya murni DD-MM-YYYY (contoh: 10-05-2025)
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr.trim())) {
        const p = dateStr.split('-');
        return new Date(`${p[2]}-${p[1]}-${p[0]}`);
    }

    // Jika formatnya verbose (contoh: 19 Mei 2026 pukul 10.17)
    let clean = dateStr.toLowerCase()
        .replace(/januari/g, '01').replace(/februari/g, '02').replace(/maret/g, '03')
        .replace(/april/g, '04').replace(/mei/g, '05').replace(/juni/g, '06')
        .replace(/juli/g, '07').replace(/agustus/g, '08').replace(/september/g, '09')
        .replace(/oktober/g, '10').replace(/november/g, '11').replace(/desember/g, '12')
        .replace(/pukul/g, '').replace(/\./g, ':').trim();

    const parts = clean.split(/\s+/);
    if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        const time = parts[3] || "00:00";
        // Format ISO: YYYY-MM-DDTHH:mm:00
        return new Date(`${year}-${month}-${day}T${time}:00`);
    }
    return new Date(NaN);
}

//fungsi saldo profil user
function updateSaldo(chatId, nominal) {
    const dbUsers = getUsers();
    
    // 1. JIKA USER BELUM ADA DI DATABASE, BUATKAN PROFILNYA
    if (!dbUsers[chatId]) {
        dbUsers[chatId] = {
            saldo: 0,
            gachaCount: 0
            // (Kamu bisa tambahkan data default lain di sini jika ada)
        };
    }
    
    // 2. PASTIKAN NOMINAL ADALAH ANGKA (Mencegah hasil NaN / Not a Number)
    const jumlahTopup = parseInt(nominal) || 0;
    
    // 3. TAMBAHKAN SALDO KE USER
    dbUsers[chatId].saldo = (dbUsers[chatId].saldo || 0) + jumlahTopup;
    
    // 4. SIMPAN KE DATABASE
    saveUsers(dbUsers); 
    
    // 5. KEMBALIKAN NOMINAL SALDO TERBARU
    return dbUsers[chatId].saldo;
}

// Function Heleket Payment
function generateHeleketSign(data) {
    // 1. JSON stringify
    // 2. Escape slash tanpa menggunakan Regex agar tidak dianggap komentar oleh editor
    const jsonData = JSON.stringify(data).split('/').join('\\/');
    
    // 3. Convert ke Base64
    const base64Data = Buffer.from(jsonData).toString('base64');
    
    // 4. MD5(Base64 + API_KEY)
    const sign = crypto.createHash('md5').update(base64Data + settings.heleket.apiKey).digest('hex');
    
    return sign;
}

// 2. FUNGSI BANTUAN UNTUK MEMBUAT TAMPILAN HALAMAN
function generateOSPage(chatId, page) {
    const data = osDataCache[chatId];
    if (!data) return null; // Jika data sudah hilang/direstart

    const totalPages = Math.ceil(data.length / OS_PER_PAGE);
    const startIndex = (page - 1) * OS_PER_PAGE;
    const endIndex = startIndex + OS_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);

    let text = `🖥 <b>DAFTAR ID OS HOSTVDS</b>\n`;
    text += `📄 Halaman <b>${page}</b> dari <b>${totalPages}</b>\n\n`;

    pageData.forEach(os => {
        text += `<b>${os.name}</b>\n<code>${os.id}</code>\n\n`;
    });

    // Membuat tombol inline
    const inline_keyboard = [];
    const navigationRow = [];

    if (page > 1) {
        navigationRow.push({ text: "⬅️ Kembali", callback_data: `os_page_${page - 1}` });
    }
    if (page < totalPages) {
        navigationRow.push({ text: "Selanjutnya ➡️", callback_data: `os_page_${page + 1}` });
    }

    if (navigationRow.length > 0) {
        inline_keyboard.push(navigationRow);
    }

    return { text, reply_markup: { inline_keyboard } };
}

// 4. LISTENER UNTUK MENANGKAP KLIK TOMBOL (Taruh di luar command, berdiri sendiri)


    // Jika tombol yang ditekan adalah tombol navigasi OS
// ====================================================
// PANGGIL KONFIGURASI DARI FOLDER DATABASE
// ====================================================
const app = express();
app.use(express.json());

// ====================================================
// DATABASE SEMENTARA & MENU UTAMA
// ====================================================
const userSessions = {}; 
// Database sementara untuk menyimpan voucher aktif
const activeVouchers = {};
// ====================================================
// FUNGSI DATABASE USER (FORMAT BARU)
// ====================================================
const usersFile = path.join(__dirname, 'database', 'users.json');
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({})); // Dibuat dalam bentuk Object {}
}

function getUsers() {
    let data = JSON.parse(fs.readFileSync(usersFile));
    // Keamanan jika format lama terdeteksi, ubah jadi format baru
    if (Array.isArray(data)) data = {}; 
    return data;
}
function saveUsers(data) {
    try {
        // Gunakan variabel usersFile agar searah dengan folder database kamu
        fs.writeFileSync(usersFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("Gagal menyimpan database user:", err.message);
    }
}
// ====================================================
// FUNGSI DATABASE TOKO (STOK VPS)
// ====================================================
const storeFile = path.join(__dirname, 'database', 'store.json');
if (!fs.existsSync(storeFile)) {
    // Default awal jika belum diatur admin
    fs.writeFileSync(storeFile, JSON.stringify({ vps_ram: "1GB", vps_price: 35000, vps_stock: 0 }, null, 2));
}

function getStore() {
    return JSON.parse(fs.readFileSync(storeFile));
}

function updateStore(data) {
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2));
}
// ====================================================
// FUNGSI DATABASE (FORMAT MULTI-SERVER)
// ====================================================
function saveUser(chatId, username) {
    const users = getUsers();
    if (!users[chatId]) {
        users[chatId] = {
            id: chatId,
            username: username,
            servers: [] // <-- SEKARANG MENJADI ARRAY UNTUK MENYIMPAN BANYAK SERVER
        };
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        return true; 
    }
    return false;
}

function updateUserProfile(chatId, paketDibeli, usernamePanel) {
    const users = getUsers();
    if (!users[chatId]) return;
    if (!users[chatId].servers) users[chatId].servers = []; // Migrasi aman

    const now = new Date();
    const expired = new Date();
    expired.setDate(now.getDate() + 30); // Default 30 Hari

    const timeOptions = { timeZone: "Asia/Jakarta", day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };

    // Push data server baru ke dalam array
    users[chatId].servers.push({
        username_panel: usernamePanel,
        paket: paketDibeli,
        order_date: now.toLocaleString("id-ID", timeOptions),
        expired_date: expired.toLocaleString("id-ID", timeOptions),
        expired_timestamp: expired.getTime() // Disimpan dalam hitungan milidetik agar mudah ditambah nanti
    });

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Fungsi Baru: Menambah masa aktif server
function extendServer(chatId, serverIndex, addDays) {
    const users = getUsers();
    if (!users[chatId] || !users[chatId].servers[serverIndex]) return;

    const server = users[chatId].servers[serverIndex];
    const timeOptions = { timeZone: "Asia/Jakarta", day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };

    // Tambah hari ke timestamp expired sebelumnya
    const newExpiredTime = server.expired_timestamp + (addDays * 24 * 60 * 60 * 1000);
    const newExpiredDate = new Date(newExpiredTime);

    server.expired_timestamp = newExpiredTime;
    server.expired_date = newExpiredDate.toLocaleString("id-ID", timeOptions);

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    return server.username_panel; // Kembalikan username panel untuk notif
}
// Fungsi untuk membersihkan teks agar aman dikirim sebagai HTML
function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
const ROLE_START = `Role: Helpful Hosting Assistant. 
Menu yang tersedia: Beli vps, Beli Panel, Patungan Vps, Rental Panel, Install Vps. 
Spek VPS: Intel Xeon Platinum, RAM 16GB, Core 4. 
Keunggulan: Server kami jauh lebih unggul, stabil, dan kencang dari pesaing karna menggunakan Vps yang 100% Legal.
Fitur Unggulan: Voice Note Command Order, Order via Voice Note lebih Cepat, Mudah, dan Hemat karna terdapat diskon potongan harga UpTo Rp. 2000
Keterangan: Arahkan user untuk pergi ke Menu utama untuk melihat semua menu yang tersedia, dan Arahkan user jika mengalami kendala atau ingin pre Order Vps bisa klik Button menu bantuan di bawah ini.`;

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "User"; 
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    // 1. Simpan user & Notif Admin
    const isNewUser = saveUser(chatId, username);
    if (isNewUser) {
        const dateNow = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const notifAdmin = `🎉 *Selamat! User baru telah bergabung*\n\n🆔 ID: \`${chatId}\`\n👤 Username: ${username}\n📅 Waktu: ${dateNow}`;
        bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "Markdown" }).catch(()=>{});
    }

    // 2. Teks Menu
        const menuText = `<blockquote>────✧ <b>ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ</b> ✧
ᴄᴀᴘᴇᴋ ʙᴇʟɪ ᴘᴀɴᴇʟ ᴍᴜʀᴀʜ ᴛᴀᴘɪ ᴛɪᴀᴘ 3-7 ʜᴀʀɪ ꜱᴇʀᴠᴇʀ ᴍᴀᴛɪ/ᴍᴏᴋᴀᴅ? ʙɪʟᴀɴɢ ɴʏᴀ ᴅɪ ʀᴀᴡᴀᴛ ᴛᴀᴘɪ ᴄᴜᴍᴀ ᴍᴀɴɪꜱ ᴅɪ ᴀᴡᴀʟ 
ᴘɪɴᴅᴀʜ ᴋᴇ ꜱᴇʀᴠᴇʀ ᴋᴀᴍɪ! 
ʟᴀʏᴀɴᴀɴ ᴏɴ 24/7ᴊᴀᴍ ᴊᴀʀɪɴɢᴀɴ ᴛᴀɴᴘᴀ ʙᴀᴛᴀꜱ - ꜱᴇᴡᴀ ʙᴜʟᴀɴᴀɴ ʙɪꜱᴀ ᴅɪ ᴘᴇʀᴘᴀɴᴊᴀɴɢ</blockquote>
<blockquote>ᴏʀᴅᴇʀ ᴍᴀᴋɪɴ ʜᴇᴍᴀᴛ ᴅᴇɴɢᴀɴ ᴠᴏɪᴄᴇ ɴᴏᴛᴇ ᴄᴏᴍᴍᴀɴᴅ!</blockquote>
<blockquote>ᴋʟɪᴋ ɪᴋᴏɴ ᴍɪᴄ, ᴜᴄᴀᴘᴋᴀɴ ᴘᴇʀɪɴᴛᴀʜ ᴅɪʙᴀᴡᴀʜ ɪɴɪ ᴜɴᴛᴜᴋ ᴏʀᴅᴇʀ ɪɴꜱᴛᴀɴ :
"ʙᴇʟɪ ᴘᴀɴᴇʟ |ᴘᴀᴋᴇᴛ| ᴜꜱᴇʀɴᴀᴍᴇ |ɴᴀᴍᴀᴘᴀɴᴇʟ| ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ |ᴘᴀʏᴍᴇɴᴛ|"</blockquote>
<blockquote>ᴄᴏɴᴛᴏʜ/: "ʙᴇʟɪ ᴘᴀɴᴇʟ ᴜɴʟɪ ᴜꜱᴇʀɴᴀᴍᴇ ᴀʙᴄ ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ Qʀɪꜱ"</blockquote>
<blockquote>⪼ Runtime : <code>${getRuntime()}</code>
────────────⧽</blockquote>`;

    const keyboardMenuPertama = {
        reply_markup: {
            inline_keyboard: [[{ text: "𝘉𝘶𝘬𝘢 𝘔𝘦𝘯𝘶", callback_data: "mainmenu" }]]
        }
    };

    // 3. Efek Mengetik Dipertahankan!
    bot.sendChatAction(chatId, "typing");

    // 4. Delay 1 Detik & Pengiriman FOTO (Sangat Ringan & Cepat)
    setTimeout(() => {
        // Menggunakan settings.panelImage yang sudah ada di setting.js
        bot.sendPhoto(chatId, settings.panelImage, {
            caption: menuText,
            parse_mode: "HTML",
            ...keyboardMenuPertama
                }).then(async () => {
            try {
                bot.sendChatAction(chatId, "typing");
                
                const userPrompt = `Perkenalkan dirimu bahwa kamu adalah ai asisten yang dikembangkan oleh Boosteryuk untuk melayani customer. Beri penjelasan bahwa server kami lebih unggul dari para pesaing karna menggunakan Vps yang 100% Legal dengan spek Intel Xeon Platinum Ram 16 Core 4. beri emoji agar terlihat hidup`;

                const aiUrl = `https://api.siputzx.my.id/api/ai/glm47flash?prompt=${encodeURIComponent(userPrompt)}&system=${encodeURIComponent(ROLE_START)}&temperature=0.7`;
                
                const res = await axios.get(aiUrl, {
                    timeout: 50000,
                    httpAgent: new http.Agent({ family: 4 }), // Paksa IPv4
                    httpsAgent: new https.Agent({ family: 4 }),
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json'
                    }
                });

                // --- PERBAIKAN PENGAMBILAN DATA ---
                let rawData = "";
                if (res.data && res.data.data && res.data.data.response) {
                    rawData = res.data.data.response;
                } else if (res.data && res.data.data) {
                    rawData = typeof res.data.data === 'string' ? res.data.data : JSON.stringify(res.data.data);
                } else if (res.data && res.data.result) {
                    rawData = res.data.result;
                }

                // --- PROSES PEMBERSIHAN (CLEANING) ---
                let finalResponse = String(rawData)
                    .replace(/\\n/g, '\n') 
                    .replace(/\\"/g, '"')
                    .replace(/&quot;/g, '"')
                    .trim();

                // Hapus petik pembungkus jika ada
                if (finalResponse.startsWith('"') && finalResponse.endsWith('"')) {
                    finalResponse = finalResponse.slice(1, -1).trim();
                }

                // Filter jika JSON bocor
                if (finalResponse.includes('{"') || finalResponse.includes('":')) {
                    const match = finalResponse.match(/"(?:data|result|response|content)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (match && match[1]) {
                        finalResponse = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                    }
                }

                // Escape HTML
                const safeAiText = escapeHTML(finalResponse);

                // --- HANYA KIRIM JIKA ADA HASILNYA ---
                if (safeAiText && safeAiText.length > 2) {
                    bot.sendMessage(chatId, `AI\n\n<blockquote>Halo ${firstName} selamat datang!</blockquote>\n\n<blockquote>${safeAiText}</blockquote>`, {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [[{ text: "💬 𝙱𝚊𝚗𝚝𝚞𝚊𝚗", callback_data: "menu_bantuan" }]]
                        }
                    });
                }

            } catch (err) {
                // Hanya log di console sesuai permintaan
                console.error("AI Fetch Error:", err.message);
            }
}).catch((err) => {
            console.log("Gagal kirim foto start:", err.message);
            bot.sendMessage(chatId, menuText, { parse_mode: "HTML", ...keyboardMenuPertama });
        });
    }, 1000); 
});

const keyboardMenuKedua = {
    inline_keyboard: [
            [
            { text: "🛍 SMM Panel", callback_data: "smm" } // Tombol ke Hal 2
        ], 
        [
            { text: "🛍 𝙱𝚎𝚕𝚒 𝚅𝚙𝚜", callback_data: "menu_vps" },
            { text: "🛍 𝙱𝚎𝚕𝚒 𝙿𝚊𝚗𝚎𝚕", callback_data: "menu_panel" }
        ],
        [
            { text: "💬 𝙱𝚊𝚗𝚝𝚞𝚊𝚗", callback_data: "menu_bantuan" },           
            { text: "👤 𝙿𝚛𝚘𝚏𝚒𝚕", callback_data: "menu_profil" }
        ],
        [
            { text: "➡️ 𝚂𝚎𝚕𝚊𝚗𝚓𝚞𝚝𝚗𝚢𝚊", callback_data: "menu_lainnya" } // Tombol ke Hal 2
        ], 
        [
            { text: "🔎 𝙲𝚎𝚔 𝙸𝚍", callback_data: "cekid" }
        ]
    ]
};
//Fungsi Vn Order

async function processVoiceToOrder(fileLink, chatId) {
    const inputPath = `./database/voice_${chatId}.oga`;
    const outputPath = `./database/voice_${chatId}.mp3`;

    try {
        const response = await axios({ url: fileLink, responseType: 'arraybuffer' });
        fs.writeFileSync(inputPath, response.data);

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath).toFormat('mp3').on('end', async () => {
                try {
                    // Gunakan .trim() untuk pastikan tidak ada spasi di API KEY
                    const apiKey = settings.assemblyApiKey.trim();

                    // 1. Upload
                    const audioData = fs.readFileSync(outputPath);
                    const uploadRes = await axios.post('https://api.assemblyai.com/v2/upload', audioData, {
                        headers: { 
                            "authorization": apiKey, 
                            "content-type": "application/octet-stream" 
                        }
                    });

                    // 2. Minta Transkripsi (DIPERBAIKI DI SINI)
const transcriptRes = await axios.post('https://api.assemblyai.com/v2/transcript', {
    audio_url: uploadRes.data.upload_url,
    language_code: "id", // Bahasa Indonesia
    // PERBAIKAN: Masukkan dua model dalam array sesuai saran error tadi
    speech_models: ["universal-3-pro", "universal-2"] 
}, { 
    headers: { "authorization": apiKey } 
});

                    const transcriptId = transcriptRes.data.id;
                    let text = "";
                    
                    // 3. Polling
                    for (let i = 0; i < 30; i++) {
                        const pollingRes = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                            headers: { "authorization": apiKey }
                        });
                        
                        if (pollingRes.data.status === 'completed') {
                            text = pollingRes.data.text.toLowerCase();
                            break;
                        } else if (pollingRes.data.status === 'error') {
                            throw new Error("AI Error: " + pollingRes.data.error);
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    resolve(text);
                } catch (e) { 
                    // Cetak error lengkap ke console jika gagal
                    console.log("LOG ERROR:", e.response?.data || e.message);
                    reject(e); 
                }
            }).save(outputPath);
        });
    } catch (err) {
        throw err;
    }
}
//uji coba
async function autoCreatePanelTimed(chatId, namaPaket, durasiJam, isTrial = false) {
    const genRandom = (len) => Math.random().toString(36).substring(2, 2 + len);
    const username = (isTrial ? "trial" : "hr") + genRandom(4);
    const password = "PW" + genRandom(8).toUpperCase();
    const email = `${username}@timed.bot`;
    
    const headersPtero = {
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${settings.plta}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    };

    try {
        // --- 1. CREATE USER ---
        const resUser = await fetch(`${settings.domain}/api/application/users`, {
            method: "POST",
            headers: headersPtero, 
            body: JSON.stringify({ email, username, first_name: username, last_name: "Timed", language: "en", password })
        });

        if (!resUser.ok) {
            const errLog = await resUser.text();
            console.log("Error Create User:", errLog);
            throw new Error(`Cloudflare/Server Error: ${resUser.status}`);
        }
        const dataUser = await resUser.json();
        const user = dataUser.attributes;

        // --- 2. CREATE SERVER ---
        const resServer = await fetch(`${settings.domain}/api/application/servers`, {
            method: "POST",
            headers: headersPtero, 
            body: JSON.stringify({
                name: username + "_Timed",
                user: user.id,
                egg: parseInt(settings.eggs),
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
                startup: "npm start",
                environment: { USER_UPLOAD: "0", AUTO_UPDATE: "0", MAIN_FILE: "index.js" },
                limits: { memory: 500, swap: 0, disk: 500, io: 500, cpu: 50 },
                feature_limits: { databases: 1, backups: 1, allocations: 1 },
                deploy: { locations: [parseInt(settings.loc)], dedicated_ip: false, port_range: [] }
            })
        });

        if (!resServer.ok) throw new Error("Banyak user sedang membuat Server di Pterodactyl, Coba lagi nanti.");
        const dataServer = await resServer.json();
        const server = dataServer.attributes;

        // --- 3. PROSES SIMPAN DATABASE (SAFETY MODE) ---
        const dbTimed = getTimedServers(); 
        const expiredDate = new Date();
        expiredDate.setHours(expiredDate.getHours() + durasiJam);

        // SAFETY CHECK: Pastikan .slots adalah Array sebelum .push
        if (!dbTimed.slots || !Array.isArray(dbTimed.slots)) {
            dbTimed.slots = [];
        }

        dbTimed.slots.push({
            chatId, 
            serverId: server.id, 
            userId: user.id,
            expiredAt: expiredDate.toISOString(), 
            type: isTrial ? "TRIAL" : "HOURLY"
        });

        // SAFETY CHECK: Update Counter Trial
        if (isTrial) {
            if (!dbTimed.trialHistory) dbTimed.trialHistory = {};
            dbTimed.trialHistory[chatId] = (dbTimed.trialHistory[chatId] || 0) + 1;
            
            // Log sukses ke Admin
            bot.sendMessage(settings.adminId, `✅ <b>TRIAL BERHASIL:</b> User ${chatId} (@${user.username}) telah menggunakan jatah ke-${dbTimed.trialHistory[chatId]}`);
        }

        saveTimedServers(dbTimed);

        // --- 4. NOTIFIKASI SUKSES ---
        const textSuccess = `<blockquote>( ✅ ) - <b>ᴜᴊɪ ᴄᴏʙᴀ ʙᴇʀʜᴀꜱɪʟ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ</b></blockquote>
<blockquote>🌐 ʟᴏɢɪɴ: ${settings.domain}
👤 ᴜꜱᴇʀɴᴀᴍᴇ: <code>${user.username}</code>
🔐 ᴘᴀꜱꜱᴡᴏʀᴅ: <code>${password}</code>

⏳ ᴅᴜʀᴀꜱɪ: <b>${durasiJam} ᴊᴀᴍ</b>
<i>ᴘᴀɴᴇʟ ᴀᴋᴀɴ ᴏᴛᴏᴍᴀᴛɪꜱ ᴅɪʜᴀᴘᴜꜱ ꜱᴀᴀᴛ ᴡᴀᴋᴛᴜ ʜᴀʙɪꜱ.</i></blockquote>`;

        bot.sendMessage(chatId, textSuccess, { parse_mode: "HTML" });

    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
        bot.sendMessage(chatId, `⚠️ <b>ᴛᴇʀᴊᴀᴅɪ ᴋᴇꜱᴀʟᴀʜᴀɴ:</b> ${error.message}\n\n<i>Hubungi Admin</i>`, { parse_mode: "HTML" });
    }
}
// ====================================================
// FUNGSI AUTO CREATE PANEL PTERODACTYL
// ====================================================
async function autoCreatePanel(chatId, username, namaPaket) {
    bot.sendMessage(chatId, `⏳ Sedang memproses pembuatan panel untuk username: \`${username}\`...`, { parse_mode: "Markdown" });

    // 1. DETEKSI SPESIFIKASI BERDASARKAN PAKET
    let memo = "0"; let cpu = "0"; let disk = "0";

    if (namaPaket.includes("Started 1GB")) { memo = "1024"; cpu = "50"; disk = "10240"; }
    else if (namaPaket.includes("Started 2GB")) { memo = "2048"; cpu = "100"; disk = "20480"; }
    else if (namaPaket.includes("Medium 6GB")) { memo = "6144"; cpu = "150"; disk = "51200"; }
    else if (namaPaket.includes("Medium 8GB")) { memo = "8192"; cpu = "200"; disk = "71680"; }
    else if (namaPaket.includes("PRO")) { memo = "0"; cpu = "0"; disk = "0"; } // 0 = Unlimited

    // 2. PERSIAPAN HEADER & DATA
    // Menambahkan User-Agent agar tidak diblokir Cloudflare
    const headersPtero = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.plta}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    };

    const name = username + "_" + namaPaket.replace(/\s+/g, '');
    const email = `${username}@Buyeradmin`;
    const password = `${username}001`;
    const spc = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';

    let user;
    let server;

    try {
        // --- CREATE USER ---
        const resUser = await fetch(`${settings.domain}/api/application/users`, {
            method: "POST",
            headers: headersPtero,
            body: JSON.stringify({
                email: email, username: username, first_name: username, last_name: username, language: "en", password: password
            })
        });
        
        // Cek jika response bukan JSON (Blokir Cloudflare)
        if (!resUser.ok) {
            const errBody = await resUser.text();
            console.log("Error Ptero User:", errBody);
            throw new Error(`Status ${resUser.status}. Cek log console.`);
        }

        const dataUser = await resUser.json();

        if (dataUser.errors) {
            console.log("Pterodactyl API Error (User):", dataUser.errors);
            bot.sendMessage(chatId, `⚠️ Gagal membuat user. Mungkin username/email sudah terdaftar, Silakan hubungi admin untuk konfirmasi lebih lanjut.\nError: ${dataUser.errors[0].detail}`);
            return;
        }
        user = dataUser.attributes;

        // --- CREATE SERVER ---
        const resServer = await fetch(`${settings.domain}/api/application/servers`, {
            method: "POST",
            headers: headersPtero,
            body: JSON.stringify({
                name: name,
                description: "Auto Deploy by Bot",
                user: user.id,
                egg: parseInt(settings.eggs),
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
                startup: spc,
                environment: {
                    USER_UPLOAD: "0", AUTO_UPDATE: "0", MAIN_FILE: "index.js", NODE_PACKAGES: "", UNNODE_PACKAGES: "", GIT_ADDRESS: "", BRANCH: "", USERNAME: "", ACCESS_TOKEN: "", NODE_ARGS: ""
                },
                limits: { memory: parseInt(memo), swap: 0, disk: parseInt(disk), io: 500, cpu: parseInt(cpu) },
                feature_limits: { databases: 5, backups: 5, allocations: 1 },
                deploy: { locations: [parseInt(settings.loc)], dedicated_ip: false, port_range: [] }
            })
        });

        if (!resServer.ok) {
            const errBody = await resServer.text();
            console.log("Error Ptero Server:", errBody);
            throw new Error(`Status ${resServer.status}. Gagal membuat Server.`);
        }

        const dataServer = await resServer.json();

        if (dataServer.errors) {
            console.log("Pterodactyl API Error (Server):", dataServer.errors);
            bot.sendMessage(chatId, `⚠️ User terbuat, tapi gagal membuat Server, Silakan hubungi admin.\nError: ${dataServer.errors[0].detail}`);
            return;
        }
        server = dataServer.attributes;

    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Terjadi error sistem: ${error.message}`);
        return;
    }

    // 3. KIRIM HASIL KE PEMBELI JIKA SUKSES
    if (user && server) {
        updateUserProfile(chatId, namaPaket, user.username);
        const textSuccess = `<blockquote>✅ <b>BERHASIL MEMBUAT PANEL!</b>

🌐 Login: ${settings.domain}
👤 Username: <code>${user.username}</code>
🔐 Password: <code>${password}</code>

🖥 <b>Spesifikasi Server:</b>
- Paket: ${namaPaket}
- Memory: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory + " MB"}
- CPU: ${server.limits.cpu === 0 ? "Unlimited" : server.limits.cpu + " %"}
- Disk: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk + " MB"}

<i>Harap simpan data ini dengan baik.</i></blockquote>`;

        if (settings.pp) {
            bot.sendAnimation(chatId, settings.pp, { caption: textSuccess, parse_mode: "HTML" });
        } else {
            bot.sendMessage(chatId, textSuccess, { parse_mode: "HTML" });
        }
    }
}

// ====================================================
// FUNGSI BANTUAN: LOGIN KE OPENSTACK HOSTVDS
// Mengembalikan { token, computeUrl }
// ====================================================
async function getHostvdsToken() {
    try {
        const authPayload = {
            auth: {
                identity: {
                    methods: ["password"],
                    password: {
                        user: {
                            name: settings.hostvds.username,
                            domain: { id: settings.hostvds.domainId },
                            password: settings.hostvds.password
                        }
                    }
                },
                scope: {
                    project: {
                        name: settings.hostvds.projectName,
                        domain: { id: settings.hostvds.domainId }
                    }
                }
            }
        };

        // Tembak Login Keystone v3
        const res = await axios.post(`${settings.hostvds.authUrl}/auth/tokens`, authPayload);
        const token = res.headers['x-subject-token'];
        
        // Ekstrak Catalog untuk mencari URL Nova Compute Region Amsterdam
        const catalog = res.data.token.catalog;
        const computeService = catalog.find(c => c.type === 'compute');
        
        if (!computeService) throw new Error("Layanan Compute tidak ditemukan di HostVDS!");

        let endpoint = computeService.endpoints.find(e => e.interface === 'public' && e.region === settings.hostvds.region);
        if (!endpoint) endpoint = computeService.endpoints.find(e => e.interface === 'public');

        return { token: token, computeUrl: endpoint.url };

    } catch (err) {
        console.error("ERROR LOGIN HOSTVDS:", err.response ? JSON.stringify(err.response.data) : err.message);
        throw new Error("Gagal login ke OpenStack HostVDS. Cek kredensial di settings.js!");
    }
}

// ====================================================
// FITUR ADMIN: AMBIL ID OS DARI HOSTVDS
// ====================================================
// 3. COMMAND /getos YANG SUDAH DIUBAH
bot.onText(/^\/getos/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(settings.adminId)) return;

    const waitMsg = await bot.sendMessage(chatId, "⏳ <i>Login ke HostVDS dan mengambil data OS...</i>", { parse_mode: "HTML" });
    
    try {
        const hostvds = await getHostvdsToken();

        const res = await axios.get(`${hostvds.computeUrl}/images`, {
            headers: { "X-Auth-Token": hostvds.token }
        });
        
        // Simpan data array OS ke dalam cache berdasarkan chatId
        osDataCache[chatId] = res.data.images;

        // Buat tampilan untuk Halaman 1
        const pageContent = generateOSPage(chatId, 1);
        
        if (!pageContent) {
             return bot.editMessageText("❌ Data kosong.", { chat_id: chatId, message_id: waitMsg.message_id });
        }

        bot.editMessageText(pageContent.text, { 
            chat_id: chatId, 
            message_id: waitMsg.message_id, 
            parse_mode: "HTML",
            reply_markup: pageContent.reply_markup
        });

    } catch (err) {
        bot.editMessageText(`❌ Gagal mengambil OS:\n${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

// ====================================================
// COMMAND BROADCAST VOUCHER PROMO (DENGAN PANDUAN)
// ====================================================
// ====================================================
// KODE VN PROMO ON/OFF/SET
// ====================================================

bot.onText(/^\/vnpromo (on|off|set)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId !== Number(settings.adminId)) return; // Hanya untuk admin

    const action = match[1];
    const args = msg.text.split(' ')[2];

    if (action === 'on') {
        settings.vnPromo.active = true;
        await bot.sendMessage(chatId, "<blockquote>✅ <b>Promo Diskon VN diaktifkan!</b></blockquote>", { parse_mode: "HTML" });
    } 
    else if (action === 'off') {
        settings.vnPromo.active = false;
        await bot.sendMessage(chatId, "<blockquote>❌ <b>Promo Diskon VN dimatikan!</b></blockquote>", { parse_mode: "HTML" });
    }
    else if (action === 'set' && args) {
        settings.vnPromo.discount = parseInt(args);
        await bot.sendMessage(chatId, `<blockquote>⚙️ <b>Nominal diskon VN diatur ke: Rp ${args}</b></blockquote>`, { parse_mode: "HTML" });
    }
});


bot.onText(/^\/addvoucher(?:\s+(.*))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(settings.adminId)) return;

    // 1. CEK JIKA ADMIN HANYA KETIK /sebarvoucher ATAU FORMAT SALAH
    const args = match[1] ? match[1].split(" ") : [];

    if (args.length < 5) {
        const panduanMsg = `<blockquote>⚠️ <b>FORMAT PERINTAH SALAH!</b>\n━━━━━━━━━━━━━━━━━━\n\nUntuk menyebar voucher diskon, gunakan format berikut:\n\n<code>/addvoucher [Kode_Voucher] [Diskon_%] [Kuota] [Nama_Paket] [Harga_Normal]</code>\n\n<b>📌 Contoh Penggunaan:</b>\n<code>/addvoucher RAMADHAN 50 10 Started_1GB 5000</code>\n\nDAFTAR PAKET:\nStarted_1GB\nStarted_2GB\nMedium_6GB\nMedium_8GB\nPRO_Unlimited\n\n<i>Keterangan:</i>\n- <b>RAMADHAN</b>: Nama kode voucher.\n- <b>50</b>: Diskon 50%.\n- <b>10</b>: Hanya berlaku untuk 10 orang tercepat.\n- <b>Started_1GB</b>: Nama paket (Gunakan garis bawah <code>_</code> untuk spasi).\n- <b>5000</b>: Harga asli paket sebelum diskon.</blockquote>`;
        
        return bot.sendMessage(chatId, panduanMsg, { parse_mode: "HTML" });
    }

    // 2. AMBIL VARIABEL DARI INPUT ADMIN
    const kodeVoucher = args[0].toUpperCase();
    const diskonPersen = parseInt(args[1]);
    const kuota = parseInt(args[2]);
    const namaPaket = args[3].replace(/_/g, " "); // Mengubah garis bawah kembali jadi spasi
    const hargaAsli = parseInt(args[4]);

    // Validasi angka agar tidak error
    if (isNaN(diskonPersen) || isNaN(kuota) || isNaN(hargaAsli)) {
        return bot.sendMessage(chatId, "⚠️ Diskon, Kuota, dan Harga Asli harus berupa angka!", { parse_mode: "HTML" });
    }

    // 3. SIMPAN VOUCHER KE MEMORI
    activeVouchers[kodeVoucher] = {
        diskon: diskonPersen,
        sisaKuota: kuota,
        paket: namaPaket,
        hargaNormal: hargaAsli
    };

    const users = getUsers();
    const userIds = Array.isArray(users) ? users : Object.keys(users);

    await bot.sendMessage(chatId, `⏳ Mengirim Voucher <b>${kodeVoucher}</b> ke <b>${userIds.length}</b> user...`, { parse_mode: "HTML" });

    // ====================================================
    // 4. FORMAT TANGGAL DAN JAM SAAT INI (WIB)
    // ====================================================
    const now = new Date();
    // Mengatur zona waktu ke Asia/Jakarta (WIB)
    const tglOptions = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const jamOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    
    const tanggalStr = now.toLocaleDateString('id-ID', tglOptions); // Hasil: 15 Mei 2024
    const jamStr = now.toLocaleTimeString('id-ID', jamOptions).replace(/\./g, ':'); // Hasil: 14:30
    
    // Gabungkan Tanggal dan Jam
    const waktuBroadcast = `${tanggalStr} | ${jamStr} WIB`;

    // 5. FORMAT PESAN BROADCAST QUOTE (Dengan Tanggal & Jam)
    const broadcastMsg = `<blockquote>🎉 <b>VOUCHER DISKON SPESIAL!</b>
━━━━━━━━━━━━━━━━━━

Kode Voucher : <b>${kodeVoucher}</b>
Diskon <b>${diskonPersen}%</b>
Produk : Panel Pterodactyl paket <b>${namaPaket}</b>!

<i>Voucher Tersedia : ${kuota}

📆 <i>Diterbitkan : ${waktuBroadcast}</i></i></blockquote>`;

    const broadcastOptions = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: `🎟 𝘉𝘦𝘭𝘪 𝘥𝘦𝘯𝘨𝘢𝘯 𝘝𝘰𝘶𝘤𝘩𝘦𝘳`, callback_data: `klaimvc_${kodeVoucher}` }]
            ]
        }
    };

    // 6. EKSEKUSI PENGIRIMAN (LOOPING AMAN)
    let sukses = 0;
    for (const userId of userIds) {
        try {
            await bot.sendMessage(userId, broadcastMsg, broadcastOptions);
            sukses++;
        } catch (error) {}
        await delay(50); // Jeda anti-banned Telegram
    }

    bot.sendMessage(chatId, `<blockquote>✅ <b>Broadcast Voucher Selesai!</b>\nBerhasil terkirim ke ${sukses} user.</blockquote>`, { parse_mode: "HTML" });
});
// ====================================================
// FITUR ADMIN: AMBIL ID SPEK (FLAVOR) DARI HOSTVDS
// ====================================================
bot.onText(/^\/getspek/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(settings.adminId)) return;

    const waitMsg = await bot.sendMessage(chatId, "⏳ <i>Login ke HostVDS dan mengambil data Spek...</i>", { parse_mode: "HTML" });
    
    try {
        const hostvds = await getHostvdsToken();

        // Tembak API Asli HostVDS (Bukan baseUrl lagi)
        const res = await axios.get(`${hostvds.computeUrl}/flavors/detail`, {
            headers: { "X-Auth-Token": hostvds.token }
        });
        
        let text = "⚙️ <b>DAFTAR ID SPEK HOSTVDS</b>\n\n";
        res.data.flavors.forEach(f => {
            text += `<b>${f.name}</b> (RAM: ${f.ram}MB, CPU: ${f.vcpus})\nID: <code>${f.id}</code>\n\n`;
        });
        
        bot.editMessageText(text, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "HTML" });
    } catch (err) {
        bot.editMessageText(`❌ Gagal mengambil Spek:\n${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

//handlePaymentSuccess

async function handlePaymentSuccess(chatId, session, orderId, messageId = null) {
    try {
        // --- 1. JIKA USER DEPOSIT ---
        if (session.type === "deposit") {
            const saldoBaru = updateSaldo(chatId, session.amount);
            const textSukses = `<blockquote>✅ <b>DEPOSIT BERHASIL!</b>\n\n` +
                             `💰 Saldo Masuk: <b>Rp ${parseInt(session.amount).toLocaleString()}</b>\n` +
                             `💳 Total Saldo: <b>Rp ${saldoBaru.toLocaleString()}</b>\n\n` +
                             `Terima kasih sudah melakukan top up!</blockquote>`;

            if (messageId) await bot.editMessageText(textSukses, { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }).catch(()=>{});
            else bot.sendMessage(chatId, textSukses, { parse_mode: "HTML" });

            bot.sendMessage(settings.adminId, `<blockquote>💰 <b>INCOME: DEPOSIT SALDO</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n💵 Nominal: Rp ${parseInt(session.amount).toLocaleString()}\n🧾 Order ID: <code>${orderId}</code></blockquote>`, { parse_mode: "HTML" });
        } 
        
        // --- 2. JIKA PERPANJANG PANEL ---
        else if (session.type === "extend") {
            const panelUser = extendServer(chatId, session.serverIndex, session.days);
            const textSukses = `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\nPanel <code>${panelUser}</code> telah diperpanjang selama ${session.days} hari.</blockquote>`;

            if (messageId) await bot.editMessageCaption(textSukses, { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }).catch(() => {});
            else bot.sendMessage(chatId, textSukses, { parse_mode: "HTML" });

            bot.sendMessage(settings.adminId, `<blockquote>💸 <b>INCOME: PERPANJANG PANEL</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n🖥 Panel: <code>${panelUser}</code>\n⏳ Tambah: ${session.days} Hari</blockquote>`, { parse_mode: "HTML" });
        } 

        // --- 3. JIKA USER IKUT PATUNGAN VPS (FITUR UTAMA) ---
        else if (session.type === "patungan") {
            const textSukses = `<blockquote>🎉 <b>PEMBAYARAN BERHASIL!</b>\n\nAnda resmi menjadi <b>${session.role}</b> di kelompok patungan ini. Memproses data...</blockquote>`;
            
            if (messageId) await bot.editMessageCaption(textSukses, { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }).catch(() => {});
            else bot.sendMessage(chatId, textSukses, { parse_mode: "HTML" });

            let dbPatungan = getPatungan();
            let room = dbPatungan[session.roomId];

            // A. JIKA ROOM BELUDA ADA (PEMBAYARAN CEO PERTAMA)
            if (!room) {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + (session.durasi || 24));

                dbPatungan[session.roomId] = {
                    id: session.roomId,
                    paket: session.paket,
                    targetHarga: session.hargaVps, // Harga asli VPS (misal 35k)
                    current: 0,
                    mode: session.mode, // 'atur' atau 'flex'
                    slot: session.slot || 999,
                    members: [],
                    status: "OPEN",
                    expiresAt: expiresAt.toISOString(),
                    captainId: chatId
                };
                room = dbPatungan[session.roomId];
            }

            // B. TAMBAHKAN MEMBER BARU
            const newUser = {
                id: chatId,
                username: session.username_tg || "User",
                amount: session.harga, // Nominal yang dibayar (bisa hasil bagi atau input manual)
                role: session.role
            };

            room.members.push(newUser);
            room.current += newUser.amount;
            savePatungan(dbPatungan);

            // C. NOTIFIKASI KE MEMBER LAIN & ADMIN
            sendJoinNotification(room, newUser);

            const notifAdmin = `<blockquote>🤝 <b>INCOME: JOIN PATUNGAN</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n🎖 Role: <b>${session.role}</b>\n📦 Paket: ${session.paket}\n📈 Progres: Rp ${room.current}/${room.targetHarga}\n⏳ Mode: ${session.mode.toUpperCase()}</blockquote>`;
            bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

            // D. CEK JIKA DANA SUDAH TERKUMPUL (GOAL)
            if (room.current >= room.targetHarga) {
                room.status = "PROCESSING";
                savePatungan(dbPatungan);

                room.members.forEach(m => {
                    bot.sendMessage(m.id, `<blockquote>🔥 <b>DANA TERKUMPUL!</b>\n\nTarget Rp ${room.targetHarga.toLocaleString()} terpenuhi. VPS akan segera dibuat oleh sistem. Kapten (CEO) akan menerima datanya.</blockquote>`, { parse_mode: "HTML" }).catch(()=>{});
                });

                bot.sendMessage(settings.adminId, `<blockquote>🚀 <b>PATUNGAN SELESAI (FULL)</b>\nRoom: <code>${session.roomId}</code>\n\nDana sudah terkumpul penuh. Segera eksekusi pembuatan VPS.</blockquote>`, { parse_mode: "HTML" });
            }
        }

        // --- 4. JIKA VPS BARU ---
        else if (session.type === "vps") {
            const textSukses = `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\n\nVPS Anda sedang dideploy otomatis...</blockquote>`;
            if (messageId) await bot.editMessageCaption(textSukses, { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }).catch(() => {});
            else bot.sendMessage(chatId, textSukses, { parse_mode: "HTML" });

            bot.sendMessage(settings.adminId, `<blockquote>🖥️ <b>INCOME: VPS BARU</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n📦 Paket: ${session.paket}\n🧾 Order ID: <code>${orderId}</code></blockquote>`, { parse_mode: "HTML" });
            autoCreateVPS(chatId, session.username, session.paket);
        }

        // --- 5. JIKA JASA INSTALL ---
        else if (session.type === "jasa_install") {
            bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN JASA SUKSES!</b>\n\nSilakan kirimkan <b>IP VPS</b> Anda:</blockquote>`, { parse_mode: "HTML" });
            bot.sendMessage(settings.adminId, `<blockquote>🛠️ <b>INCOME: JASA INSTALL</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n🧾 Order ID: <code>${orderId}</code></blockquote>`, { parse_mode: "HTML" });
            userSessions[chatId] = { type: "install", step: "awaiting_install_ip" };
            return; 
        }

        // --- 6. DEFAULT (PANEL BARU) ---
        else {
            const textSukses = `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\n\nPanel Pterodactyl Anda sedang dibuat...</blockquote>`;
            if (messageId) await bot.editMessageCaption(textSukses, { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }).catch(() => {});
            else bot.sendMessage(chatId, textSukses, { parse_mode: "HTML" });

            bot.sendMessage(settings.adminId, `<blockquote>📦 <b>INCOME: PANEL BARU</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n👤 User: <code>${session.username}</code>\n🧾 Order ID: <code>${orderId}</code></blockquote>`, { parse_mode: "HTML" });
            autoCreatePanel(chatId, session.username, session.paket);
        }

        delete userSessions[chatId];

    } catch (e) {
        console.log("Error handlePaymentSuccess:", e);
        bot.sendMessage(settings.adminId, `⚠️ <b>ERROR HANDLER:</b> ${e.message}`);
    }
}
// ====================================================
// FUNGSI AUTO CREATE VPS (HOSTVDS) - FULL REAL API
// ====================================================
async function autoCreateVPS(chatId, vpsName, namaPaket) {
    bot.sendMessage(chatId, `⏳ Sedang mendeploy VPS \`${vpsName}\` di datacenter Amsterdam. Proses ini memakan waktu 1-2 menit...`, { parse_mode: "Markdown" });

    // 1. MAPPING ID SPEK ASLI DARI HOSTVDS
    let flavorId = ""; 
    if (namaPaket.includes("1GB")) flavorId = "f5ea1bc8-de85-437f-8b89-6c2bdd11bba5"; 
    else if (namaPaket.includes("2GB")) flavorId = "68b6357b-8c89-4ab7-a845-5afbd24852c6";
    else if (namaPaket.includes("4GB")) flavorId = "c356a6fe-ebff-4c44-aa1f-ada1d93023cc";

    // 👉 TUGAS ANDA: Ganti tulisan di bawah ini dengan ID hasil dari /getos
    let imageId = "c54a6fb6-1bc6-490b-a5cd-9559232c9a3f"; 

    // 2. GENERATE PASSWORD ACAK YANG AMAN
    const randomAngka = Math.floor(1000 + Math.random() * 9000);
    const passwordVps = `Root@${vpsName}${randomAngka}!`;

    try {
        // 3. LOGIN KE HOSTVDS (Otomatis dapat Token & URL Datacenter)
        const hostvds = await getHostvdsToken();

        // 4. SUSUN PERINTAH PEMBUATAN SERVER
        const payload = {
            server: {
                name: vpsName,
                imageRef: imageId,
                flavorRef: flavorId,
                networks: "auto", // Minta IP Publik otomatis
                adminPass: passwordVps // Pasang password kita
            }
        };

        // 5. TEMBAK API CREATE SERVER
        const res = await axios.post(`${hostvds.computeUrl}/servers`, payload, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-Token": hostvds.token // Gunakan tiket masuk yang baru
            }
        });

        const serverData = res.data.server;
        const ipAddress = serverData.accessIPv4 || "Sedang dialokasikan (Tunggu 1 menit)";

        // 6. KIRIM HASILNYA KE PEMBELI
                const textSuccess = `<blockquote>✅ <b>VPS BERHASIL DIDEPLOY!</b>

🖥 <b>Detail Server:</b>
├ Nama: <code>${serverData.name}</code>
├ Paket: ${namaPaket}
└ Status: <b>Active / Booting</b>

🌐 <b>Detail Akses (SSH):</b>
├ IP Address: <code>${ipAddress}</code>
├ Username: <code>root</code>
└ Password: <code>${passwordVps}</code>

<i>Catatan: Jika IP belum muncul, silakan tunggu 1-2 menit karena server sedang dalam proses instalasi Sistem Operasi. Gunakan aplikasi Termius/Putty/Termux untuk login.</i></blockquote>`;

        bot.sendMessage(chatId, textSuccess, { parse_mode: "HTML" });

        // (Opsional) Update Profil User di Bot
        const currentStore = getStore();
        if (currentStore.vps_stock > 0) {
            currentStore.vps_stock -= 1;
            updateStore(currentStore);
        }
        // updateUserProfile(chatId, namaPaket, vpsName);

    } catch (error) {
        console.error("ERROR CREATE VPS:", error.response ? JSON.stringify(error.response.data) : error.message);
        bot.sendMessage(chatId, "⚠️ *Gagal mendeploy VPS!* Stok mungkin habis. Silakan hubungi Admin.", { parse_mode: "Markdown" });
    }
}
// ====================================================
// FUNGSI AUTO INSTALL PTERODACTYL VIA SSH
// ====================================================
async function runPterodactylInstaller(chatId, ip, password, domain) {
    const conn = new Client();
    
    // Generate Akun Admin Panel Default
    const adminEmail = `admin@${domain}`;
    const adminUser = "admin";
    const adminPass = "Admin@" + Math.floor(1000 + Math.random() * 9000) + "!";

    // Lapor bahwa bot sedang mencoba masuk
    await bot.sendMessage(chatId, `<blockquote>🔄 <b>Menghubungkan ke VPS...</b>\n━━━━━━━━━━━━━━━━━━\nMencoba login SSH ke IP <code>${ip}</code>...</blockquote>`, { parse_mode: "HTML" });

    // JIKA BERHASIL LOGIN
    conn.on('ready', () => {
        bot.sendMessage(chatId, `<blockquote>✅ <b>Koneksi SSH Berhasil!</b>\n━━━━━━━━━━━━━━━━━━\nBot sedang melakukan instalasi Pterodactyl & Wings di background.\n\n☕️ <i>Proses ini memakan waktu sekitar 5 - 15 menit. Silakan tinggalkan chat ini sejenak, kami akan mengabari Anda jika sudah selesai.</i></blockquote>`, { parse_mode: "HTML" });

        // ==========================================
        // BASH SCRIPT (Perintah Linux Otomatis)
        // Catatan: Script ini menggunakan instalasi standar (bisa kamu ganti dengan script curl installer favoritmu/andalanmu)
        // ==========================================
        // ==========================================
        // BASH SCRIPT: AUTO INSTALL PTERODACTYL (MODE SILUMAN)
        // ==========================================
        const cmd = `
            export DEBIAN_FRONTEND=noninteractive;
            
            # 1. Update OS & Install Kebutuhan Dasar
            apt-get update -y && apt-get upgrade -y;
            apt-get install -y curl wget tar unzip git redis-server mariadb-server nginx certbot python3-certbot-nginx sudo;

            # 2. Install PHP 8.1 (Wajib untuk Pterodactyl)
            apt -y install software-properties-common apt-transport-https ca-certificates gnupg;
            LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php;
            apt-get update -y;
            apt-get install -y php8.1 php8.1-{common,cli,gd,mysql,mbstring,bcmath,xml,fpm,curl,zip};

            # 3. Install Composer
            curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer;

            # 4. Setup Database MariaDB (Otomatis)
            mysql -u root -e "CREATE DATABASE panel;";
            mysql -u root -e "CREATE USER 'pterodactyl'@'127.0.0.1' IDENTIFIED BY 'PteroPassword123!';";
            mysql -u root -e "GRANT ALL PRIVILEGES ON panel.* TO 'pterodactyl'@'127.0.0.1' WITH GRANT OPTION;";
            mysql -u root -e "FLUSH PRIVILEGES;";

            # 5. Download Panel Pterodactyl
            mkdir -p /var/www/pterodactyl;
            cd /var/www/pterodactyl;
            curl -Lo panel.tar.gz https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz;
            tar -xzvf panel.tar.gz;
            chmod -R 755 storage/* bootstrap/cache/;

            # 6. Konfigurasi Environment (.env)
            cp .env.example .env;
            COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader;
            php artisan key:generate --force;

            # Inject Data ke .env
            sed -i "s/APP_URL=http:\\/\\/localhost/APP_URL=https:\\/\\/${domain}/g" .env;
            sed -i "s/DB_PASSWORD=/DB_PASSWORD=PteroPassword123!/g" .env;

            # 7. Migrasi Database & Buat Akun Admin
            php artisan migrate --seed --force;
            php artisan p:user:make --email="${adminEmail}" --username="${adminUser}" --name-first="Admin" --name-last="Ganteng" --password="${adminPass}" --admin=1;

            # Set Kepemilikan Folder
            chown -R www-data:www-data /var/www/pterodactyl/*;

            # 8. Setup SSL (Gembok Hijau) & Nginx
            # PENTING: Perintah ini akan ERROR jika domain belum di pointing ke IP VPS!
            systemctl stop nginx;
            certbot certonly --standalone --non-interactive --agree-tos -m "${adminEmail}" -d "${domain}";

            # Download Config Nginx Pterodactyl
            curl -o /etc/nginx/sites-available/pterodactyl.conf https://raw.githubusercontent.com/pterodactyl/architecture/master/configs/nginx/pterodactyl.conf;
            sed -i "s/<domain>/${domain}/g" /etc/nginx/sites-available/pterodactyl.conf;
            ln -s /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/pterodactyl.conf;
            rm /etc/nginx/sites-enabled/default;

            systemctl restart nginx;

            # 9. Setup Cronjob & Worker
            echo "* * * * * php /var/www/pterodactyl/artisan schedule:run >> /dev/null 2>&1" | crontab -u www-data -;
            
            # Selesai! Mengirim sinyal sukses ke Bot Telegram
            echo "DONE_INSTALL";
        `;

        // Eksekusi Perintah
        conn.exec(cmd, (err, stream) => {
            if (err) {
                bot.sendMessage(chatId, `<blockquote>❌ <b>INSTALASI GAGAL!</b>\n━━━━━━━━━━━━━━━━━━\nTerjadi kesalahan saat mengeksekusi perintah di VPS Anda.</blockquote>`, { parse_mode: "HTML" });
                return conn.end();
            }

            stream.on('close', (code, signal) => {
                conn.end(); // Tutup koneksi SSH
                
                // Jika proses bash selesai dengan sukses (code 0)
                                if (code === 0) {
                    // 1. Kirim Pesan Sukses Panel
                    const textSuccess = `<blockquote>🎉 <b>INSTALASI PANEL SELESAI!</b>
━━━━━━━━━━━━━━━━━━
🌐 <b>URL Panel:</b> https://${domain}
👤 <b>Username:</b> <code>${adminUser}</code>
🔐 <b>Password:</b> <code>${adminPass}</code>

⚠️ <b>TAHAP AKHIR (INSTALL WINGS):</b>
Bot membutuhkan <b>Kode Konfigurasi Node</b> agar server bisa dinyalakan.

<b>Langkah-langkah:</b>
1. Login ke URL Panel di atas.
2. Ke menu Admin (Ikon Gear) ➔ Locations ➔ Create New.
3. Ke menu Nodes ➔ Create New ➔ Isi FQDN dengan <code>${domain}</code>.
4. Pergi ke tab <b>Configuration</b> pada Node yang baru dibuat.
5. Copy kode <b>Auto Deploy</b> (Biasanya berawalan <code>sudo ptero...</code> atau <code>curl...</code>).
6. <b>PASTE KODE TERSEBUT DI SINI!</b>

⏳ <i>Waktu Anda: 1 Menit dari sekarang. Jika lewat, Auto-Install Wings dibatalkan.</i></blockquote>`;

                    bot.sendMessage(chatId, textSuccess, { parse_mode: "HTML" });

                    // 2. Buat Timer 1 Menit (60.000 ms)
                    const timeoutId = setTimeout(() => {
                        if (userSessions[chatId] && userSessions[chatId].step === "awaiting_wings_token") {
                            bot.sendMessage(chatId, `<blockquote>⏰ <b>WAKTU HABIS!</b>\n━━━━━━━━━━━━━━━━━━\nAnda tidak mengirimkan Token Wings dalam 1 menit.\n\nInstalasi Wings otomatis dibatalkan. Anda harus menginstal ulang.</blockquote>`, { parse_mode: "HTML" });
                            delete userSessions[chatId]; // Hapus sesi
                        }
                    }, 60000); // 60000 ms = 1 Menit

                    // 3. Simpan Sesi untuk menunggu Token
                    userSessions[chatId] = {
                        type: "install_wings",
                        step: "awaiting_wings_token",
                        ip: ip,
                        pass: password,
                        timer: timeoutId // Simpan ID timer agar bisa dibatalkan jika user cepat
                    };

                } else {
                    bot.sendMessage(chatId, `<blockquote>❌ <b>INSTALASI GAGAL (ERROR CODE: ${code})</b>\n━━━━━━━━━━━━━━━━━━\nProses terhenti di tengah jalan. Pastikan OS VPS adalah Ubuntu 22.04 Fresh Install.</blockquote>`, { parse_mode: "HTML" });
                }
            }).on('data', (data) => {
                // Opsional: Jika ingin melihat log instalasi di console panelmu
                console.log(`[SSH LOG ${ip}]: ${data}`);
            }).stderr.on('data', (data) => {
                console.log(`[SSH ERROR ${ip}]: ${data}`);
            });
        });
    });

    // JIKA GAGAL LOGIN (IP Mati, Pass Salah, Port 22 ditutup)
    conn.on('error', (err) => {
        let alasan = "Terjadi kesalahan koneksi.";
        if (err.message.includes("authentication")) alasan = "Password Root salah!";
        else if (err.message.includes("connect")) alasan = "IP tidak aktif atau sedang booting. Tunggu 1 menit lalu coba lagi.";
        else if (err.message.includes("timeout")) alasan = "Koneksi Timeout (Server lambat lambat/IP Salah).";

        bot.sendMessage(chatId, `<blockquote>❌ <b>GAGAL LOGIN KE VPS</b>\n━━━━━━━━━━━━━━━━━━\n<b>Alasan:</b> ${alasan}\n\n<i>Silakan cek kembali IP dan Password Anda, lalu ulangi proses Auto Install.</i></blockquote>`, { parse_mode: "HTML" });
    });

    // Mulai Eksekusi Koneksi
    try {
        conn.connect({
            host: ip,
            port: 22,
            username: 'root',
            password: password,
            readyTimeout: 15000 // Timeout 15 detik
        });
    } catch (error) {
        bot.sendMessage(chatId, `<blockquote>❌ <b>KONEKSI DITOLAK</b>\n━━━━━━━━━━━━━━━━━━\nFormat IP salah atau server menolak koneksi Node.js.</blockquote>`, { parse_mode: "HTML" });
    }
}
// ====================================================
// FUNGSI AUTO INSTALL WINGS (TAHAP 2)
// ====================================================
async function runWingsInstaller(chatId, ip, password, tokenCommand) {
    const conn = new Client();
    
    bot.sendMessage(chatId, `<blockquote>🔄 <b>MENGINSTAL WINGS...</b>\n━━━━━━━━━━━━━━━━━━\nBot kembali login ke VPS Anda untuk menginstal sistem Docker dan Wings.\n\n<i>Proses ini memakan waktu sekitar 2-3 menit...</i></blockquote>`, { parse_mode: "HTML" });

    conn.on('ready', () => {
        // BASH SCRIPT: Install Docker, Download Wings, Eksekusi Token, Nyalakan Wings
        const cmdWings = `
            export DEBIAN_FRONTEND=noninteractive;
            
            # 1. Install Docker (Wajib untuk Wings)
            if ! [ -x "$(command -v docker)" ]; then
                curl -sSL https://get.docker.com/ | CHANNEL=stable bash;
                systemctl enable --now docker;
            fi

            # 2. Download Wings Binary
            mkdir -p /etc/pterodactyl;
            curl -L -o /usr/local/bin/wings https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_$([[ "$(uname -m)" == "x86_64" ]] && echo "amd64" || echo "arm64");
            chmod u+x /usr/local/bin/wings;

            # 3. Setup Systemd Service
            curl -s -o /etc/systemd/system/wings.service https://raw.githubusercontent.com/pterodactyl/wings/main/systemd/wings.service;
            systemctl daemon-reload;

            # 4. EKSEKUSI TOKEN DARI USER (Untuk generate config.yml)
            ${tokenCommand}

            # 5. Nyalakan Wings
            systemctl enable --now wings;
            systemctl restart wings;
            
            echo "WINGS_DONE";
        `;

        conn.exec(cmdWings, (err, stream) => {
            if (err) return conn.end();

            stream.on('close', (code) => {
                conn.end();
                if (code === 0) {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>INSTALASI WINGS SUKSES!</b>\n━━━━━━━━━━━━━━━━━━\nNode Anda sekarang sudah terhubung dengan Panel Pterodactyl dan berstatus <b>Gembok Hijau (Online)</b>.\n\nAnda sudah bisa mulai membuat server game! 🎮</blockquote>`, { parse_mode: "HTML" });
                } else {
                    bot.sendMessage(chatId, `<blockquote>❌ <b>GAGAL MENYALAKAN WINGS</b>\nToken yang Anda masukkan mungkin salah atau tidak lengkap. Silakan cek menu Nodes di panel Anda.</blockquote>`, { parse_mode: "HTML" });
                }
            });
        });
    });

    conn.on('error', () => {
        bot.sendMessage(chatId, "⚠️ Gagal login kembali ke VPS. Instalasi Wings dibatalkan.");
    });

    try {
        conn.connect({ host: ip, port: 22, username: 'root', password: password, readyTimeout: 15000 });
    } catch (error) {}
}
// ====================================================
// HANDLER CALLBACK QUERY UTAMA (SUDAH FIX KURUNG KURAWAL)
// ====================================================
bot.on("callback_query", async (query) => {
    const msgId = query.message_id; // ini msg_id button lama
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
const caption = query.message.caption || query.message.text || '';
const matchKat = caption.match(/Kategori: (.+)/i);
  const katFromCap = matchKat? matchKat[1] : '';
const matchType = caption.match(/- (.+?)<\/b>/i);
  const typeFromCap = matchType? matchType[1] : '';
const type = matchType? matchType[1] : '';
    try { // <--- TRY DIBUKA DI SINI

//pembatas
  if (data === 'smm') {
    const caption = `<b>💎 SMM PANEL</b>\n\n` +
                    `Suntik followers, likes, views, dll 100% aman & bergaransi.\n\n` +
                    `Klik "Pilih Kategori" lalu ketik kategori yang mau lu cari. Contoh: tiktok, instagram, youtube`;

    await bot.sendPhoto(chatId, 'https://cdn.phototourl.com/free/2026-04-10-466b4dc1-3abf-4c2d-b7d1-e626a6cf0e2c.png', { // ganti URL foto lu
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Pilih Kategori', callback_data: 'smm_pilih_kategori' }],
          [{ text: '⬅️ Kembali', callback_data: 'menu_lainnya' }]
        ]
      }
    });
  }

  if (data === 'smm_pilih_kategori') {
smmMode.add(chatId); // MASUK MODE CARI KATEGORI
const userId = query.from.id;
    try {
      await bot.answerCallbackQuery(query.id); // tutup loading dulu
      
      if (globalServices.length === 0) {
        return bot.sendMessage(chatId, '⏳ Tunggu Sebentar..');
      }

      // JANGAN editMessageText. KIRIM BARU biar anti error
      await bot.sendMessage(chatId, `📝 Ketik kategori: instagram, tiktok, youtube, shopee, dll`, {
        parse_mode: 'HTML'
      });

    } catch (e) {
      console.log('Error pilih kategori:', e.message);
      // Fallback kirim baru kalo edit gagal
      bot.sendMessage(chatId, '✅ Silakan ketik kategori layanan: instagram, tiktok, youtube');
    }
  }
  if (data.startsWith('k|')) { // GANTI smm_kat_ JADI k|
  await bot.answerCallbackQuery(query.id);
  const chatId = query.message.chat.id;

  let [_, katEnc] = data.split('|'); // split pake | biar aman walau ada _
  let kategori = decodeURIComponent(katEnc || '');
  let katFromCap = kategori;

  // Generate tipe otomatis dari JSON
  const types = [...new Set(
    globalServices
     .filter(s => s?.category?.toLowerCase() === katFromCap.toLowerCase())
     .map(s => s.type)
  )];

  // Bikin keyboard + fallback juga pake t| jangan smm_type_
  const keyboard = types.length > 0
   ? types.map(t => [{text: t, callback_data: `t|${katEnc}|${encodeURIComponent(t)}|1` }])
    : [[{text: '📦 Kosong', callback_data: `t|${katEnc}||1` }]]; // fallback singkat

  // Tombol back juga disingkat
  keyboard.push([{text: '⬅️ Back', callback_data: 'kat'}]); // smm_pilih_kategori → kat

  await bot.editMessageCaption(
    `✅ Kategori: <b>${kategori}</b>\nPilih tipe layanan:`,
    {
      chat_id: chatId,
      message_id: query.message_id,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    }
  );
}
  // BARU: Klik layanan munculin deskripsi
// 1. DETAIL LAYAN o|
if (data.startsWith('o|')) {
  try {
    await bot.answerCallbackQuery(query.id);
    const chatId = query.message.chat.id;

    const serviceId = data.split('|')[1];
    const service = globalServices.find(s => s.id == serviceId);

    if (!service) {
      return bot.sendMessage(chatId, '❌ Layanan tidak ditemukan');
    }

    let katFromCap = service.category || 'Kategori';
    let type = service.type || 'Umum';

    // Cuma escape 3 karakter bahaya HTML, JANGAN HAPUS TAG
    // Biar <br>, <b>, <i>, <blockquote>, <img> tetep jalan
    const clean = service.description
     ? service.description
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
      : 'Tidak ada deskripsi';

    // Tapi kalo mau tag <br><b><i><blockquote><img> tetep jalan,
    // balikin lagi tag yg aman ini setelah di-escape
    const safeDesc = clean
     .replace(/&lt;br&gt;/g, '<br>')
     .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')
     .replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>')
     .replace(/&lt;blockquote&gt;/g, '<blockquote>').replace(/&lt;\/blockquote&gt;/g, '</blockquote>')
     .replace(/&lt;img /g, '<img ').replace(/&gt;/g, '>'); // img tag dibalikin

    const text = `<b>📋 Detail Layanan</b>\n\n` +
      `<b>Nama:</b> ${service.name}\n` +
      `<b>Kategori:</b> ${katFromCap}\n` +
      `<b>Tipe:</b> ${type}\n` +
      `<b>Harga:</b> Rp${service.price.toLocaleString('id-ID')}/1k\n` +
      `<b>Min:</b> ${service.min} | <b>Max:</b> ${service.max}\n` +
      `<b>Status:</b> ${service.status? '✅ Aktif' : '❌ Nonaktif'}\n\n` +
      `<b>📝 Deskripsi:</b>\n${safeDesc}\n\n` +
      `<i>Klik tombol di bawah untuk order</i>`;

    const btn = [
      [{ text: '🛒 Order Sekarang', callback_data: `c|${serviceId}` }],
      [{ text: '⬅️ Kembali ke List', callback_data: `t|${encodeURIComponent(katFromCap)}|${encodeURIComponent(type)}|1` }]
    ];

    // PAKE SENDMESSAGE AJA, GA PAKE SETTINGS.PP
    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: { inline_keyboard: btn }
    });

  } catch(e) {
    console.error('ERROR o|:', e.message);
    await bot.answerCallbackQuery(query.id, {text: '❌ Gagal buka detail', show_alert: true});
  }
}

// 2. TOMBOL BACK back|
else if (data.startsWith('back|')) {
  await bot.answerCallbackQuery(query.id);

  let [_, katEnc, typEnc] = data.split('|');
  let kat = decodeURIComponent(katEnc || '');
  let type = decodeURIComponent(typEnc || '');

  // Langsung bikin data baru kayak klik tipe
  let newData = `t|${katEnc}|${encodeURIComponent(type)}|1`;
  query.data = newData;

  // Panggil ulang handler t| - aman karena ga fake caption
  // Kalo lu pake if-else, tinggal return aja biar ke-cek lagi
  return; // biar bot.on cek ulang data = t|
}
  // TERIMA TUGAS
  if (data.startsWith('approve_')) {
    const parts = data.split('_');
    const userId = parts[1];
    const taskIndex = parseInt(parts[2]);

    let tasks = [];
    if (fs.existsSync(FILE_TASK)) {
      tasks = JSON.parse(fs.readFileSync(FILE_TASK, 'utf8'));
    }

    const task = tasks[taskIndex];
    if (!task) {
      return bot.answerCallbackQuery(query.id, { text: 'Tugas tidak ditemukan' });
    }

    // Kredit saldo ke profil user
    const dbUsers = getUsers();
    if (!dbUsers[userId]) dbUsers[userId] = { saldoFreelance: 0 };
    dbUsers[userId].saldoFreelance += task.saldoPending;
    saveUsers(dbUsers);

    // Notif ke user
    await bot.sendMessage(userId,
  `<blockquote>✅ TUGAS DITERIMA</blockquote>\n` +
  `Tugas: ${task.task}\n` +
  `Saldo Rp${task.saldoPending.toLocaleString('id-ID')} sudah di kreditkan ke profil Anda.`,
  { 
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 Cek Profil', callback_data: 'menu_profil' }]
      ]
    }
  }
);

    // Edit pesan admin
    await bot.editMessageText(
      query.message.text + '\n\n✅ Tugas Diterima oleh Admin',
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
    );

    await bot.answerCallbackQuery(query.id, { text: 'Yeay! Tugas Berhasil Diterima' });
  }
//pembatas
const caption = query.message.caption || '';

  // Ambil kategori dari caption biar bisa balik
// Taruh di atas file, luar bot.on
const userState = {};

if (data.startsWith('t|')) {
  await bot.answerCallbackQuery(query.id);
  const userId = query.from.id;

  console.log('RAW:', data, 'PANJANG:', data.length);

  let [_, katEnc, typEnc, page] = data.split('|');
  let katFromCap = decodeURIComponent(katEnc || '');
  let type = decodeURIComponent(typEnc || ''); // fallback biar ga undefined
  page = parseInt(page) || 1;

  // Simpen buat tombol back
  userState[userId] = {kat: katFromCap, type: type};

  let filtered = globalServices.filter(s =>
    s?.category?.toLowerCase().includes(katFromCap.toLowerCase())
  );

  let finalServices = filtered.filter(s =>
    s?.name?.toLowerCase().includes((type || '').toLowerCase()) // <- fallback
  );

  const perPage = 15;
  const totalPage = Math.ceil(finalServices.length / perPage) || 1; // biar ga 0
  const start = (page - 1) * perPage;
  const list = finalServices.slice(start, start + perPage);

  const text = `<b>📑 ${katFromCap.toUpperCase()} - ${type.toUpperCase()}</b>\nPage ${page}/${totalPage} | Total: ${finalServices.length}\n\n<blockquote>Pilih layanan:</blockquote>\n`;

  const btn = list.map(s => [
    { text: `${s.name} | Rp${(s.price/1000).toLocaleString('id-ID')}/1k`, callback_data: `o|${s.id}` }
  ]);

  let nav = [];
  if(page > 1) nav.push({text: '⬅️ Sebelumnya', callback_data: `t|${katEnc}|${typEnc}|${page-1}`})
  if(page < totalPage) nav.push({text: 'Selanjutnya ➡️', callback_data: `t|${katEnc}|${typEnc}|${page+1}`})
  if(nav.length > 0) btn.push(nav);

  btn.push([{ text: '⬅️ Ganti Tipe', callback_data: `back|${katEnc}` }]);

  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: btn }
  });
}
//pembatas
  // TOLAK TUGAS
  if (data.startsWith('reject_')) {
    const parts = data.split('_');
    const userId = parts[1];

    // Notif ke user
    await bot.sendMessage(userId,
      `<blockquote>❌ TUGAS DITOLAK</blockquote>\n` +
      `Tugas Anda ditolak admin karna alasan data tidak valid atau lainnya, jika terdapat kesalahan data harap hubungi pusat bantuan.`,
      { parse_mode: 'HTML' }
    );

    // Edit pesan admin
    await bot.editMessageText(
      query.message.text + '\n\n❌ Ditolak oleh Admin',
      { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
    );

    await bot.answerCallbackQuery(query.id, { text: 'Tugas ditolak' });
  }
// HANDLE KERJAKAN TUGAS - dinamis
if (query.data.startsWith('do_')) {
  const campaignId = query.data.replace('do_', '');
  const campaign = campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    await bot.answerCallbackQuery(query.id, { text: 'Campaign tidak ditemukan' });
    return;
  }

  const userId = query.from.id;

  // Simpan state step 1: nunggu email
  userState[userId] = { step: 'waiting_email', campaignId: campaign.id };

  await bot.deleteMessage(chatId, messageId);

  await bot.sendMessage(chatId,
    `<blockquote>📧 LANGKAH 1</blockquote>\n` +
    `Kirim alamat email Gmail Anda (Pastikan nama sudah sesuai dengan syarat & ketentuan yang berlaku).`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "« Batal", callback_data: "menu_freelance" }]] }
    }
  );

  await bot.answerCallbackQuery(query.id);
  return;
}

  // 1. HANDLE CAMPAIGN DETAIL - dinamis
  if (query.data.startsWith('campaign_')) {
  const userId = query.from.id;
    const campaignId = query.data.replace('campaign_', '');
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (!campaign) {
      await bot.answerCallbackQuery(query.id, { text: '❌ Campaign tidak ditemukan' });
      return;
    }

    const text = `<blockquote><b>${campaign.name}</b></blockquote>\n\n` +
                 `${campaign.desc}\n\n` +
                 `<b>Bayaran:</b> ${campaign.bayaran}/tugas`;

    const btn = [
      [{ text: "Kerjakan", callback_data: `do_${campaign.id}` }],
      [{ text: "« Kembali", callback_data: "menu_freelance" }]
    ];

    await bot.editMessageMedia(
      {
        type: 'photo',
        media: campaign.photo,
        caption: text,
        parse_mode: "HTML"
      },
      { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: btn } }
    );
    await bot.answerCallbackQuery(query.id);
    return; // stop biar ga masuk switch
  }
  
    if (data === 'stop_reminder') {
        const userId = query.from.id;
        const user = await getUserPet(userId)
        user.stopReminder = true
        await saveUser(userId, user)

        await bot.answerCallbackQuery(query.id, {
            text: 'Oke, reminder dimatiin selamanya. Kalo kangen sama pet, buka manual ya 😴',
            show_alert: true
        })

        // edit pesannya biar tombol ilang
        await bot.editMessageText('🔕 Reminder pet sudah dimatikan. Pet kamu sekarang tidur 😴', {
            chat_id: query.message.chat.id,
            message_id: query.message_id
        })
    }
        // ====================================================
        // INVOICE JASA INSTALL PTERODACTYL
        // ====================================================
        if (data === "buy_jasa_install") {
            const hargaAsli = 10000; // Harga Fix 10rb
            const estimasiFee = Math.ceil(hargaAsli * 0.007); 
            const totalBayar = hargaAsli + estimasiFee;

            const textDetail = `<blockquote>📋 <b>DETAIL JASA INSTALL VPS</b>

📦 <b>Produk:</b> Auto Install Pterodactyl + SSL
💰 <b>Biaya Jasa:</b> Rp ${hargaAsli.toLocaleString('id-ID')}
💳 <b>Fee Admin:</b> ~Rp ${estimasiFee.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━
🧾 <b>Total Bayar:</b> <b>Rp ${totalBayar.toLocaleString('id-ID')}</b>

<i>Apakah data pesanan di atas sudah benar? Jika sudah silakan klik lanjutkan dibawah ini</i></blockquote>`;

            const btnConfirm = {
                reply_markup: {
                    inline_keyboard: [
                        // Mengarah ke eksekusi pesanan Jasa
                        [{ text: "𝘓𝘢𝘯𝘫𝘶𝘵𝘬𝘢𝘯 𝘗𝘦𝘮𝘣𝘢𝘺𝘢𝘳𝘢𝘯 ✅", callback_data: "confirminstall_ready" }],
                        [{ text: "« 𝘉𝘢𝘵𝘢𝘭", callback_data: "menu_autoinstall" }]
                    ]
                }
            };

            await bot.deleteMessage(chatId, messageId).catch(()=>{});
            await bot.sendPhoto(chatId, settings.panelImage, { caption: textDetail, parse_mode: "HTML", ...btnConfirm }).catch(()=>{});
            await bot.answerCallbackQuery(query.id);
            return; 
        }
                // ====================================================
        // EKSEKUSI PEMESANAN JASA -> PILIH QRIS
        // ====================================================
                // ====================================================
        // EKSEKUSI PEMESANAN JASA -> PILIH QRIS
        // ====================================================
        if (data === "confirminstall_ready") {
            const hargaAsli = 10000;

            // KUNCI PENTING: Kita suntikkan "username" otomatis agar sistem QRIS tidak error
            userSessions[chatId] = {
                type: "jasa_install", 
                step: "awaiting_payment", 
                paket: "Jasa Auto Install Pterodactyl",
                harga: hargaAsli,
                username: `JasaInstall_${chatId}`, // <--- INI OBAT PENYEMBUHNYA
                lastBotMessageId: messageId 
            };

            await bot.deleteMessage(chatId, messageId).catch(()=>{});

            const btnPayment = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "𝘘𝘳 𝘚𝘦𝘳𝘷𝘦𝘳 1 (𝘍𝘢𝘴𝘵) ⚡", callback_data: "qr_server_1" }],
                        [{ text: "Crypto USD", callback_data: "qr_server_3" }],
                        [{ text: "𝘘𝘳 𝘚𝘦𝘳𝘷𝘦𝘳 2 (𝘔𝘢𝘪𝘯𝘵𝘦𝘯𝘢𝘯𝘤𝘦) ❌", callback_data: "qr_server_2" }],
                        [{ text: "« 𝘉𝘢𝘵𝘢𝘭𝘬𝘢𝘯 𝘖𝘳𝘥𝘦𝘳", callback_data: "back_to_main" }]
                    ]
                }
            };
            
            const promptMsg = await bot.sendMessage(chatId, `<blockquote>✅ <b>Pesanan Jasa Install Dibuat.</b>\n━━━━━━━━━━━━━━━━━━\n\nSilakan pilih Server QRIS untuk melakukan pembayaran:</blockquote>`, { parse_mode: "HTML", ...btnPayment });
            
            userSessions[chatId].lastBotMessageId = promptMsg.message_id;
            await bot.answerCallbackQuery(query.id);
            return; 
        }
        // ====================================================
        // FITUR 1: MENU BANTUAN
        // ====================================================
        if (data === "menu_bantuan") {
            userSessions[chatId] = { step: "awaiting_bantuan", lastBotMessageId: messageId };
            
            await bot.deleteMessage(chatId, messageId).catch(()=>{});
            
            const helpMsg = await bot.sendMessage(chatId, `<blockquote>🆘 <b>LAYANAN BANTUAN (TICKET)</b>\n━━━━━━━━━━━━━━━━━━\n\nSilakan ketik keluhan, laporan bug, atau pertanyaan Anda di bawah ini.\n\nPesan Anda akan langsung diteruskan ke Admin kami. (Bisa sertakan link gambar jika ada bukti error).</blockquote>`, { 
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [[{ text: "« 𝘉𝘢𝘵𝘢𝘭", callback_data: "back_to_main" }]] }
            });
            userSessions[chatId].lastBotMessageId = helpMsg.message_id;
            return;
        }

        // ====================================================
        // FITUR 2: MENU AUTO INSTALL PANEL
        // ====================================================
                // ====================================================
        // MENU AUTO INSTALL PANEL
        // ====================================================
        if (data === "menu_autoinstall") {
            const warningText = `<blockquote>⚙️ <b>AUTO INSTALL PTERODACTYL & WINGS</b>\n━━━━━━━━━━━━━━━━━━\n\nLayanan ini akan menginstal Panel dan Wings secara otomatis ke VPS Anda.\n\n⚠️ <b>SYARAT WAJIB:</b>\n1. OS VPS wajib Ubuntu 22.04 LTS.\n2. Siapkan Subdomain (Contoh: <code>panel.domain.com</code>).\n3. Subdomain SUDAH DI-POINTING ke IP VPS.\n\n💳 <b>Biaya Jasa: Rp 10.000</b> (Sekali Bayar)</blockquote>`;

            await bot.deleteMessage(chatId, messageId).catch(()=>{});
            
            await bot.sendMessage(chatId, warningText, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        // Mengarah ke invoice Jasa Install
                        [{ text: "🛒 Beli Jasa Install", callback_data: "buy_jasa_install" }],
                        [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪", callback_data: "back_to_main" }]
                    ]
                }
            });
            return;
        }

        // Mulai minta data VPS
        if (data === "start_install_ptero") {
            userSessions[chatId] = { type: "install", step: "awaiting_install_ip", lastBotMessageId: messageId };
            
            await bot.deleteMessage(chatId, messageId).catch(()=>{});
            const askIpMsg = await bot.sendMessage(chatId, `<blockquote>🖥 <b>TAHAP 1/3: IP ADDRESS</b>\n━━━━━━━━━━━━━━━━━━\n\nSilakan ketik <b>IP VPS</b> Anda:\n<i>(Contoh: 190.100.1.100)</i></blockquote>`, { parse_mode: "HTML" });
            userSessions[chatId].lastBotMessageId = askIpMsg.message_id;
            return;
        }
        // ====================================================
        // BAGIAN 1: LOGIKA "IF" UNTUK DATA DINAMIS
        // ====================================================
        
        if (query.data.startsWith("check_pay_")) {
    const invoiceUuid = query.data.replace("check_pay_", "");
    const userId = query.from.id;
    const session = userSessions[userId];

    if (!session) return bot.answerCallbackQuery(query.id, { text: "Sesi hilang.", show_alert: true });

    const dataCheck = { uuid: invoiceUuid };
    const sign = generateHeleketSign(dataCheck);

    try {
        const response = await axios.post('https://api.heleket.com/v1/payment/info', dataCheck, {
            headers: { 'merchant': settings.heleket.merchant, 'sign': sign, 'Content-Type': 'application/json' }
        });

        if (response.data.result.status === "paid") {
            await bot.answerCallbackQuery(query.id, { text: "✅ Pembayaran Crypto Berhasil! Memproses Pesanan...", show_alert: true });
            
            // Panggil fungsi pusat eksekusi yang sama
            await handlePaymentSuccess(userId, session, invoiceUuid, messageId);
        } else {
            await bot.answerCallbackQuery(query.id, { text: "⏳ Belum dibayar!.", show_alert: true });
        }
    } catch (err) {
        bot.answerCallbackQuery(query.id, { text: "Gagal Cek Server Crypto, Silakan Hubungi Admin.", show_alert: true });
    }
}
        
            if (data.startsWith('os_page_')) {
        const targetPage = parseInt(data.replace('os_page_', ''));
        const pageContent = generateOSPage(chatId, targetPage);

        if (pageContent) {
            // Update pesan dengan halaman baru
            bot.editMessageText(pageContent.text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: pageContent.reply_markup
            }).catch(err => console.log("Edit message error:", err)); // Mencegah unhandled rejection jika klik dobel
        } else {
            // Jika bot sempat direstart, cache hilang
            bot.answerCallbackQuery(query.id, { text: "⚠️ Data kadaluarsa, silahkan ketik /getos kembali.", show_alert: true });
        }
        
        // Selalu jawab callback query agar tombol tidak loading terus di Telegram pengguna
        bot.answerCallbackQuery(query.id).catch(()=>{});
    }
        
        if (data.startsWith("page_")) {
            const action = data.split("_")[1];
            
            // Jika Admin klik "Selesai", hapus pesannya
            if (action === "close") {
                await bot.deleteMessage(chatId, messageId).catch(()=>{});
                await bot.answerCallbackQuery(query.id, { text: "Menu ditutup." });
                return;
            }

            // Jika Admin klik Next / Prev, render halaman baru
            const pageNum = parseInt(action);
            await renderUserPage(chatId, pageNum, messageId);
            
            await bot.answerCallbackQuery(query.id);
            return;
        }

        if (data.startsWith("paket_")) {
            const tipe = data.split("_")[1];
            let caption = "";
            let buttons = [];

            if (tipe === "started") {
                caption = "<blockquote>🥉 <b>TIER STARTED (BASIC)</b> 🥉\nVPS: Intel Xeon Platinum (150%)\nDisk: NVMe Enterprise\nPilihan Stabil untuk Bot ringan seperti Whatsapp/Telegram atau lainnya\n\nSilakan pilih spesifikasi di bawah:</blockquote>";
                buttons = [
                    [{ text: "𝘙𝘈𝘔 1𝘎𝘉 | 𝘊𝘗𝘜 50% | DISK 10𝘎𝘉", callback_data: "buy_Started 1GB_2000" }],
                    [{ text: "𝘙𝘈𝘔 2𝘎𝘉 | 𝘊𝘗𝘜 100% | DISK 20𝘎𝘉", callback_data: "buy_Started 2GB_3000" }],
                    [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘗𝘢𝘬𝘦𝘵", callback_data: "menu_panel" }]
                ];
            } else if (tipe === "medium") {
                caption = "<blockquote>🥈 <b>TIER MEDIUM (MID)</b> 🥈\nVPS: Xeon Platinum (300%)\nDisk: NVMe Enterprise\nPilihan Stabil untuk project menengah seperti penggunaan Database/Website Api\n\nSilakan pilih spesifikasi di bawah:</blockquote>";
                buttons = [
                    [{ text: "𝘙𝘈𝘔 6𝘎𝘉 | 𝘊𝘗𝘜 150% | DISK 50𝘎𝘉", callback_data: "buy_Medium 6GB_5000" }],
                    [{ text: "𝘙𝘈𝘔 8𝘎𝘉 | 𝘊𝘗𝘜 200% | DISK 70𝘎𝘉", callback_data: "buy_Medium 8GB_9000" }],
                    [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘗𝘢𝘬𝘦𝘵", callback_data: "menu_panel" }]
                ];
            } else if (tipe === "pro") {
                caption = "<blockquote>🥇 <b>TIER PRO (HIGH)</b> 🥇\nCPU: Unlimited\nDisk: Unlimited NVMe\nPilihan Maksimal untuk semua kebutuhan hosting anda, tanpa batasan RAM dan lainnya\nSilakan pilih spesifikasi di bawah:</blockquote>";
                buttons = [
                    [{ text: "𝘜𝘯𝘭𝘪𝘮𝘪𝘵𝘦𝘥 𝘗𝘙𝘖", callback_data: "buy_PRO Unlimited_10000" }],
                    [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘗𝘢𝘬𝘦𝘵", callback_data: "menu_panel" }]
                ];
            }

            await bot.editMessageCaption(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: buttons }
            });

            await bot.answerCallbackQuery(query.id);
            return; // <-- WAJIB RETURN
        }
                // ====================================================
        // KETIKA USER KLIK TOMBOL "KLAIM VOUCHER" DARI BROADCAST
        // =================================================
                // ====================================================
        // KETIKA USER KLIK TOMBOL "KLAIM VOUCHER"
        // ====================================================
if (data.startsWith("klaimvc_")) {
    const dbUsers = getUsers();
    const mySaldo = dbUsers[chatId]?.saldo || 0; // Ambil saldo terbaru

    const kode = data.split("_")[1];
    const voucher = activeVouchers[kode];

    if (!voucher) return bot.answerCallbackQuery(query.id, { text: "❌ Voucher kadaluarsa.", show_alert: true });
    if (voucher.sisaKuota <= 0) return bot.answerCallbackQuery(query.id, { text: "😭 Kuota voucher habis!", show_alert: true });

    // RUMUS MATEMATIKA (SAMA SEPERTI SEBELUMNYA)
    const hargaNormal = Number(voucher.hargaNormal);
    const diskonPersen = Number(voucher.diskon);
    
    // Hitung potongan & harga bersih
    const potonganDiskon = Math.floor(hargaNormal * (diskonPersen / 100));
    const hargaSetelahDiskon = hargaNormal - potonganDiskon;
    
    // Hitung Fee (Hanya jika bayar via QRIS)
    const estimasiFee = Math.ceil(hargaSetelahDiskon * 0.007);
    const totalBayarQRIS = hargaSetelahDiskon + estimasiFee;

    // Simpan ke sesi agar saat input username bot ingat ini adalah paket promo
    userSessions[chatId] = {
        type: "panel",
        paket: `${voucher.paket} (PROMO ${kode})`,
        harga: hargaSetelahDiskon, // Harga yang akan dipotong dari saldo
        totalQRIS: totalBayarQRIS,
        step: "confirming_promo"
    };

    // Cek kecukupan saldo
    const statusSaldo = mySaldo >= hargaSetelahDiskon 
        ? "🟢 <b>Saldo Cukup</b> (Bayar instan tanpa fee)" 
        : `🔴 <b>Saldo Kurang</b> (Butuh Top Up)`;

    const textDetailPromo = `<blockquote>📋 <b>DETAIL PESANAN (PROMO)</b>

🎟 <b>Voucher:</b> <code>${kode}</code>
📦 <b>Produk:</b> Panel - ${voucher.paket}

💰 <b>Harga Normal:</b> <del>Rp ${hargaNormal.toLocaleString('id-ID')}</del>
📉 <b>Diskon ${diskonPersen}%:</b> -Rp ${potonganDiskon.toLocaleString('id-ID')}
💸 <b>Est. Total (QRIS):</b> Rp ${totalBayarQRIS.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━
💳 <b>Saldo Anda:</b> Rp ${mySaldo.toLocaleString('id-ID')}
ℹ️ <b>Status Saldo:</b> ${statusSaldo}

<i>Apakah detail pesanan di atas sudah benar? Klik Lanjutkan untuk mengisi data username.</i></blockquote>`;

    const btnConfirmPromo = {
        reply_markup: {
            inline_keyboard: [
                // Kirim hargaSetelahDiskon ke tahap input username
                [{ text: "✅ 𝘓𝘢𝘯𝘫𝘶𝘵𝘬𝘢𝘯", callback_data: `confirmbuy_${voucher.paket}_${hargaSetelahDiskon}` }],
                [{ text: "« 𝘉𝘢𝘵𝘢𝘭", callback_data: "menu_panel" }]
            ]
        }
    };

    // Kurangi kuota voucher hanya saat user benar-benar MEMBAYAR nantinya (opsional)
    // Di sini kita biarkan dulu, atau jika ingin fix diklaim:
    voucher.sisaKuota -= 1; 

    await bot.deleteMessage(chatId, messageId).catch(()=>{});
    await bot.sendPhoto(chatId, settings.panelImage, { 
        caption: textDetailPromo, 
        parse_mode: "HTML", 
        ...btnConfirmPromo 
    }).catch(()=>{});

    await bot.answerCallbackQuery(query.id);
    return; 
}
         // ====================================================
        // B. KETIKA KLIK RAM (MEMUNCULKAN DETAIL & BIAYA ADMIN)
        // ====================================================
        
        if (data.startsWith("buy_")) {
    const dbUsers = getUsers();
    const mySaldo = dbUsers[chatId]?.saldo || 0; // Ambil saldo dari database

    const parts = data.split("_");
    const detailPaket = parts[1]; // Contoh: "Started 1GB"
    const hargaAsli = parseInt(parts[2]); // Contoh: 25000

    // Rumus Estimasi Fee Pakasir (Hanya berlaku jika bayar via QRIS)
    const estimasiFee = Math.ceil(hargaAsli * 0.007); 
    const totalBayarQRIS = hargaAsli + estimasiFee;

    // Simpan ke sesi sementara (PENTING: Simpan harga asli untuk potongan saldo nanti)
    userSessions[chatId] = {
        type: "panel", // Tipe order
        paket: detailPaket,
        harga: hargaAsli,
        fee: estimasiFee,
        totalQRIS: totalBayarQRIS,
        step: "confirming_order"
    };

    // Tentukan status saldo (Cukup atau Kurang)
    const statusSaldo = mySaldo >= hargaAsli 
        ? "🟢 <b>Saldo Cukup</b> (Potongan Tanpa Fee Admin)" 
        : `🔴 <b>Saldo Kurang</b> (Butuh Top Up)`;

    const textDetail = `<blockquote>📋 <b>DETAIL PESANAN ANDA</b>

📦 <b>Produk:</b> Panel Pterodactyl - ${detailPaket}
💰 <b>Harga Paket:</b> Rp ${hargaAsli.toLocaleString('id-ID')}
💸 <b>Estimasi Total (QRIS):</b> Rp ${totalBayarQRIS.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━
💳 <b>Saldo Anda:</b> Rp ${mySaldo.toLocaleString('id-ID')}
ℹ️ <b>Status Saldo:</b> ${statusSaldo}

<i>Klik Lanjutkan jika pesanan sudah benar untuk mengisi data username panel Anda.</i></blockquote>`;

    const btnConfirm = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ 𝘓𝘢𝘯𝘫𝘶𝘵𝘬𝘢𝘯", callback_data: `confirmbuy_${detailPaket}_${hargaAsli}` }],
                [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪", callback_data: "menu_panel" }]
            ]
        }
    };

    await bot.editMessageCaption(textDetail, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        ...btnConfirm
    }).catch(() => {});

    await bot.answerCallbackQuery(query.id);
    return; 
}

        // ====================================================
        // C. KETIKA KLIK "LANJUTKAN" (MEMINTA USERNAME)
        // ====================================================
        
                // ====================================================
        // FITUR INTERAKTIF +/- PERPANJANGAN SERVER
        // ====================================================
if (data.startsWith("ext_")) {
    const parts = data.split("_");
    const action = parts[1]; // ui, min, plus, confirm
    const srvIndex = parseInt(parts[2]);
    let days = parseInt(parts[3]);

    const dbUsers = getUsers();
    const myProfile = dbUsers[chatId];
    
    if (!myProfile || !myProfile.servers[srvIndex]) {
        await bot.answerCallbackQuery(query.id, { text: "Data server tidak valid.", show_alert: true });
        return;
    }

    const targetServer = myProfile.servers[srvIndex];
    const mySaldo = myProfile.saldo || 0;

    // Logika Tombol Tambah / Kurang Hari
    if (action === "plus") days++;
    if (action === "min" && days > 1) days--;

    // Perhitungan Harga (Rp 500 / Hari)
    const hargaPerpanjang = days * 500;
    const estimasiFee = Math.ceil(hargaPerpanjang * 0.007);
    const totalBayarQRIS = hargaPerpanjang + estimasiFee;

    // ==========================================
    // 1. JIKA USER KLIK "LANJUTKAN" (PILIH PAYMENT)
    // ==========================================
    if (action === "confirm") {
        userSessions[chatId] = {
            type: "extend",
            serverIndex: srvIndex,
            days: days,
            paket: `Perpanjang [${targetServer.username_panel}] ${days} Hari`,
            harga: hargaPerpanjang, // Harga asli untuk potong saldo
            totalQRIS: totalBayarQRIS, // Harga + fee untuk QRIS
            username: targetServer.username_panel
        };

        const textPay = `<blockquote>🔄 <b>KONFIRMASI PEMBAYARAN</b>\n\n` +
                      `🖥 Server: <code>${targetServer.username_panel}</code>\n` +
                      `⏳ Durasi: +${days} Hari\n` +
                      `💰 Harga: Rp ${hargaPerpanjang.toLocaleString('id-ID')}\n` +
                      `━━━━━━━━━━━━━━━━━━\n` +
                      `💳 Saldo Anda: Rp ${mySaldo.toLocaleString('id-ID')}</blockquote>\n\n` +
                      `<i>Silakan pilih metode pembayaran:</i>`;

        const btnPayment = {
            reply_markup: {
                inline_keyboard: [
                    // Tombol Bayar Pakai Saldo
                    [{ text: `💳 Bayar Pakai Saldo (Rp ${mySaldo.toLocaleString()})`, callback_data: "pay_via_saldo" }],
                    // Metode Luar
                    [
                        { text: "⚡ QRIS FAST", callback_data: "qr_server_1" },
                        { text: "🪙 Koin Crypto", callback_data: "pay_crypto_heleket" }
                    ],
                    [{ text: "« Batal", callback_data: `ext_ui_${srvIndex}_${days}` }]
                ]
            }
        };

        await bot.editMessageCaption(textPay, { chat_id: chatId, message_id: messageId, parse_mode: "HTML", ...btnPayment }).catch(()=>{});
        await bot.answerCallbackQuery(query.id);
        return;
    }

    // ==========================================
    // 2. TAMPILAN INTERAKTIF (+ / - HARI)
    // ==========================================
    const statusSaldo = mySaldo >= hargaPerpanjang 
        ? "🟢 <b>Saldo Cukup</b>" 
        : `🔴 <b>Saldo Kurang</b> (Butuh TopUp)`;

    const textExtend = `<blockquote>🔄 <b>ATUR DURASI PERPANJANG</b>

🖥 <b>Detail Server:</b>
├ User: <code>${targetServer.username_panel}</code>
└ Expired: <b>${targetServer.expired_date}</b>

⏳ <b>Tambah:</b> ${days} Hari (Rp 500/hr)
━━━━━━━━━━━━━━━━━━
💰 Harga Sewa: Rp ${hargaPerpanjang.toLocaleString('id-ID')}
💳 Saldo Anda: Rp ${mySaldo.toLocaleString('id-ID')}
ℹ️ Status: ${statusSaldo}</blockquote>`;

    const btnInteractive = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "➖ 𝘒𝘶𝘳𝘢𝘯𝘨", callback_data: `ext_min_${srvIndex}_${days}` },
                    { text: `${days} Hari`, callback_data: "ignore" },
                    { text: "➕ 𝘛𝘢𝘮𝘣𝘢𝘩", callback_data: `ext_plus_${srvIndex}_${days}` }
                ],
                [{ text: "𝘓𝘢𝘯𝘫𝘶𝘵𝘬𝘢𝘯 ➡️", callback_data: `ext_confirm_${srvIndex}_${days}` }],
                [{ text: "« 𝘉𝘢𝘵𝘢𝘭", callback_data: "menu_profil" }]
            ]
        }
    };

    await bot.editMessageCaption(textExtend, { chat_id: chatId, message_id: messageId, parse_mode: "HTML", ...btnInteractive }).catch(()=>{});
    await bot.answerCallbackQuery(query.id);
    return;
}

        // Fungsi Batal UI
        if (data === "cancel_order_ui") {
            delete userSessions[chatId];
            await bot.deleteMessage(chatId, messageId).catch(()=>{});
            await bot.sendMessage(chatId, "❌ Pesanan dibatalkan.", { reply_markup: { inline_keyboard: [[{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘔𝘦𝘯𝘶", callback_data: "back_to_main" }]]} });
            await bot.answerCallbackQuery(query.id);
            return;
        }
        
        if (data.startsWith("confirmbuy_")) {
            const parts = data.split("_");
            const detailPaket = parts[1];
            const harga = parseInt(parts[2]);

            // Simpan data ke sesi sementara
            userSessions[chatId] = {
                step: "awaiting_username",
                paket: detailPaket,
                harga: harga, // Yang disimpan harga asli, Pakasir akan otomatis nambahin fee-nya nanti
                lastBotMessageId: messageId 
            };

            // Hapus pesan foto panel detail
            await bot.deleteMessage(chatId, messageId).catch(()=>{});

            // Kirim pesan teks meminta username
            const promptMsg = await bot.sendMessage(chatId, `<blockquote>✅ Anda akan memesan <b>Paket ${detailPaket}</b>.\n\n📝 Silakan ketik <b>Username</b> (tanpa spasi) yang ingin digunakan untuk Panel Anda:</blockquote>`, { parse_mode: "HTML" });
            
            // Simpan ID pesan ini agar nanti dihapus otomatis setelah user ngetik
            userSessions[chatId].lastBotMessageId = promptMsg.message_id;

            await bot.answerCallbackQuery(query.id);
            return; 
        }   
        
                // ====================================================
        // 1. KETIKA KLIK "CEK KETERSEDIAAN VPS" (MUNCUL LOADING & STOK)
        // ====================================================
if (data === "check_vps_stock") {
    // Efek Loading Pura-pura
    await bot.answerCallbackQuery(query.id, { text: "⏳ Sedang mengecek ketersediaan di server..." });

    const store = getStore();
    const dbUsers = getUsers();
    const mySaldo = dbUsers[chatId]?.saldo || 0; // Ambil saldo user

    // 1. JIKA STOK HABIS
    if (store.vps_stock <= 0) {
        const textHabis = `<blockquote>❌ <b>MOHON MAAF, VPS SEDANG KOSONG</b>\n\nSaat ini belum ada alokasi VPS baru dari Admin. Silakan cek kembali nanti atau hubungi Admin untuk pre-order.</blockquote>`;
        await bot.editMessageCaption(textHabis, {
            chat_id: chatId, message_id: messageId, parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘔𝘦𝘯𝘶", callback_data: "back_to_main" }]] }
        }).catch(()=>{});
        return;
    }

    // 2. LOGIKA SPESIFIKASI (Sesuai RAM)
    let cpu = ""; let disk = "";
    if (store.vps_ram.includes("1GB")) { cpu = "1 Core Intel Xeon"; disk = "10 GB NVMe SSD"; }
    else if (store.vps_ram.includes("2GB")) { cpu = "1 Core Intel Xeon"; disk = "20 GB NVMe SSD"; }
    else if (store.vps_ram.includes("4GB")) { cpu = "2 Core Intel Xeon"; disk = "40 GB NVMe SSD"; }
    else { cpu = "High Performance CPU"; disk = "Enterprise NVMe SSD"; }

    // 3. PERHITUNGAN BIAYA
    const hargaVps = store.vps_price;
    const estimasiFee = Math.ceil(hargaVps * 0.007); 
    const totalBayarQRIS = hargaVps + estimasiFee;

    // 4. CEK STATUS SALDO
    const statusSaldo = mySaldo >= hargaVps 
        ? "🟢 <b>Saldo Cukup</b> (Bayar instan)" 
        : `🔴 <b>Saldo Kurang</b> (Butuh TopUp)`;

    // 5. SIMPAN KE SESI (Agar saat 'Lanjutkan' bot ingat harganya)
    userSessions[chatId] = {
        type: "vps",
        paket: `Cloud VPS ${store.vps_ram}`,
        harga: hargaVps, // Harga murni untuk potong saldo
        totalQRIS: totalBayarQRIS, // Harga + fee untuk QRIS
        step: "viewing_vps_stock"
    };

    const textTersedia = `<blockquote>✅ <b>VPS TERSEDIA!</b> (Stok: <b>${store.vps_stock} Unit</b>)

🖥 <b>SPESIFIKASI CLOUD VPS</b>
🔹 <b>Kapasitas RAM:</b> ${store.vps_ram}
🔹 <b>Processor:</b> ${cpu}
🔹 <b>Storage:</b> ${disk}
🔹 <b>Lokasi Server:</b> Silicon Valley, USA 🇺🇸

📋 <b>RINCIAN BIAYA</b>
├ Harga Sewa: Rp ${hargaVps.toLocaleString('id-ID')} / Bln
├ Fee Admin: ~Rp ${estimasiFee.toLocaleString('id-ID')}
└ <b>Est. Total (QRIS): Rp ${totalBayarQRIS.toLocaleString('id-ID')}</b>

💳 <b>SALDO ANDA:</b> Rp ${mySaldo.toLocaleString('id-ID')}
ℹ️ <b>Status Saldo:</b> ${statusSaldo}

<i>Klik Lanjutkan Pesanan untuk mengisi data Hostname VPS Anda.</i></blockquote>`;

    // Ubah Gambar dan Teks
    await bot.deleteMessage(chatId, messageId).catch(()=>{});
    await bot.sendPhoto(chatId, settings.panelImage, {
        caption: textTersedia,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ 𝘓𝘢𝘯𝘫𝘶𝘵𝘬𝘢𝘯 𝘗𝘦𝘴𝘢𝘯𝘢𝘯", callback_data: "confvps_ready" }],
                [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪", callback_data: "menu_vps" }]
            ]
        }
    });
    return;
}

        // ====================================================
        // 2. KETIKA KLIK "LANJUTKAN PESANAN" (MINTA HOSTNAME)
        // ====================================================        
        if (data === "confvps_ready") {
            const store = getStore();

            if (store.vps_stock <= 0) {
                await bot.answerCallbackQuery(query.id, { text: "Stok baru saja habis direbut orang lain!", show_alert: true });
                return;
            }

            userSessions[chatId] = {
                type: "vps", 
                step: "awaiting_hostname",
                paket: `VPS RAM ${store.vps_ram}`,
                harga: store.vps_price,
                lastBotMessageId: messageId 
            };

            await bot.deleteMessage(chatId, messageId).catch(()=>{});

                        const promptMsg = await bot.sendMessage(chatId, `<blockquote>✅ Anda memesan <b>VPS RAM ${store.vps_ram}</b>.\n\n📝 Silakan ketik <b>Hostname / Nama Server</b> Anda (Contoh: <code>bot-trading</code>):</blockquote>`, { parse_mode: "HTML" });
            userSessions[chatId].lastBotMessageId = promptMsg.message_id;

            await bot.answerCallbackQuery(query.id);
            return; 
        }

        // ====================================================
        // BAGIAN 2: LOGIKA "SWITCH" UNTUK MENU TETAP
        // ====================================================

        switch (data) {
            
            // ====================================================
            // MENU UTAMA & KEMBALI KE MENU
            // ====================================================
            case "mainmenu":
            case "back_to_main":
            
                           const textMainMenu = `<blockquote>( 👋 ) - <b>ʜᴀʟᴏ ꜱᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ʙᴏᴛ ᴀᴜᴛᴏ ᴏʀᴅᴇʀ ᴘᴀɴᴇʟ ʟᴇɢᴀʟ 100%</b></blockquote>
<blockquote>ᴄᴀᴘᴇᴋ ʙᴇʟɪ ᴘᴀɴᴇʟ ᴍᴜʀᴀʜ ᴛᴀᴘɪ ᴛɪᴀᴘ 3-7 ʜᴀʀɪ ꜱᴇʀᴠᴇʀ ᴍᴀᴛɪ/ᴍᴏᴋᴀᴅ? ʙɪʟᴀɴɢ ɴʏᴀ ᴅɪ ʀᴀᴡᴀᴛ ᴛᴀᴘɪ ᴄᴜᴍᴀ ᴍᴀɴɪꜱ ᴅɪ ᴀᴡᴀʟ 
ᴘɪɴᴅᴀʜ ᴋᴇ ꜱᴇʀᴠᴇʀ ᴋᴀᴍɪ! 
ʟᴀʏᴀɴᴀɴ ᴏɴ 24/7ᴊᴀᴍ ᴊᴀʀɪɴɢᴀɴ ᴛᴀɴᴘᴀ ʙᴀᴛᴀꜱ - ꜱᴇᴡᴀ ʙᴜʟᴀɴᴀɴ ʙɪꜱᴀ ᴅɪ ᴘᴇʀᴘᴀɴᴊᴀɴɢ

ᴅᴀᴘᴀᴛᴋᴀɴ ᴅɪꜱᴋᴏɴ ꜱ/ᴅ 50% ᴜɴᴛᴜᴋ ᴘᴇᴍʙᴇʟɪᴀɴ ᴘᴀɴᴇʟ ᴘᴛᴇʀᴏᴅᴀᴄᴛʏʟ ᴍɪɴ 30 ʜᴀʀɪ (ᴛɪᴅᴀᴋ ᴛᴇʀᴍᴀꜱᴜᴋ ᴘᴇʀᴘᴀɴᴊᴀɴɢ)</blockquote><blockquote>ᴜᴄᴀᴘᴋᴀɴ ᴘᴇʀɪɴᴛᴀʜ ᴅɪʙᴀᴡᴀʜ ɪɴɪ ᴜɴᴛᴜᴋ ᴏʀᴅᴇʀ ɪɴꜱᴛᴀɴ :
"ʙᴇʟɪ ᴘᴀɴᴇʟ |ᴘᴀᴋᴇᴛ| ᴜꜱᴇʀɴᴀᴍᴇ |ɴᴀᴍᴀᴘᴀɴᴇʟ| ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ |ᴘᴀʏᴍᴇɴᴛ|"

ᴄᴏɴᴛᴏʜ/: "ʙᴇʟɪ ᴘᴀɴᴇʟ ᴜɴʟɪ ᴜꜱᴇʀɴᴀᴍᴇ ᴀʙᴄ ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ Qʀɪꜱ"

ᴘɪʟɪʜ ᴍᴇɴᴜ ᴅɪ ʙᴀᴡᴀʜ ɪɴɪ ᴜɴᴛᴜᴋ ᴍᴇᴍᴜʟᴀɪ
╭──✧ <i>𝘐𝘯𝘧𝘰𝘳𝘮𝘢𝘴𝘪</i> ✧
│ ⪼ Legalitas #No1
╰──────────⧽</blockquote>`;
                
                if (data === "mainmenu") {
                    // Edit caption (jika dari menu /start awal yang sudah berupa foto)
                    await bot.editMessageCaption(textMainMenu, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: "HTML",
                        reply_markup: keyboardMenuKedua
                    }).catch(() => {});
                } else {
                    // Jika dari tombol "Kembali", hapus pesan lama lalu kirim foto baru
                    await bot.deleteMessage(chatId, messageId).catch(()=>{});
                    
                    // UBAH MENJADI KIRIM FOTO DI SINI
                    await bot.sendPhoto(chatId, settings.panelImage, {
                        caption: textMainMenu,
                        parse_mode: "HTML",
                        reply_markup: keyboardMenuKedua
                    }).catch((err) => {
                        console.log("Gagal kirim foto menu utama:", err.message);
                        // Fallback aman jika gambar gagal dimuat
                        bot.sendMessage(chatId, textMainMenu, {
                            parse_mode: "HTML",
                            reply_markup: keyboardMenuKedua
                        });
                    });
                }
                break;
case "menu_lainnya": {
const textMenuLainnya = `<blockquote>( 👋 ) - <b>ʜᴀʟᴏ ꜱᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ʙᴏᴛ ᴀᴜᴛᴏ ᴏʀᴅᴇʀ ᴘᴀɴᴇʟ ʟᴇɢᴀʟ 100%</b></blockquote>
<blockquote>ᴄᴀᴘᴇᴋ ʙᴇʟɪ ᴘᴀɴᴇʟ ᴍᴜʀᴀʜ ᴛᴀᴘɪ ᴛɪᴀᴘ 3-7 ʜᴀʀɪ ꜱᴇʀᴠᴇʀ ᴍᴀᴛɪ/ᴍᴏᴋᴀᴅ? ʙɪʟᴀɴɢ ɴʏᴀ ᴅɪ ʀᴀᴡᴀᴛ ᴛᴀᴘɪ ᴄᴜᴍᴀ ᴍᴀɴɪꜱ ᴅɪ ᴀᴡᴀʟ 
ᴘɪɴᴅᴀʜ ᴋᴇ ꜱᴇʀᴠᴇʀ ᴋᴀᴍɪ! 
ʟᴀʏᴀɴᴀɴ ᴏɴ 24/7ᴊᴀᴍ ᴊᴀʀɪɴɢᴀɴ ᴛᴀɴᴘᴀ ʙᴀᴛᴀꜱ - ꜱᴇᴡᴀ ʙᴜʟᴀɴᴀɴ ʙɪꜱᴀ ᴅɪ ᴘᴇʀᴘᴀɴᴊᴀɴɢ

ᴅᴀᴘᴀᴛᴋᴀɴ ᴅɪꜱᴋᴏɴ ꜱ/ᴅ 50% ᴜɴᴛᴜᴋ ᴘᴇᴍʙᴇʟɪᴀɴ ᴘᴀɴᴇʟ ᴘᴛᴇʀᴏᴅᴀᴄᴛʏʟ ᴍɪɴ 30 ʜᴀʀɪ (ᴛɪᴅᴀᴋ ᴛᴇʀᴍᴀꜱᴜᴋ ᴘᴇʀᴘᴀɴᴊᴀɴɢ)</blockquote><blockquote>ᴜᴄᴀᴘᴋᴀɴ ᴘᴇʀɪɴᴛᴀʜ ᴅɪʙᴀᴡᴀʜ ɪɴɪ ᴜɴᴛᴜᴋ ᴏʀᴅᴇʀ ɪɴꜱᴛᴀɴ :
"ʙᴇʟɪ ᴘᴀɴᴇʟ |ᴘᴀᴋᴇᴛ| ᴜꜱᴇʀɴᴀᴍᴇ |ɴᴀᴍᴀᴘᴀɴᴇʟ| ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ |ᴘᴀʏᴍᴇɴᴛ|"

ᴄᴏɴᴛᴏʜ/: "ʙᴇʟɪ ᴘᴀɴᴇʟ ᴜɴʟɪ ᴜꜱᴇʀɴᴀᴍᴇ ᴀʙᴄ ʙᴀʏᴀʀ ᴘᴀᴋᴀɪ Qʀɪꜱ"

ᴘɪʟɪʜ ᴍᴇɴᴜ ᴅɪ ʙᴀᴡᴀʜ ɪɴɪ ᴜɴᴛᴜᴋ ᴍᴇᴍᴜʟᴀɪ
╭──✧ <i>𝘐𝘯𝘧𝘰𝘳𝘮𝘢𝘴𝘪</i> ✧
│ ⪼ Legalitas #No1
╰──────────⧽</blockquote>`;

    const keyboardMenuLainnya = {
        inline_keyboard: [
            [
                { text: "🤝 𝙿𝚊𝚝𝚞𝚗𝚐𝚊𝚗 𝚅𝚙𝚜", callback_data: "menu_patungan" }
            ],
            [{ text: "💈 𝙸𝚗𝚜𝚝𝚊𝚕𝚕 𝚅𝚙𝚜", callback_data: "menu_autoinstall" }],
            [
                { text: "🎮 𝚁𝚎𝚗𝚝𝚊𝚕 𝙿𝚊𝚗𝚎𝚕", callback_data: "menu_hourly" }
            ],
            [
                { text: "🐿 𝙰𝚍𝚘𝚙𝚜𝚒 𝙿𝚎𝚝", callback_data: "menu_pet" }
            ],
            [
                { text: "💸 Freelance", callback_data: "menu_freelance" }
            ],
            [
                { text: "𝙺𝚎𝚖𝚋𝚊𝚕𝚒", callback_data: "back_to_main" } // ID Sesuai permintaanmu
            ]
        ]
    };

    // Logika pengiriman (Sama dengan kode mainmenu kamu)
    await bot.editMessageCaption(textMenuLainnya, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: keyboardMenuLainnya
    }).catch(async () => {
        // Jika gagal edit, hapus dan kirim foto baru
        await bot.deleteMessage(chatId, messageId).catch(()=>{});
        await bot.sendPhoto(chatId, settings.panelImage, {
            caption: textMenuLainnya,
            parse_mode: "HTML",
            reply_markup: keyboardMenuLainnya
        });
    });
    break;
}
case "menu_hourly": {
    const text = `<blockquote>🕒 <b>MENU RENTAL PANEL</b>\n\nButuh Panel cuma sebentar? Sewa per jam aja!\n\n💰 Harga: <b>Rp 500 / Jam</b>\n\n🔋Spesifikasi: Panel 1GB CPU 50%\n\nSilakan masukkan jumlah jam yang ingin disewa (1-24):</blockquote>`;
    
    userSessions[chatId] = { type: "hourly", step: "input_hour" };
    bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    break;
}
case "menu_trial": {
    const dbTimed = getTimedServers();
    
    // Safety check: pastikan dbTimed.slots ada sebelum di-filter
    const allSlots = dbTimed.slots || []; 
    const activeTrials = allSlots.filter(s => s.type === "TRIAL");
    
    const totalSlots = 1; // Sesuai permintaanmu sebelumnya
    const slotTerpakai = activeTrials.length;

    // --- CEK LIMIT 3 KALI ---
    const history = dbTimed.trialHistory || {};
    const usedTrials = history[chatId] || 0;
    const maxLimit = 3;

    if (usedTrials >= maxLimit) {
        const textLimit = `<blockquote>( ❌ ) - <b>ᴀᴋꜱᴇꜱ ᴅɪʙᴀᴛᴀꜱɪ</b></blockquote>
<blockquote>ᴍᴀᴀꜰ, ᴋᴀᴍᴜ ꜱᴜᴅᴀʜ ᴍᴇɴɢɢᴜɴᴀᴋᴀɴ ᴊᴀᴛᴀʜ ᴜᴊɪ ᴄᴏʙᴀ ɢʀᴀᴛɪꜱ ꜱᴇʙᴀɴʏᴀᴋ <b>3/3 ᴋᴀʟɪ</b>.</blockquote>`;
        
        return bot.editMessageCaption(textLimit, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "⬅️ ᴋᴇᴍʙᴀʟɪ", callback_data: "menu_lainnya" }]] }
        });
    }

    // --- CEK SLOT PENUH ---
    if (slotTerpakai >= totalSlots) {
        const sorted = activeTrials.sort((a, b) => new Date(a.expiredAt) - new Date(b.expiredAt));
        const sisaWaktu = Math.ceil((new Date(sorted[0].expiredAt) - new Date()) / (1000 * 60));

        const textFull = `<blockquote>( ❌ ) - <b>ᴍᴀᴀꜰ ꜱʟᴏᴛ ᴜᴊɪ ᴄᴏʙᴀ ᴘᴇɴᴜʜ</b></blockquote>
<blockquote>ꜱʟᴏᴛ ᴀᴋᴀɴ ᴛᴇʀꜱᴇᴅɪᴀ ᴅᴀʟᴀᴍ ᴡᴀᴋᴛᴜ: <b>${sisaWaktu} ᴍᴇɴɪᴛ ʟᴀɢɪ</b></blockquote>`;

        return bot.editMessageCaption(textFull, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "⬅️ ᴋᴇᴍʙᴀʟɪ", callback_data: "menu_lainnya" }]] }
        });
    }

    // --- TAMPILKAN INFO ---
    const textInfoTrial = `<blockquote>( 🎁 ) - <b>ɪɴꜰᴏʀᴍᴀꜱɪ ᴜᴊɪ ᴄᴏʙᴀ ɢʀᴀᴛɪꜱ</b></blockquote>
<blockquote>📊 <b>ꜱᴛᴀᴛᴜꜱ ᴋᴜᴏᴛᴀ ᴋᴀᴍᴜ:</b>
- ᴛᴇʀᴘᴀᴋᴀɪ: ${usedTrials} / 3 ᴋᴀʟɪ
- ꜱɪꜱᴀ: ${maxLimit - usedTrials} ᴋᴀʟɪ ʟᴀɢɪ

ᴋʟɪᴋ ʙᴜᴛᴛᴏɴ ᴅɪ ʙᴀᴡᴀʜ ᴜɴᴛᴜᴋ ᴍᴇᴍᴜʟᴀɪ.</blockquote>`;

    await bot.editMessageCaption(textInfoTrial, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ ᴍᴜʟᴀɪ ᴜᴊɪ ᴄᴏʙᴀ", callback_data: "start_trial_now" }],
                [{ text: "⬅️ ᴋᴇᴍʙᴀʟɪ", callback_data: "menu_lainnya" }]
            ]
        }
    });
    break;
}
case "start_trial_now": {
    const dbTimed = getTimedServers();
    
    // --- SAFETY CHECK (PENTING!) ---
    // Pastikan jika .slots tidak ada, bot menggunakan array kosong [] agar tidak crash
    const allSlots = dbTimed.slots || []; 
    const activeTrials = allSlots.filter(s => s.type === "TRIAL");
    
    // Batas slot (Sesuaikan: tadi kamu minta 1 slot, di kode ini 3. Saya samakan dengan kodemu)
    if (activeTrials.length >= 1) {
        return bot.answerCallbackQuery(query.id, { 
            text: "Maaf, slot sedang penuh. Silakan kembali lagi nanti.", 
            show_alert: true 
        });
    }

    const textProses = `<blockquote>( ⚙️ ) - <b>ꜱᴇᴅᴀɴɢ ᴍᴇᴍᴘʀᴏꜱᴇꜱ</b></blockquote>
<blockquote>ᴘᴇʀᴍɪɴᴛᴀᴀɴ ᴜᴊɪ ᴄᴏʙᴀ ᴋᴀᴍᴜ ꜱᴇᴅᴀɴɢ ᴅɪᴘʀᴏꜱᴇꜱ ᴏʟᴇʜ ꜱɪꜱᴛᴇᴍ. ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ ꜱᴇʙᴇɴᴛᴀʀ...</blockquote>`;

    await bot.editMessageCaption(textProses, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML"
    });

    // --- LOG ADMIN TRIAL ---
    const notifAdminTrial = `<blockquote>🎁 <b>ʟᴏɢ ᴀᴅᴍɪɴ: ᴜᴊɪ ᴄᴏʙᴀ ɢʀᴀᴛɪꜱ</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ᴜꜱᴇʀ ɪᴅ: <code>${chatId}</code>\n👤 ᴜꜱᴇʀɴᴀᴍᴇ: @${query.from.username || 'ᴛᴀɴᴘᴀ ᴜꜱᴇʀɴᴀᴍᴇ'}\n\n<i>ꜱᴛᴀᴛᴜꜱ: ꜱᴇᴅᴀɴɢ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ᴛʀɪᴀʟ 1 ᴊᴀᴍ...</i></blockquote>`;
    bot.sendMessage(settings.adminId, notifAdminTrial, { parse_mode: "HTML" }).catch(()=>{});

    // Jalankan fungsi pembuatan
    await autoCreatePanelTimed(chatId, "Trial 1GB", 1, true);
    break;
}
case "menu_patungan": {
    const text = `<blockquote><b>🤝 MENU PATUNGAN VPS (CROWDFUNDING)</b>\n\n` +
                 `Beli Vps buat rame rame? Cocok nih! Ajak teman mu untuk berkontribusi, Penyetor pertama akan mendapatkan Tittle CEO yang memegang data Vps!\n\n` +
                 `Jika durasi Patungan habis dan Progres tidak mencapai target, Saldo akan di Refund Otomatis.\n\n` +
                 `Pilih paket yang ingin kamu buka atau ikuti Progres yang sedang berlangsung. Pembayar pertama otomatis jadi <b>CEO</b>.</blockquote>`;
    
    const btn = [
        [{ text: "💈 INTEL XEON PT RAM 2GB", callback_data: "p_pilih_2GB" }],
        [{ text: "💈 INTEL XEON PT RAM 4GB", callback_data: "p_pilih_4GB" }],
        [{ text: "« Kembali", callback_data: "back_to_main" }]
    ];

    await bot.editMessageCaption(text, { 
        chat_id: chatId, message_id: messageId, 
        parse_mode: "HTML", reply_markup: { inline_keyboard: btn } 
    });
    break;
}
// --- MENU PILIH PAKET ---
case "p_pilih_2GB":
case "p_pilih_4GB": {
    const paketDipilih = query.data.split("_")[2];
    const hargaVps = (paketDipilih === "2GB") ? 35000 : 60000;

    // Simpan data awal ke sesi
    userSessions[chatId] = { 
        type: "patungan", 
        paket: paketDipilih, 
        hargaVps: hargaVps, // Harga asli VPS
        username_tg: query.from.username || "User"
    };

    const text = `<blockquote><b>💈 SETTING MODE PATUNGAN VPS</b>\n\n` +
                 `Paket: ${paketDipilih.toUpperCase()}\n` +
                 `Harga VPS: Rp ${hargaVps.toLocaleString()}\n\n` +
                 `Silakan pilih mode patungan:</blockquote>`;

    const btn = [
        [{ text: "👥 Mode Atur (Tentukan Slot)", callback_data: "p_mode_atur" }],
        [{ text: "🌊 Mode Fleksibel (Bebas Kontribusi)", callback_data: "p_mode_flex" }],
        [{ text: "« Batal", callback_data: "menu_patungan" }]
    ];
    await bot.editMessageCaption(text, { chat_id: chatId, message_id: messageId, parse_mode: "HTML", reply_markup: { inline_keyboard: btn } });
    break;
}

// --- PILIH MODE ---
case "p_mode_atur":
case "p_mode_flex": {
    const mode = query.data.split("_")[2];
    userSessions[chatId].mode = mode;

    let text, btn;
    if (mode === "atur") {
        text = `<blockquote><b>👥 MODE ATUR</b>\n\nBerapa jumlah orang yang boleh ikut patungan (termasuk kamu)?\n<i>Contoh: Jika diisi 5, maka Rp 35.000 / 5 = Rp 7.000 per orang.</i></blockquote>`;
        userSessions[chatId].step = "input_patungan_slot";
        await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    } else {
        text = `<blockquote><b>🌊 MODE FLEKSIBEL</b>\n\nMode ini dapat menampung banyak user (tanpa batas) hingga saldo mencapai target hanya user yang berkontribusi yang akan mendapatkan Tittle dan Akses, dan Penyetor pertama akan mendapatkan Tittle CEO.\n\nBerapa nominal yang ingin kamu bayar sekarang sebagai CEO?\n(Minimal Rp 1.000)</blockquote>`;
        userSessions[chatId].step = "input_patungan_nominal";
        await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    }
    break;
}
case "p_dur_24":
case "p_dur_48":
case "p_dur_168": {
    const jam = parseInt(query.data.split("_")[2]);
    userSessions[chatId].durasi = jam;
    userSessions[chatId].roomId = "R" + Date.now(); // Room baru karena dia CEO
    
    // Langsung panggil QRIS
    return bot.answerCallbackQuery(query.id, { text: "Mengarahkan ke pembayaran..." }).then(() => {
        // Trigger manual ke case qr_server_1
        bot.emit('callback_query', { ...query, data: 'qr_server_1' });
    });
    break;
}
            case "menu_panel":
                await bot.deleteMessage(chatId, messageId).catch(()=>{}); 
                                const captionPanel = "<blockquote>🖥 <b>PTERODACTYL PANEL - THE OPEN-SOURCE GAME MANAGEMENT SOLUTION</b>\n\nPilih tier paket dibawah ini sesuai kebutuhan anda...</blockquote>";
                
                const btnPaket = {
    reply_markup: {
        inline_keyboard: [
            // Baris 1: Started dan Medium Sejajar
            [
                { text: "🥉 𝘗𝘢𝘬𝘦𝘵 𝘚𝘵𝘢𝘳𝘵𝘦𝘥", callback_data: "paket_started" },
                { text: "🥈 𝘗𝘢𝘬𝘦𝘵 𝘔𝘦𝘥𝘪𝘶𝘮", callback_data: "paket_medium" }
            ],
            // Baris 2: Pro Sendirian
            [
                { text: "🥇 𝘗𝘢𝘬𝘦𝘵 𝘗𝘙𝘖", callback_data: "paket_pro" }
            ],
            // Baris 3: Kembali
            [
                { text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪", callback_data: "back_to_main" }
            ]
        ]
    }
};
                
                // parse_mode diubah menjadi "HTML"
                await bot.sendPhoto(chatId, settings.panelImage, { caption: captionPanel, parse_mode: "HTML", ...btnPaket });
                break;
                            // DI DALAM SWITCH (DATA)
                            
                case "menu_vps":
                await bot.deleteMessage(chatId, messageId).catch(()=>{}); 
                
                // FORMAT QUOTE MENGGUNAKAN HTML
                let textVps = `<blockquote>🚀 <b>MENU - CLOUD VPS</b>\n`;
                textVps += `━━━━━━━━━━━━━━━━━━\n\n`;
                textVps += `<i>Beli Vps kualitas terbaik dengan standar kualitas global? Disini tempatnya!\nBukan spek Vps kaleng kaleng yang dijual murah kualitas buruk, punya potensi suspend dan gak tahan lama bisnis hosting mu bisa berantakan dong, vps kena suspend,pelanggan bisa kabur dan ngecap jelek nama baik kamu juga store mu. Mulai ganti Vps mu sekarang dengan yang Legal 100%</i>\n\n`;
                textVps += `Silakan cek ketersediaan stok VPS hari ini.</blockquote>`;
                
                const btnVps = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔍 𝘊𝘦𝘬 𝘒𝘦𝘵𝘦𝘳𝘴𝘦𝘥𝘪𝘢𝘢𝘯 𝘝𝘗𝘚", callback_data: "check_vps_stock" }],
                            [{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪", callback_data: "back_to_main" }]
                        ]
                    }
                };
                
                // SANGAT PENTING: parse_mode diubah menjadi "HTML"
                await bot.sendPhoto(chatId, settings.panelImage, { caption: textVps, parse_mode: "HTML", ...btnVps });
                break;
                        // ====================================================
            // FITUR 1: MENU PROFIL & LIST SERVER
            // ====================================================
            
           case "menu_profil": {
  const userId = query.from.id;
  const dbUsers = getUsers();
  const myProfile = dbUsers[chatId];
  const userData = dbUsers[userId] || {};

  if (!myProfile) {
    await bot.answerCallbackQuery(query.id, { text: "Profil tidak ditemukan. Ketik /start dulu.", show_alert: true });
    break;
  }

  const saldoUser = myProfile.saldo || 0;
  const gachaSisa = 3 - (myProfile.gachaCount || 0);

// 1. Deklarasi dulu pake let biar bisa diubah
let saldoFreelance = userData.saldoFreelance || 0;
let saldoPending = userData.saldoPending || 0;

// 2. Baru hitung ulang saldoPending dari task.json
if (fs.existsSync(FILE_TASK)) {
    const tasks = JSON.parse(fs.readFileSync(FILE_TASK, "utf8"));
    const userTasks = tasks.filter(task => String(task.userId) === String(chatId));
    saldoPending = userTasks.reduce((total, task) => total + (task.saldoPending || 0), 0);
}

  // === AMBIL DATA PET ===
  const userPet = await getUserPet(chatId);
  let textPet = "";
  if (userPet.pet) {
    const sisaExperiencePoint = getRemainingXP(userPet.pet);
    const halfLevel = Math.floor(userPet.pet.maxLevel / 2);
    let fase = "Bayi 🐣";
    if (userPet.pet.level >= userPet.pet.maxLevel) {
      fase = "Dewasa 👑";
    } else if (userPet.pet.level >= halfLevel) {
      fase = "Tumbuh 🌱";
    }

    textPet = `\n\n🐾 <b>PET: ${userPet.pet.name}</b>\n`;
    textPet += `├ Level: ${userPet.pet.level}/${userPet.pet.maxLevel} ${fase}\n`;
    textPet += `└ Experience Point: ${userPet.pet.xp}/10 | Sisa: ${sisaExperiencePoint} Experience Point`;
  } else {
    textPet = `\n\n🐾 <b>PET:</b> Belum ada\nKlik tombol "🐾 Pet" untuk adopsi`;
  }

  // === BLOK DATA FREELANCE ===

let textFreelance = `\n\n💼 <b>FREELANCE</b>\n`;
textFreelance += `├ Saldo Freelance: Rp${saldoFreelance.toLocaleString("id-ID")}\n`;
textFreelance += `└ Saldo Pending: Rp${saldoPending.toLocaleString("id-ID")}`;

  let textProfil = `<blockquote>👤 <b>PROFIL AKUN</b>\n\n`;
  textProfil += `🆔 ID: <code>${chatId}</code>\n`;
  textProfil += `💰 <b>SALDO PANEL: Rp ${saldoUser.toLocaleString("id-ID")}</b>\n`;
  textProfil += `🎰 Gacha Hari Ini: <b>${gachaSisa > 0? gachaSisa : 0}x</b>`;
  textProfil += textFreelance; // TAMPILIN BLOK FREELANCE DI SINI
  textProfil += textPet; // TAMPILIN BLOK PET DI SINI
  textProfil += `\n\n🟢 <b>SERVER AKTIF:</b>\n`;

  let btnProfil = [
    [
      { text: "🎮 Gacha Harian", callback_data: "menu_gacha" },
      { text: "➕ Top Up Saldo", callback_data: "menu_deposit" }
    ],
    [
      { text: "🐾 Kelola Pet", callback_data: "menu_pet" }
    ],
    [
      { text: "« Kembali", callback_data: "back_to_main" }
    ]
  ];

  if (!myProfile.servers || myProfile.servers.length === 0) {
    textProfil += `<i>Belum ada panel yang aktif.</i>`;
  } else {
    myProfile.servers.forEach((server, index) => {
      const waktuSekarang = new Date();
      const waktuHabis = parseFlexibleDate(server.expired_date);
      const selisihMilidetik = waktuHabis - waktuSekarang;

      let statusExpired = "";
      let peringatan = "";

      if (!isNaN(waktuHabis.getTime())) {
        if (selisihMilidetik > 0) {
          const hari = Math.floor(selisihMilidetik / (1000 * 60 * 60 * 24));
          const jam = Math.floor((selisihMilidetik % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const menit = Math.floor((selisihMilidetik % (1000 * 60 * 60)) / (1000 * 60));

          if (hari > 0) {
            statusExpired = `${hari} Hari ${jam} Jam`;
          } else if (jam > 0) {
            statusExpired = `${jam} Jam ${menit} Menit`;
          } else {
            statusExpired = `${menit} Menit lagi`;
          }

          if (hari < 2) {
            peringatan = `\n⚠️ <b>MASA AKTIF AKAN HABIS</b>`;
          }
        } else {
          statusExpired = "❌ <b>SUDAH EXPIRED</b>";
        }
      } else {
        statusExpired = "Format Tanggal Salah";
      }

      textProfil += `\n🖥 <b>Panel ${index + 1}</b> (<code>${server.username_panel}</code>)\n`;
      textProfil += `├ Paket: ${server.paket}\n`;
      textProfil += `├ Order: <code>${server.order_date}</code>\n`;
      textProfil += `└ Expired: <b>${statusExpired}</b>${peringatan}\n`;
    });

    btnProfil.unshift([
      { text: "🔄 Perpanjangan Server", callback_data: "extend_list" }
    ]);
  }

  textProfil += `</blockquote>`;

  await bot.deleteMessage(chatId, messageId).catch(() => {});

  await bot.sendPhoto(chatId, settings.panelImage, {
    caption: textProfil,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: btnProfil }
  }).catch(() => {
    bot.sendMessage(chatId, textProfil, { parse_mode: "HTML", reply_markup: { inline_keyboard: btnProfil } });
  });
  break;
}
case "roll_gacha": {
    const dbUsers = getUsers();
    const myProfile = dbUsers[chatId];

    if (myProfile.gachaCount >= 3) {
        return bot.editMessageText("❌ Kamu sudah melakukannya hari ini, Silakan datang kembali besok!.", { chat_id: chatId, message_id: messageId });
    }

    myProfile.gachaCount += 1;
    
    // Sistem Win Rate Rendah (Misal 5% peluang menang)
    // Berdasarkan permintaan: menang sulit (rate rendah)
    const winRate = Math.random() < 0.50; // 0.05 = 5% peluang menang
    let textResult = "";
    
    bot.sendMessage(settings.adminId, `🎰 <b>GACHA LOG</b>\nUser: ${chatId}\nUsername: ${myProfile.username}\nKlik Gacha ke-${myProfile.gachaCount}`);

    if (winRate) {
        const hadiah = 5;
        myProfile.saldo = (myProfile.saldo || 0) + hadiah;
        textResult = `🎉 <b>SELAMAT!</b>\n\nKamu mendapatkan saldo gratis sebesar <b>Rp ${hadiah}</b>! Saldo telah ditambahkan ke profilmu.`;
        
        // Notif Admin
        bot.sendMessage(settings.adminId, `🔥 <b>GACHA WINNER!</b>\nUser: ${chatId}\nMendapatkan: Rp ${hadiah}`);
    } else {
        textResult = `🎰 <b>ZONK!</b>\n\nMaaf, kamu belum beruntung di putaran ke-${myProfile.gachaCount}. Ayo coba lagi!`;
    }

    const sisa = 3 - myProfile.gachaCount;
    let btnGacha = [];
    
    if (sisa > 0) {
        btnGacha.push([{ text: `🎰 SPIN LAGI (${sisa}x)`, callback_data: "roll_gacha" }]);
    }
    btnGacha.push([{ text: "« Kembali ke Profil", callback_data: "menu_profil" }]);

    saveUsers(dbUsers);
    
    await bot.editMessageText(textResult, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: btnGacha }
    });
    break;
}
// 1. Klik Tombol Deposit
case "menu_deposit":
    userSessions[chatId] = { step: "waiting_depo_amount" };
    await bot.sendMessage(chatId, "💰 <b>TOP UP SALDO</b>\n\nMasukkan nominal yang ingin kamu deposit:\n(Min: 2000)", { parse_mode: "HTML" });
    break;
    
case "pay_via_saldo": {
    const userId = query.from.id;
    const session = userSessions[userId];
    const dbUsers = getUsers();
    const user = dbUsers[userId];

    if (!session || !session.harga) {
        return bot.answerCallbackQuery(query.id, { text: "⚠️ Sesi order hilang, Harap order ulang.", show_alert: true });
    }

    const harga = parseInt(session.harga);
    const saldoSekarang = user.saldo || 0;

    // 1. Cek apakah saldo cukup
    if (saldoSekarang < harga) {
        return bot.answerCallbackQuery(query.id, { 
            text: `❌ Saldo Tidak Cukup!\n\nHarga: Rp ${harga.toLocaleString()}\nSaldo: Rp ${saldoSekarang.toLocaleString()}\n\nSilakan Top Up dulu di menu Profil.`, 
            show_alert: true 
        });
    }

    // 2. Jika cukup, Potong Saldo
    dbUsers[userId].saldo = saldoSekarang - harga;
    saveUsers(dbUsers); // Simpan perubahan ke file JSON

    await bot.answerCallbackQuery(query.id, { text: "✅ Saldo berhasil dipotong! Memproses pesanan...", show_alert: true });

    // 3. Jalankan Eksekusi Produk (Panel/VPS)
    // Kita buat Order ID manual dengan awalan "WAL" (Wallet)
    const walletOrderId = `WAL-${Date.now()}`;
    
    // Panggil fungsi pusat yang sudah kita buat tadi
    await handlePaymentSuccess(userId, session, walletOrderId, messageId);
    
    break;
}
case "menu_gacha": {
    const dbUsers = getUsers();
    const myProfile = dbUsers[chatId];

    // --- LOGIKA RESET JAM 00.00 WIB ---
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); 

    if (myProfile.lastGachaDate !== today) {
        myProfile.lastGachaDate = today;
        myProfile.gachaCount = 0;
        myProfile.gachaLocked = false;
        saveUsers(dbUsers);
    }

    if (myProfile.gachaLocked) {
        return bot.answerCallbackQuery(query.id, { 
            text: "❌ Jawaban kamu tadi salah, Kembali lagi besok ya!", 
            show_alert: true 
        });
    }

    if (myProfile.gachaCount >= 3) {
        return bot.answerCallbackQuery(query.id, { 
            text: "❌ Kamu sudah melakukannya hari ini, Kembali lagi besok ya!", 
            show_alert: true 
        });
    }

    // --- GENERATE SOAL (Penjumlahan, Pengurangan, Perkalian) ---
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, hasil;

    if (op === '+') {
        a = Math.floor(Math.random() * 40) + 10; // 10 - 50
        b = Math.floor(Math.random() * 40) + 10; // 10 - 50
        hasil = a + b;
    } else if (op === '-') {
        a = Math.floor(Math.random() * 30) + 20; // 20 - 50
        b = Math.floor(Math.random() * 15) + 1;  // 1 - 15
        hasil = a - b; // Pastikan hasil selalu positif
    } else { // Perkalian (*)
        a = Math.floor(Math.random() * 10) + 2;  // 2 - 12
        b = Math.floor(Math.random() * 10) + 2;  // 2 - 12
        hasil = a * b; // Hasil selalu bulat (integer)
    }

    userSessions[chatId] = { 
        step: "waiting_gacha_answer", 
        answer: hasil 
    };

    const textGacha = `<blockquote>🎮 <b>TANTANGAN GACHA HARIAN</b>\n\n` +
                    `Selesaikan soal ini untuk mulai Spin:\n` +
                    `Berapakah hasil dari: <b>${a} ${op} ${b}</b> ?\n\n` +
                    `<i>Sisa Spin: ${3 - myProfile.gachaCount}x\n⚠️ Jika salah jawab, Spin hari ini HANGUS!</i></blockquote>`;

    await bot.deleteMessage(chatId, messageId).catch(()=>{});
    await bot.sendPhoto(chatId, settings.panelImage, { 
        caption: textGacha, 
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "« Kembali", callback_data: "menu_profil" }]] }
    });
    break;
}
            // ====================================================
            // FITUR 2: PILIH SERVER UNTUK DIPERPANJANG
            // ====================================================
            case "extend_list":
                const myData = getUsers()[chatId];
                if (!myData || !myData.servers || myData.servers.length === 0) break;

                let extButtons = [];
                myData.servers.forEach((srv, index) => {
                    // Tombol untuk masing-masing server
                    extButtons.push([{ text: `🖥 Perpanjang: ${srv.username_panel}`, callback_data: `ext_ui_${index}_1` }]);
                });
                extButtons.push([{ text: "« 𝘒𝘦𝘮𝘣𝘢𝘭𝘪 𝘒𝘦 𝘗𝘳𝘰𝘧𝘪𝘭", callback_data: "menu_profil" }]);

                await bot.deleteMessage(chatId, messageId).catch(()=>{});
                // Menggunakan gambar panel dari setting
                await bot.sendPhoto(chatId, settings.panelImage, { 
                    caption: "<blockquote>🔄 <b>PERPANJANG MASA SEWA</b>\n\nSilakan pilih server panel mana yang ingin Anda perpanjang masa aktifnya:</blockquote>", 
                    parse_mode: "HTML", 
                    reply_markup: { inline_keyboard: extButtons } 
                });
                break;
            // ====================================================
            // PAYMENT GATEWAY PAKASIR (CREATE QRIS)
            // ====================================================
            case "qr_server_1": {
    const userId = query.from.id;
    const session = userSessions[userId];

    // 1. VALIDASI SESI (Ditambahkan tipe 'patungan')
    if (!session || (!session.username && session.type !== "deposit" && session.type !== "patungan")) {
        await bot.answerCallbackQuery(query.id, { 
            text: "Sesi order habis. Harap order ulang.", 
            show_alert: true 
        });
        break;
    }

    await bot.answerCallbackQuery(query.id, { text: "Membuat QRIS, mohon tunggu..." });

    // --- BAGIAN PENENTUAN ORDER ID KHUSUS ---
    let prefix = "INV";
    if (session.type === "deposit") prefix = "DEP";
    if (session.type === "patungan") prefix = "PTG"; // ID Khusus Patungan
    
    const orderId = session.orderId || `${prefix}${Date.now()}`;
    
    try {
        const res = await axios.post(`${settings.pakasir.baseUrl}/transactioncreate/qris`, {
            project: settings.pakasir.slug,
            order_id: orderId,
            amount: session.harga, 
            api_key: settings.pakasir.apiKey
        });

        const qrisString = res.data.payment.payment_number; 
        const totalPayment = res.data.payment.total_payment; 
        
        userSessions[userId].orderId = orderId;
        userSessions[userId].amount = session.harga; 

        const qrisImageBuffer = await QRCode.toBuffer(qrisString, { 
            margin: 4, scale: 12,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        // --- BAGIAN DINAMIS (TIDAK MERUSAK STRUKTUR LAMA) ---
        let labelUser, valueUser, labelProduk, valueProduk, extraNote = "";

        if (session.type === "deposit") {
            labelUser = "UID";
            valueUser = userId;
            labelProduk = "Deposit";
            valueProduk = "Isi Saldo";
        } else if (session.type === "patungan") {
            // Deskripsi khusus Patungan
            labelUser = "Room ID";
            valueUser = session.roomId || "NEW ROOM";
            labelProduk = "Paket & Role";
            valueProduk = `${session.paket.toUpperCase()} (${session.role})`; // Menampilkan Role CEO/Partner dll
            extraNote = `\n<i>Setelah bayar, kamu otomatis menjadi <b>${session.role}</b></i>`;
        } else {
            // Default untuk Panel/VPS biasa
            labelUser = "Username";
            valueUser = session.username;
            labelProduk = "Produk";
            valueProduk = session.paket || "Panel Pterodactyl";
        }

        // 5. RENDER TEXT INVOICE (Menggunakan variabel dinamis di atas)
        const textQr = `<blockquote>🛒 <b>INVOICE ORDER</b>

📝 <b>Order ID:</b> <code>${orderId}</code>
👤 <b>${labelUser}:</b> <code>${valueUser}</code>
📦 <b>${labelProduk}:</b> ${valueProduk}
💰 <b>Total Bayar:</b> <b>Rp ${totalPayment}</b>\n(Termasuk Fee)\n\n${extraNote}

<i>Silakan scan QRIS di atas. Klik tombol di bawah jika sudah bayar.</i></blockquote>`;
                    
        await bot.deleteMessage(userId, messageId).catch(()=>{});
        
        await bot.sendPhoto(userId, qrisImageBuffer, {
            caption: textQr,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [ 
                    [{ text: "Cek Status Pembayaran ♻️", callback_data: "cek_payment_status" }],
                    [{ text: "Batal ❌", callback_data: "back_to_main" }]
                ] 
            }
        });

    } catch (err) {
        console.error("Error Pakasir:", err.response ? err.response.data : err.message);
        await bot.sendMessage(userId, "⚠️ Gagal membuat QRIS. Silakan coba lagi atau hubungi admin.");
    }
    break;
}

case "pay_crypto_heleket": {
    const userId = query.from.id;
    const session = userSessions[userId];

    if (!session || !session.harga) {
        return bot.answerCallbackQuery(query.id, { text: "⚠️ Harga tidak ditemukan, Silakan order ulang.", show_alert: true });
    }

    try {
        // 1. Bersihkan Harga & Hitung USD
        const hargaMentah = String(session.harga).replace(/[^0-9]/g, '');
        const kurs = parseFloat(settings.heleket.kursUsd) || 17089;
        const amountUSD = (parseFloat(hargaMentah) / kurs).toFixed(2);
        
        // Buat Order ID yang lebih pendek (beberapa API sensitif terhadap panjang ID)
        const orderId = `INV${Math.floor(Date.now() / 1000)}`; 

        // 2. Buat Payload (Urutan: amount, currency, order_id)
        const payload = {
            amount: String(amountUSD),
            currency: "USD",
            order_id: String(orderId)
        };

        // 3. Stringify & Sign (Metode Paling Akurat)
        // Gunakan replace manual untuk memastikan slash di-escape dengan benar
        const rawBody = JSON.stringify(payload).replace(/\//g, "\\/");
        const base64Body = Buffer.from(rawBody).toString('base64');
        
        // Pastikan API Key bersih dari spasi di awal/akhir
        const cleanApiKey = settings.heleket.apiKey.trim();
        const cleanMerchant = settings.heleket.merchant.trim();

        const signature = crypto.createHash('md5')
            .update(base64Body + cleanApiKey)
            .digest('hex');

        // DEBUG: Cek terminal untuk memastikan data bersih
        console.log("--- DEBUG RE-CHECK ---");
        console.log("Payload:", rawBody);
        console.log("Sign:", signature);

        await bot.answerCallbackQuery(query.id, { text: "Menghubungkan ke Gateway..." });

        // 4. Kirim Request
        const response = await axios.post('https://api.heleket.com/v1/payment', rawBody, {
            headers: {
                'merchant': cleanMerchant,
                'sign': signature,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.state === 0) {
            const res = response.data.result;
            let textPay = `💎 <b>PEMBAYARAN CRYPTO</b>\n\n` +
                          `💵 Total Tagihan: <b>$${amountUSD} USD</b>\n` +
                          `🆔 Invoice ID: <code>${res.uuid}</code>\n\n` +
                          `<i>Klik tombol di bawah untuk membayar. Link berlaku 60 menit.</i>`;

            const btnPay = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔗 BAYAR SEKARANG", url: res.url }],
                        [{ text: "🔄 CEK STATUS", callback_data: `check_pay_${res.uuid}` }],
                        [{ text: "« Kembali", callback_data: "back_to_main" }]
                    ]
                }
            };

            // PERBAIKAN DI SINI: Gunakan editMessageText karena pesan sebelumnya adalah teks
            await bot.editMessageText(textPay, {
                chat_id: userId,
                message_id: messageId,
                parse_mode: "HTML",
                ...btnPay
            }).catch((err) => {
                // Jika masih error, kirim sebagai pesan baru (fallback)
                bot.sendMessage(userId, textPay, { parse_mode: "HTML", ...btnPay });
            });

        } else {
            bot.answerCallbackQuery(query.id, { text: "Heleket: " + response.data.message, show_alert: true });
        }

    } catch (err) {
        console.error("HTTP ERROR:", err.response?.data || err.message);
        const msg = err.response?.data?.message || "Invalid Sign. Cek API Key di settings.";
        bot.answerCallbackQuery(query.id, { text: "Error: " + msg, show_alert: true });
    }
    break;
}

            case "qr_server_2":
                await bot.answerCallbackQuery(query.id, { text: "Server QRIS 2 sedang maintenance.", show_alert: true });
                break;
                
                case "qr_server_3":
                await bot.answerCallbackQuery(query.id, { text: "Server Crypto belum tersedia.", show_alert: true });
                return; // Return khusus alert

            // ====================================================
            // CEK STATUS PAKASIR (MANUAL BUTTON)
            // ====================================================
   case "cek_payment_status": {
    const userId = query.from.id;
    const curSession = userSessions[userId];

    if (!curSession || !curSession.orderId) {
        return bot.answerCallbackQuery(query.id, { text: "Data order tidak ditemukan.", show_alert: true });
    }

    try {
        const checkUrl = `${settings.pakasir.baseUrl}/transactiondetail?project=${settings.pakasir.slug}&amount=${curSession.amount}&order_id=${curSession.orderId}&api_key=${settings.pakasir.apiKey}`;
        const statusRes = await axios.get(checkUrl);
        const txStatus = statusRes.data.transaction.status; 

        if (txStatus === "completed") {
            await bot.answerCallbackQuery(query.id, { text: "✅ Pembayaran SUKSES! Memproses Pesanan...", show_alert: true });
            
            // Panggil fungsi pusat eksekusi (Sama dengan Heleket)
            await handlePaymentSuccess(userId, curSession, curSession.orderId, messageId);
        } else {
            await bot.answerCallbackQuery(query.id, { text: "⏳ Belum lunas. Silakan bayar dulu ya!", show_alert: true });
        }
    } catch (err) {
        bot.answerCallbackQuery(query.id, { text: "Gagal mengecek status.", show_alert: true });
    }
    break;
}
            // ====================================================
            // FITUR SIMULASI PEMBAYARAN (SANDBOX)
            // ====================================================
            case "simulate_payment":
                const simSession = userSessions[chatId];
                if (!simSession || !simSession.orderId) {
                    await bot.answerCallbackQuery(query.id, { text: "Data order tidak valid.", show_alert: true });
                    break;
                }

                await bot.answerCallbackQuery(query.id, { text: "Mengirim simulasi..." });

                try {
                    // Tembak API Simulasi Pakasir
                    await axios.post(`${settings.pakasir.baseUrl}/paymentsimulation`, {
                        project: settings.pakasir.slug,
                        order_id: simSession.orderId,
                        amount: simSession.amount,
                        api_key: settings.pakasir.apiKey
                    });

                    // Bot tidak perlu memanggil fungsi createPanel di sini. 
                    // Karena Pakasir akan otomatis mengirim ping ke WEBHOOK Anda, 
                    // dan fungsi webhook di bawah akan mengeksekusi create panel.
                    
                    await bot.sendMessage(chatId, "🧪 *SIMULASI DIKIRIM!*\nMenunggu respon Webhook dari server Pakasir...", { parse_mode: "Markdown" });

                } catch (err) {
                    console.error("Simulasi Error:", err.response ? err.response.data : err.message);
                    await bot.answerCallbackQuery(query.id, { text: "Gagal mengirim simulasi.", show_alert: true });
                }
                break;

            // ====================================================
            // FITUR BATALKAN PESANAN (CANCEL TRANSACTION)
            // ====================================================
            case "cancel_payment":
                const cancelSession = userSessions[chatId];
                if (!cancelSession || !cancelSession.orderId) {
                    await bot.answerCallbackQuery(query.id, { text: "Tidak ada order aktif yang bisa dibatalkan.", show_alert: true });
                    break;
                }

                await bot.answerCallbackQuery(query.id, { text: "Membatalkan pesanan..." });

                try {
                    // Tembak API Cancel Pakasir
                    await axios.post(`${settings.pakasir.baseUrl}/transactioncancel`, {
                        project: settings.pakasir.slug,
                        order_id: cancelSession.orderId,
                        amount: cancelSession.amount,
                        api_key: settings.pakasir.apiKey
                    });

                    // Edit caption foto QR menjadi "Pesanan Dibatalkan" agar tidak bisa discan lagi
                    await bot.editMessageCaption(`<blockquote>❌ <b>PESANAN DIBATALKAN</b>\n\nOrder ID: <code>${cancelSession.orderId}</code> telah berhasil dibatalkan oleh pengguna.</blockquote>`, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: "HTML" // <-- UBAH KE HTML
                    });

                    // Hapus sesi user
                    delete userSessions[chatId];

                    // Tampilkan notifikasi pop-up
                    await bot.answerCallbackQuery(query.id, { text: "Pesanan berhasil dibatalkan dari sistem.", show_alert: true });

                } catch (err) {
                    console.error("Cancel Error:", err.response ? err.response.data : err.message);
                    await bot.answerCallbackQuery(query.id, { text: "Gagal membatalkan pesanan di server 1.", show_alert: true });
                }
                break;
            case "cekid":
                await bot.sendMessage(chatId, `ID Anda adalah: ${chatId}`);
                break;

            // === CASE 1: BUKA MENU PET ===
            case 'menu_pet': {
    const userId = query.from.id
    const user = await getUserPet(userId)

    // Keyboard adopsi - callback tetep pick_egg biar ga ngerusak flow lama
    const keyboardAdopt = {
        inline_keyboard: [
            [
                {text: '🥚 Blaze Telur Api', callback_data: 'pick_egg'},
                {text: '🌱 Leafy Bibit Pohon', callback_data: 'pick_tree'}
            ],
            [
                {text: '🐱 Pawsy Anak Kucing', callback_data: 'pick_cat'}
            ],
            [{text: '⬅️ Kembali', callback_data: 'back_to_main'}]
        ]
    }

    if(!user ||!user.pet) {
        // Belum punya pet → hapus pesan lama + kirim teks baru
        try {
            await bot.deleteMessage(chatId, messageId)
        } catch(e) {}

        await bot.sendMessage(chatId,
            `<blockquote>🐾 <b>ADOPSI PET PERTAMA KAMU!</b>\n\nPilih bibit pet. Tiap pet punya 3 fase: Bayi → Tumbuh → Dewasa\nDapatkan Rewards hadiah menarik mulai dari produk VPS hingga saldo wallet yang bisa kamu cairkan!</blockquote>`,
            {parse_mode: 'HTML', reply_markup: keyboardAdopt}
        )
    } else {
        // Udah punya pet → tampil status + gambar sesuai level
        await showPetStatus(chatId, user.pet, messageId)
    }
    break
}

            // === CASE 2: ADOPSI PET BARU ===
            case 'pick_egg':
            case 'pick_tree':
            case 'pick_cat': {
    const userId = query.from.id
    const oldType = data.replace('pick_', '')

    // Mapping biar sinkron sama PET_IMAGES baru
    const typeMap = {egg: 'blaze', tree: 'leafy', cat: 'pawsy'}
    const type = typeMap[oldType]

    const petNames = {blaze: 'Blaze', leafy: 'Leafy', pawsy: 'Pawsy'}
    const maxLevels = {blaze: 100, leafy: 300, pawsy: 150}

    const newPet = {
        type, // sekarang 'blaze' bukan 'egg'
        name: petNames[type],
        level: 0,
        xp: 0,
        maxLevel: maxLevels[type],
        lastFeed: null, 
        lastDrinkFree: null,
        lastDrinkVoice: null,
        feedThisWeek: 0,
        weekId: getWeekId(),
        isNew: true, 
        stopReminder: false
    }

    await savePet(userId, newPet)
    await bot.deleteMessage(chatId, messageId).catch(()=>{})

    await bot.sendPhoto(chatId, PET_IMAGES[type].baby, {
        caption: `🎉 SELAMAT! Kamu adopsi ${newPet.name}!\n\nIni wujud dia masih bayi 🐣\nRawat pake VN "minta minum" +2 XP atau tunggu Sabtu-Minggu buat dapat makan gratis +5 XP\nKlik tombol "pet" buat cek status`,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[{text: '🔄 Lihat Pet', callback_data: 'menu_pet'}]]
        }
    })
    break
}

case 'drink_pet': {
    const userId = query.from.id
    const user = await getUserPet(userId)
    const today = new Date().toISOString().split('T')[0]

    if(user.pet.lastDrinkVoice === today) {
        await bot.answerCallbackQuery(query.id, {text: 'Udah minum hari ini! Besok lagi ya', show_alert: true})
        return
    }

    user.pet.xp += 2
    user.pet.lastDrinkVoice = today

    let msg = '+2 XP'
    if(user.pet.xp >= 10) {
        user.pet.level += 1
        user.pet.xp = 0
        msg = `🎉  +2 XP || ${user.pet.level}!`
    }

    await savePet(userId, user.pet)
    await bot.answerCallbackQuery(query.id, {text: msg})
    await showPetStatus(chatId, user.pet, messageId)
    break
}

case 'feed_pet': {
    const userId = query.from.id
    const chatId = query.message.chat.id
    const messageId = query.message_id
    const user = await getUserPet(userId)
    const today = new Date().toISOString().split('T')[0]

    if(!user?.pet) {
        await bot.answerCallbackQuery(query.id, {text: 'Kamu belum punya pet!', show_alert: true})
        return
    }

    // CEK WEEKEND - GAUSAH KUNCI TOMBOL
    const day = new Date().getDay() // 0=Minggu, 6=Sabtu
    const isWeekend = day === 0 || day === 6

    if(!isWeekend) {
        await bot.answerCallbackQuery(query.id, {text: '🍗 Kamu tidak punya makanannya', show_alert: true})
        return
    }

    if(user.pet.lastFeed === today) {
        await bot.answerCallbackQuery(query.id, {text: 'Udah dikasih makan hari ini! Besok lagi ya', show_alert: true})
        return
    }

    user.pet.xp += 2 // Makan = +2 XP
    user.pet.lastFeed = today

    let msg = '+2 XP 🍗'
    let levelUpMsg = ''

    while(user.pet.xp >= 10) {
        user.pet.level += 1
        user.pet.xp -= 10
        if(user.pet.level > user.pet.maxLevel) {
            user.pet.level = user.pet.maxLevel
            user.pet.xp = 0
            levelUpMsg = `\n👑 ${user.pet.name} udah max level!`
            break
        }
        levelUpMsg += `\n🎉 ${user.pet.name} naik ke Lv ${user.pet.level}!`
    }

    await savePet(userId, user.pet)
    await bot.answerCallbackQuery(query.id, {text: msg + levelUpMsg})
    await showPetStatus(chatId, user.pet, messageId)
    break
}

case "menu_freelance": {
  const userId = query.from.id;
  const text = `<blockquote><b>💼 MENU FREELANCE</b>\n\n` +
               `Kerjakan tugas, Dapat Uang 💸\n\n` +
               `Pilih campaign yang sedang berlangsung dibawah ini.</blockquote>`;

  // Bikin tombol dari array campaigns yang udah lu taro di atas
  const btn = campaigns.map(campaign => [{
    text: `${campaign.name}`,
    callback_data: `campaign_${campaign.id}`
  }]);

  // Tambah baris tombol bawah
  btn.push([
    { text: "« Kembali", callback_data: "back_to_main" }, 
    { text: "💸 Withdraw", callback_data: "menu_withdraw" }
  ]);

  await bot.editMessageCaption(text, {
    chat_id: chatId, message_id: messageId,
    parse_mode: "HTML", reply_markup: { inline_keyboard: btn }
  });
  await bot.answerCallbackQuery(query.id);
  break;
}
case /^approve_(\d+)_(\d+)$/: {
  const adminId = query.from.id;
  const matchResult = data.match(/^approve_(\d+)_(\d+)$/);
  const targetUserId = matchResult[1];
  const taskIndex = parseInt(matchResult[2], 10);

  const tasks = JSON.parse(fs.readFileSync(FILE_TASK, "utf8"));
  const task = tasks[taskIndex];

  if (!task || String(task.userId)!== targetUserId) {
    await bot.answerCallbackQuery(query.id, { text: "Data tugas tidak ditemukan", show_alert: true });
    break;
  }

  // Ambil teks pesan admin sebelum diedit
  const adminText = query.message.text.replace(/✅ TUGAS DITERIMA\n|❌ TUGAS DITOLAK\n|\n\n<b>Status:<\/b>.*$/g, "");

  // Pindahkan saldo pending ke saldo freelance user
  const dbUsers = getUsers();
  if (!dbUsers[targetUserId]) {
    dbUsers[targetUserId] = { saldoFreelance: 0 };
  }
  if (!dbUsers[targetUserId].saldoFreelance) {
    dbUsers[targetUserId].saldoFreelance = 0;
  }
  dbUsers[targetUserId].saldoFreelance += task.saldoPending;

  // Hapus tugas dari daftar pending
  tasks.splice(taskIndex, 1);
  fs.writeFileSync(FILE_TASK, JSON.stringify(tasks, null, 2));
  saveUsers(dbUsers);

  // Kirim notifikasi ke user
  await bot.sendMessage(
    targetUserId,
    `<blockquote>✅ Selamat, Tugas Anda kami terima!</blockquote>\n` +
    `Saldo Rp${task.saldoPending.toLocaleString("id-ID")} sudah dikreditkan ke profil Anda.`,
    { parse_mode: "HTML" }
  );

  // Update pesan admin
  await bot.editMessageText(
    `<blockquote>✅ TUGAS DITERIMA</blockquote>\n${adminText}\n\n<b>Status:</b> Saldo Rp${task.saldoPending.toLocaleString("id-ID")} sudah masuk ke user`,
    {
      chat_id: query.message.chat.id,
      message_id: query.message_id,
      parse_mode: "HTML"
    }
  );

  await bot.answerCallbackQuery(query.id, { text: "Tugas diterima" });
  break;
}

case /^reject_(\d+)_(\d+)$/: {
  const adminId = query.from.id;
  const matchResult = data.match(/^reject_(\d+)_(\d+)$/);
  const targetUserId = matchResult[1];
  const taskIndex = parseInt(matchResult[2], 10);

  const tasks = JSON.parse(fs.readFileSync(FILE_TASK, "utf8"));
  const task = tasks[taskIndex];

  if (!task || String(task.userId)!== targetUserId) {
    await bot.answerCallbackQuery(query.id, { text: "Data tugas tidak ditemukan", show_alert: true });
    break;
  }

  // Ambil teks pesan admin sebelum diedit
  const adminText = query.message.text.replace(/✅ TUGAS DITERIMA\n|❌ TUGAS DITOLAK\n|\n\n<b>Status:<\/b>.*$/g, "");

  // Hapus tugas dari daftar pending, saldo pending otomatis hilang
  tasks.splice(taskIndex, 1);
  fs.writeFileSync(FILE_TASK, JSON.stringify(tasks, null, 2));

  // Kirim notifikasi ke user
  await bot.sendMessage(userId,
  `<blockquote>❌ TUGAS DITOLAK</blockquote>\n` +
  `Tugas Anda ditolak admin karena alasan data tidak valid atau lainnya.\n` +
  `Jika terdapat kesalahan data harap hubungi pusat bantuan.`,
  { 
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💬 Pusat Bantuan', callback_data: 'menu_bantuan' },
          { text: '💼 Kerjakan Lagi', callback_data: 'menu_freelance' }
        ]
      ]
    }
  }
);

  // Update pesan admin
  await bot.editMessageText(
    `<blockquote>❌ TUGAS DITOLAK</blockquote>\n${adminText}\n\n<b>Status:</b> Saldo pending dihapus`,
    {
      chat_id: query.message.chat.id,
      message_id: query.message_id,
      parse_mode: "HTML"
    }
  );

  await bot.answerCallbackQuery(query.id, { text: "Tugas ditolak" });
  break;
}

case "menu_withdraw": {
  const dbUsers = getUsers();
  const myProfile = dbUsers[chatId];
  const saldoFreelance = myProfile.saldoFreelance || 0;

  let textWithdraw = `<blockquote>💸 <b>MENU WITHDRAW</b>\n\n`;
  textWithdraw += `Saldo Freelance Anda: $${saldoFreelance.toFixed(3)}\n\n`;
  textWithdraw += `⚠️ <b>PERHATIAN</b>\n`;
  textWithdraw += `Pastikan alamat penarikan tidak memiliki biaya admin atau fee. Jika terdapat biaya admin maka saldo tidak akan diteruskan.</blockquote>\n\n`;
  textWithdraw += `Silakan pilih metode penarikan:`;

  let btnWithdraw = [
    [
      { text: "💳 Wallet", callback_data: "withdraw_wallet" },
      { text: "📷 QRIS", callback_data: "withdraw_qris" }
    ],
    [
      { text: "« Kembali", callback_data: "back_to_main" }
    ]
  ];

  await bot.sendMessage(chatId, textWithdraw, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: btnWithdraw }
  });
  break;
}

case "withdraw_wallet": {
  userState[chatId] = { step: "waiting_wallet" };
  await bot.sendMessage(chatId, `<blockquote>Kirim alamat wallet Anda sekarang.\nContoh: 0x123abc...</blockquote>`, { parse_mode: "HTML" });
  break;
}

case "withdraw_qris": {
  userState[chatId] = { step: "waiting_qris" };
  await bot.sendMessage(chatId, `<blockquote>Kirim foto QRIS Anda sekarang.\nPastikan foto jelas dan tidak buram.</blockquote>`, { parse_mode: "HTML" });
  break;
}

case /^withdraw_done_(\d+)$/: {
const userId = query.from.id;
  const targetUserId = data.match(/^withdraw_done_(\d+)$/)[1];

  if (String(userId)!== String(owner)) {
    await bot.answerCallbackQuery(query.id, { text: "Anda bukan admin", show_alert: true });
    break;
  }

  const dbUsers = getUsers();
  const saldoFreelance = dbUsers[targetUserId].saldoFreelance || 0;

  // Potong saldo freelance user
  dbUsers[targetUserId].saldoFreelance = 0;
  saveUsers(dbUsers);

  await bot.sendMessage(targetUserId, `<blockquote>Withdraw telah berhasil. Saldo $${saldoFreelance.toFixed(3)} akan segera dikirim ke alamat Anda.</blockquote>`, { parse_mode: "HTML" });

  await bot.editMessageCaption(`<blockquote>✅ WITHDRAW BERHASIL</blockquote>\n${query.message.caption}\n\n<b>Status:</b> Saldo sudah dikirim ke user`, {
    chat_id: query.message.chat.id,
    message_id: query.message_id,
    parse_mode: "HTML"
  }).catch(() => {
    bot.editMessageText(`<blockquote>✅ WITHDRAW BERHASIL</blockquote>\n${query.message.text}\n\n<b>Status:</b> Saldo sudah dikirim ke user`, {
      chat_id: query.message.chat.id,
      message_id: query.message_id,
      parse_mode: "HTML"
    });
  });

  await bot.answerCallbackQuery(query.id, { text: "Withdraw berhasil" });
  break;
}

case /^withdraw_reject_(\d+)$/: {
const userId = query.from.id;
  const targetUserId = data.match(/^withdraw_reject_(\d+)$/)[1];

  if (String(userId)!== String(owner)) {
    await bot.answerCallbackQuery(query.id, { text: "Anda bukan admin", show_alert: true });
    break;
  }

  await bot.sendMessage(targetUserId, `<blockquote>Withdraw ditolak karena alamat penarikan memiliki biaya admin atau fee.</blockquote>`, { parse_mode: "HTML" });

  await bot.editMessageCaption(`<blockquote>❌ WITHDRAW DITOLAK</blockquote>\n${query.message.caption}\n\n<b>Status:</b> Alamat memiliki fee`, {
    chat_id: query.message.chat.id,
    message_id: query.message_id,
    parse_mode: "HTML"
  }).catch(() => {
    bot.editMessageText(`<blockquote>❌ WITHDRAW DITOLAK</blockquote>\n${query.message.text}\n\n<b>Status:</b> Alamat memiliki fee`, {
      chat_id: query.message.chat.id,
      message_id: query.message_id,
      parse_mode: "HTML"
    });
  });

  await bot.answerCallbackQuery(query.id, { text: "Withdraw ditolak" });
  break;
}

        } // <--- PENUTUP SWITCH

        await bot.answerCallbackQuery(query.id).catch(()=>{});

    // ====================================================
    // CATCH (PENUTUP TRY - POSISI 100% AMAN DI SINI)
    // ====================================================
    } catch (error) { 
        console.error("Error di callback:", error);
        await bot.answerCallbackQuery(query.id, { text: "Terjadi kesalahan sistem." }).catch(()=>{});
    }
}); // <--- PENUTUP BOT.ON ("CALLBACK_QUERY")

bot.onText(/\/bangunin pet/, async (msg) => {
    const user = await getUser(msg.from.id)
    user.stopReminder = false
    await saveUser(msg.from.id, user)
    bot.sendMessage(msg.chat.id, '🔔 Reminder pet sudah diaktifin lagi! Pet akan berinteraksi dengan kamu lagi ~')
})
// ====================================================
// FITUR ADMIN: CEK DETAIL USER BERDASARKAN ID
// Command: /cek <id_telegram>
// ====================================================
bot.onText(/^\/cek (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];

    if (String(chatId) !== String(settings.adminId)) return;

    const waitMsg = await bot.sendMessage(chatId, "⏳ <i>Wait, check...</i>", { parse_mode: "HTML" });

    try {
        const dbUsers = getUsers();
        const targetUser = dbUsers[targetId];

        if (!targetUser) {
            return bot.editMessageText(`❌ User dengan ID <code>${targetId}</code> tidak ditemukan.`, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "HTML" });
        }

        let text = `🔍 <b>INFORMASI DETAIL USER</b>\n➖➖➖➖➖➖➖➖➖➖\n`;
        text += `🆔 <b>ID Telegram:</b> <code>${targetId}</code>\n`;
        text += `👤 <b>Username:</b> ${targetUser.username || "-"}\n`;
        text += `💰 <b>Saldo:</b> Rp ${(targetUser.saldo || 0).toLocaleString('id-ID')}\n\n`;

        if (targetUser.servers && targetUser.servers.length > 0) {
            text += `🟢 <b>SERVER AKTIF (${targetUser.servers.length} Panel):</b>\n`;
            
            targetUser.servers.forEach((srv, idx) => {
                // Menggunakan fungsi parseFlexibleDate agar mendukung format Indonesia
                const waktuSekarang = new Date();
                const waktuHabis = parseFlexibleDate(srv.expired_date);
                const selisihMS = waktuHabis - waktuSekarang;
                
                let statusExpired = "";
                if (!isNaN(waktuHabis.getTime())) {
                    if (selisihMS > 0) {
                        const hari = Math.floor(selisihMS / (1000 * 60 * 60 * 24));
                        const jam = Math.floor((selisihMS % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const menit = Math.floor((selisihMS % (1000 * 60 * 60)) / (1000 * 60));

                        if (hari > 0) {
                            statusExpired = `${hari} Hari ${jam} Jam`;
                        } else if (jam > 0) {
                            statusExpired = `${jam} Jam ${menit} Menit`;
                        } else {
                            statusExpired = `${menit} Menit lagi`;
                        }
                    } else {
                        statusExpired = "❌ SUDAH HABIS";
                    }
                } else {
                    statusExpired = "⚠️ Format Tgl Salah";
                }

                text += `\n<b>${idx + 1}. Username Panel: <code>${srv.username_panel}</code></b>\n`;
                text += `   ├ Paket: ${srv.paket}\n`;
                text += `   ├ Tgl Order: <code>${srv.order_date}</code>\n`;
                text += `   └ Expired: <b>${statusExpired}</b>\n`;
                text += `     (Tgl: <code>${srv.expired_date}</code>)\n`;
            });
        } else {
            text += `🔴 <b>SERVER AKTIF:</b> <i>Tidak ada server aktif.</i>\n`;
        }

        await bot.editMessageText(text, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "HTML" });

    } catch (err) {
        console.error(err);
        bot.editMessageText("❌ Terjadi kesalahan saat memproses data.", { chat_id: chatId, message_id: waitMsg.message_id });
    }
});

// ====================================================
// FITUR ADMIN: ATUR STOK VPS
// Format: /setvps <RAM> <Harga> <Stok>
// ====================================================
// ====================================================
// FUNGSI BANTUAN UNTUK JEDA WAKTU BROADCAST (Taruh di luar, bebas dimana saja di bagian atas)
// ====================================================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ====================================================
// COMMAND /setvps (UPDATE STOK & AUTO BROADCAST)
// ====================================================
// ====================================================
// COMMAND /setvps (UPDATE STOK & AUTO BROADCAST DENGAN PANDUAN)
// ====================================================
bot.onText(/^\/setvps(?:\s+(.*))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    // Pastikan hanya admin yang bisa menjalankan perintah ini
    if (String(chatId) !== String(settings.adminId)) return;

    const inputText = match[1];

    // 1. PANDUAN PENGGUNAAN (JIKA KOSONG ATAU SALAH FORMAT)
    // Cek apakah admin hanya mengetik /setvps atau teks kurang dari 3 kata
    if (!inputText || inputText.trim().split(/\s+/).length < 3) {
        const panduanMsg = `<blockquote>⚠️ <b>FORMAT PERINTAH SALAH!</b>\n━━━━━━━━━━━━━━━━━━\n\nUntuk mengupdate dan menyebar stok VPS, gunakan format berikut:\n\n<code>/setvps [Spek_VPS] [Harga] [Stok]</code>\n\n<b>📌 Contoh Penggunaan:</b>\n<code>/setvps 2GB 2 Core 15000 10</code>\n\n<i>Keterangan:</i>\n- <b>2GB 2 Core</b>: Spesifikasi VPS (Boleh pakai spasi).\n- <b>15000</b>: Harga sewa per bulan (Wajib Angka).\n- <b>10</b>: Jumlah stok VPS yang tersedia (Wajib Angka).</blockquote>`;
        
        return bot.sendMessage(chatId, panduanMsg, { parse_mode: "HTML" });
    }

    // 2. PECAH TEKS SECARA CERDAS
    const args = inputText.trim().split(/\s+/);
    
    // Ambil 2 angka paling belakang sebagai Stok dan Harga
    const stok = parseInt(args.pop());
    const harga = parseInt(args.pop());
    
    // Sisanya yang di depan digabung kembali sebagai nama RAM/Spek
    const ram = args.join(" ");

    // Validasi Angka
    if (isNaN(harga) || isNaN(stok)) {
        return bot.sendMessage(chatId, "<blockquote>⚠️ <b>Gagal:</b> Harga dan Stok harus berupa angka murni tanpa titik/koma!</blockquote>", { parse_mode: "HTML" });
    }

    // 3. UPDATE DATABASE TOKO
    updateStore({ vps_ram: ram, vps_price: harga, vps_stock: stok });

    // Beritahu admin bahwa proses broadcast sedang berjalan
    const loadingMsg = await bot.sendMessage(chatId, "⏳ *Stok berhasil diupdate! Sedang memulai proses Broadcast ke semua user...*", { parse_mode: "Markdown" });

    // 4. BUAT FORMAT PESAN QUOTE
    const botUsername = "@" + (await bot.getMe()).username; 

    let broadcastMsg = `<blockquote>🖥 <b>RESTOCK CLOUD VPS</b>\n`;
    broadcastMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
    broadcastMsg += `Spesifikasi VPS terbaru telah tersedia! Segera amankan server Anda sebelum kehabisan.\n\n`;
    broadcastMsg += `—\n\n`;
    broadcastMsg += `1. <b>${ram}</b> | High Performance NVMe\n`;
    broadcastMsg += `➥ Rp ${harga.toLocaleString('id-ID')} / Bulan\n\n`;
    broadcastMsg += `—\n\n`;
    broadcastMsg += `✅ <b>STOK TERSEDIA : ${stok} VPS</b>\n\n`;
    broadcastMsg += `${botUsername}\n${botUsername}</blockquote>`;

    // Tombol di bawah pesan broadcast agar user langsung Order
    const broadcastOptions = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛒 Beli VPS Sekarang", callback_data: "check_vps_stock" }]
            ]
        }
    };

    // 5. AMBIL DATA USER DAN BROADCAST
    const users = getUsers(); 
    const userIds = Array.isArray(users) ? users : Object.keys(users);

    // 6. LAPORAN KE ADMIN JIKA SELESAI
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(()=>{});
    bot.sendMessage(chatId, `<blockquote>✅ <b>BROADCAST SELESAI!</b>\n━━━━━━━━━━━━━━━━━━\nBerhasil dikirim: ${successCount} User\nGagal (Blokir Bot): ${failCount} User</blockquote>`, { parse_mode: "HTML" });


    // 3. AMBIL SEMUA DATA USER DARI DATABASE
    // Sesuaikan fungsi getUsers() dengan yang ada di scriptmu
    const dbUsers = getUsers(); 
    
    let successCount = 0;
    let failCount = 0;

    // 4. LOOPING PENGIRIMAN PESAN KE SEMUA USER (DENGAN JEDA)
    for (const targetId of userIds) {
        // Opsional: Jika tidak mau admin menerima broadcast ini, aktifkan baris di bawah:
        // if (String(targetId) === String(settings.adminId)) continue; 

        try {
            await bot.sendMessage(targetId, broadcastMsg, broadcastOptions);
            successCount++;
        } catch (error) {
            // Error biasanya terjadi jika user sudah memblokir (block) bot ini
            failCount++;
        }
        
        // JEDA 50 MILIDETIK ANTAR PESAN AGAR TIDAK KENA LIMIT TELEGRAM (SANGAT PENTING)
        await delay(50); 
    }

    // 5. LAPORAN KE ADMIN JIKA SELESAI
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(()=>{});
        bot.sendMessage(chatId, `<blockquote>✅ <b>BROADCAST SELESAI!</b>\n\nBerhasil dikirim: ${successCount} User\nGagal (Blokir Bot): ${failCount} User</blockquote>`, { parse_mode: "HTML" });
});
// ====================================================
// FITUR ADMIN: LIST SEMUA USER (PAGINATION)
// Command: /users
// ====================================================
bot.onText(/^\/users/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(settings.adminId)) return;
    
    // Panggil fungsi pembuat halaman (Halaman pertama = index 0)
    await renderUserPage(chatId, 0);
});
//Fungsi Fayu Pedia
async function getSMMServices() {
  try {
    const res = await axios.post(`${SMM_BASE}/services`, {
      api_id: settings.smm.apiId,   // WAJIB int
      api_key: settings.smm.apiKey, // WAJIB string
      action: 'services'
    });
    
    if (res.data.status === true) {
      return res.data.services;
    } else {
      console.log('SMM Error:', res.data.msg);
      return [];
    }
  } catch (err) {
    console.error('Gagal ambil services:', err.message);
    return [];
  }
}
// FUNGSI show Pet status
async function showPetStatus(chatId, pet, messageId = null) {
    // Kasih default biar ga undefined
    const nama = pet.name || pet.nama || 'Pet Kamu'
    const level = pet.level || 1
    const maxLevel = pet.maxLevel || 10
    const xp = pet.xp || 0
    const feedThisWeek = pet.feedThisWeek || 0

    const sisaXP = getRemainingXP({xp, maxLevel}) || 0
    const drinkFree = canDrinkFree(pet)? '✅ Gratis' : '❌ Besok'
    const drinkVoice = canDrinkVoice(pet)? '✅ VN 1x' : '❌ Besok'
    const feed = canFeed(pet)? `${2-feedThisWeek}x lagi` : 'Sabtu-Minggu'
    const imgUrl = getPetImage(pet) || 'https://via.placeholder.com/400x400.png?text=Pet'

    const halfLevel = Math.floor(maxLevel / 2)
    let fase = 'Bayi 🐣'
    if(level >= maxLevel) fase = 'Dewasa 👑'
    else if(level >= halfLevel) fase = 'Tumbuh 🌱'

    const caption = `<b>${nama}</b> - Lv ${level}/${maxLevel} ${fase}\nXP: ${xp}/10 | Sisa: ${sisaXP} XP\n🍗 Makan: ${feed}\n💧 Minum: ${drinkFree} | ${drinkVoice}\n\nKetik VN "peliharaan mau minum" +2 XP`

    const keyboard = {
        inline_keyboard: [
          [ 
          {text: '🥣 Kasih Makan', callback_data: 'feed_pet'}, 
          {text: '🍶 Kasih Minum', callback_data: 'drink_pet'}
          ],
          
            [{text: '🔄 Refresh', callback_data: 'menu_pet'}],
            [{text: '⬅️ Kembali', callback_data: 'back_to_main'}]
        ]
    }
if(messageId) {
    try {
        await bot.deleteMessage(chatId, messageId)
    } catch(e){}
}
await bot.sendPhoto(chatId, imgUrl, {
    caption: caption,
    parse_mode: 'HTML',
    reply_markup: keyboard
})

}

function getPets() {
  if(!fs.existsSync('./database/pets.json')) fs.writeFileSync('./database/pets.json', '{}')
  return JSON.parse(fs.readFileSync('./database/pets.json', 'utf8'))
}

function savePets(db) {
  fs.writeFileSync('./database/pets.json', JSON.stringify(db, null, 2))
}

function canDrinkFree(pet) {
  const today = new Date().toDateString()
  return pet.lastDrinkFree!== today
}
function canDrinkVoice(pet) {
  const today = new Date().toDateString()
  return pet.lastDrinkVoice!== today
}
function canFeed(pet) {
  const week = getWeekId()
  if(pet.weekId!== week) {
    pet.weekId = week
    pet.feedThisWeek = 0
  }
  return pet.feedThisWeek < 2
}

function startPetReminder() {
    console.log('[PET REMINDER] Aktif, cek tiap menit...')

    setInterval(async () => {
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()

        // Jalan pas 05:00 WIB doang
        if (hours!== 5 || minutes!== 0) return

        console.log('[PET REMINDER] Jam 05.00! Mulai broadcast...')
        const today = new Date().toISOString().split('T')[0]
        const day = now.getDay() // 0=Minggu, 6=Sabtu
        const isWeekend = day === 0 || day === 6

        const dbUsers = getUsers()// ganti sesuai DB lu
        let sent = 0

        for (const userId in dbUsers) {
        const user = dbUsers[userId];
            if (!user.pet) continue
            if (user.stopReminder) continue // skip user yg udah silent

            const belumMinum = user.pet.lastDrink!== today
            const belumMakan = isWeekend && user.pet.lastFeed!== today

            // Skip kalo udah lengkap semua
            if (!belumMinum &&!belumMakan) continue

            let pesan = `🐾 <b>REMINDER PET</b> 🐾\n\n`
            pesan += `Hai majikan ${user.pet.name}!\n`
            pesan += `Udah jam 5 pagi nih, perut gue keroncongan 😭\n\n`

            if (belumMakan) pesan += `🍗 Makan: Belum dikasih. XP +2\n`
            else pesan += `🍗 Makan: Udah kenyang\n`

            if (belumMinum) pesan += `💧 Minum: Belum dikasih. XP +3\n`
            else pesan += `💧 Minum: Udah seger\n`

            pesan += `\nYuk kasih gue makan & minum~`

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🐾 Buka Pet', callback_data: 'menu_pet' }],
                    [{ text: '🔕 Silent Reminder Selamanya', callback_data: 'stop_reminder' }]
                ]
            }

            try {
                await bot.sendMessage(user.userId, pesan, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                })
                sent++
                await new Promise(r => setTimeout(r, 100)) // anti spam
            } catch (e) {
                // user block bot, skip
            }
        }

        console.log(`[PET REMINDER] Selesai, terkirim ke ${sent} user`)
        await new Promise(r => setTimeout(r, 60000)) // delay 1 menit biar ga keulang
    }, 60000) // cek tiap 1 menit
}

// Jalanin pas bot start
startPetReminder()

// Logic minum dari VN
bot.on('voice', async (msg) => {
  if(!msg.voice) return
  if(!msg.text?.toLowerCase().includes('mau minum')) return

  const userId = msg.from.id
  const chatId = msg.chat.id
  const user = await getUserPet(userId)
  if(!user.pet) return bot.sendMessage(chatId, 'Kamu belum punya pet. Klik tombol "pet" buat adopsi dulu')

  const today = new Date().toDateString()
  let xpGain = 0
  let pesan = []

  // 1. Minum gratis harian +1 XP
  if(user.pet.lastDrinkFree !== today) {
    xpGain += 1
    user.pet.lastDrinkFree = today
    pesan.push('💧 Minum gratis +1 XP')
  }

  // 2. Minum dari VN +2 XP 
  if(user.pet.lastDrinkVoice !== today) {
    xpGain += 2
    user.pet.lastDrinkVoice = today
    pesan.push('🎤 VN +2 XP')
  } else {
    // Kalo VN udah dipake tapi gratis belum
    if(xpGain === 0) return bot.sendMessage(chatId, 'VN minum udah dipake hari ini. Besok lagi ya')
  }

  // Kalo sama sekali ga dapet XP
  if(xpGain === 0) return bot.sendMessage(chatId, 'Hari ini udah minum semua. Besok lagi ya')

  user.pet.xp += xpGain

  // Level up berkali-kali
  let levelUpMsg = ''
  while(user.pet.xp >= 10) {
    user.pet.level += 1
    user.pet.xp -= 10
    if(user.pet.level > user.pet.maxLevel) {
      user.pet.level = user.pet.maxLevel
      user.pet.xp = 0
      levelUpMsg = `\n👑 ${user.pet.name} udah max level!`
      break
    }
    levelUpMsg += `\n🎉 ${user.pet.name} naik ke Lv ${user.pet.level}!`
  }

  await savePet(userId, user.pet)
  await showPetStatus(chatId, user.pet)
  await bot.sendMessage(chatId, `${pesan.join(' + ')}\nTotal +${xpGain} XP${levelUpMsg}`)
})

function isWeekend() {
  const day = new Date().getDay() // 0=Minggu, 6=Sabtu
  return day === 0 || day === 6
}
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // 1. HANDLE SUBMIT TUGAS - paling atas biar tidak ke skip
// HANDLE SUBMIT TUGAS STEP 1: EMAIL
if (userState[userId] && userState[userId].step === 'waiting_email') {
  const email = text.trim();

  if (!email.includes('@gmail.com')) {
    return bot.sendMessage(chatId, 'Email harus menggunakan @gmail.com. Silakan kirim ulang.');
  }

  // Simpan email ke state, pindah ke step 2
  userState[userId].email = email;
  userState[userId].step = 'waiting_password';

  return bot.sendMessage(chatId,
    `<blockquote>🔒 LANGKAH 2</blockquote>\n` +
    `kirim password yang sesuai dengan aturan campaign ini.\n`, 
    { parse_mode: "HTML" }
  );
}

// HANDLE SUBMIT TUGAS STEP 2: PASSWORD
if (userState[userId] && userState[userId].step === 'waiting_password') {
  const password = text.trim();
  const campaignId = userState[userId].campaignId;
  const email = userState[userId].email;
  const campaign = campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    delete userState[userId];
    return bot.sendMessage(chatId, 'Campaign tidak ditemukan. Kembali ke menu Freelance.');
  }

  // Validasi password
  if (password!== campaign.password) {
    return bot.sendMessage(chatId, 'Password salah. Silakan kirim ulang password yang benar.');
  }

  // Simpan ke file JSON - tanpa nama
  let tasks = [];
  if (fs.existsSync(FILE_TASK)) {
    tasks = JSON.parse(fs.readFileSync(FILE_TASK, 'utf8'));
  }

  const newTask = {
    userId: userId,
    username: msg.from.username || msg.from.first_name,
    task: campaign.name,
    email: email,
    password: password,
    saldoPending: campaign.bayaran,
    waktu: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  };

  tasks.push(newTask);
  fs.writeFileSync(FILE_TASK, JSON.stringify(tasks, null, 2));

  // Kirim ke admin
  const adminText = `<blockquote>📥 TUGAS BARU MASUK</blockquote>\n` +
                    `<b>User:</b> ${newTask.username} <code>${userId}</code>\n\n` +
                    `<b>Tugas:</b> ${newTask.task}\n` +
                    `<b>Email:</b> <code>${email}</code>\n\n` +
                    `<b>Saldo Pending:</b> Rp${campaign.bayaran.toLocaleString("id-ID")}\n\n` +
                    `<b>Waktu:</b> ${newTask.waktu}`;

  const adminButtons = [
    [
      { text: "✅ Terima", callback_data: `approve_${userId}_${tasks.length - 1}` },
      { text: "❌ Tolak", callback_data: `reject_${userId}_${tasks.length - 1}` }
    ]
  ];

  await bot.sendMessage(owner, adminText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: adminButtons }
  });

  delete userState[userId]; // reset state
  return bot.sendMessage(chatId,
    `<blockquote>✅ TUGAS BERHASIL DIKIRIM</blockquote>\n` +
    `Email: ${email}\n` +
    `Reward Pending: Rp${campaign.bayaran.toLocaleString("id-ID")}\n` +
    `Tunggu verifikasi admin.`,
    { parse_mode: "HTML" }
  );
}

  // 2. HANDLE WITHDRAW WALLET
  if (userState[chatId] && userState[chatId].step === 'waiting_wallet' && text) {
    const walletAddress = text.trim();
    const dbUsers = getUsers();
    const saldoFreelance = dbUsers[chatId]?.saldoFreelance || 0;

    if (saldoFreelance <= 0) {
      delete userState[chatId];
      return bot.sendMessage(chatId, '<blockquote>Saldo Freelance Anda 0. Kerjakan tugas terlebih dahulu.</blockquote>', { parse_mode: 'HTML' });
    }

    const adminText = `<blockquote>💸 REQUEST WITHDRAW BARU</blockquote>\n` +
                      `<b>User:</b> ${msg.from.first_name} <code>${chatId}</code>\n` +
                      `<b>Metode:</b> Wallet\n` +
                      `<b>Saldo:</b> $${saldoFreelance.toFixed(3)}\n` +
                      `<b>Alamat:</b> <code>${walletAddress}</code>`;

    const adminButtons = [
      [
        { text: '✅ Done', callback_data: `withdraw_done_${chatId}` },
        { text: '❌ Tolak', callback_data: `withdraw_reject_${chatId}` }
      ]
    ];

    await bot.sendMessage(owner, adminText, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: adminButtons }
    });

    delete userState[chatId];
    return bot.sendMessage(chatId, `<blockquote>Request withdraw $${saldoFreelance.toFixed(3)} ke wallet berhasil dikirim. Tunggu admin memproses.</blockquote>`, { parse_mode: 'HTML' });
  }

  // 3. HANDLE WITHDRAW QRIS
  if (userState[chatId] && userState[chatId].step === 'waiting_qris' && msg.photo) {
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    const dbUsers = getUsers();
    const saldoFreelance = dbUsers[chatId]?.saldoFreelance || 0;

    if (saldoFreelance <= 0) {
      delete userState[chatId];
      return bot.sendMessage(chatId, '<blockquote>Saldo Freelance Anda 0. Kerjakan tugas terlebih dahulu.</blockquote>', { parse_mode: 'HTML' });
    }

    const adminCaption = `<blockquote>💸 REQUEST WITHDRAW BARU</blockquote>\n` +
                         `<b>User:</b> ${msg.from.first_name} <code>${chatId}</code>\n` +
                         `<b>Metode:</b> QRIS\n` +
                         `<b>Saldo:</b> $${saldoFreelance.toFixed(3)}`;

    const adminButtons = [
      [
        { text: '✅ Done', callback_data: `withdraw_done_${chatId}` },
        { text: '❌ Tolak', callback_data: `withdraw_reject_${chatId}` }
      ]
    ];

    await bot.sendPhoto(owner, photoId, {
      caption: adminCaption,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: adminButtons }
    });

    delete userState[chatId];
    return bot.sendMessage(chatId, `<blockquote>Request withdraw $${saldoFreelance.toFixed(3)} melalui QRIS berhasil dikirim. Tunggu admin memproses.</blockquote>`, { parse_mode: 'HTML' });
  }
//pembatas
  
  // Command batal

  // 1. Command batal - cek paling atas
  if (text === '/cancel') {
    smmMode.delete(chatId);
    return bot.sendMessage(chatId, '❌ Mode Ditutup');
  }

  // 2. Keluar kalo user ga lagi mode cari kategori
  if (!smmMode.has(chatId)) return;
  if (!text || globalServices.length === 0) return;

  smmMode.delete(chatId); // hapus mode biar ga ke-trigger pas chat lain

  const msgLoading = await bot.sendMessage(chatId, '🔍 Mencari kategori...');

  // 3. FIX: Case insensitive + fuzzy
  const searchText = text.toLowerCase();
  let filtered = globalServices.filter(s =>
    s.category.toLowerCase().includes(searchText)
  );

  // 4. Kalo ga ketemu, kasih saran + balikin mode
  if (filtered.length === 0) {
    await bot.deleteMessage(chatId, msgLoading.message_id);

    const allKat = [...new Set(globalServices.map(s => s.category))];
    const saran = allKat.filter(k =>
      k.toLowerCase().includes(searchText.slice(0,3))
    ).slice(0,5);

    const saranText = saran.length > 0
     ? `\n\nMungkin maksud anda:\n${saran.map(k => `▫️ ${k}`).join('\n')}`
      : '';

    smmMode.add(chatId); // balikin mode biar user bisa ketik ulang

    return bot.sendMessage(chatId, `❌ Kategori "${text}" Tidak tersedia ${saranText}\n\nKetik ulang atau /cancel`, {
      parse_mode: 'HTML'
    });
  }

  // 5. Extract tipe dinamis
  const typeMap = {};
  filtered.forEach(s => {
    let type = 'Lainnya';
    const nameLower = s.name.toLowerCase();
    if (searchText.includes('youtube')) {
      if (nameLower.includes('subscriber')) type = 'Subscribers';
      else if (nameLower.includes('view')) type = 'Views';
      else if (nameLower.includes('like')) type = 'Likes';
      else if (nameLower.includes('watchtime')) type = 'Watchtime';
      else if (nameLower.includes('comment')) type = 'Comments';
    }
    else if (searchText.includes('instagram') || searchText.includes('tiktok')) {
      if (nameLower.includes('followers')) type = 'Followers';
      else if (nameLower.includes('like')) type = 'Likes';
      else if (nameLower.includes('view')) type = 'Views';
      else if (nameLower.includes('comment')) type = 'Comments';
    }
    else type = s.type.toUpperCase();

    if (!typeMap[type]) typeMap[type] = [];
    typeMap[type].push(s);
  });

  const types = Object.keys(typeMap).sort();
  await bot.deleteMessage(chatId, msgLoading.message_id);

  const caption = `<i>Kategori: ${text}</i>\nTersedia ${filtered.length} layanan\n\n<blockquote>Pilih tipe layanan dibawah ini:</blockquote>`;
let btn = types.map(t => [{ 
  text: `🛍 ${t}`, 
  callback_data: `t|${encodeURIComponent(text)}|${encodeURIComponent(t)}|1` // ganti smm_type_ jadi t|
}]);
btn.push([{ text: '⬅️ Ganti Kategori', callback_data: 'kat' }]); // smm_pilih_kategori → kat

bot.sendPhoto(chatId, settings.pp, {
  caption: caption,
  parse_mode: 'HTML',
  reply_markup: { inline_keyboard: btn }
});
//pembatas
 
  // 4. HANDLE PET MAKAN - baru diproses jika bukan tugas/withdraw
  if (!text) return;
  if (text.toLowerCase()!== 'peliharaan makan') return;

  const user = await getUserPet(userId);
  if (!user.pet) return;

  if (!isWeekend()) {
    return bot.sendMessage(chatId, 'Pet hanya bisa makan pada hari Sabtu dan Minggu.');
  }
  if (!canFeed(user.pet)) {
    return bot.sendMessage(chatId, 'Minggu ini sudah 2 kali makan. Tunggu minggu depan.');
  }

  user.pet.xp += 5;
  user.pet.feedThisWeek += 1;
  user.pet.weekId = getWeekId();

  // Cek naik level berkali kali
  while (user.pet.xp >= 10) {
    user.pet.level += 1;
    user.pet.xp -= 10;
    if (user.pet.level > user.pet.maxLevel) {
      user.pet.level = user.pet.maxLevel;
      user.pet.xp = 0;
      break;
    }
    await bot.sendMessage(chatId, `🎉 ${user.pet.name} naik ke Level ${user.pet.level}!`);
  }

  await savePet(userId, user.pet);
  await showPetStatus(chatId, user.pet);
  await bot.sendMessage(chatId, `🍗 ${user.pet.name} kenyang! Mendapat tambahan 5 XP`);
});

// Fungsi bantuan untuk merender halaman User
async function renderUserPage(chatId, page, messageId = null) {
    const dbUsers = getUsers();
    const usersArray = Object.values(dbUsers); // Ubah object ke array agar bisa di-page
    const totalUsers = usersArray.length;
    const maxPerPage = 5;
    const totalPages = Math.ceil(totalUsers / maxPerPage);

    if (totalUsers === 0) {
        if (messageId) bot.deleteMessage(chatId, messageId).catch(()=>{});
        return bot.sendMessage(chatId, "⚠️ Belum ada user terdaftar di database.");
    }

    // Validasi batas halaman agar tidak error
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    const startIdx = page * maxPerPage;
    const currentUsers = usersArray.slice(startIdx, startIdx + maxPerPage);

    let text = `👥 <b>DAFTAR PENGGUNA BOT</b>\n`;
    text += `<i>Halaman ${page + 1} dari ${totalPages} (Total: ${totalUsers} User)</i>\n➖➖➖➖➖➖➖➖➖➖\n\n`;

    currentUsers.forEach((u, i) => {
        const srvCount = u.servers ? u.servers.length : 0;
        text += `<b>${startIdx + i + 1}. ${u.username}</b>\n`;
        text += `   ├ ID: <code>${u.id}</code>\n`;
        text += `   └ Server Aktif: <b>${srvCount}</b>\n\n`;
    });

    // Buat Tombol Pagination Dinamis
    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ Kembali", callback_data: `page_${page - 1}` });
    navRow.push({ text: "❌ Selesai", callback_data: `page_close` });
    if (page < totalPages - 1) navRow.push({ text: "Selanjutnya ➡️", callback_data: `page_${page + 1}` });

    const options = { parse_mode: "HTML", reply_markup: { inline_keyboard: [navRow] } };

    if (messageId) {
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options }).catch(()=>{});
    } else {
        await bot.sendMessage(chatId, text, options);
    }
}
// ====================================================
// FITUR ADMIN: AMBIL ID OS DARI HOSTVDS
// ====================================================
// ====================================================
// FITUR ADMIN: AMBIL ID OS DARI HOSTVDS (SUDAH DIPERBAIKI)
// ====================================================
bot.onText(/^\/getos/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(settings.adminId)) return;

    const waitMsg = await bot.sendMessage(chatId, "⏳ <i>Login ke HostVDS dan mengambil data OS...</i>", { parse_mode: "HTML" });
    
    try {
        const hostvds = await getHostvdsToken();

        // ⚠️ INILAH PENYEBAB ERROR-NYA: Pastikan penulisan URL-nya 100% sama seperti ini
        const res = await axios.get(`${hostvds.computeUrl}/images`, {
            headers: { "X-Auth-Token": hostvds.token }
        });
        
        let text = "🖥 <b>DAFTAR ID OS HOSTVDS</b>\n\n";
        res.data.images.forEach(os => {
            text += `<b>${os.name}</b>\n<code>${os.id}</code>\n\n`;
        });
        
        bot.editMessageText(text, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "HTML" });
    } catch (err) {
        console.error("ERROR /GETOS:", err.message);
        bot.editMessageText(`❌ Gagal mengambil OS:\n${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    }
});
// ====================================================
// FITUR ADMIN: AMBIL ID SPEK (FLAVOR) DARI HOSTVDS
// ====================================================
bot.onText(/^\/getspek/, async (msg) => {
    const chatId = msg.chat.id;
    console.log("Ada yang akses /getspek :", chatId);

    if (String(chatId) !== String(settings.adminId)) {
        bot.sendMessage(chatId, "❌ Akses Ditolak. Anda bukan Admin.");
        return;
    }

    bot.sendMessage(chatId, "⏳ <i>Mengambil data Spek dari HostVDS...</i>", { parse_mode: "HTML" });
    try {
        const res = await axios.get(`${settings.hostvds.baseUrl}/flavors/detail`, {
            headers: { "X-Auth-Token": settings.hostvds.token }
        });
        
        let text = "⚙️ <b>DAFTAR ID SPEK HOSTVDS</b>\n\n";
        res.data.flavors.forEach(f => {
            text += `<b>${f.name}</b> (RAM: ${f.ram}MB, CPU: ${f.vcpus})\nID: <code>${f.id}</code>\n\n`;
        });
        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    } catch (err) {
        console.error("API GETSPEK ERROR:", err.message);
        bot.sendMessage(chatId, `❌ Gagal mengambil Spek: ${err.message}\nCek Token HostVDS Anda di setting.js!`);
    }
});
// ====================================================
// WEBHOOK LISTENER UNTUK PAKASIR (AUTO DEPLOY)
// ====================================================
// ====================================================
// WEBHOOK LISTENER UNTUK PAKASIR (AUTO DEPLOY)
// ====================================================
app.post('/webhook', async (req, res) => {
    const dataWebhook = req.body;
    
    if (dataWebhook && dataWebhook.status === "completed") {
        const orderIdLunas = dataWebhook.order_id;
        
        for (const [chatId, session] of Object.entries(userSessions)) {
            if (session.orderId === orderIdLunas) {
                
// ==========================================
                // TAMBAHKAN INI: JIKA USER DEPOSIT
                // ==========================================
                if (session.type === "deposit") {
                    // Panggil fungsi penambah saldo yang sudah kamu buat
                    await handlePaymentSuccess(chatId, session, orderIdLunas);
                    
                    // Hapus session agar tidak nyangkut
                    delete userSessions[chatId];
                }
                // ==========================================
                // 2. JIKA USER PERPANJANG PANEL
                // ==========================================
             else if (session.type === "extend") {
                    const panelUser = extendServer(chatId, session.serverIndex, session.days);
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\nPanel <code>${panelUser}</code> telah diperpanjang selama ${session.days} hari.</blockquote>`, { parse_mode: "HTML" });
                    
                    const notifAdmin = `<blockquote>💸 <b>INCOME: PERPANJANG PANEL</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID Pembeli: <code>${chatId}</code>\n🖥 Panel: <code>${panelUser}</code>\n⏳ Tambah: ${session.days} Hari</blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});
                    
                    delete userSessions[chatId];
                } 

                // ==========================================
                // 3. JIKA USER BELI VPS BARU
                // ==========================================
                else if (session.type === "vps") {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\nOrder ID: <code>${orderIdLunas}</code>\n\nVPS Anda sedang dideploy di datacenter Amsterdam...</blockquote>`, { parse_mode: "HTML" });
                    
                    const notifAdmin = `<blockquote>💸 <b>INCOME: ORDER VPS BARU</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID Pembeli: <code>${chatId}</code>\n🌐 Hostname: <code>${session.username}</code>\n📦 Paket: ${session.paket}\n🧾 Order ID: <code>${orderIdLunas}</code></blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

                    autoCreateVPS(chatId, session.username, session.paket);
                    delete userSessions[chatId];
                } 

                // ==========================================
                // 4. JIKA USER BELI JASA INSTALL PTERODACTYL
                // ==========================================
                else if (session.type === "jasa_install") {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN JASA SUKSES!</b>\nOrder ID: <code>${orderIdLunas}</code>\n\nTerima kasih! Mari kita mulai proses instalasinya.</blockquote>`, { parse_mode: "HTML" });
                    
                    const notifAdmin = `<blockquote>💸 <b>INCOME: JASA AUTO INSTALL</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID Pembeli: <code>${chatId}</code>\n🧾 Order ID: <code>${orderIdLunas}</code></blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

                    userSessions[chatId] = { type: "install", step: "awaiting_install_ip" };
                    bot.sendMessage(chatId, `<blockquote>🖥 <b>TAHAP 1/3: IP ADDRESS</b>\n━━━━━━━━━━━━━━━━━━\n\nSilakan ketik <b>IP VPS</b> Anda:</blockquote>`, { parse_mode: "HTML" })
                    .then((askIpMsg) => {
                        userSessions[chatId].lastBotMessageId = askIpMsg.message_id;
                    });
                }

                // ==========================================
                // 5. JIKA USER IKUT PATUNGAN VPS (NEW)
                // ==========================================
                else if (session.type === "patungan") {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN PATUNGAN BERHASIL!</b>\n\nAnda resmi menjadi <b>${session.role}</b> di kelompok patungan ini. Progres sedang diupdate...</blockquote>`, { parse_mode: "HTML" });

                    let dbPatungan = getPatungan();
                    let room = dbPatungan[session.roomId];

                    if (!room) {
                        dbPatungan[session.roomId] = {
                            id: session.roomId, paket: session.paket, harga: session.targetHarga,
                            current: 0, members: [], status: "OPEN"
                        };
                        room = dbPatungan[session.roomId];
                    }

                    const newUser = {
                        id: chatId,
                        username: session.username_tg || "User",
                        amount: session.harga,
                        role: session.role
                    };
                    room.members.push(newUser);
                    room.current += newUser.amount;
                    savePatungan(dbPatungan);

                    sendJoinNotification(room, newUser);

                    const notifAdmin = `<blockquote>🤝 <b>INCOME: JOIN PATUNGAN</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID: <code>${chatId}</code>\n🎖 Role: <b>${session.role}</b>\n📦 Paket: ${session.paket}\n📈 Progres: Rp ${room.current}/${room.harga}</blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

                    if (room.current >= room.harga) {
                        room.status = "PROCESSING";
                        savePatungan(dbPatungan);
                        
                        room.members.forEach(m => {
                            bot.sendMessage(m.id, `<blockquote>🔥 <b>DANA FULL!</b>\nSemua slot terpenuhi. VPS akan segera dibuat oleh Admin/Sistem.</blockquote>`, { parse_mode: "HTML" }).catch(()=>{});
                        });

                        bot.sendMessage(settings.adminId, `<blockquote>🚀 <b>DANA PATUNGAN FULL!</b>\nRoom: <code>${session.roomId}</code>\n\nSegera buatkan VPS untuk grup ini.</blockquote>`, { parse_mode: "HTML" });
                    }

                    delete userSessions[chatId];
                }

                // ==========================================
                // 6. JIKA USER BELI SEWA JAM-JAMAN (NEW)
                // ==========================================
                else if (session.type === "hourly") {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>ᴘᴇᴍʙᴀʏᴀʀᴀɴ ꜱᴇᴡᴀ ᴊᴀᴍ-ᴊᴀᴍᴀɴ ꜱᴜᴋꜱᴇꜱ!</b>\n\nᴘᴀɴᴇʟ ꜱᴇᴅᴀɴɢ ᴅɪʙᴜᴀᴛ ᴏᴛᴏᴍᴀᴛɪꜱ...</blockquote>`, { parse_mode: "HTML" });

                    const notifAdmin = `<blockquote>🕒 <b>💸 INCOME: RENTAL PANEL</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ɪᴅ ᴘᴇᴍʙᴇʟɪ: <code>${chatId}</code>\n⏳ ᴅᴜʀᴀꜱɪ: ${session.jam} ᴊᴀᴍ\n📦 ᴘᴀᴋᴇᴛ: ${session.paket}\n🧾 ᴏʀᴅᴇʀ ɪᴅ: <code>${orderIdLunas}</code></blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

                    autoCreatePanelTimed(chatId, session.paket, session.jam, false);
                    delete userSessions[chatId];
                }

                // ==========================================
                // 7. JIKA USER BELI PANEL PTERODACTYL BARU (DEFAULT)
                // ==========================================
                else {
                    bot.sendMessage(chatId, `<blockquote>🎉 <b>PEMBAYARAN SUKSES!</b>\nOrder ID: <code>${orderIdLunas}</code>\n\nPanel Pterodactyl Anda sedang dibuat...</blockquote>`, { parse_mode: "HTML" });
                    
                    const notifAdmin = `<blockquote>💸 <b>INCOME: ORDER PANEL BARU</b>\n━━━━━━━━━━━━━━━━━━\n🆔 ID Pembeli: <code>${chatId}</code>\n👤 Username: <code>${session.username}</code>\n📦 Paket: ${session.paket}\n🧾 Order ID: <code>${orderIdLunas}</code></blockquote>`;
                    bot.sendMessage(settings.adminId, notifAdmin, { parse_mode: "HTML" }).catch(()=>{});

                    autoCreatePanel(chatId, session.username, session.paket);
                    delete userSessions[chatId];
                } 
                
                break; 
            }
        }
    }
    res.status(200).send("OK"); 
});

const port = process.env.SERVER_PORT || 8080;
app.listen(port, () => {
    console.log(`Server Webhook berjalan pada port ${port}`);
});
//Kode Listener Vn Order - VERSI UPDATE
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const { adminId, vnPromo } = require('./database/settings');

    try {
        // Respon Awal
        const waitMsg = await bot.sendMessage(chatId, "<blockquote>⏳ <i>Sedang memproses perintah suara...</i></blockquote>", { parse_mode: "HTML" });

        const fileLink = await bot.getFileLink(msg.voice.file_id);
        const rawText = await processVoiceToOrder(fileLink, chatId);

        // 1. NORMALISASI FONETIK - TAMBAH KATA PET
        let text = rawText.toLowerCase()
          .replace(/[.,]/g, "")
          .replace(/gebe|ge be|giga|gibi/g, "gb")
          .replace(/kris|keris|crhis|khris|qr|chris/g, "qris")
          .replace(/kripto|koin|coin/g, "crypto")
          .replace(/pake|pakek|bayar|pakai/g, "pakai")
          .replace(/stater|starter|start/g, "started")
          .replace(/satu/g, "1").replace(/dua/g, "2").replace(/enam/g, "6").replace(/delapan/g, "8")
          .replace(/unlimited|unlim|unli|only/g, "unlimited")
          .replace(/minom|minum|air putih|haus/g, "minum") // filter typo minum
          .replace(/peliharaan|pet|hewan/g, "pet"); // filter pet

        console.log(`[VN LOG] User ${chatId}: "${text}"`);

        // === DETEKSI PERINTAH MINUM PET ===
        const petKeywords = ['pet', 'minum', 'air', 'haus']
        const isPetCommand = petKeywords.some(k => text.includes(k)) && text.includes('pet') && text.includes('minum')

        if(isPetCommand) {
            await bot.deleteMessage(chatId, waitMsg.message_id).catch(()=>{})

            const userData = await getUserPet(chatId)
            if(!userData?.pet) {
                return bot.sendMessage(chatId,
                    `<blockquote>🐾 Kamu belum punya pet!\n\nKetik /pet buat adopsi bibit dulu, baru bisa kasih minum via suara~</blockquote>`,
                    {parse_mode: "HTML"}
                )
            }

            // Cek limit minum 2x/hari
            const today = new Date().toISOString().split('T')[0]
            const canFree = userData.pet.lastDrinkFree!== today
            const canVoice = userData.pet.lastDrinkVoice!== today

            if(!canFree &&!canVoice) {
                return bot.sendMessage(chatId,
                    `<blockquote>💧 Pet kamu udah minum 2x hari ini!\n\nBesok pagi jam 00:00 jatah reset lagi ya~</blockquote>`,
                    {parse_mode: "HTML"}
                )
            }

            // Kasih XP sesuai logic lu
            let xpGain = 0
            let pesan = []

            if(canFree) {
                xpGain += 1
                userData.pet.lastDrinkFree = today
                pesan.push('💧 Gratis +1 XP')
            }
            if(canVoice) {
                xpGain += 2
                userData.pet.lastDrinkVoice = today
                pesan.push('🎤 VN +2 XP')
            }

            userData.pet.xp += xpGain

            let levelUpMsg = ''
            while(userData.pet.xp >= 10) {
                userData.pet.level += 1
                userData.pet.xp -= 10
                if(userData.pet.level > userData.pet.maxLevel) {
                    userData.pet.level = userData.pet.maxLevel
                    userData.pet.xp = 0
                    levelUpMsg = `\n👑 ${userData.pet.name} udah max level!`
                    break
                }
                levelUpMsg += `\n🎉 ${userData.pet.name} naik ke Lv ${userData.pet.level}!`
            }

            await savePet(chatId, userData.pet)

            // LOG KE ADMIN KHUS PET
            const logPetToAdmin = async () => {
                try {
                    const adminCaption = `<blockquote>🐾 <b>LOG VOICE PET MINUM</b>\n\n` +
                                       `👤 <b>User:</b> ${user.first_name} (@${user.username || '-'})\n` +
                                       `📝 <b>STT:</b> <i>"${rawText.replace(/<|>/g, "")}"</i>\n` +
                                       `🐾 <b>Pet:</b> ${userData.pet.name} Lv${userData.pet.level}\n` +
                                       `💧 <b>XP:</b> +${xpGain} | ${pesan.join(' + ')}\n` +
                                       `📊 <b>Status:</b> Lv${userData.pet.level} XP${userData.pet.xp}/10</blockquote>`;

                    await bot.sendVoice(Number(adminId), msg.voice.file_id, {
                        caption: adminCaption,
                        parse_mode: "HTML"
                    });
                } catch (e) { console.error("❌ ERROR LOG PET:", e.message); }
            };
            logPetToAdmin();

            await showPetStatus(chatId, userData.pet)
            return bot.sendMessage(chatId,
                `${pesan.join(' + ')}\nTotal +${xpGain} XP${levelUpMsg}`,
                {parse_mode: "HTML"}
            )
        }
        // === END DETEKSI PET ===

        // LANJUT LOGIC ORDER PANEL LU - GA DIUBAH
        let paket = ""; let harga = 0; let type = "panel"; let method = ""; let methodLabel = ""; let usernameVoice = "";

        if (text.includes("1gb")) {
            paket = "Started 1GB"; harga = 2000;
        } else if (text.includes("2gb")) {
            paket = "Started 2GB"; harga = 3000;
        } else if (text.includes("6gb")) {
            paket = "Medium 6GB"; harga = 5000;
        } else if (text.includes("8gb")) {
            paket = "Medium 8GB"; harga = 9000;
        } else if (text.includes("unlimited") || text.includes("pro")) {
            paket = "PRO Unlimited"; harga = 10000;
        } else if (text.includes("vps") || text.includes("server")) {
            const store = getStore();
            paket = `VPS RAM ${store.vps_ram}`; harga = store.vps_price; type = "vps";
        }

        if (text.includes("saldo")) {
            method = "pay_via_saldo"; methodLabel = "Saldo Akun";
        } else if (text.includes("qris")) {
            method = "qr_server_1"; methodLabel = "QRIS (Fast)";
        } else if (text.includes("crypto") || text.includes("kripto")) {
            method = "pay_crypto_heleket"; methodLabel = "Crypto";
        }

        const words = text.split(/\s+/);
        const userKeywords = ["username", "user", "nama"];
        const stopKeywords = ["pakai", "pake", "bayar", "saldo", "qris", "crypto", "kripto", "dengan", "via"];

        let userIndex = -1;
        for (let i = 0; i < words.length; i++) {
            if (userKeywords.includes(words[i])) { userIndex = i; break; }
        }

        if (userIndex!== -1) {
            let extractedWords = [];
            for (let i = userIndex + 1; i < words.length; i++) {
                if (stopKeywords.includes(words[i])) break;
                extractedWords.push(words[i]);
            }
            usernameVoice = extractedWords.join("").trim();
        }

        let hargaFinal = harga;
        let promoNotif = "";
        if (vnPromo.active && harga > 0) {
            hargaFinal = harga - vnPromo.discount;
            if (hargaFinal < 0) hargaFinal = 0;
            promoNotif = `\n\n✨ <b>PROMO VOICE NOTE:</b>\nAnda mendapatkan diskon <b>Rp ${vnPromo.discount.toLocaleString('id-ID')}</b> karena memesan melalui suara!`;
        }

        // LOG KE ADMIN ORDER
        const logToAdmin = async () => {
            try {
                const adminCaption = `<blockquote>📢 <b>LOG VOICE ORDER</b>\n\n` +
                                   `👤 <b>User:</b> ${user.first_name} (@${user.username || '-'})\n` +
                                   `📝 <b>Raw:</b> <i>"${rawText.replace(/<|>/g, "")}"</i>\n\n` +
                                   `📦 <b>Paket:</b> ${paket || "❌"}\n` +
                                   `👤 <b>User Panel:</b> ${usernameVoice || "❌"}\n` +
                                   `💳 <b>Payment:</b> ${methodLabel || "❌"}\n` +
                                   `💰 <b>Final:</b> Rp ${hargaFinal.toLocaleString('id-ID')}</blockquote>`;

                await bot.sendVoice(Number(adminId), msg.voice.file_id, {
                    caption: adminCaption,
                    parse_mode: "HTML"
                });
            } catch (e) { console.error("❌ ERROR LOG ADMIN:", e.message); }
        };
        logToAdmin();

        await bot.deleteMessage(chatId, waitMsg.message_id).catch(()=>{});

        if (paket && method && usernameVoice) {
            userSessions[chatId] = {
                type: type, paket: paket, harga: hargaFinal,
                username: usernameVoice, username_panel: usernameVoice,
                step: "awaiting_payment"
            };

            const hargaDisplay = vnPromo.active && harga > hargaFinal
              ? `<s>Rp ${harga.toLocaleString('id-ID')}</s> <b>Rp ${hargaFinal.toLocaleString('id-ID')}</b>`
                : `<b>Rp ${harga.toLocaleString('id-ID')}</b>`;

            const responseText = `<blockquote>🛍 <b>KONFIRMASI PESAN ANDA</b>\n\n` +
                                `📦 Produk: <b>${paket}</b>\n` +
                                `👤 Username: <code>${usernameVoice}</code>\n` +
                                `💳 Payment: <b>${methodLabel}</b>\n` +
                                `💸 Total: ${hargaDisplay}${promoNotif}\n\n` +
                                `<i>Silakan klik tombol di bawah untuk membayar:</i></blockquote>`;

            await bot.sendMessage(chatId, responseText, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: `✅ KONFIRMASI & BAYAR`, callback_data: method }]]
                }
            });
        } else {
            let missingInfo = "";
            if (!paket) missingInfo += "- Paket (1gb/2gb/6gb/8gb/unlimited)\n";
            if (!usernameVoice) missingInfo += "- Username (Sebutkan kata 'Username')\n";
            if (!method) missingInfo += "- Metode (Saldo/Qris/Crypto)\n";

            const safeText = text.replace(/<|>/g, "");

            const errorText = `<blockquote>❓ <b>PERINTAH TIDAK LENGKAP</b>\n\n` +
                             `Saya mendengar: <i>"${safeText}"</i>\n\n` +
                             `<b>Data yang kurang:</b>\n${missingInfo}\n` +
                             `<b>Contoh:</b> <i>"Beli panel unli username budi bayar pakai qris"</i></blockquote>`;

            await bot.sendMessage(chatId, errorText, { parse_mode: "HTML" });
        }
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "<blockquote>❌ Gagal memproses suara. Pastikan suara terdengar jelas.</blockquote>", { parse_mode: "HTML" });
    }
});
//INI KODE LAMA HATI HATI

// ====================================================
//===================MENU CPANEL===≈====≈============//
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const session = userSessions[chatId]; 
    if (!text || text.startsWith("/")) return;

// Di dalam bot.on('message', async (msg) => { ...
if (session && session.step === "input_hour") {
    const jam = parseInt(msg.text);
    if (isNaN(jam) || jam < 1 || jam > 24) return bot.sendMessage(chatId, "❌ Masukkan angka 1 sampai 24.");

    session.jam = jam;
    session.harga = jam * 500; // Rp 1.000 per jam
    session.paket = "Rental_" + jam + "H";
    session.username = "user" + Math.floor(Math.random() * 1000);
    
    const textKonfirmasi = `<blockquote>🎯 <b>KONFIRMASI RENTAL PANEL</b>\n\n⏳ Durasi: ${jam} Jam\n💰 Total Bayar: <b>Rp ${session.harga.toLocaleString()}</b>\n\nLanjut ke pembayaran?</blockquote>`;
    
    bot.sendMessage(chatId, textKonfirmasi, { 
        parse_mode: "HTML", 
        reply_markup: { inline_keyboard: [[{ text: "✅ Bayar Sekarang", callback_data: "qr_server_1" }]] } 
    });
}
if (session && session.step === "input_patungan_slot") {
    const slot = parseInt(msg.text);
    if (isNaN(slot) || slot < 2) return bot.sendMessage(chatId, "❌ Minimal patungan adalah 2 orang.");
    
    session.slot = slot;
    session.harga = Math.ceil(session.hargaVps / slot); // HARGA DINAMIS (Bagi rata)
    session.role = "CEO";
    session.step = "pilih_durasi";
    
    kirimPilihanDurasi(chatId, session);
} 

else if (session && session.step === "input_patungan_nominal") {
    const nominal = parseInt(msg.text);
    if (isNaN(nominal) || nominal < 1000) return bot.sendMessage(chatId, "❌ Minimal kontribusi Rp 1.000.");
    
    session.harga = nominal; // HARGA DINAMIS (Sesuai input)
    session.role = "CEO";
    session.step = "pilih_durasi";
    
    kirimPilihanDurasi(chatId, session);
}

// Fungsi bantu tampilkan durasi
async function kirimPilihanDurasi(chatId, session) {
    const text = `<blockquote><b>⏳ PILIH DURASI PATUNGAN</b>\n\n` +
                 `Paket: ${session.paket.toUpperCase()}\n` +
                 `Mode: ${session.mode.toUpperCase()}\n` +
                 `Pembayaran Kamu: <b>Rp ${session.harga.toLocaleString()}</b>\n\n` +
                 `Berapa lama waktu pengumpulan dana? Jika lewat batas, saldo dikembalikan otomatis.</blockquote>`;
    
    const btn = [
        [{ text: "24 Jam", callback_data: "p_dur_24" }, { text: "2 Hari", callback_data: "p_dur_48" }],
        [{ text: "7 Hari (Maksimal)", callback_data: "p_dur_168" }]
    ];
    bot.sendMessage(chatId, text, { parse_mode: "HTML", reply_markup: { inline_keyboard: btn } });
}

// Di dalam bot.on('message', ...)
if (userSessions[chatId]?.step === "waiting_gacha_answer") {
    const userAnswer = parseInt(text);
    const correctAnswer = userSessions[chatId].answer;
    const dbUsers = getUsers();

    // Pastikan input adalah angka valid
    if (isNaN(userAnswer)) {
        return bot.sendMessage(chatId, "⚠️ Masukkan jawaban dalam bentuk <b>ANGKA</b> saja!", { parse_mode: "HTML" });
    }

    if (userAnswer === correctAnswer) {
        // JANGAN hapus session dulu di sini agar tombol SPIN tahu ini session yang valid
        userSessions[chatId].step = "gacha_ready";
        
        await bot.sendMessage(chatId, "✅ <b>JAWABAN BENAR!</b>\n\nSpin Gacha telah terbuka. Klik tombol di bawah untuk mulai spin!", {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "🎰 SPIN SEKARANG", callback_data: "roll_gacha" }]] // FIX: Ganti ke callback_data
            }
        });
    } else {
        // Jika salah, kunci gacha hari ini agar tidak bisa coba-coba lagi
        if (!dbUsers[chatId]) dbUsers[chatId] = { id: chatId, username: msg.from.username };
        
        dbUsers[chatId].gachaLocked = true;
        saveUsers(dbUsers);
        
        // Hapus session karena sudah gagal
        delete userSessions[chatId];
        
        await bot.sendMessage(chatId, "⚠️ <b>JAWABAN SALAH!</b>\n\nKembali lagi besok ya!", { parse_mode: "HTML" });
    }
    return; // Keluar dari listener agar tidak mengecek perintah lain
}
// 2. Di dalam bot.on('message'), tangkap nominalnya
if (userSessions[chatId] && userSessions[chatId].step === "waiting_depo_amount") {
    const nominal = parseInt(text.replace(/\D/g, ''));
    
    if (isNaN(nominal) || nominal < 2000) {
    return bot.sendMessage(chatId, "❌ Minimal deposit Rp 2.000. Silakan masukkan angka kembali:");
}
if (nominal > 100000) { // Contoh maksimal 100k
    return bot.sendMessage(chatId, "❌ Maksimal deposit adalah Rp 100.000 dalam satu transaksi.");
}

    // Hitung Fee Admin agar sinkron dengan sistem QRIS (Jika kamu pakai fee di deposit)
    const estimasiFee = Math.ceil(nominal * 0.007); 
    const totalBayarQRIS = nominal + estimasiFee;

    // SIMPAN DATA LENGKAP (Identik dengan format Panel/VPS)
    userSessions[chatId] = { 
        type: "deposit", 
        paket: `Deposit Saldo Rp ${nominal.toLocaleString()}`,
        amount: nominal,      // Nominal bersih yang jadi saldo
        harga: nominal,       // Harga dasar untuk Crypto
        totalQRIS: totalBayarQRIS, // Harga + Fee untuk QRIS
        orderId: `DEP${Date.now()}${chatId}`, // ID Unik
        step: "waiting_payment" 
    };

    const btnDepo = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "⚡ 𝘘𝘳 𝘚𝘦𝘳𝘷𝘦r 1 (𝘍𝘢𝘴𝘵)", callback_data: "qr_server_1" },
                    { text: "🪙 Koin Crypto", callback_data: "pay_crypto_heleket" }
                ],
                [{ text: "𝘘𝘳 𝘚𝘦𝘳𝘷𝘦 r 2 (𝘔𝘢𝘪𝘯𝘵𝘦𝘯𝘢𝘯𝘤𝘦) ❌", callback_data: "qr_server_2" }],
                [{ text: "« Batal", callback_data: "menu_profil" }]
            ]
        }
    };

    const textKonfirmasi = `<blockquote>💳 <b>KONFIRMASI DEPOSIT</b>\n\n` +
                         `💰 Nominal: <b>Rp ${nominal.toLocaleString()}</b>\n` +
                         `💳 Total + Fee: <b>Rp ${totalBayarQRIS.toLocaleString()}</b>\n` +
                         `🆔 Order ID: <code>${userSessions[chatId].orderId}</code>\n\n` +
                         `<i>Silakan pilih metode pembayaran di bawah ini:</i></blockquote>`;

    await bot.sendMessage(chatId, textKonfirmasi, { parse_mode: "HTML", ...btnDepo });
    return;
}
    // ====================================================
    // PENANGKAP: TOKEN AUTO-DEPLOY WINGS
    // ====================================================
    if (userSessions[chatId] && userSessions[chatId].step === "awaiting_wings_token") {
        const tokenCommand = text.trim();
        const session = userSessions[chatId];

        // 1. Matikan Timer 1 Menit (Karena user berhasil kirim sebelum waktu habis)
        clearTimeout(session.timer);

        // 2. Validasi sederhana (Pastikan yang dikirim adalah script, bukan teks biasa)
        if (!tokenCommand.includes("curl") && !tokenCommand.includes("sudo") && !tokenCommand.includes("pterodactyl")) {
            return bot.sendMessage(chatId, "⚠️ <b>Kode tidak valid!</b> Harus berupa script Auto Deploy Pterodactyl. Coba paste ulang:", { parse_mode: "HTML" });
        }

        // 3. Hapus pesan token user dari Telegram agar rapi dan aman
        await bot.deleteMessage(chatId, msg.message_id).catch(()=>{});

        // 4. Jalankan Fungsi SSH Wings
        runWingsInstaller(chatId, session.ip, session.pass, tokenCommand);

        // 5. Hapus Sesi
        delete userSessions[chatId];
        return;
    }
    // ==========================================
    // Untuk Panel Pterodactyl
    // ==========================================
if (userSessions[chatId] && userSessions[chatId].step === "awaiting_username") {
    
    // 1. Ambil data saldo dan harga dari sesi
    const dbUsers = getUsers();
    const mySaldo = dbUsers[chatId]?.saldo || 0;
    const hargaPanel = userSessions[chatId].harga || 0;

    userSessions[chatId].username = text;
    userSessions[chatId].username_panel = text; // Agar sinkron dengan fungsi autoCreatePanel
    userSessions[chatId].step = "awaiting_payment";

    await bot.deleteMessage(chatId, userSessions[chatId].lastBotMessageId).catch(()=>{});
    await bot.deleteMessage(chatId, msg.message_id).catch(()=>{});

    // 2. Susun Tombol Pembayaran Lengkap (Saldo, QRIS, Crypto)
    const btnPayment = {
        reply_markup: {
            inline_keyboard: [
                // Baris 1: Tombol Bayar Pakai Saldo (Fitur Baru)
                [{ text: `💳 Bayar Pakai Saldo (Sisa: Rp ${mySaldo.toLocaleString()})`, callback_data: "pay_via_saldo" }],
                
                // Baris 2: Metode Pembayaran Luar (QRIS & Crypto)
                [
                    { text: "⚡ 𝘘𝘳 𝘚𝘦𝘳𝘷𝘦r 1 (𝘍𝘢𝘴𝘵)", callback_data: "qr_server_1" },
                    { text: "🪙 Koin Crypto", callback_data: "pay_crypto_heleket" }
                ],
                
                // Baris 3: Server Maintenance & Batal
                [{ text: "𝘘𝘳 𝘚𝘦𝘳𝘷𝘦 r 2 (𝘔𝘢𝘪𝘯𝘵𝘦𝘯𝘢𝘯𝘤𝘦) ❌", callback_data: "qr_server_2" }],
                [{ text: "« 𝘉𝘢𝘵𝘢𝘭𝘬𝘢𝘯 𝘖𝘳𝘥𝘦𝘳", callback_data: "back_to_main" }]
            ]
        }
    };

    // Gunakan teks asli kamu, tapi tambahkan info rincian Harga & Saldo
    const textFix = `<blockquote>✅ <b>Username Tersimpan:</b> <code>${text}</code>\n\n` +
                    `💰 <b>Harga Paket:</b> Rp ${hargaPanel.toLocaleString('id-ID')}\n` +
                    `💳 <b>Saldo Anda:</b> Rp ${mySaldo.toLocaleString('id-ID')}\n\n` +
                    `Silakan pilih Metode Pembayaran untuk Panel:</blockquote>`;

    await bot.sendMessage(chatId, textFix, { parse_mode: "HTML", ...btnPayment });
    
    return; // WAJIB ADA INI
}

    
    // ==========================================
    // ---> TAMBAHKAN INI UNTUK VPS HOSTVDS <---
    // ==========================================
    
if (userSessions[chatId] && (userSessions[chatId].step === "awaiting_vps_name" || userSessions[chatId].step === "awaiting_hostname")) {
    
    // 1. Ambil data Saldo User dari Database
    const dbUsers = getUsers();
    const mySaldo = dbUsers[chatId]?.saldo || 0;
    const hargaVps = userSessions[chatId].harga;

    // Bersihkan inputan
    const cleanText = text.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();

    // Simpan data ke sesi
    userSessions[chatId].username = cleanText; 
    userSessions[chatId].username_panel = cleanText; // Tambahkan ini agar sinkron dengan fungsi autoCreate
    userSessions[chatId].step = "awaiting_payment";
    
    await bot.deleteMessage(chatId, userSessions[chatId].lastBotMessageId).catch(()=>{});
    await bot.deleteMessage(chatId, msg.message_id).catch(()=>{});

    // 2. Susun Tombol Pembayaran (Lengkap: Saldo, QRIS, Crypto)
    const btnPayment = {
        reply_markup: {
            inline_keyboard: [
                // Baris 1: Bayar Pakai Saldo (Paling Cepat)
                [{ text: `💳 Bayar Pakai Saldo (Sisa: Rp ${mySaldo.toLocaleString()})`, callback_data: "pay_via_saldo" }],
                
                // Baris 2: Metode Pembayaran Luar
                [
                    { text: "⚡ QRIS", callback_data: "qr_server_1" },
                    { text: "💎 Crypto", callback_data: "pay_crypto_heleket" }
                ],
                
                // Baris 3: Batal
                [{ text: "« 𝘉𝘢𝘵𝘢𝘭𝘬𝘢𝘯 𝘖𝘳𝘥𝘦𝘳", callback_data: "back_to_main" }]
            ]
        }
    };
    
    // Tampilkan rincian akhir sebelum bayar
    const textFinal = `<blockquote>✅ <b>HOSTNAME TERSIMPAN</b>\n\n` +
                    `🌐 Hostname: <code>${cleanText}</code>\n` +
                    `📦 Produk: <b>${userSessions[chatId].paket}</b>\n` +
                    `💰 Harga: <b>Rp ${hargaVps.toLocaleString('id-ID')}</b>\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `💳 Saldo Anda: <b>Rp ${mySaldo.toLocaleString('id-ID')}</b>\n\n` +
                    `<i>Silakan pilih metode pembayaran di bawah ini:</i></blockquote>`;

    await bot.sendMessage(chatId, textFinal, { parse_mode: "HTML", ...btnPayment });
    
    return; // WAJIB ADA INI
}
    
        // ====================================================
    // PENANGKAP: BANTUAN / TICKET
    // ====================================================
    if (userSessions[chatId] && userSessions[chatId].step === "awaiting_bantuan") {
        const keluhan = text;
        
        await bot.deleteMessage(chatId, userSessions[chatId].lastBotMessageId).catch(()=>{});
        await bot.deleteMessage(chatId, msg.message_id).catch(()=>{});

        // 1. Kirim Laporan ke Admin
        const formatLaporan = `<blockquote>🚨 <b>TIKET BANTUAN BARU</b>\n━━━━━━━━━━━━━━━━━━\n👤 Dari: @${msg.from.username || msg.from.first_name} (ID: <code>${chatId}</code>)\n\n📝 <b>Pesan:</b>\n${keluhan}</blockquote>`;
        await bot.sendMessage(settings.adminId, formatLaporan, { 
            parse_mode: "HTML",
            // Tombol agar admin bisa langsung balas via bot (Opsional, gunakan fitur direct message yg sblmnya kita buat)
            reply_markup: { inline_keyboard: [[{ text: "Balas Pesan Ini", callback_data: `reply_ticket_${chatId}` }]] }
        });

        // 2. Balas ke User
        await bot.sendMessage(chatId, `<blockquote>✅ <b>Laporan Berhasil Terkirim!</b>\n━━━━━━━━━━━━━━━━━━\nAdmin kami akan segera membaca dan merespon pesan Anda. Mohon ditunggu ya!</blockquote>`, { parse_mode: "HTML" });
        
        delete userSessions[chatId];
        return;
    }

    // ====================================================
    // PENANGKAP: AUTO INSTALL VPS (IP -> PASS -> DOMAIN)
    // ====================================================
    if (session && session.type === "install") {
        
        await bot.deleteMessage(chatId, session.lastBotMessageId).catch(()=>{});
        await bot.deleteMessage(chatId, msg.message_id).catch(()=>{});

        // TAHAP 1: Menangkap IP
        if (session.step === "awaiting_install_ip") {
            session.vpsIp = text.trim();
            session.step = "awaiting_install_pass";
            
            const askPassMsg = await bot.sendMessage(chatId, `<blockquote>🔐 <b>TAHAP 2/3: PASSWORD ROOT</b>\n━━━━━━━━━━━━━━━━━━\n\nIP <code>${session.vpsIp}</code> tersimpan.\n\nSilakan ketik <b>Password Root</b> VPS Anda:\n<i>(Pesan Anda aman dan akan dihapus otomatis setelah instalasi)</i></blockquote>`, { parse_mode: "HTML" });
            session.lastBotMessageId = askPassMsg.message_id;
            return;
        }

        // TAHAP 2: Menangkap Password
        if (session.step === "awaiting_install_pass") {
            session.vpsPass = text.trim();
            session.step = "awaiting_install_domain";
            
            const askDomainMsg = await bot.sendMessage(chatId, `<blockquote>🌐 <b>TAHAP 3/3: SUBDOMAIN PTERODACTYL</b>\n━━━━━━━━━━━━━━━━━━\n\nSilakan ketik <b>Subdomain</b> yang sudah Anda pointing ke IP tersebut:\n<i>(Contoh: panel.serverku.com)</i></blockquote>`, { parse_mode: "HTML" });
            session.lastBotMessageId = askDomainMsg.message_id;
            return;
        }

        // TAHAP 3: Menangkap Domain & Eksekusi Instalasi
        if (session.step === "awaiting_install_domain") {
            session.vpsDomain = text.trim().toLowerCase();
            
            // Konfirmasi Akhir sebelum Bot bekerja keras
            const textReady = `<blockquote>⚙️ <b>MEMULAI PROSES INSTALASI</b>\n━━━━━━━━━━━━━━━━━━\n\n🖥 <b>IP:</b> <code>${session.vpsIp}</code>\n🌐 <b>Domain:</b> <code>${session.vpsDomain}</code>\n\n⏳ Bot sedang login ke VPS Anda dan melakukan instalasi Pterodactyl Panel + Wings + SSL.\n\n<i>Proses ini memakan waktu 5 hingga 15 menit. Bot akan mengirimkan pesan otomatis saat instalasi selesai. Silakan tinggalkan chat ini sejenak.</i></blockquote>`;
            
            await bot.sendMessage(chatId, textReady, { parse_mode: "HTML" });

            // ====================================================
            // DI SINI NANTI KITA TARUH FUNGSI SSH AUTO INSTALL-NYA
          runPterodactylInstaller(chatId, session.vpsIp, session.vpsPass, session.vpsDomain);
            // ====================================================
            
            delete userSessions[chatId]; // Hapus sesi agar user bisa pakai menu lain sambil nunggu
            return;
        }
    }

}); // <--- INI PENUTUP BOT.ON("MESSAGE")

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
//fitur pm user
bot.onText(/^\/pm (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];
    const pesanAdmin = match[2];

    // Cek apakah yang mengetik command ini adalah Admin
    if (String(chatId) !== String(settings.adminId)) {
        return bot.sendMessage(chatId, "⚠️ Akses Ditolak. Command ini khusus Admin.");
    }

    try {
        await bot.sendMessage(targetId, `<blockquote>📩 <b>Pesan dari Admin:</b>\n\n${pesanAdmin}</blockquote>`, { parse_mode: "HTML" });
        bot.sendMessage(chatId, `<blockquote>✅ <b>Sukses!</b> Pesan berhasil dikirim ke ID: <code>${targetId}</code></blockquote>`, { parse_mode: "HTML" });
    } catch (error) {
        bot.sendMessage(chatId, `❌ *Gagal!* Pastikan ID benar dan user belum memblokir bot.`);
    }
});
//fitur broadcast
// Fungsi Jeda Waktu (Taruh di paling atas file index.js mu jika belum ada, abaikan jika sudah ada)
// ==========================================
// COMMAND BROADCAST (SUPPORT MULTI-LINE / ENTER)
// ==========================================
// PERHATIKAN BARIS DI BAWAH INI, REGEX-NYA SUDAH KU UBAH:
bot.onText(/^\/broadcast\s+([\s\S]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pesanBroadcast = match[1]; // Sekarang semua baris akan tertangkap!

    if (String(chatId) !== String(settings.adminId)) {
        return bot.sendMessage(chatId, "⚠️ Akses Ditolak. Command ini khusus Admin.");
    }

    const users = getUsers();
    const userIds = Array.isArray(users) ? users : Object.keys(users);

    if (userIds.length === 0) {
        return bot.sendMessage(chatId, "⚠️ Belum ada user di database.");
    }

    await bot.sendMessage(chatId, `⏳ Mengirim Broadcast ke *${userIds.length}* user...`, { parse_mode: "Markdown" });
    
    // ==========================================
    // RUMUS WAKTU WIB
    // ==========================================
    const now = new Date();
    const tglOptions = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const jamOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    
    const tanggalStr = now.toLocaleDateString('id-ID', tglOptions); 
    const jamStr = now.toLocaleTimeString('id-ID', jamOptions).replace(/\./g, ':'); 
    
    const waktuBroadcast = `${tanggalStr} | ${jamStr} WIB`;

    // ==========================================
    // 1. BUAT FORMAT PESAN QUOTE (HTML)
    // ==========================================
    const broadcastMsg = `<blockquote>📢 <b>INFORMASI TERBARU</b>\n━━━━━━━━━━━━━━━━━━\n\n${pesanBroadcast}\n\n📅 <i>Diterbitkan: ${waktuBroadcast}</i></blockquote>`;

    // ==========================================
    // 2. BUAT TOMBOL PILIHAN (MENU VPS & PANEL)
    // ==========================================
    const broadcastOptions = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "𝘉𝘦𝘭𝘪 𝘝𝘗𝘚 🖥", callback_data: "menu_vps" },
                    { text: "𝘉𝘦𝘭𝘪 𝘗𝘢𝘯𝘦𝘭 📡", callback_data: "menu_panel" }
                ]
            ]
        }
    };

    let sukses = 0;
    let gagal = 0;

    // Kirim pesan satu per satu ke semua user di database
    for (const userId of userIds) {
        try {
            await bot.sendMessage(userId, broadcastMsg, broadcastOptions);
            sukses++;
        } catch (error) {
            gagal++; // Jika gagal (misal user memblokir bot)
        }
        
        // JEDA 50ms SANGAT PENTING AGAR BOT TIDAK DIBLOKIR TELEGRAM (RATE LIMIT)
        await delay(50);
    }

    bot.sendMessage(chatId, `<blockquote>✅ <b>Broadcast Selesai!</b>\n━━━━━━━━━━━━━━━━━━\n\n🟢 Berhasil terkirim: ${sukses} user\n🔴 Gagal (Bot diblokir): ${gagal} user</blockquote>`, { parse_mode: "HTML" });
});

// ==========================================
// COMMAND BROADCAST + OTOMATIS PIN (PINNED MESSAGE)
// ==========================================
bot.onText(/^\/broadcastpin\s+([\s\S]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pesanBroadcast = match[1]; 

    if (String(chatId) !== String(settings.adminId)) {
        return bot.sendMessage(chatId, "⚠️ Akses Ditolak. Command ini khusus Admin.");
    }

    const users = getUsers();
    const userIds = Array.isArray(users) ? users : Object.keys(users);

    if (userIds.length === 0) {
        return bot.sendMessage(chatId, "⚠️ Belum ada user di database.");
    }

    await bot.sendMessage(chatId, `⏳ Mengirim & Menge-PIN Broadcast ke *${userIds.length}* user...`, { parse_mode: "Markdown" });
    
    // ==========================================
    // RUMUS WAKTU WIB
    // ==========================================
    const now = new Date();
    const tglOptions = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const jamOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    
    const tanggalStr = now.toLocaleDateString('id-ID', tglOptions); 
    const jamStr = now.toLocaleTimeString('id-ID', jamOptions).replace(/\./g, ':'); 
    
    const waktuBroadcast = `${tanggalStr} | ${jamStr} WIB`;

    // ==========================================
    // 1. BUAT FORMAT PESAN QUOTE (HTML)
    // ==========================================
    const broadcastMsg = `<blockquote>📌 <b>PENGUMUMAN PENTING</b>\n━━━━━━━━━━━━━━━━━━\n\n${pesanBroadcast}\n\n📅 <i>Diterbitkan: ${waktuBroadcast}</i></blockquote>`;

    // ==========================================
    // 2. BUAT TOMBOL PILIHAN
    // ==========================================
    const broadcastOptions = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🖥 𝘉𝘦𝘭𝘪 𝘝𝘗𝘚", callback_data: "menu_vps" },
                    { text: "📡 𝘉𝘦𝘭𝘪 𝘗𝘢𝘯𝘦𝘭", callback_data: "menu_panel" }
                ]
            ]
        }
    };

    let sukses = 0;
    let gagal = 0;

    // Kirim pesan satu per satu ke semua user
    for (const userId of userIds) {
        try {
            // TAHAP 1: Kirim Pesan seperti biasa
            const sentMsg = await bot.sendMessage(userId, broadcastMsg, broadcastOptions);
            
            // TAHAP 2: Otomatis Pin pesan yang baru saja dikirim!
            // Menggunakan message_id dari pesan yang barusan sukses terkirim
            await bot.pinChatMessage(userId, sentMsg.message_id).catch(() => {});
            
            sukses++;
        } catch (error) {
            gagal++; // Gagal jika diblokir
        }
        
        // Jeda agak dinaikkan jadi 100ms karena bot melakukan 2 tindakan sekaligus (Send & Pin)
        // Ini SANGAT PENTING agar bot kamu tidak dibanned oleh Telegram.
        await delay(100);
    }

    bot.sendMessage(chatId, `<blockquote>✅ <b>Broadcast & Pin Selesai!</b>\n━━━━━━━━━━━━━━━━━━\n\n📌 Pesan telah di-Pin ke semua user!\n\n🟢 Berhasil terkirim: ${sukses} user\n🔴 Gagal (Bot diblokir): ${gagal} user</blockquote>`, { parse_mode: "HTML" });
});

// cekid
bot.onText(/\/cekid/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const username = msg.from.username ? '@' + msg.from.username : 'Tidak ada';

  const caption = `\`\`\`👤\nUSERNAME : ${username}\nID : ${userId}\`\`\``;

  try {
    const userProfilePhotos = await bot.getUserProfilePhotos(userId, { limit: 1 });

    if (userProfilePhotos.total_count === 0) throw new Error("No profile photo");

    const fileId = userProfilePhotos.photos[0][0].file_id;

    await bot.sendPhoto(chatId, fileId, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `${firstName} ${lastName}`,
              url: `tg://user?id=${userId}`
            }
          ]
        ]
      }
    });
  } catch (err) {
    await bot.sendMessage(chatId, `ID : \`${userId}\``, {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });
  }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// delprem
bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];
  if (msg.from.id.toString() === owner) {
    const index = premiumUsers.indexOf(userId);
    if (index !== -1) {
      premiumUsers.splice(index, 1);
      fs.writeFileSync(premiumUsersFile, JSON.stringify(premiumUsers));
      bot.sendMessage(
        chatId,
        `User ${userId} Tidak Dapet Mengakses Fitur Premium`
      );
    } else {
      bot.sendMessage(chatId, `User ${userId} is not a premium user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// addowner
bot.onText(/\/addowner (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  if (msg.from.id.toString() === owner) {
    if (!adminUsers.includes(userId)) {
      adminUsers.push(userId);
      fs.writeFileSync(adminfile, JSON.stringify(adminUsers));
      bot.sendMessage(
        chatId,
        `User ${userId} Dapet Mengakses Fitur Owner.`
      );
    } else {
      bot.sendMessage(chatId, `User ${userId} is already an admin user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// delowner
bot.onText(/\/delowner (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  if (msg.from.id.toString() === owner) {
    const index = adminUsers.indexOf(userId);
    if (index !== -1) {
      adminUsers.splice(index, 1);
      fs.writeFileSync(adminfile, JSON.stringify(adminUsers));
      bot.sendMessage(chatId, `User ${userId} Tidak Dapet Lagi Mengakses Fitur Owner`);
    } else {
      bot.sendMessage(chatId, `User ${userId} is not an admin user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});

bot.onText(/\/1gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "BOT", url: "https://t.me/Panelkitalegalbot" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /1gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "1gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "256";
  const cpu = "30";
  const disk = "1024";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
const data2 = await response2.json();
    
    // Wajib ditambah agar kamu tau error dari Pterodactyl kalau gagal lagi
    if (data2.errors) {
       console.log("ALASAN SERVER 1GB GAGAL DIBUAT:", JSON.stringify(data2.errors, null, 2));
    }

    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 
Jangan Ddos Server
Wajib tutup domain saat screenshot`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
// 2gb
bot.onText(/\/2gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "BOT", url: "https://t.me/Panelkitalegalbot" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /2gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "2gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "2048";
  const cpu = "60";
  const disk = "2048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}_${u}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 3gb
// 3gb
bot.onText(/\/3gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [[{ text: "OWNER", url: "@helpboosteryuk" }]],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /3gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "3gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "3072";
  const cpu = "90";
  const disk = "3072";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
 if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di data panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
       environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

|[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 4gb
bot.onText(/\/4gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [[{ text: "OWNER", url: "@helpboosteryuk" }]],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /4gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "4gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "4048";
  const cpu = "110";
  const disk = "4048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 
|[ RULES ]| :
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 5gb
bot.onText(/\/5gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /5gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "5gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "5048";
  const cpu = "140";
  const disk = "5048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

|[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.onText(/\/delsrv (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const srv = match[1].trim();

  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));

  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "Perintah hanya untuk Owner, OWNER Saya Untuk Menjadi Owner atau Users Premium...",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "OWNER", url: "https://t.me/dhanreal07" }],
          ],
        },
      }
    );
    return;
  }

  if (!srv) {
    bot.sendMessage(
      chatId,
      "Mohon masukkan ID server yang ingin dihapus, contoh: /delsrv 1234"
    );
    return;
  }

  try {
    let f = await fetch(domain + "/api/application/servers/" + srv, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "SERVER TIDAK ADA");
    } else {
      bot.sendMessage(chatId, "SUCCESFULLY DELETE SERVER");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 6gb
bot.onText(/\/6gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /6gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "6gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "6048";
  const cpu = "170";
  const disk = "6048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @dhanreal07`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 7gb
bot.onText(/\/7gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /7gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "7gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "7048";
  const cpu = "200";
  const disk = "7048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
       environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 8gb
bot.onText(/\/8gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /8gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "8gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "8048";
  const cpu = "230";
  const disk = "8048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 9gb
bot.onText(/\/9gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /9gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "9gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "9048";
  const cpu = "260";
  const disk = "9048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

|[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 10gb
bot.onText(/\/10gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /10gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "10gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "10000";
  const cpu = "290";
  const disk = "10000";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}
 |[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password} 

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
bot.onText(/\/11gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /10gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "10gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "11000";
  const cpu = "290";
  const disk = "10000";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const email = `${username}@Buyeradmin`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

|[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password}

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});

// unli
bot.onText(/\/unli (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));

  if (!isPremium) {
    return bot.sendMessage(chatId, "KHUSUS PREMIUM ❌", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
        ],
      },
    }); // <-- STOP semua eksekusi di sini
  }

  const t = text.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "Invalid format. Usage: /unli namapanel,idtele");
  }

  const username = t[0];
  const u = t[1];
  const name = username + "unli";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@Buyeraadmin`;
  const akunlo = settings.pp;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/npm start';
  const password = `${username}001`;
  let user;
  let server;

  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });

    const data = await response.json();

if (data.errors) {
      // Tambahkan console.log agar kamu tau apa error aslinya di console
      console.log("Pterodactyl API Error:", data.errors); 

      if (
        data.errors[0]?.meta?.rule === "unique" &&
        data.errors[0]?.meta?.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel Kyzz.");
      } else {
        bot.sendMessage(chatId, `Error: ${JSON.stringify(data.errors[0], null, 2)}`);
      }
      return;
    }

    user = data.attributes;

    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          MAIN_FILE: "index.js",
          NODE_PACKAGES: "",
          UNNODE_PACKAGES: "",
          GIT_ADDRESS: "",
          BRANCH: "",
          USERNAME: "",
          ACCESS_TOKEN: "",
          NODE_ARGS: ""
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }

  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );

    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

|[ DATA PANEL KAMU ]|
🌐 Login : ${domain}
👤 Username : ${user.username}
🔐 Password : ${password}

|[ RULES ]|
JANGAN DDOS SERVER 
WAJIB TUTUP DOMAIN SAAT SCREENSHOT
JNGAN BAGIKAN DOMAIN KE SIAPAPUN
JANGAN LUPA GANTI PASSWORD PANEL
ADMIN CUMA KASIH DATA 1X
NO RUSUH MAKASIH ITU AJA

CPANEL BY @helpboosteryuk`,
      });

      bot.sendMessage(chatId, "Data panel berhasil dikirim ke ID Telegram yang dimaksud.");
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// cadmin
bot.onText(/\/cadmin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "KHUSUS OWNER ❌",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "OWNER", url: "https://t.me/@helpboosteryuk" }],
          ],
        },
      }
    );
    return;
  }
  const commandParams = match[1].split(",");
  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();
  if (commandParams.length < 2) {
    bot.sendMessage(
      chatId,
      "Format Salah! Penggunaan: /cadmin namapanel,idtele"
    );
    return;
  }
  const password = panelName + "117";
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: `${panelName}@Buyeradmin`,
        username: panelName,
        first_name: panelName,
        last_name: "Memb",
        language: "en",
        root_admin: true,
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      bot.sendMessage(chatId, JSON.stringify(data.errors[0], null, 2));
      return;
    }
    const user = data.attributes;
    const userInfo = `
TYPE: user
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
    bot.sendMessage(
      telegramId,
      `
|[ INFO DATA ADMIN PANEL ]|
🌐  Login : ${domain}
👤  Username : ${user.username}
🔐  Password : ${password} 

|[ RULES ]| 
NO DDOS
NO CPU 90%
NO RUN BOT NET
NO INTIP SERVER
NO RUSUH
SIMPAN DATA BAIK" KARNA ADMIN CUMA NGIRIM DATA 1X

CADMIN BY  @helpboosteryuk
    `
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
fs.readFile(adminfile, (err, data) => {
  if (err) {
    console.error(err);
  } else {
    adminIDs = JSON.parse(data);
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// listsrv
bot.onText(/\/listsrv/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  // Check if the user is the Owner
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "KHUSUS OWNER ❌.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "OWNER", url: "https://t.me/  helpboosteryuk" }],
          ],
        },
      }
    );
    return;
  }
  let page = 1; // Mengubah penggunaan args[0] yang tidak didefinisikan sebelumnya
  try {
    let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
      // Menggunakan backticks untuk string literal
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    let res = await f.json();
    let servers = res.data;
    let messageText = "Daftar server aktif yang dimiliki:\n\n";
    for (let server of servers) {
      let s = server.attributes;

      let f3 = await fetch(
        `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${pltc}`,
          },
        }
      );
      let data = await f3.json();
      let status = data.attributes ? data.attributes.current_state : s.status;

      messageText += `ID Server: ${s.id}\n`;
      messageText += `Nama Server: ${s.name}\n`;
      messageText += `Status: ${status}\n\n`;
    }

    bot.sendMessage(chatId, messageText);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan dalam memproses permintaan.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// listadmin
bot.onText(/\/listadmin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "KHUSUS OWNER ❌",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "OWNER", url: "https://t.me/helpboosteryuk" }],
          ],
        },
      }
    );
    return;
  }
  let page = "1";
  try {
    let f = await fetch(`${domain}/api/application/users?page=${page}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    let res = await f.json();
    let users = res.data;
    let messageText = "Berikut list admin :\n\n";
    for (let user of users) {
      let u = user.attributes;
      if (u.root_admin) {
        messageText += `🆔 ID: ${u.id} - 🌟 Status: ${
          u.attributes?.user?.server_limit === null ? "Inactive" : "Active"
        }\n`;
        messageText += `${u.username}\n`;
        messageText += `${u.first_name} ${u.last_name}\n\n`;
        messageText += "By @helpboosteryuk";
      }
    }
    messageText += `Page: ${res.meta.pagination.current_page}/${res.meta.pagination.total_pages}\n`;
    messageText += `Total Admin: ${res.meta.pagination.count}`;
    const keyboard = [
      [
        {
          text: "🔙 BACK",
          callback_data: JSON.stringify({
            action: "back",
            page: parseInt(res.meta.pagination.current_page) - 1,
          }),
        },
        {
          text: "🔜 NEXT",
          callback_data: JSON.stringify({
            action: "next",
            page: parseInt(res.meta.pagination.current_page) + 1,
          }),
        },
      ],
    ];
    bot.sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
   
    //▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
    // batas akhir
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan dalam memproses permintaan.");
  }
});
