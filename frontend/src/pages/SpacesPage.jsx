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
      <div className="card bg-base-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-base-300">
        <div className="card-body p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg mb-1.5 line-clamp-2">
                {space.name}
              </h3>
              <div className="badge badge-primary badge-sm">
                <BookOpen className="size-3 mr-1" />
                {capitalize(space.skill)}
              </div>
            </div>
            {isCreator && (
              <div className="badge badge-accent badge-sm shrink-0">Creator</div>
            )}
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm opacity-70 line-clamp-2">
            {space.description}
          </p>

          {/* Creator */}
          <div className="flex items-center gap-2">
            <div className="avatar">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-base-300">
                <img
                  src={space.creator.profilePic}
                  alt={space.creator.fullName}
                  className="rounded-full object-cover"
                />
              </div>
            </div>
            <div className="text-xs sm:text-sm min-w-0 flex-1">
              <p className="font-medium truncate">{space.creator.fullName}</p>
              <p className="text-xs opacity-60">Creator</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm pt-2 border-t border-base-300">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="size-3.5 sm:size-4" />
              <span>{space.members.length} members</span>
            </div>
            {isMember && activeStreamCount > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-success">
                <Radio className="size-3.5 sm:size-4" />
                <span>{activeStreamCount} streaming</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="card-actions justify-end pt-2">
            {isMember ? (
              <button
                onClick={() => navigate(`/spaces/${space._id}`)}
                className="btn btn-sm sm:btn-md btn-success w-full gap-1.5 sm:gap-2"
              >
                Open Space
              </button>
            ) : isPending ? (
              <button className="btn btn-sm sm:btn-md btn-disabled w-full">
                Request Pending
              </button>
            ) : (
              <button
                onClick={() => requestJoinMutation(space._id)}
                className="btn btn-sm sm:btn-md btn-primary w-full gap-1.5 sm:gap-2"
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <UserPlus className="size-3.5 sm:size-4" />
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="container mx-auto  space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Spaces
            </h1>
            <p className="text-sm sm:text-base text-base-content/60 mt-1">
              Join or create spaces to grind together
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm sm:btn-md gap-2 w-full sm:w-auto"
          >
            <Plus className="size-4 sm:size-5" />
            Create Space
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs tabs-box bg-base-200 p-1 w-full sm:w-auto inline-flex">
              <button
                className={`tab tab-sm sm:tab-md ${activeTab === "my-spaces" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("my-spaces")}
              >
                <span >My Spaces</span>
                <span className="badge badge-sm ml-1.5 sm:ml-2">{mySpaces.length}</span>
              </button>
              <button
                className={`tab tab-sm sm:tab-md ${activeTab === "discover" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("discover")}
              >
                Discover Spaces
                <span className="badge badge-sm ml-1.5 sm:ml-2">{discoverSpaces.length}</span>
              </button>
            </div>

            {/* My Spaces Tab */}
            {activeTab === "my-spaces" && (
              <div className="space-y-4">
                {mySpaces.length === 0 ? (
                  <div className="card bg-base-200 p-6 sm:p-8 lg:p-12 text-center">
                    <Users className="size-10 sm:size-12 mx-auto mb-3 text-base-content/40" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">No spaces yet</h3>
                    <p className="text-xs sm:text-sm text-base-content/60 mb-4">
                      Create or join a space to start grinding together
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
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
                  <div className="flex-1">
                    <label className="input input-sm sm:input-md flex items-center gap-2 w-full">
                      <Search className="size-4 sm:size-5 opacity-70" />
                      <input
                        type="text"
                        id="space-search"
                        placeholder="Search spaces..."
                        className="grow text-sm sm:text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Skill Filter */}
                  <select
                    className="select select-sm sm:select-md w-full sm:w-auto sm:min-w-[200px]"
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
                  <div className="card bg-base-200 p-6 sm:p-8 lg:p-12 text-center">
                    <BookOpen className="size-10 sm:size-12 mx-auto mb-3 text-base-content/40" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">No spaces found</h3>
                    <p className="text-xs sm:text-sm text-base-content/60">
                      {discoverSpaces.length === 0
                        ? "Come back later to find available spaces"
                        : "Try adjusting your search or filters"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {filteredDiscoverSpaces.map((space) => (
                      <SpaceCard key={space._id} space={space} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Space Modal */}
      {showCreateModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg sm:text-xl mb-4">
              Create New Space
            </h3>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <fieldset className="fieldset">
                <label className="label" htmlFor="space-name">
                  Space Name
                </label>
                <input
                  id="space-name"
                  type="text"
                  placeholder="e.g., JavaScript Mastery Group"
                  className="input input-sm sm:input-md w-full"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isCreating}
                />
              </fieldset>

              <fieldset className="fieldset">
                <label className="label" htmlFor="space-description">
                  Description
                </label>
                <textarea
                  id="space-description"
                  placeholder="What will you focus on together?"
                  className="textarea h-20 sm:h-24 text-sm sm:text-base w-full"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={isCreating}
                />
              </fieldset>

              <fieldset className="fieldset">
                <label className="label" htmlFor="space-skill">
                  Skill Focus
                </label>
                <select
                  id="space-skill"
                  className="select select-sm sm:select-md w-full"
                  value={formData.skill}
                  onChange={(e) =>
                    setFormData({ ...formData, skill: e.target.value })
                  }
                  disabled={isCreating}
                >
                  <option value="">Select a skill</option>
                  {SKILLS.map((skill) => (
                    <option key={skill} value={skill.toLowerCase()}>
                      {skill}
                    </option>
                  ))}
                </select>
              </fieldset>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm sm:btn-md"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm sm:btn-md"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creating...
                    </>
                  ) : (
                    "Create Space"
                  )}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCreateModal(false)} disabled={isCreating}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default SpacesPage;
