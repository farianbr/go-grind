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
import { Link } from "react-router";
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
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Meet New Grinders
            </h2>
            <p className="text-xs sm:text-sm opacity-70">
              Discover perfect focus partners based on your profile
            </p>
          </div>
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex justify-center py-8 sm:py-12">
          <span className="loading loading-spinner loading-md sm:loading-lg" />
        </div>
      ) : recommendedUsers.length === 0 ? (
        <div className="card bg-base-200 p-4 sm:p-6 text-center">
          <h3 className="font-semibold text-base sm:text-lg mb-2">
            No recommendations available
          </h3>
          <p className="text-sm text-base-content opacity-70">
            Check back later for new partners!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {recommendedUsers?.map((user) => {
            const requestId = outgoingRequestsMap.get(user._id);
            const hasRequestBeenSent = !!requestId;

            return (
              <div
                key={user._id}
                className="card bg-base-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="card-body p-4 sm:p-5 space-y-3 sm:space-y-4">
                  <Link to={`/profile/${user._id}`} className="flex items-center gap-2 sm:gap-3">
                    <div className="avatar size-12 sm:size-16 rounded-full overflow-hidden shrink-0">
                      <img src={user.profilePic} alt={user.fullName} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{user.fullName}</h3>
                      {user.location && (
                        <div className="flex items-center text-xs opacity-70 mt-1">
                          <MapPinIcon className="size-3 mr-1 shrink-0" />
                          <span className="truncate">{user.location}</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Languages and Skills */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-secondary text-xs">
                      {getLanguageFlag(user.nativeLanguage)}
                      Native: {capitalize(user.nativeLanguage)}
                    </span>
                    {user.learningSkill && (
                      <span className="badge badge-outline text-xs">
                        Focus: {capitalize(user.learningSkill)}
                      </span>
                    )}
                  </div>

                  {user.bio && <p className="text-xs sm:text-sm opacity-70 line-clamp-2">{user.bio}</p>}

                  {/* Action button */}
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm flex-1 mt-2 ${
                        hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                      } `}
                      onClick={() => sendRequestMutation(user._id)}
                      disabled={hasRequestBeenSent || isSending}
                    >
                      {hasRequestBeenSent ? (
                        <>
                          <CheckCircleIcon className="size-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Request Sent</span>
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="size-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Send Request</span>
                        </>
                      )}
                    </button>
                    {hasRequestBeenSent && (
                      <button
                        className="btn btn-ghost btn-circle btn-sm mt-2"
                        onClick={() => cancelRequestMutation(requestId)}
                        disabled={isCancelling}
                        aria-label="Cancel request"
                      >
                        <X className="h-4 w-4" />
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
