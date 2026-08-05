const TOKEN_KEY = "hrms_access_token";
const USER_KEY = "hrms_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || null;

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Decode JWT payload (base64url). Returns null if invalid.
export const decodeJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Check if the stored token is expired (exp is in seconds).
export const isTokenExpired = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now();
};
