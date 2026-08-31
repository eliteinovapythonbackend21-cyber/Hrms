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

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-[18px] w-[18px]"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-3.5 w-3.5"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const EditIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export default function Topbar() {
  const { toggleSidebar } = useUI();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const user = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);

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
    <header className="relative z-20 h-16 shrink-0 bg-white/90 dark:bg-[#080c17]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between px-4 lg:px-6">
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-slate-400 dark:text-slate-500">
              Workspace
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              HR Management
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        {/* SEARCH */}
        <button
          type="button"
          className="hidden md:flex items-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.035] px-3 text-slate-400 dark:text-slate-500 hover:border-primary-500/30 hover:text-primary-500 transition-all"
          title="Search"
        >
          <SearchIcon />
          <span className="text-xs font-medium">Search</span>
          <span className="ml-5 text-[10px] border border-slate-200 dark:border-white/10 rounded-md px-1.5 py-0.5">
            /
          </span>
        </button>

        {/* NOTIFICATION */}
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Notifications"
        >
          <BellIcon />

          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-[#080c17]" />
        </button>

        <div className="h-7 w-px bg-slate-200 dark:bg-white/10 mx-1" />

        {/* PROFILE */}
        <Dropdown
          panelClassName="dark:backdrop-blur-2xl dark:bg-[#0c0d12] border border-slate-200 dark:border-white/10 shadow-2xl"
          trigger={
            <span className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-slate-100 dark:hover:bg-white/[0.045] transition-colors cursor-pointer">
              <div className="relative">
                <Avatar
                  name={user?.username}
                  src={resolveUploadUrl(user?.profile_picture?.url)}
                  size="sm"
                  className="ring-2 ring-primary-500/20 dark:ring-primary-400/20"
                />

                <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white dark:border-[#080c17]" />
              </div>

              <span className="hidden sm:block text-left max-w-[130px]">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {user?.username || "User"}
                </span>

                <span className="block text-[10px] text-slate-500 dark:text-slate-500 capitalize truncate mt-0.5">
                  {user?.role || "Member"}
                </span>
              </span>

              <ChevronIcon />
            </span>
          }
        >
          {({ close }) => (
            <div className="w-64 py-1">
              {/* USER HEADER */}
              <div className="px-3 py-3">
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.035] border border-slate-200/70 dark:border-white/[0.06] p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar
                        name={user?.username}
                        src={resolveUploadUrl(
                          user?.profile_picture?.url
                        )}
                        size="md"
                      />

                      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c0d12]" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {user?.username || "User"}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {user?.email}
                      </p>

                      <div className="mt-1.5 inline-flex items-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-300 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                        {user?.role || "Member"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate(profilePath);
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500">
                    <UserIcon />
                  </span>
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(true);
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500">
                    <EditIcon />
                  </span>
                  <span>Edit Profile</span>
                </button>

                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/users/new");
                      close();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300">
                      <PlusIcon />
                    </span>
                    <span>Create Profile</span>
                  </button>
                )}
              </div>

              <div className="my-2 border-t border-slate-200 dark:border-white/10" />

              <div className="px-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                    <LogoutIcon />
                  </span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </Dropdown>
      </div>

      {editOpen && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          user={user}
        />
      )}
    </header>
  );
}