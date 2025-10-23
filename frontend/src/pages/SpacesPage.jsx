import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Plus, Users, BookOpen, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { getAllSpaces, createSpace, requestToJoinSpace } from "../lib/api";
import { SKILLS } from "../constants";
import { capitalize } from "../lib/utils";
import useAuthUser from "../hooks/useAuthUser";

const SpacesPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    skill: "",
    maxMembers: 10,
  });

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: getAllSpaces,
  });

  const { mutate: createSpaceMutation, isPending: isCreating } = useMutation({
    mutationFn: createSpace,
    onSuccess: () => {
      toast.success("Space created successfully!");
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setShowCreateModal(false);
      setFormData({ name: "", description: "", skill: "", maxMembers: 10 });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create space");
    },
  });

  const { mutate: requestJoinMutation } = useMutation({
    mutationFn: requestToJoinSpace,
    onSuccess: () => {
      toast.success("Join request sent!");
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send request");
    },
  });

  const handleCreateSpace = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.skill) {
      toast.error("Please fill all fields");
      return;
    }
    createSpaceMutation(formData);
  };

  const isUserInSpace = (space) => {
    return space.members.some((member) => member._id === authUser._id);
  };

  const hasPendingRequest = (space) => {
    return space.pendingRequests.some((user) => user._id === authUser._id);
  };

  const isSpaceFull = (space) => {
    return space.members.length >= space.maxMembers;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Learning Spaces
            </h1>
            <p className="text-base-content/60 mt-1">
              Join or create study groups to learn together
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary gap-2"
          >
            <Plus className="size-5" />
            Create Space
          </button>
        </div>

        {/* Spaces Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : spaces.length === 0 ? (
          <div className="card bg-base-200 p-12 text-center">
            <Users className="size-16 mx-auto mb-4 text-base-content/40" />
            <h3 className="text-xl font-semibold mb-2">No spaces yet</h3>
            <p className="text-base-content/60 mb-4">
              Be the first to create a learning space!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary mx-auto"
            >
              <Plus className="size-5 mr-2" />
              Create Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => {
              const isMember = isUserInSpace(space);
              const isPending = hasPendingRequest(space);
              const isFull = isSpaceFull(space);
              const isCreator = space.creator._id === authUser._id;

              return (
                <div
                  key={space._id}
                  className="card bg-base-200 hover:shadow-lg transition-shadow"
                >
                  <div className="card-body p-5 space-y-4">
                    {/* Header */}
                    <div>
                      <h3 className="font-bold text-lg mb-1">{space.name}</h3>
                      <div className="badge badge-primary badge-sm">
                        <BookOpen className="size-3 mr-1" />
                        {capitalize(space.skill)}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm opacity-70 line-clamp-2">
                      {space.description}
                    </p>

                    {/* Creator */}
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          <img
                            src={space.creator.profilePic}
                            alt={space.creator.fullName}
                          />
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{space.creator.fullName}</p>
                        <p className="text-xs opacity-60">Creator</p>
                      </div>
                    </div>

                    {/* Members count */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="size-4" />
                      <span>
                        {space.members.length}/{space.maxMembers} members
                      </span>
                      {isFull && (
                        <span className="badge badge-error badge-xs ml-auto">
                          Full
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="card-actions justify-end pt-2">
                      {isCreator ? (
                        <button
                          onClick={() => navigate(`/spaces/${space._id}`)}
                          className="btn btn-sm btn-outline w-full"
                        >
                          Manage Space
                        </button>
                      ) : isMember ? (
                        <button
                          onClick={() => navigate(`/spaces/${space._id}`)}
                          className="btn btn-sm btn-success w-full"
                        >
                          Open Space
                        </button>
                      ) : isPending ? (
                        <button className="btn btn-sm btn-disabled w-full">
                          Request Pending
                        </button>
                      ) : isFull ? (
                        <button className="btn btn-sm btn-disabled w-full">
                          Space Full
                        </button>
                      ) : (
                        <button
                          onClick={() => requestJoinMutation(space._id)}
                          className="btn btn-sm btn-primary w-full"
                        >
                          <UserPlus className="size-4 mr-1" />
                          Request to Join
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Space Modal */}
        {showCreateModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Create New Space</h3>
              <form onSubmit={handleCreateSpace} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Space Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., JavaScript Mastery Group"
                    className="input input-bordered"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    placeholder="What will you learn together?"
                    className="textarea textarea-bordered h-24"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Skill Focus</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.skill}
                    onChange={(e) =>
                      setFormData({ ...formData, skill: e.target.value })
                    }
                  >
                    <option value="">Select a skill</option>
                    {SKILLS.map((skill) => (
                      <option key={skill} value={skill.toLowerCase()}>
                        {skill}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Max Members</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    className="input input-bordered"
                    value={formData.maxMembers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxMembers: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Space"
                    )}
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowCreateModal(false)}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacesPage;
