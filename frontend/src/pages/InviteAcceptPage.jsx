import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import toast from "react-hot-toast";

import { acceptTeamInvite } from "../lib/api";

/**
 * Landing point for a shared invite link. The route sits behind auth, so an
 * invitee without an account signs up first and arrives here afterwards.
 */
const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: acceptTeamInvite,
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamInvites"] });
      toast.success(`You're in ${team.name}.`);
      navigate(`/teams/${team._id}`, { replace: true });
    },
  });

  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      mutate(token);
    }
  }, [token, mutate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card bg-base-200 border border-base-300 max-w-md w-full">
        <div className="card-body items-center text-center gap-3 p-8">
          <Building2 className="size-8 text-primary" />
          {isPending && (
            <>
              <h1 className="text-lg font-bold">Joining the team…</h1>
              <span className="loading loading-spinner" />
            </>
          )}
          {isError && (
            <>
              <h1 className="text-lg font-bold">This invite didn&apos;t work</h1>
              <p className="text-sm text-base-content/70">
                {error?.response?.data?.message ??
                  "The link may have expired or been withdrawn."}
              </p>
              <button
                onClick={() => navigate("/teams")}
                className="btn btn-primary btn-sm mt-2"
              >
                Go to teams
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
