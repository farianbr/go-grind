import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getFriendRequests,
  getOutgoingFriendReqs,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from "../lib/api";
import { Link } from "react-router";

const RequestRow = ({ user, caption, children }) => (
  <li className="flex items-center gap-3 py-3">
    <Link to={`/profile/${user._id}`} className="shrink-0">
      <img
        src={user.profilePic || "/blank-pp.png"}
        alt=""
        className="size-10 rounded-full object-cover"
      />
    </Link>
    <div className="min-w-0 flex-1">
      <Link
        to={`/profile/${user._id}`}
        className="font-medium text-sm truncate block hover:text-primary transition-colors"
      >
        {user.fullName}
      </Link>
      <p className="text-xs text-base-content/55 truncate">{caption}</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">{children}</div>
  </li>
);

const Empty = ({ children }) => (
  <p className="text-sm text-base-content/60 py-4">{children}</p>
);

const FriendRequestsPanel = () => {
  const queryClient = useQueryClient();

  const { data: friendRequestsData, isLoading: loadingIncoming } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const incoming = friendRequestsData?.incomingRequests || [];

  const { data: outgoing = [], isLoading: loadingOutgoing } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  // Each mutation's `variables` is the request id, so the spinner shows on the
  // row that was clicked rather than on every row at once.
  const {
    mutate: acceptReq,
    isPending: isAccepting,
    variables: acceptingId,
  } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success("Friend request accepted");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const {
    mutate: declineReq,
    isPending: isDeclining,
    variables: decliningId,
  } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => {
      toast.success("Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const {
    mutate: cancelReq,
    isPending: isCancelling,
    variables: cancellingId,
  } = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => {
      toast.success("Friend request cancelled");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
    },
  });

  const busy = (pending, id, target) => pending && id === target;

  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 my-2">
      <section className="min-w-0">
        <h3 className="font-semibold mb-1">Waiting on you</h3>
        <div className="border-t border-base-300">
          {loadingIncoming ? (
            <div className="py-4">
              <span className="loading loading-dots loading-sm" />
            </div>
          ) : incoming.length === 0 ? (
            <Empty>Nobody has asked to connect right now.</Empty>
          ) : (
            <ul className="divide-y divide-base-300">
              {incoming.map((req) => (
                <RequestRow
                  key={req._id}
                  user={req.sender}
                  caption="Wants to connect"
                >
                  <button
                    className="btn btn-primary btn-sm gap-1.5"
                    onClick={() => acceptReq(req._id)}
                    disabled={isAccepting || isDeclining}
                  >
                    {busy(isAccepting, acceptingId, req._id) ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Accept
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={() => declineReq(req._id)}
                    disabled={isAccepting || isDeclining}
                    aria-label={`Decline ${req.sender.fullName}`}
                  >
                    {busy(isDeclining, decliningId, req._id) ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </button>
                </RequestRow>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="min-w-0">
        <h3 className="font-semibold mb-1">Sent by you</h3>
        <div className="border-t border-base-300">
          {loadingOutgoing ? (
            <div className="py-4">
              <span className="loading loading-dots loading-sm" />
            </div>
          ) : outgoing.length === 0 ? (
            <Empty>You have no requests out.</Empty>
          ) : (
            <ul className="divide-y divide-base-300">
              {outgoing.map((req) => (
                <RequestRow
                  key={req._id}
                  user={req.recipient}
                  caption="Waiting for a reply"
                >
                  <button
                    className="btn btn-ghost btn-sm gap-1.5"
                    onClick={() => cancelReq(req._id)}
                    disabled={isCancelling}
                  >
                    {busy(isCancelling, cancellingId, req._id) && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Cancel
                  </button>
                </RequestRow>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default FriendRequestsPanel;
