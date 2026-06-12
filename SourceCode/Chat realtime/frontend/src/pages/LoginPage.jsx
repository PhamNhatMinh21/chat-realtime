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
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" width="20" height="20" style={{ width: '20px', height: '20px', flexShrink: 0, objectFit: 'contain' }} />
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
