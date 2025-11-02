import { Link } from "react-router";
import { LANGUAGE_TO_FLAG } from "../constants";
import { capitalize } from "../lib/utils";
import { MapPinIcon, UserMinus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unfriend } from "../lib/api";
import toast from "react-hot-toast";

const FriendCard = ({ friend, showUnfriend = true, showViewProfile = false }) => {
  const queryClient = useQueryClient();

  const { mutate: unfriendMutation, isPending } = useMutation({
    mutationFn: () => unfriend(friend._id),
    onSuccess: () => {
      toast.success("Unfriended successfully");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["recommendedUsers"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to unfriend");
    },
  });

  const handleUnfriend = () => {
    if (window.confirm(`Are you sure you want to unfriend ${friend.fullName}?`)) {
      unfriendMutation();
    }
  };

  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-3 sm:p-4">
        {/* USER INFO */}
        <Link to={`/profile/${friend._id}`} className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 hover:opacity-80 transition-opacity">
          <div className="avatar size-12 sm:size-16 rounded-full overflow-hidden shrink-0">
            <img src={friend.profilePic} alt={friend.fullName} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{friend.fullName}</h3>
            {friend.location && (
              <div className="flex items-center text-xs opacity-70 mt-1">
                <MapPinIcon className="size-3 mr-1 shrink-0" />
                <span className="truncate">{friend.location}</span>
              </div>
            )}
          </div>
        </Link>

        <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
          <span className="badge badge-secondary badge-xs sm:badge-sm">
            {getLanguageFlag(friend.nativeLanguage)}
            Native: {capitalize(friend.nativeLanguage)}
          </span>
          {friend.learningSkill && (
            <span className="badge badge-outline badge-xs sm:badge-sm">
              Focus: {capitalize(friend.learningSkill)}
            </span>
          )}
        </div>
        {friend.bio && <p className="text-xs sm:text-sm opacity-70 line-clamp-2">{friend.bio}</p>}

        <div className="flex gap-2 mt-3 sm:mt-4">
          <Link to={`/chats/${friend._id}`} className="btn btn-outline btn-sm flex-1">
            Message
          </Link>

          {showViewProfile && (
            <Link to={`/profile/${friend._id}`} className="btn btn-primary btn-sm">
              View Profile
            </Link>
          )}

          {showUnfriend && !showViewProfile && (
            <button
              onClick={handleUnfriend}
              className="btn btn-ghost btn-circle btn-sm"
              disabled={isPending}
              title="Unfriend"
            >
              {isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <UserMinus className="size-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default FriendCard;

// eslint-disable-next-line react-refresh/only-export-components
export function getLanguageFlag(language) {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
      />
    );
  }
  return null;
}
