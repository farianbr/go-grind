import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, X, Search } from "lucide-react";
import toast from "react-hot-toast";

import {
  cancelFriendRequest,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  sendFriendRequest,
} from "../lib/api";
import { getLanguageFlag } from "../components/FriendCard";
import { capitalize } from "../lib/utils.js";
import { SKILLS } from "../constants";
import { Link } from "react-router";

const RecommendedFriends = () => {
  const queryClient = useQueryClient();

  const [outgoingRequestsMap, setOutgoingRequestsMap] = useState(new Map());
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

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
  }, [outgoingFriendReqs]);

  // Get unique locations from users
  const availableLocations = useMemo(() => {
    const locations = new Set();
    recommendedUsers.forEach((u) => {
      if (u.location) locations.add(u.location);
    });
    return Array.from(locations).sort();
  }, [recommendedUsers]);

  const filteredUsers = useMemo(() => {
    if (!recommendedUsers) return [];
    
    return recommendedUsers.filter((u) => {
      // Search filter
      const term = search.trim().toLowerCase();
      if (term) {
        const hay = [u.fullName, u.location, u.nativeLanguage, u.learningSkill, u.bio]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }

      // Skill filter
      if (selectedSkill && u.learningSkill?.toLowerCase() !== selectedSkill.toLowerCase()) {
        return false;
      }

      // Location filter
      if (selectedLocation && u.location !== selectedLocation) {
        return false;
      }

      return true;
    });
  }, [recommendedUsers, search, selectedSkill, selectedLocation]);

  return (
    <section>
      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Search */}
        <label className="input input-bordered w-full flex items-center gap-2">
          <Search className="size-4 opacity-70" />
          <input
            type="text"
            placeholder="Search by name, skill, or location..."
            className="grow text-sm sm:text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* Skill and Location Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="select select-bordered w-full sm:flex-1 text-sm"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            <option value="">All Skills</option>
            {SKILLS.map((skill) => (
              <option key={skill} value={skill.toLowerCase()}>
                {skill}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered w-full sm:flex-1 text-sm"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {(search || selectedSkill || selectedLocation) && (
            <button
              className="btn btn-ghost btn-sm sm:btn-md"
              onClick={() => {
                setSearch("");
                setSelectedSkill("");
                setSelectedLocation("");
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex justify-center py-8 sm:py-12">
          <span className="loading loading-spinner loading-md sm:loading-lg" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card bg-base-200 p-4 sm:p-6 text-center">
          <h3 className="font-semibold text-base sm:text-lg mb-2">
            No matches found
          </h3>
          <p className="text-sm text-base-content opacity-70">
            Try a different search term or check back later
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {filteredUsers?.map((user) => {
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
                    <Link
                      to={`/profile/${user._id}`}
                      className="btn btn-outline btn-sm mt-2"
                      aria-label="View profile"
                    >
                      View Profile
                    </Link>
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
