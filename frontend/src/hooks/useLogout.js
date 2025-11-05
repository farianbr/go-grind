import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem("token");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
