import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useUser } from "./useUsers";

import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";

import { domainColors } from "@/theme/tokens/domainColors";
import { formatDate } from "@/utils/formatDate";
import { resolveUploadUrl } from "@/utils/fileUrl";

// Module identity: indigo — Users is its own module.
const INDIGO = {
  icon: "bg-indigo-600",
  badge:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  ring: "ring-indigo-100 dark:ring-indigo-500/20",
};

const Icon = ({ children }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
  >
    {children}
  </svg>
);

const MailIcon = () => (
  <Icon>
    <path
      d="M2.5 5.5A1.5 1.5 0 0 1 4 4h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-9Z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M3 5.5 10 11l7-5.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path
      d="M4.5 3h2.4l1 3.6-1.7 1.3a9 9 0 0 0 4.4 4.4l1.3-1.7 3.6 1v2.4c0 .8-.7 1.4-1.5 1.3A13 13 0 0 1 3.2 4.5c-.1-.8.5-1.5 1.3-1.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </Icon>
);

const UserIcon = () => (
  <Icon>
    <circle
      cx="10"
      cy="7"
      r="3"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M3.5 17c1-3.3 4-5 6.5-5s5.5 1.7 6.5 5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </Icon>
);

const ClockIcon = () => (
  <Icon>
    <circle
      cx="10"
      cy="10"
      r="7"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M10 6v4l3 2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const CalendarIcon = () => (
  <Icon>
    <rect
      x="3"
      y="4.5"
      width="14"
      height="12"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M3 8h14M7 3v3M13 3v3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </Icon>
);

function Field({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {icon}

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="truncate text-sm text-slate-700 dark:text-slate-200">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { showToast } = useToast();

  const {
    data: user,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useUser(id);

  const [showImage, setShowImage] = useState(false);

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */
  if (isError || !user) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        User not found.
      </div>
    );
  }

  /*
   * ============================================================
   * ROLE
   * ============================================================
   *
   * The user's actual role decides which user list
   * should be opened.
   *
   * Admin:
   * /users/admins
   *
   * Employee:
   * /users/employees
   */
  const userRole = user?.role?.toLowerCase();

  /*
   * ============================================================
   * BACK PATH
   * ============================================================
   */
  const getBackPath = () => {
    if (userRole === "admin") {
      return "/users/admins";
    }

    if (userRole === "employee") {
      return "/users/employees";
    }

    /*
     * Fallback
     */
    return "/users/employees";
  };

  /*
   * ============================================================
   * BACK HANDLER
   * ============================================================
   */
  const handleBack = () => {
    navigate(getBackPath());
  };

  /*
   * ============================================================
   * EDIT PROFILE
   * ============================================================
   *
   * Pass the user's role to UserFormPage.
   *
   * This is important because UserFormPage uses
   * location.state?.role to know which list it came from.
   */
  const handleEditProfile = () => {
    navigate(`/users/${id}/edit`, {
      state: {
        role: userRole,
      },
    });
  };

  /*
   * ============================================================
   * ROLE STYLE
   * ============================================================
   */
  const roleStyle =
    domainColors.role[user.role] ||
    "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";

  /*
   * ============================================================
   * PROFILE IMAGE
   * ============================================================
   */
  const avatarSrc = resolveUploadUrl(
    user.profile_picture?.url
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ======================================================
          HEADER
          ====================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${INDIGO.icon}`}
          >
            <span className="font-bold">
              U
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              User Profile
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {user.username}
            </p>
          </div>
        </div>

        {/* Header Buttons */}
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            isLoading={isFetching}
            className="w-full sm:w-auto"
          >
            Refresh
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        </div>
      </div>

      {/* ======================================================
          PROFILE CARD
          ====================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {/* Avatar */}
          <button
            type="button"
            onClick={() => {
              if (avatarSrc) {
                setShowImage(true);
              }
            }}
            title={
              avatarSrc
                ? "View profile picture"
                : undefined
            }
            className={`rounded-full ring-4 ${INDIGO.ring} ${
              avatarSrc
                ? "cursor-pointer transition-opacity hover:opacity-90"
                : "cursor-default"
            }`}
          >
            <Avatar
              name={user.username}
              src={avatarSrc}
              size="lg"
            />
          </button>

          {/* User Name + Role */}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-white">
              {user.username}
            </h2>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge className={roleStyle}>
                {user.role}
              </Badge>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="sm:ml-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={handleEditProfile}
              className="w-full sm:w-auto"
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* ======================================================
          ACCOUNT INFORMATION
          ====================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Account
        </h3>

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field
            icon={<UserIcon />}
            label="Username"
            value={user.username}
          />

          <Field
            icon={<UserIcon />}
            label="Role"
            value={user.role}
          />

          <Field
            icon={<MailIcon />}
            label="Email"
            value={user.email}
          />

          <Field
            icon={<PhoneIcon />}
            label="Mobile"
            value={user.mobile}
          />

          <Field
            icon={<ClockIcon />}
            label="Last Login"
            value={formatDate(user.last_login)}
          />

          <Field
            icon={<CalendarIcon />}
            label="Created"
            value={formatDate(user.created_at)}
          />
        </div>
      </div>

      {/* ======================================================
          PROFILE IMAGE MODAL
          ====================================================== */}
      <Modal
        open={showImage}
        onClose={() => setShowImage(false)}
        title="Profile Picture"
        size="sm"
      >
        <img
          src={avatarSrc}
          alt={user.username}
          className="w-full rounded-lg object-cover"
        />
      </Modal>
    </div>
  );
}