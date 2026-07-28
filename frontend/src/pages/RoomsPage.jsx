import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Building2, UserPlus, Search, DoorOpen } from "lucide-react";
import toast from "react-hot-toast";

import { getAllRooms, createRoom, requestToJoinRoom } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

// Rooms with people in them come first. A directory sorted by creation date
// buries the only rooms worth walking into right now.
const byLiveliness = (a, b) =>
  (b.activeStreams?.length || 0) - (a.activeStreams?.length || 0) ||
  (b.members?.length || 0) - (a.members?.length || 0);

const RoomsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scope, setScope] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    joinPolicy: "open",
  });

  // The tab lives in the URL so a link can point straight at the public
  // directory instead of dropping people on their own empty room list.
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: getAllRooms,
  });

  const { mutate: createRoomMutation, isPending: isCreating } = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      toast.success("Room created.");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowCreateModal(false);
      setFormData({ name: "", description: "", joinPolicy: "open" });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Couldn't create that room.");
    },
  });

  const {
    mutate: requestJoinMutation,
    isPending: isRequesting,
    variables: joiningRoomId,
  } = useMutation({
    mutationFn: requestToJoinRoom,
    onSuccess: (data) => {
      toast.success(data?.message ?? "Join request sent!");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["myRooms"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send request");
    },
  });

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.description.trim().length < 30) {
      toast.error("Add a name and describe the room in at least 30 characters");
      return;
    }
    createRoomMutation(formData);
  };

  const isUserInRoom = (room) =>
    room.members.some((member) => member._id === authUser._id);

  const hasPendingRequest = (room) =>
    (room.pendingRequests || []).some(
      (user) => String(user?._id ?? user) === authUser._id
    );

  const myRooms = rooms.filter(isUserInRoom).sort(byLiveliness);
  const discoverRooms = rooms.filter((room) => !isUserInRoom(room));

  const requested = searchParams.get("tab");
  // A new account landing on an empty "My rooms" saw nothing on the page that
  // matters most, so the default follows what they actually have.
  const activeTab =
    requested === "discover" || requested === "my-rooms"
      ? requested
      : myRooms.length === 0
      ? "discover"
      : "my-rooms";
  const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });

  const filteredDiscoverRooms = discoverRooms
    .filter((room) => {
      const matchesScope =
        scope === "" || (scope === "team" ? Boolean(room.team) : !room.team);
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term === "" ||
        room.name.toLowerCase().includes(term) ||
        room.description.toLowerCase().includes(term);
      return matchesScope && matchesSearch;
    })
    .sort(byLiveliness);

  const RoomRow = ({ room }) => {
    const isMember = isUserInRoom(room);
    const isPending = hasPendingRequest(room);
    const isCreator = room.creator._id === authUser._id;
    const live = room.activeStreams?.length || 0;
    const needsApproval = room.joinPolicy === "approval";
    const joining = isRequesting && joiningRoomId === room._id;

    return (
      <li className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{room.name}</h3>
            {room.team ? (
              <span className="badge badge-sm badge-ghost gap-1 shrink-0">
                <Building2 className="size-3" />
                {room.team.name}
              </span>
            ) : (
              <span className="badge badge-sm badge-ghost gap-1 shrink-0">
                <DoorOpen className="size-3" />
                {needsApproval ? "Approval" : "Open to anyone"}
              </span>
            )}
            {isCreator && (
              <span className="text-[11px] uppercase tracking-wide text-base-content/45 shrink-0">
                Yours
              </span>
            )}
          </div>

          <p className="text-sm text-base-content/60 line-clamp-1 mt-0.5">
            {room.description}
          </p>

          <p className="text-xs text-base-content/45 mt-1.5 truncate">
            {room.members.length}{" "}
            {room.members.length === 1 ? "member" : "members"} · opened by{" "}
            {room.creator.fullName}
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {live > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              {live} at {live === 1 ? "a desk" : "desks"}
            </span>
          )}

          {isMember ? (
            <button
              onClick={() => navigate(`/rooms/${room._id}`)}
              className="btn btn-sm btn-outline"
            >
              Open room
            </button>
          ) : isPending ? (
            <span className="text-xs text-base-content/50">
              Waiting on the host
            </span>
          ) : (
            <button
              onClick={() => requestJoinMutation(room._id)}
              className="btn btn-sm btn-primary gap-2"
              disabled={joining}
            >
              {joining ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {needsApproval ? "Ask to join" : "Take a desk"}
            </button>
          )}
        </div>
      </li>
    );
  };

  const tabs = [
    { id: "my-rooms", label: "My rooms", count: myRooms.length },
    { id: "discover", label: "Discover", count: discoverRooms.length },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-base-300">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Rooms
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              Where your team, your friends or strangers work the same block.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            <Plus className="size-4" />
            New room
          </button>
        </header>

        {isLoading ? (
          <ul className="divide-y divide-base-300">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="py-4 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-2.5 w-24" />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="flex items-center gap-5 mt-4 mb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id}
                  className={`pb-2 -mb-px border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-base-content"
                      : "border-transparent text-base-content/55 hover:text-base-content"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 font-mono tabular-nums text-xs text-base-content/45">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === "my-rooms" &&
              (myRooms.length === 0 ? (
                <div className="border-t border-base-300 py-10 max-w-md">
                  <h2 className="font-semibold">You haven&apos;t joined a room</h2>
                  <p className="text-sm text-base-content/60 mt-1">
                    Open rooms let you take a desk straight away. Or start one
                    and invite the people you work with.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => setActiveTab("discover")}
                      className="btn btn-sm btn-primary"
                    >
                      Browse rooms
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn btn-sm btn-ghost"
                    >
                      Start one
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-base-300 border-t border-base-300">
                  {myRooms.map((room) => (
                    <RoomRow key={room._id} room={room} />
                  ))}
                </ul>
              ))}

            {activeTab === "discover" && (
              <div className="border-t border-base-300 pt-4">
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <label className="input input-sm flex-1 flex items-center gap-2">
                    <Search className="size-4 opacity-60" />
                    <input
                      type="text"
                      id="room-search"
                      placeholder="Search rooms"
                      className="grow"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </label>

                  <select
                    className="select select-sm w-full sm:w-48"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    aria-label="Filter rooms"
                  >
                    <option value="">All rooms</option>
                    <option value="open">Open to anyone</option>
                    <option value="team">My teams</option>
                  </select>
                </div>

                {filteredDiscoverRooms.length === 0 ? (
                  <p className="text-sm text-base-content/60 py-8 border-t border-base-300">
                    {discoverRooms.length === 0
                      ? "You're in every room there is right now."
                      : "No room matches that. Try a different search."}
                  </p>
                ) : (
                  <ul className="divide-y divide-base-300 border-t border-base-300">
                    {filteredDiscoverRooms.map((room) => (
                      <RoomRow key={room._id} room={room} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-1">Open a new room</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Anyone who joins can open it later. You don&apos;t have to be here
              first.
            </p>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <fieldset className="fieldset">
                <label className="label" htmlFor="room-name">
                  Room name
                </label>
                <input
                  id="room-name"
                  type="text"
                  placeholder="e.g. Design Studio Hours"
                  className="input w-full"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isCreating}
                />
              </fieldset>

              <fieldset className="fieldset">
                <label className="label" htmlFor="room-description">
                  Description
                </label>
                <textarea
                  id="room-description"
                  placeholder="Who is this room for, and what happens in it?"
                  className="textarea h-24 w-full"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={isCreating}
                />
              </fieldset>

              <fieldset className="fieldset">
                <span className="label">Who can join?</span>
                <div className="flex gap-2">
                  {[
                    { value: "open", label: "Anyone" },
                    { value: "approval", label: "I approve each" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={formData.joinPolicy === opt.value}
                      onClick={() =>
                        setFormData({ ...formData, joinPolicy: opt.value })
                      }
                      className={`btn btn-sm flex-1 ${
                        formData.joinPolicy === opt.value
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                      disabled={isCreating}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-base-content/50 mt-1">
                  Need a room only your company can see? Create it from a team.
                </p>
              </fieldset>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm gap-2"
                  disabled={isCreating}
                >
                  {isCreating && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  {isCreating ? "Opening..." : "Open room"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCreateModal(false)} disabled={isCreating}>
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default RoomsPage;
