import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/components/feedback/Toast";
import Avatar from "@/components/ui/Avatar";
import Dropdown from "@/components/ui/Dropdown";
import EditProfileModal from "@/features/users/EditProfileModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearToken } from "@/utils/tokenHelpers";
import { resolveUploadUrl } from "@/utils/fileUrl";

export default function Topbar() {
  const { toggleSidebar } = useUI();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  // Self-service profile link: employees land on their own employee record,
  // admins always land on their user profile (an admin account is never an
  // employee record, even if one happens to be linked in the data).
  const profilePath =
    user?.role === "employee" && user?.employee?.id
      ? `/employees/${user.employee.id}`
      : `/users/${user?.id}`;

  const handleLogout = () => {
    clearToken();
    showToast("Logged out successfully", "success");
    navigate("/login");
  };

  return (
    <header className="relative z-20 h-16 bg-white dark:bg-white/[0.03] dark:backdrop-blur-xl border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
          Welcome, {user?.username || "User"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Dropdown
          panelClassName="dark:backdrop-blur-none dark:bg-slate-900"
          trigger={
            <span className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <Avatar
                name={user?.username}
                src={resolveUploadUrl(user?.profile_picture?.url)}
                size="sm"
                className="ring-2 ring-primary-500/40 dark:ring-primary-400/40"
              />
              <span className="hidden sm:block text-left">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {user?.username}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role}
                </span>
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          }
        >
          {({ close }) => (
            <>
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1 border-b border-slate-200 dark:border-white/10">
                <Avatar
                  name={user?.username}
                  src={resolveUploadUrl(user?.profile_picture?.url)}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user?.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate(profilePath);
                  close();
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditOpen(true);
                  close();
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Edit Profile
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-white/10" />
              <button
                type="button"
                onClick={() => {
                  close();
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Sign Out
              </button>
            </>
          )}
        </Dropdown>
      </div>

      {editOpen && (
        <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} user={user} />
      )}
    </header>
  );
}
