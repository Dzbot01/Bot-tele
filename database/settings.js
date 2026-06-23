const settings = {
  token: '8218162598:AAFi5T-8a0sZ4lska5EbRmIbIwRHFHIANsM',
  adminId: '7009592389', 
  pp: 'https://cdn.phototourl.com/free/2026-04-10-466b4dc1-3abf-4c2d-b7d1-e626a6cf0e2c.png',
urladmin: 'https://t.me/helpboosteryuk',
assemblyApiKey: "30cc65c70f5347baba64b0bfd769fa4d",

 // === SMM PANEL FAYUPEDIA ===
  smm: {
    baseUrl: 'https://fayupedia.id/api', // Base URL doang
    apiKey: '2mty8r-9byhur-otlsin-iir1gc-yedoe7', 
    apiId: '147506'
  },
  

vnPromo: {
        active: true,      // true = aktif, false = mati
        discount: 500      // Potongan harga (misal Rp 500)
    }, 
    
    heleket: {
        merchant: "ea2f3574-2c4f-4977-86dd-e7b7fbdd4be7", // Masukkan UUID Merchant kamu
        apiKey: "OolxDHAeGSDDT0OrgbZabZSMe2DSadilk0w9kMsWivLteoQiRsrvpn2llJxBm3UqAIC13MCrM5BjsH5uuXzPcwb8ycC44H1LUwWHoztziLJuV8nNGLipiubkZkjNOF4o",             // Masukkan API Key kamu
        kursUsd: 15800                               // Default mata uang fiat
    }, 

    // Konfigurasi Payment Gateway Pakasir
    pakasir: {
        slug: "dejet",
        apiKey: "qF3zQrTHPW1EDSFmPN3tcC58BY2t3p2Y",
        baseUrl: "https://app.pakasir.com/api"
    },
      // ==========================================
    // KONFIGURASI OPENSTACK HOSTVDS
    // ==========================================
    hostvds: {
        authUrl: "https://os-api.hostvds.com/identity/v3", 
        username: "hostvds-b8738e20-1b66-4144-84f6-1df6e3a362dc", 
        password: "GMU7iwRF3N1kwin2GMdG7AAXVmE", // Ganti dengan password asli Anda
        projectName: "hostvds-b8738e20-1b66-4144-84f6-1df6e3a362dc",
        domainId: "default",
        region: "eu-west2" 
    },
    // Gambar Banner Panel
    panelImage: "https://cdn.phototourl.com/free/2026-04-10-466b4dc1-3abf-4c2d-b7d1-e626a6cf0e2c.png", 

    //SERVER 1
  domain : 'https://panel.cekidku.my.id' , // domain
  plta: 'ptla_pfVSFwG1sLOzpgp5j6hmG9xDnAlFnMxHzvQhp4Ceytp', //  plta yang sesuai
  pltc: 'ptlc_Bsz0IugDCEFb0Rrr574qcCeDRZXcZmL4EHLClBwwMVB', // pltc yang sesuai
  
  //CREATE PANEL
  loc: '1', // Isi dengan lokasi yang diinginkan
  eggs: '15'
};

module.exports = settings;