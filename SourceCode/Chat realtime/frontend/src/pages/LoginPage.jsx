import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Eye, EyeOff, User, Lock } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import ThemeToggleBtn from "../components/ThemeToggleBtn";
import { BASE_URL } from "../lib/config";


export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuthStore();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) return setError("Vui lòng nhập đầy đủ thông tin");
    const result = await login(form, navigate);
    if (result && !result.success) setError(result.message);
  };

  return (
    <div className="auth-page">
      <ThemeToggleBtn />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MessageSquare size={30} color="white" />
          </div>
        </div>
        <h1 className="auth-title">Chào mừng trở lại!</h1>
        <p className="auth-subtitle">Đăng nhập để tiếp tục trò chuyện</p>

        {error && (
          <div style={{ background: "rgba(255,79,106,0.1)", border: "1px solid rgba(255,79,106,0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", color: "#ff4f6a", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input-wrap">
              <User className="form-input-icon" size={16} />
              <input className="form-input" type="text" placeholder="Nhập username của bạn"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="form-input-wrap">
              <Lock className="form-input-icon" size={16} />
              <input className="form-input" type={showPass ? "text" : "password"} placeholder="Nhập mật khẩu"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="form-input-right" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="auth-submit" disabled={isLoggingIn}>
            {isLoggingIn ? <><span className="spinner" /> Đang đăng nhập...</> : "Đăng nhập"}
          </button>
        </form>

        <div className="auth-separator">
          <span>Hoặc</span>
        </div>
        
        <button type="button" className="google-auth-btn" onClick={() => window.location.href = `${BASE_URL}/api/auth/google`}>
          <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.42-4.69H24v9.09h12.75c-.53 2.87-2.14 5.3-4.57 6.93l7.08 5.49C43.42 37.32 46.5 31.22 46.5 24z"/>
            <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.08-5.49c-1.97 1.36-4.47 2.18-8.81 2.18-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Đăng nhập bằng Google
        </button>

        <p className="auth-footer">
          Chưa có tài khoản?{" "}
          <span className="auth-link" onClick={() => navigate("/signup")}>Đăng ký ngay</span>
        </p>
      </div>
    </div>
  );
}
