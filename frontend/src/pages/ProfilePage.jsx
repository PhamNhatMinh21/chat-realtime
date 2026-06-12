import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";


const ProfilePage = () => {
  const { authUser } = useAuthStore();

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="glass-panel p-6 rounded-lg space-y-8">
          <div className="text-center">
            <h1 className="h1">Profile</h1>
            <p className="mt-2 text-muted">Your profile information</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-4xl text-white font-bold mb-4">
                 {authUser?.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5 pt-4">
              <div className="text-sm text-secondary flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                Username
              </div>
              <p className="px-4 py-2 bg-alt rounded-md border border-color">{authUser?.username}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-secondary flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2 bg-alt rounded-md border border-color">{authUser?.email}</p>
            </div>
          </div>

          <div className="mt-6 bg-alt rounded-md p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-color">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0] || "Just now"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-success">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
