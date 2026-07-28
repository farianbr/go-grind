import { useQuery } from "@tanstack/react-query";

import { getActiveSoloSession } from "../lib/api";
import useAuthUser from "./useAuthUser";

/**
 * The one source of truth for "is this person mid-session right now".
 *
 * Shared by the dashboard, the nav and the session page so they can never
 * disagree — the dashboard used to offer "Start a session" to someone who
 * already had one running.
 */
export function useActiveSession() {
  const { authUser } = useAuthUser();

  const { data: session, isLoading } = useQuery({
    queryKey: ["soloSession"],
    queryFn: getActiveSoloSession,
    enabled: !!authUser,
    // Another tab may have started or finished a session.
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const onBreak = Boolean(session?.breaks?.some((b) => !b.endedAt));

  return { session, isActive: Boolean(session), onBreak, isLoading };
}

export default useActiveSession;
