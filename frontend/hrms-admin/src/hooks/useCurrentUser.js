import { useState, useEffect } from "react";
import { getUser } from "@/utils/tokenHelpers";

const USER_UPDATED_EVENT = "hrms:user-updated";

// getUser() reads a localStorage snapshot once; components that render it
// directly at call time never re-render when it changes elsewhere (e.g.
// after an Edit Profile save). This hook subscribes to a same-tab custom
// event so the topbar/sidebar update immediately without a full reload.
export function useCurrentUser() {
  const [user, setUserState] = useState(() => getUser());

  useEffect(() => {
    const handler = () => setUserState(getUser());
    window.addEventListener(USER_UPDATED_EVENT, handler);
    return () => window.removeEventListener(USER_UPDATED_EVENT, handler);
  }, []);

  return user;
}

export function notifyUserUpdated() {
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}
