import { Navigate, useLocation } from "react-router-dom";
import { getToken, isTokenExpired, getUser } from "@/utils/tokenHelpers";

// JWT check: redirect to /login if no valid token.
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
