/**
 * Dịch vụ âm thanh & Giọng nói chỉ đường tiếng Việt chuẩn 100%
 *
 * Chiến lược 3 lớp đảm bảo KHÔNG BAO GIỜ bị phát giọng tiếng Anh:
 * 1. Offline First: Quét & phát trực tiếp các file MP3 tiếng Việt có sẵn trong `public/audio/`.
 * 2. Online Proxy: Nếu cụm từ mới, gọi qua `/api/tts?q=...` hoặc proxy Google TTS với referer hợp lệ.
 * 3. Chống phát tiếng Anh: Chỉ sử dụng window.speechSynthesis nếu tìm thấy giọng đọc có mã 'vi' / 'vietnamese'.
 *    Nếu máy tính (như Windows PC mặc định) không có giọng tiếng Việt, tuyệt đối không cho giọng tiếng Anh đọc tiếng Việt bồi!
 */

type MuteListener = (isMuted: boolean) => void;

function sanitizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

class VoiceGuidanceService {
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private isMuted: boolean = false;
  private listeners: Set<MuteListener> = new Set();
  private currentAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.isMuted = false;
  }

  // Phát tiếng chuông báo 'Ding' êm ái phong cách bệnh viện thông minh
  public playChime(freq: number = 660, duration: number = 0.22) {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Ignore
    }
  }

  // Khởi động Audio context ngay khi người dùng tương tác màn hình
  public unlockAudio() {
    this.isMuted = false;
    this.playChime(520, 0.08);
  }

  // Tìm URL file audio tiếng Việt tĩnh tương ứng (nếu có)
  private getLocalAudioUrl(text: string): string | null {
    const trimmed = text.trim();
    const map: Record<string, string> = {
      'rẽ trái': 'audio/re_trai.mp3',
      'rẽ phải': 'audio/re_phai.mp3',
      'đi thẳng': 'audio/di_thang.mp3',
      'bạn đã đến nơi': 'audio/da_den_noi.mp3',
      'đi vào thang máy': 'audio/di_vao_thang_may.mp3',
      'bắt đầu chỉ đường': 'audio/bat_dau_chi_duong.mp3',
      'bắt đầu mô phỏng đi thử': 'audio/bat_dau_di_thu.mp3',
      'chuẩn bị di chuyển': 'audio/chuan_bi_di_chuyen.mp3',
      'đã hoàn thành lộ trình': 'audio/da_ket_thuc_lo_trinh.mp3',
      'vui lòng chọn điểm đến': 'audio/vui_long_chon_diem_den.mp3',
    };

    const key = trimmed.toLowerCase();
    if (map[key]) return map[key];

    // Kiểm tra mẫu "Đã chọn [Tên phòng]"
    if (trimmed.startsWith('Đã chọn ') || trimmed.startsWith('đã chọn ')) {
      const roomPart = trimmed.substring(8).trim();
      const slug = sanitizeName(roomPart);
      if (slug) {
        return `audio/phong_${slug}.mp3`;
      }
    }

    return null;
  }

  // Phát âm thanh giọng nói chuẩn tiếng Việt 100%
  public speak(text: string, force: boolean = false) {
    if (this.isMuted || typeof window === 'undefined' || !text.trim()) {
      return;
    }

    const now = Date.now();
    // Chống lặp âm thanh dày đặc nếu cùng nội dung trong vòng 3.5 giây
    if (!force && this.lastSpokenText === text && now - this.lastSpokenTime < 3500) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    // Chuông ding nhẹ trước
    this.playChime(660, 0.16);

    // Dừng câu nói cũ đang phát nếu có
    this.stop();

    const localAudio = this.getLocalAudioUrl(text);

    if (localAudio) {
      // 1. ƯU TIÊN SỐ 1: File MP3 tiếng Việt chuẩn bản ngữ lưu sẵn trong public/audio/
      const audio = new Audio(localAudio);
      this.currentAudio = audio;
      audio.play().catch(() => {
        // Nếu load file nội bộ bị lỗi, thử fallback qua API Proxy
        this.playViaProxy(text);
      });
      return;
    }

    // 2. Cụm từ động: Sử dụng proxy `/api/tts`
    this.playViaProxy(text);
  }

  private playViaProxy(text: string) {
    try {
      const proxyUrl = `/api/tts?q=${encodeURIComponent(text)}`;
      const audio = new Audio(proxyUrl);
      this.currentAudio = audio;

      audio.play().catch(() => {
        // 3. Dự phòng cuối cùng: Web Speech API nhưng CHỈ KHI máy có giọng tiếng Việt thực sự
        this.fallbackWebSpeech(text);
      });
    } catch {
      this.fallbackWebSpeech(text);
    }
  }

  private fallbackWebSpeech(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      setTimeout(() => {
        try {
          const voices = window.speechSynthesis.getVoices();
          // QUAN TRỌNG: Chỉ dùng Web Speech nếu trình duyệt thực sự có giọng tiếng Việt!
          // Tuyệt đối không để giọng David/Zira (tiếng Anh) đọc tiếng Việt bồi.
          const viVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('vi') ||
              v.lang.toLowerCase().includes('vi-') ||
              v.name.toLowerCase().includes('vietnam') ||
              v.name.toLowerCase().includes('vietnamese')
          );

          if (!viVoice) {
            // Không có giọng tiếng Việt trên Windows/máy này -> Không phát để tránh đọc tiếng Anh bồi
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = viVoice.lang || 'vi-VN';
          utterance.voice = viVoice;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore
        }
      }, 25);
    } catch {
      // Ignore
    }
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.lastSpokenText = '';
  }

  public unmute() {
    this.isMuted = false;
    this.listeners.forEach((fn) => fn(false));
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    } else {
      this.playChime(660, 0.2);
    }
    this.listeners.forEach((fn) => fn(this.isMuted));
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public subscribe(listener: MuteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const voiceService = new VoiceGuidanceService();
