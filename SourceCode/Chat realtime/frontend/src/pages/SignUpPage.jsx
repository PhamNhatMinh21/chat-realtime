import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import ThemeToggleBtn from "../components/ThemeToggleBtn";
import { BASE_URL } from "../lib/config";


export default function SignUpPage() {
  const navigate = useNavigate();
  const { signup, isSigningUp } = useAuthStore();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.firstName || !form.lastName) return setError("Vui lòng nhập họ và tên");
    if (!form.username) return setError("Vui lòng nhập username");
    if (!form.email) return setError("Vui lòng nhập email");
    if (form.password.length < 6) return setError("Mật khẩu phải ít nhất 6 ký tự");
    const result = await signup(form, navigate);
    if (result && !result.success) setError(result.message);
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="auth-page">
      <ThemeToggleBtn />
      <div className="auth-card" style={{ width: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MessageSquare size={30} color="white" />
          </div>
        </div>
        <h1 className="auth-title">Tạo tài khoản mới</h1>
        <p className="auth-subtitle">Tham gia ChatSync để kết nối với mọi người</p>

        {error && (
          <div style={{ background: "rgba(255,79,106,0.1)", border: "1px solid rgba(255,79,106,0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", color: "#ff4f6a", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tên</label>
              <div className="form-input-wrap">
                <User className="form-input-icon" size={16} />
                <input className="form-input" placeholder="Tên" {...field("firstName")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Họ</label>
              <div className="form-input-wrap">
                <User className="form-input-icon" size={16} />
                <input className="form-input" placeholder="Họ" {...field("lastName")} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input-wrap">
              <User className="form-input-icon" size={16} />
              <input className="form-input" placeholder="Tên đăng nhập" {...field("username")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="form-input-wrap">
              <Mail className="form-input-icon" size={16} />
              <input className="form-input" type="email" placeholder="email@example.com" {...field("email")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="form-input-wrap">
              <Lock className="form-input-icon" size={16} />
              <input className="form-input" type={showPass ? "text" : "password"} placeholder="Ít nhất 6 ký tự" {...field("password")} />
              <button type="button" className="form-input-right" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="auth-submit" disabled={isSigningUp}>
            {isSigningUp ? <><span className="spinner" /> Đang tạo tài khoản...</> : "Tạo tài khoản"}
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
          Đã có tài khoản?{" "}
          <span className="auth-link" onClick={() => navigate("/login")}>Đăng nhập</span>
        </p>
      </div>
    </div>
  );
}
