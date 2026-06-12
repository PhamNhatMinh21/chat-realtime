import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare } from 'lucide-react';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginWithToken } = useAuthStore();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            navigate('/login?error=' + error);
            return;
        }

        if (token) {
            loginWithToken(token, navigate);
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate, loginWithToken]);

    return (
        <div className="loading-screen" style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-color)" }}>
            <div className="loading-logo" style={{ marginBottom: "20px" }}>
                <MessageSquare size={32} color="white" />
            </div>
            <p className="loading-text" style={{ color: "var(--text-primary)" }}>Đang xác thực Google...</p>
        </div>
    );
}
