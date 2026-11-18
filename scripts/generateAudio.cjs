const https = require('https');
const fs = require('fs');
const path = require('path');

const audioDir = path.join(process.cwd(), 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Danh sách phòng từ sampleData
const sampleContent = fs.readFileSync(path.join(process.cwd(), 'src/data/sampleData.ts'), 'utf8');
const roomMatches = [...sampleContent.matchAll(/name:\s*'([^']+)'/g)].map(x => x[1]);
const uniqueRooms = Array.from(new Set(roomMatches));

const phrases = [
  // Lệnh điều hướng
  { id: 're_trai', text: 'Rẽ trái' },
  { id: 're_phai', text: 'Rẽ phải' },
  { id: 'di_thang', text: 'Đi thẳng' },
  { id: 'da_den_noi', text: 'Bạn đã đến nơi' },
  { id: 'di_vao_thang_may', text: 'Đi vào thang máy' },
  { id: 'bat_dau_chi_duong', text: 'Bắt đầu chỉ đường' },
  { id: 'bat_dau_di_thu', text: 'Bắt đầu mô phỏng đi thử' },
  { id: 'chuan_bi_di_chuyen', text: 'Chuẩn bị di chuyển' },
  { id: 'da_ket_thuc_lo_trinh', text: 'Đã hoàn thành lộ trình' },
  { id: 'vui_long_chon_diem_den', text: 'Vui lòng chọn điểm đến' }
];

function sanitize(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

uniqueRooms.forEach(room => {
  const fileKey = 'phong_' + sanitize(room);
  phrases.push({ id: fileKey, text: 'Đã chọn ' + room });
});

console.log('Tổng số câu âm thanh cần tạo:', phrases.length);

function downloadTts(item) {
  return new Promise((resolve) => {
    const dest = path.join(audioDir, item.id + '.mp3');
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      return resolve({ id: item.id, status: 'cached' });
    }
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + encodeURIComponent(item.text);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://translate.google.com/'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error('Failed:', item.id, res.statusCode);
        return resolve({ id: item.id, status: 'error' });
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve({ id: item.id, status: 'ok', size: fs.statSync(dest).size });
      });
    });
    req.on('error', (err) => {
      console.error('Req error:', item.id, err);
      resolve({ id: item.id, status: 'error' });
    });
  });
}

async function run() {
  for (let i = 0; i < phrases.length; i++) {
    const res = await downloadTts(phrases[i]);
    console.log(`[${i+1}/${phrases.length}] ${phrases[i].text} -> ${phrases[i].id}.mp3 (${res.status})`);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('Tất cả file âm thanh tiếng Việt đã được tạo hoàn tất trong public/audio!');
}

run();
