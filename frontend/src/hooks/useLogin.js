import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../lib/api";

const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Store token in localStorage as fallback for mobile browsers
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
