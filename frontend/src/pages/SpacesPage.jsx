import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Plus, Users, BookOpen, UserPlus, Radio, Search } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("my-spaces");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    skill: "",
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
      setFormData({ name: "", description: "", skill: "" });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create space");
    },
  });

  const { mutate: requestJoinMutation, isPending: isRequesting } = useMutation({
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

  // Separate spaces into my spaces and discover spaces
  const mySpaces = spaces.filter((space) => isUserInSpace(space));
  const discoverSpaces = spaces.filter((space) => !isUserInSpace(space));

  // Filter discover spaces
  const filteredDiscoverSpaces = discoverSpaces.filter((space) => {
    const matchesSkill = selectedSkill === "" || space.skill?.toLowerCase() === selectedSkill.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSkill && matchesSearch;
  });

  const SpaceCard = ({ space }) => {
    const isMember = isUserInSpace(space);
    const isPending = hasPendingRequest(space);
    const isCreator = space.creator._id === authUser._id;
    const activeStreamCount = space.activeStreams?.length || 0;

    return (
      <div className="card bg-base-200 hover:shadow-lg transition-shadow">
        <div className="card-body p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{space.name}</h3>
              <div className="badge badge-primary badge-sm">
                <BookOpen className="size-3 mr-1" />
                {capitalize(space.skill)}
              </div>
            </div>
            {isCreator && (
              <div className="badge badge-accent badge-sm">Creator</div>
            )}
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
                  className="rounded-full object-cover"
                />
              </div>
            </div>
            <div className="text-sm">
              <p className="font-medium">{space.creator.fullName}</p>
              <p className="text-xs opacity-60">Creator</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span>{space.members.length} members</span>
            </div>
            {isMember && activeStreamCount > 0 && (
              <div className="flex items-center gap-2 text-success">
                <Radio className="size-4" />
                <span>{activeStreamCount} streaming</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="card-actions justify-end pt-2">
            {isMember ? (
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
            ) : (
              <button
                onClick={() => requestJoinMutation(space._id)}
                className="btn btn-sm btn-primary w-full"
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <UserPlus className="size-4 mr-1" />
                    Request to Join
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-200 p-1">
              <button
                className={`tab ${activeTab === "my-spaces" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("my-spaces")}
              >
                My Spaces
                <span className="badge badge-sm ml-2">{mySpaces.length}</span>
              </button>
              <button
                className={`tab ${activeTab === "discover" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("discover")}
              >
                Discover
                <span className="badge badge-sm ml-2">{discoverSpaces.length}</span>
              </button>
            </div>

            {/* My Spaces Tab */}
            {activeTab === "my-spaces" && (
              <div className="space-y-4">
                {mySpaces.length === 0 ? (
                  <div className="card bg-base-200 p-8 text-center">
                    <Users className="size-12 mx-auto mb-3 text-base-content/40" />
                    <h3 className="text-lg font-semibold mb-2">No spaces yet</h3>
                    <p className="text-base-content/60 mb-4 text-sm">
                      Create or join a space to start learning together
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mySpaces.map((space) => (
                      <SpaceCard key={space._id} space={space} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Discover Spaces Tab */}
            {activeTab === "discover" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="form-control flex-1">
                    <label className="input input-bordered flex items-center gap-2">
                      <Search className="size-5 opacity-70" />
                      <input
                        type="text"
                        placeholder="Search spaces..."
                        className="grow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Skill Filter */}
                  <select
                    className="select select-bordered w-full sm:w-auto min-w-[200px]"
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                  >
                    <option value="">All Skills</option>
                    {SKILLS.map((skill) => (
                      <option key={skill} value={skill.toLowerCase()}>
                        {capitalize(skill)}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredDiscoverSpaces.length === 0 ? (
                  <div className="card bg-base-200 p-8 text-center">
                    <BookOpen className="size-12 mx-auto mb-3 text-base-content/40" />
                    <h3 className="text-lg font-semibold mb-2">No spaces found</h3>
                    <p className="text-base-content/60 text-sm">
                      {discoverSpaces.length === 0
                        ? ""
                        : "Try adjusting your search or filters"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscoverSpaces.map((space) => (
                      <SpaceCard key={space._id} space={space} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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
