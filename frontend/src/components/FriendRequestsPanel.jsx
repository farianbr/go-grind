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

  const { mutate: acceptReq, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success("Friend request accepted");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const { mutate: declineReq, isPending: isDeclining } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => {
      toast.success("Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const { mutate: cancelReq, isPending: isCancelling } = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => {
      toast.success("Friend request cancelled");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 my-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Incoming Requests</h3>
        {loadingIncoming ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : incoming.length === 0 ? (
          <div className="card bg-base-200 p-4 h-24 text-center text-sm text-base-content/60">
            <span className="my-auto">No incoming requests</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {incoming.map((req) => (
              <div key={req._id} className="card bg-base-200 hover:bg-base-300 transition-colors">
                <div className="card-body p-3 flex flex-col items-center text-center gap-2">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring ring-primary ring-offset-base-100 ring-offset-2">
                      <img src={req.sender.profilePic} alt={req.sender.fullName} />
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="font-semibold text-sm truncate">{req.sender.fullName}</p>
                    <p className="text-xs text-base-content/60 mt-0.5">wants to connect</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <div className="flex gap-2 w-full">
                      <button
                        className="btn btn-success btn-sm flex-1"
                        onClick={() => acceptReq(req._id)}
                        disabled={isAccepting || isDeclining}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        className="btn btn-error btn-sm flex-1"
                        onClick={() => declineReq(req._id)}
                        disabled={isAccepting || isDeclining}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <Link 
                      to={`/profile/${req.sender._id}`} 
                      className="btn btn-primary btn-sm btn-outline w-full"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Outgoing Requests</h3>
        {loadingOutgoing ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : outgoing.length === 0 ? (
          <div className="card bg-base-200 p-4 h-24 text-center text-sm text-base-content/60">
            <span className="my-auto">No outgoing requests</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outgoing.map((req) => (
              <div key={req._id} className="card bg-base-200 hover:bg-base-300 transition-colors">
                <div className="card-body p-3 flex flex-col items-center text-center gap-2">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring ring-primary ring-offset-base-100 ring-offset-2">
                      <img src={req.recipient.profilePic} alt={req.recipient.fullName} />
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="font-semibold text-sm truncate">{req.recipient.fullName}</p>
                    <p className="text-xs text-base-content/60 mt-0.5">request sent</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <Link to={`/profile/${req.recipient._id}`} className="btn btn-primary btn-sm btn-outline w-full">
                      View Profile
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm w-full"
                      onClick={() => cancelReq(req._id)}
                      disabled={isCancelling}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequestsPanel;
