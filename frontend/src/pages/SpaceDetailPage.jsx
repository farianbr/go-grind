import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  UserPlus, 
  UserMinus, 
  Trash2,
  UserCheck,
  UserX,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";

import { 
  getSpaceById, 
  approveJoinRequest, 
  rejectJoinRequest, 
  leaveSpace, 
  deleteSpace,
  requestToJoinSpace 
} from "../lib/api";
import { capitalize } from "../lib/utils";
import useAuthUser from "../hooks/useAuthUser";

const SpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: space, isLoading } = useQuery({
    queryKey: ["space", id],
    queryFn: () => getSpaceById(id),
  });

  const { mutate: approveMutation } = useMutation({
    mutationFn: ({ spaceId, userId }) => approveJoinRequest(spaceId, userId),
    onSuccess: () => {
      toast.success("Request approved!");
      queryClient.invalidateQueries({ queryKey: ["space", id] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to approve");
    },
  });

  const { mutate: rejectMutation } = useMutation({
    mutationFn: ({ spaceId, userId }) => rejectJoinRequest(spaceId, userId),
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["space", id] });
    },
  });

  const { mutate: leaveMutation } = useMutation({
    mutationFn: leaveSpace,
    onSuccess: () => {
      toast.success("Left space");
      navigate("/spaces");
    },
  });

  const { mutate: deleteMutation } = useMutation({
    mutationFn: deleteSpace,
    onSuccess: () => {
      toast.success("Space deleted");
      navigate("/spaces");
    },
  });

  const { mutate: requestJoinMutation } = useMutation({
    mutationFn: requestToJoinSpace,
    onSuccess: () => {
      toast.success("Join request sent!");
      queryClient.invalidateQueries({ queryKey: ["space", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-bold mb-4">Space not found</h2>
        <button onClick={() => navigate("/spaces")} className="btn btn-primary">
          Back to Spaces
        </button>
      </div>
    );
  }

  const isCreator = space.creator._id === authUser._id;
  const isMember = space.members.some((member) => member._id === authUser._id);
  const hasPendingRequest = space.pendingRequests.some((user) => user._id === authUser._id);
  const isFull = space.members.length >= space.maxMembers;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/spaces")}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold">{space.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Space Info Card */}
            <div className="card bg-base-200">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div className="badge badge-primary">
                    <BookOpen className="size-3 mr-1" />
                    {capitalize(space.skill)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="size-4" />
                    {space.members.length}/{space.maxMembers} members
                  </div>
                </div>

                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-base-content/70">{space.description}</p>

                <div className="divider"></div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {isCreator ? (
                    <>
                      <button className="btn btn-success gap-2 flex-1 sm:flex-initial">
                        <Video className="size-5" />
                        Start Stream
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn btn-error gap-2"
                      >
                        <Trash2 className="size-5" />
                        Delete Space
                      </button>
                    </>
                  ) : isMember ? (
                    <>
                      <button className="btn btn-success gap-2 flex-1 sm:flex-initial">
                        <Video className="size-5" />
                        Join Stream
                      </button>
                      <button
                        onClick={() => leaveMutation(id)}
                        className="btn btn-ghost gap-2"
                      >
                        <UserMinus className="size-5" />
                        Leave Space
                      </button>
                    </>
                  ) : hasPendingRequest ? (
                    <button className="btn btn-disabled w-full">
                      Request Pending
                    </button>
                  ) : isFull ? (
                    <button className="btn btn-disabled w-full">
                      Space Full
                    </button>
                  ) : (
                    <button
                      onClick={() => requestJoinMutation(id)}
                      className="btn btn-primary gap-2 w-full"
                    >
                      <UserPlus className="size-5" />
                      Request to Join
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-4">
                  Members ({space.members.length})
                </h3>
                <div className="space-y-3">
                  {space.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
                    >
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          <img src={member.profilePic} alt={member.fullName} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{member.fullName}</h4>
                        {member.learningSkill && (
                          <p className="text-sm text-base-content/60">
                            Learning: {capitalize(member.learningSkill)}
                          </p>
                        )}
                      </div>
                      {member._id === space.creator._id && (
                        <div className="badge badge-primary">Creator</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator Info */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Created By</h3>
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full">
                      <img
                        src={space.creator.profilePic}
                        alt={space.creator.fullName}
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold">{space.creator.fullName}</h4>
                    {space.creator.learningSkill && (
                      <p className="text-sm text-base-content/60">
                        Learning: {capitalize(space.creator.learningSkill)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Requests - Only visible to creator */}
            {isCreator && space.pendingRequests.length > 0 && (
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-4">
                    Pending Requests ({space.pendingRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {space.pendingRequests.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
                      >
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            <img src={user.profilePic} alt={user.fullName} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {user.fullName}
                          </h4>
                          {user.learningSkill && (
                            <p className="text-xs text-base-content/60 truncate">
                              {capitalize(user.learningSkill)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              approveMutation({ spaceId: id, userId: user._id })
                            }
                            className="btn btn-success btn-xs btn-circle"
                            title="Approve"
                          >
                            <UserCheck className="size-3" />
                          </button>
                          <button
                            onClick={() =>
                              rejectMutation({ spaceId: id, userId: user._id })
                            }
                            className="btn btn-error btn-xs btn-circle"
                            title="Reject"
                          >
                            <UserX className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Delete Space?</h3>
              <p className="mb-4">
                Are you sure you want to delete this space? This action cannot be
                undone.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error"
                  onClick={() => {
                    deleteMutation(id);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowDeleteConfirm(false)}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceDetailPage;
