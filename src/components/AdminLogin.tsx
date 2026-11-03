import { useState, useRef, useEffect, useMemo } from 'react';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

// Mã PIN mặc định là 7777 (hoặc 1234)
const DEFAULT_PIN = '7777';

export function AdminLogin({ onSuccess, onCancel }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Tạo danh sách các ngôi sao lấp lánh ngẫu nhiên
  const stars = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      x: (i * 23) % 100,
      y: (i * 37) % 100,
      size: (i % 3) * 1.2 + 1.5,
      opacity: ((i % 5) + 3) / 10,
      duration: ((i % 4) + 2) * 1.2,
      delay: (i % 5) * 0.7,
    }));
  }, []);

  // Tự động focus vào ô nhập số khi mở màn hình để bật bàn phím
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setErrorMsg('');

    if (val.length === 4) {
      if (val === DEFAULT_PIN || val === '1234') {
        onSuccess();
      } else {
        setErrorMsg('Mã PIN không chính xác. Vui lòng thử lại!');
        setTimeout(() => {
          setPin('');
        }, 400);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'radial-gradient(ellipse at 50% 30%, #111c38 0%, #060913 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* CSS Keyframes cho hiệu ứng sao lấp lánh chuyển động */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes floatAurora {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.15); }
        }
      `}</style>

      {/* Hiệu ứng hào quang nền vũ trụ nhẹ nhàng (Aurora Glow) */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: 500,
          height: 500,
          marginLeft: -250,
          marginTop: -250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(30, 58, 138, 0.05) 50%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          animation: 'floatAurora 12s ease-in-out infinite',
        }}
      />

      {/* Bầu trời sao lấp lánh (Twinkling Stars) */}
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: s.id % 4 === 0 ? '#38bdf8' : '#ffffff',
            boxShadow: s.id % 3 === 0 ? '0 0 6px rgba(56, 189, 248, 0.9)' : 'none',
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Nút Mũi Tên Quay Lại ở góc trên bên trái màn hình */}
      {onCancel && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          title="Quay lại bản đồ"
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            left: 'max(16px, env(safe-area-inset-left, 16px))',
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      )}

      {/* Toàn bộ bố cục hiển thị trực tiếp trên nền sao */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo Bệnh viện Quân Y 7A */}
        <div
          style={{
            width: 82,
            height: 82,
            borderRadius: 22,
            background: '#ffffff',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.25)',
            marginBottom: 20,
          }}
        >
          <img
            src="/logo.png"
            alt="Logo Bệnh Viện Quân Y 7A"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#f8fafc',
            margin: '0 0 8px',
            textAlign: 'center',
            letterSpacing: '-0.3px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          Đăng Nhập Quản Trị
        </h2>
        <p
          style={{
            fontSize: 14,
            color: '#94a3b8',
            margin: '0 0 32px',
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          Nhập mã PIN 4 số của bạn
        </p>

        {/* Khung nhập PIN: input ẩn kích hoạt bàn phím hệ thống (PC & Mobile) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'text',
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Input vô hình nhận phím từ PC hoặc bật bàn phím số Native trên Mobile */}
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={handleChange}
            autoFocus
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              cursor: 'text',
              zIndex: 2,
            }}
          />

          {/* 4 ô hiển thị ký tự mã PIN trực quan */}
          <div style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
            {[0, 1, 2, 3].map((idx) => {
              const char = pin[idx];
              const isFilled = Boolean(char);
              const isCurrent = pin.length === idx;
              return (
                <div
                  key={idx}
                  style={{
                    width: 52,
                    height: 58,
                    borderRadius: 16,
                    background: isFilled ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(8px)',
                    border: isCurrent
                      ? '2px solid #38bdf8'
                      : isFilled
                      ? '2px solid rgba(56, 189, 248, 0.7)'
                      : '1.5px solid rgba(255, 255, 255, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: showPassword ? 24 : 30,
                    fontWeight: 700,
                    color: '#f8fafc',
                    boxShadow: isFilled || isCurrent ? '0 0 20px rgba(56, 189, 248, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {char ? (showPassword ? char : '•') : ''}
                </div>
              );
            })}
          </div>

          {/* Nút Con Mắt bật/tắt xem mật khẩu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword(!showPassword);
              inputRef.current?.focus();
            }}
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={{
              position: 'absolute',
              right: 2,
              zIndex: 3,
              background: 'transparent',
              border: 'none',
              color: showPassword ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              borderRadius: 8,
              transition: 'color 0.15s',
            }}
          >
            {showPassword ? (
              // Icon mắt mở
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              // Icon mắt gạch chéo
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        </div>

        {/* Thông báo lỗi */}
        <div style={{ minHeight: 24, marginTop: 18, textAlign: 'center' }}>
          {errorMsg && (
            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>
              {errorMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
