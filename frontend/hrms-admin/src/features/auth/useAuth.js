import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { setToken, setUser, clearToken } from "@/utils/tokenHelpers";

export function useLogin() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: (res) => {
      const { access_token, user } = res.data;
      setToken(access_token);
      setUser(user);
      navigate("/dashboard");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload) => authApi.register(payload),
    onSuccess: () => {
      navigate("/login");
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  return () => {
    clearToken();
    navigate("/login");
  };
}
