import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "../lib/api";
import useAuthUser from "./useAuthUser";

export const useNotificationUnreadCount = () => {
  const { authUser } = useAuthUser();

  const { data } = useQuery({
    queryKey: ["notificationUnreadCount"],
    queryFn: getUnreadCount,
    enabled: !!authUser,
    refetchInterval: 10000,
  });

  return data?.count || 0;
};
