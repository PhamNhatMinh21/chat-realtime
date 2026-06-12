import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useSocketStore } from "./store/useSocketStore";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import { MessageSquare } from "lucide-react";

export default function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (authUser) connectSocket();
    else disconnectSocket();
  }, [authUser, connectSocket, disconnectSocket]);

  if (isCheckingAuth) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <MessageSquare size={32} color="white" />
        </div>
        <p className="loading-text">Loading ChatSync...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
      <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
      <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
