import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "./useUsers";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import DetailList from "@/components/ui/DetailList";
import Modal from "@/components/ui/Modal";
import { domainColors } from "@/theme/tokens/domainColors";
import { formatDate } from "@/utils/formatDate";
import { resolveUploadUrl } from "@/utils/fileUrl";

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: user, isLoading, isError, isFetching, refetch } = useUser(id);
  const [showImage, setShowImage] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !user) {
    showToast("Failed to load user", "error");
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        User not found.
      </div>
    );
  }

  const roleStyle =
    domainColors.role[user.role] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
  const avatarSrc = resolveUploadUrl(user.profile_picture?.url);

  const rows = [
    { label: "Username", value: user.username },
    { label: "Email", value: user.email },
    { label: "Mobile", value: user.mobile || "-" },
    { label: "Role", value: user.role },
    { label: "Last Login", value: formatDate(user.last_login) },
    { label: "Created", value: formatDate(user.created_at) },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          User Profile
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            isLoading={isFetching}
            className="w-full sm:w-auto"
          >
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => navigate("/users")} className="w-full sm:w-auto">
            Back
          </Button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => avatarSrc && setShowImage(true)}
            title={avatarSrc ? "View profile picture" : undefined}
            className={`rounded-full ${avatarSrc ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-default"}`}
          >
            <Avatar name={user.username} src={avatarSrc} size="lg" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {user.username}
            </h2>
            <Badge className={roleStyle}>{user.role}</Badge>
          </div>
        </div>

        <DetailList rows={rows} />

        <div className="mt-6">
          <Button variant="secondary" onClick={() => navigate(`/users/${id}/edit`)}>
            Edit Profile
          </Button>
        </div>
      </div>

      <Modal open={showImage} onClose={() => setShowImage(false)} title="Profile Picture" size="sm">
        <img src={avatarSrc} alt={user.username} className="w-full rounded-lg object-cover" />
      </Modal>
    </div>
  );
}
