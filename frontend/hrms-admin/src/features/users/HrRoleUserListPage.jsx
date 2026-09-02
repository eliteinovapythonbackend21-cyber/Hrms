import { useParams } from "react-router-dom";
import { HR_SUB_ROLES } from "@/constants/roles";
import UserListPage from "./UserListPage";

// Maps a URL-safe slug (e.g. "hr-director") back to the exact role name
// stored on the user (e.g. "HR Director") so the sidebar's HR section can
// link to a role-filtered Users list without a dedicated route per role.
const slugify = (role) => role.toLowerCase().replace(/\s+/g, "-");
const ROLE_BY_SLUG = Object.fromEntries(HR_SUB_ROLES.map((role) => [slugify(role), role]));

export default function HrRoleUserListPage() {
  const { roleSlug } = useParams();
  const role = ROLE_BY_SLUG[roleSlug];
  if (!role) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 transition-opacity duration-300 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Unknown role.
      </div>
    );
  }
  return <UserListPage role={role} />;
}
