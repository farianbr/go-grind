import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  cancelFriendRequest,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  sendFriendRequest,
} from "../lib/api";
import { getLanguageFlag } from "../components/FriendCard";
import { capitalize } from "../lib/utils.js";
import useAuthUser from "../hooks/useAuthUser.js";
const RecommendedFriends = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [outgoingRequestsMap, setOutgoingRequestsMap] = useState(new Map());

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { mutate: sendRequestMutation, isPending: isSending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      toast.success("Friend request sent!");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
    },
  });

  const { mutate: cancelRequestMutation, isPending: isCancelling } = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => {
      toast.success("Friend request cancelled");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  useEffect(() => {
    const requestsMap = new Map();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        requestsMap.set(req.recipient._id, req._id);
      });
    }
    setOutgoingRequestsMap(requestsMap);
  }, [outgoingFriendReqs, authUser]);
  return (
    <section>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Meet New Grinders
            </h2>
            <p className="opacity-70">
              Discover perfect learning partners based on your profile
            </p>
          </div>
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : recommendedUsers.length === 0 ? (
        <div className="card bg-base-200 p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">
            No recommendations available
          </h3>
          <p className="text-base-content opacity-70">
            Check back later for new partners!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedUsers?.map((user) => {
            const requestId = outgoingRequestsMap.get(user._id);
            const hasRequestBeenSent = !!requestId;

            return (
              <div
                key={user._id}
                className="card bg-base-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="card-body p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar size-16 rounded-full overflow-hidden">
                      <img src={user.profilePic} alt={user.fullName} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">{user.fullName}</h3>
                      {user.location && (
                        <div className="flex items-center text-xs opacity-70 mt-1">
                          <MapPinIcon className="size-3 mr-1" />
                          {user.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Languages and Skills */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-secondary">
                      {getLanguageFlag(user.nativeLanguage)}
                      Native: {capitalize(user.nativeLanguage)}
                    </span>
                    {user.learningSkill && (
                      <span className="badge badge-outline">
                        📚 Learning: {capitalize(user.learningSkill)}
                      </span>
                    )}
                  </div>

                  {user.bio && <p className="text-sm opacity-70">{user.bio}</p>}

                  {/* Action button */}
                  <div className="flex gap-2">
                    <button
                      className={`btn flex-1 mt-2 ${
                        hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                      } `}
                      onClick={() => sendRequestMutation(user._id)}
                      disabled={hasRequestBeenSent || isSending}
                    >
                      {hasRequestBeenSent ? (
                        <>
                          <CheckCircleIcon className="size-4 mr-2" />
                          Request Sent
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="size-4 mr-2" />
                          Send Friend Request
                        </>
                      )}
                    </button>
                    {hasRequestBeenSent && (
                      <button
                        className="btn btn-ghost btn-circle mt-2"
                        onClick={() => cancelRequestMutation(requestId)}
                        disabled={isCancelling}
                        aria-label="Cancel request"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecommendedFriends;
