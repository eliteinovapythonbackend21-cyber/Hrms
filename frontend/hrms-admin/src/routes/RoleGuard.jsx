import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "@/utils/tokenHelpers";
import { getRouteRoles } from "./routePermissions";

// Admin-only / self-or-admin wrapper based on route permissions.
export default function RoleGuard({ children }) {
  const location = useLocation();
  const user = getUser();
  const allowedRoles = getRouteRoles(location.pathname);

  if (!allowedRoles) {
    // No entry -> allow all authenticated users.
    return children;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
