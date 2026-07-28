import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Clock,
  Copy,
  Mail,
  MessagesSquare,
  Plus,
  Trash2,
  UserMinus,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createRoom,
  deleteTeam,
  getTeamById,
  inviteToTeam,
  removeTeamMember,
  revokeInvite,
  updateTeamMemberRole,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

const TeamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [showRoom, setShowRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", description: "" });

  const { data: team, isLoading, isError } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamById(id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", id] });
  const onError = (fallback) => (error) =>
    toast.error(error?.response?.data?.message ?? fallback);

  const { mutate: invite, isPending: isInviting } = useMutation({
    mutationFn: (payload) => inviteToTeam(id, payload),
    onSuccess: (data) => {
      toast.success(data.message);
      setInviteEmail("");
      refresh();
    },
    onError: onError("Couldn't send that invite."),
  });

  // Every one of these carries `variables` so a spinner can land on the exact
  // invite or member acted on, rather than on the whole list.
  const {
    mutate: revoke,
    isPending: isRevoking,
    variables: revokingToken,
  } = useMutation({
    mutationFn: (token) => revokeInvite(id, token),
    onSuccess: () => {
      toast.success("Invite withdrawn.");
      refresh();
    },
    onError: onError("Couldn't withdraw that invite."),
  });

  const {
    mutate: setRole,
    isPending: isSettingRole,
    variables: roleVars,
  } = useMutation({
    mutationFn: ({ userId, role }) => updateTeamMemberRole(id, userId, role),
    onSuccess: () => {
      toast.success("Role updated.");
      refresh();
    },
    onError: onError("Couldn't change that role."),
  });

  const {
    mutate: remove,
    isPending: isRemoving,
    variables: removingUserId,
  } = useMutation({
    mutationFn: (userId) => removeTeamMember(id, userId),
    onSuccess: () => {
      toast.success("Member removed.");
      refresh();
    },
    onError: onError("Couldn't remove that member."),
  });

  const { mutate: addRoom, isPending: isAddingRoom } = useMutation({
    mutationFn: (payload) => createRoom({ ...payload, team: id }),
    onSuccess: () => {
      toast.success("Room created.");
      setShowRoom(false);
      setRoomForm({ name: "", description: "" });
      refresh();
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: onError("Couldn't create that room."),
  });

  const { mutate: destroy, isPending: isDeletingTeam } = useMutation({
    mutationFn: () => deleteTeam(id),
    onSuccess: () => {
      toast.success("Team deleted.");
      navigate("/teams");
    },
    onError: onError("Couldn't delete this team."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-base-content/70">
          This team doesn&apos;t exist, or you&apos;re not in it.
        </p>
        <Link to="/teams" className="btn btn-sm btn-primary">
          Back to teams
        </Link>
      </div>
    );
  }

  const canManage = team.myRole === "owner" || team.myRole === "admin";
  const isOwner = team.myRole === "owner";
  const minutesByUser = new Map(
    (team.weekly ?? []).map((w) => [String(w._id), w])
  );
  const liveByUser = new Map(
    (team.liveSessions ?? []).map((s) => [String(s.user?._id ?? s.user), s])
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <Link to="/teams" className="btn btn-ghost btn-sm gap-2 -ml-2">
          <ArrowLeft className="size-4" />
          Teams
        </Link>

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary shrink-0" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                {team.name}
              </h1>
              <span className="badge badge-sm badge-ghost capitalize shrink-0">
                {team.kind}
              </span>
            </div>
            {team.description && (
              <p className="text-sm text-base-content/60 mt-1.5">
                {team.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            {/* Every team has a channel, so the way into it belongs beside the
                team itself rather than only in the chat list. */}
            <Link
              to={`/chats?channel=team-${id}`}
              className="btn btn-outline btn-sm gap-2 flex-1 sm:flex-none"
            >
              <MessagesSquare className="size-4" />
              Team chat
            </Link>
            {canManage && (
              <button
                onClick={() => setShowRoom(true)}
                className="btn btn-primary btn-sm gap-2 flex-1 sm:flex-none"
              >
                <Plus className="size-4" />
                New room
              </button>
            )}
          </div>
        </div>

        {/* live now */}
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4 sm:p-5 gap-3">
            <h2 className="font-semibold text-sm sm:text-base">
              At their desks right now
            </h2>
            {team.liveSessions?.length ? (
              <ul className="grid sm:grid-cols-2 gap-2">
                {team.liveSessions.map((s) => (
                  <li
                    key={s._id}
                    className="flex items-center gap-2.5 rounded-field bg-base-100 px-3 py-2"
                  >
                    <img
                      src={s.user?.profilePic || "/blank-pp.png"}
                      alt=""
                      className="size-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {s.user?.fullName}
                      </p>
                      <p className="text-xs text-base-content/60 truncate">
                        {s.workTopic}
                      </p>
                    </div>
                    <span className="relative flex size-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-success" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60">
                Nobody is in a session yet.
              </p>
            )}
          </div>
        </div>

        {/* rooms */}
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4 sm:p-5 gap-3">
            <h2 className="font-semibold text-sm sm:text-base">Team rooms</h2>
            {team.rooms?.length ? (
              <ul className="grid sm:grid-cols-2 gap-2">
                {team.rooms.map((r) => (
                  <li key={r._id}>
                    <Link
                      to={`/rooms/${r._id}`}
                      className="flex items-center justify-between gap-3 rounded-field bg-base-100 px-3 py-2.5 hover:bg-base-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-base-content/60">
                          {r.members?.length ?? 0}{" "}
                          {r.members?.length === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60">
                No rooms yet. {canManage && "Create one for your team to work in."}
              </p>
            )}
          </div>
        </div>

        {/* members */}
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4 sm:p-5 gap-3">
            <h2 className="font-semibold text-sm sm:text-base">
              Members ({team.members.length})
            </h2>

            <ul className="space-y-2">
              {team.members.map((m) => {
                const u = m.user;
                const uid = String(u?._id);
                const stats = minutesByUser.get(uid);
                const live = liveByUser.get(uid);
                return (
                  <li
                    key={uid}
                    className="rounded-field bg-base-100 px-3 py-2.5"
                  >
                    {/* Identity on its own row so the name never truncates to
                        an initial on a phone; meta wraps underneath. */}
                    <div className="flex items-center gap-3">
                      <img
                        src={u?.profilePic || "/blank-pp.png"}
                        alt=""
                        className="size-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {u?.fullName}
                          {uid === authUser?._id && (
                            <span className="text-base-content/50"> (you)</span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          {u?.role || u?.email}
                        </p>
                      </div>
                      {live && (
                        <span className="badge badge-success badge-sm shrink-0">
                          working
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 pl-12 sm:pl-0 sm:mt-1.5">
                      <span className="text-xs text-base-content/60 inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {Math.round((stats?.minutes ?? 0) / 60)}h this week
                      </span>

                      {isOwner && m.role !== "owner" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <select
                            className="select select-xs w-24"
                            value={m.role}
                            onChange={(e) =>
                              setRole({ userId: uid, role: e.target.value })
                            }
                            disabled={isSettingRole && roleVars?.userId === uid}
                            aria-label={`Role for ${u?.fullName}`}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          {isSettingRole && roleVars?.userId === uid && (
                            <span className="loading loading-spinner loading-xs" />
                          )}
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm capitalize">
                          {m.role}
                        </span>
                      )}

                      {canManage && m.role !== "owner" && (
                        <button
                          onClick={() => remove(uid)}
                          className="btn btn-ghost btn-xs gap-1 ml-auto"
                          disabled={isRemoving && removingUserId === uid}
                          aria-label={`Remove ${u?.fullName}`}
                        >
                          {isRemoving && removingUserId === uid ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <UserMinus className="size-3.5" />
                          )}
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {canManage && (
              <div className="pt-2 border-t border-base-300 space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    invite({ email: inviteEmail, role: inviteRole });
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <label className="input input-sm flex-1 flex items-center gap-2">
                    <Mail className="size-4 opacity-60" />
                    <input
                      type="email"
                      className="grow"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      aria-label="Invite by email"
                    />
                  </label>
                  <select
                    className="select select-sm sm:w-28"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    aria-label="Invite role"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary gap-2"
                    disabled={isInviting}
                  >
                    {isInviting && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Invite
                  </button>
                </form>

                {team.invites?.length > 0 && (
                  <ul className="space-y-1.5">
                    {team.invites.map((inv) => (
                      <li
                        key={inv.token}
                        className="flex items-center gap-2 text-xs rounded-field bg-base-100 px-3 py-2"
                      >
                        <span className="flex-1 truncate">
                          {inv.email}{" "}
                          <span className="text-base-content/50">
                            · {inv.role} · pending
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              `${window.location.origin}/invite/${inv.token}`
                            );
                            toast.success("Invite link copied.");
                          }}
                          className="btn btn-ghost btn-xs gap-1"
                        >
                          <Copy className="size-3" />
                          Link
                        </button>
                        <button
                          onClick={() => revoke(inv.token)}
                          className="btn btn-ghost btn-xs btn-circle"
                          disabled={isRevoking && revokingToken === inv.token}
                          aria-label={`Withdraw invite to ${inv.email}`}
                        >
                          {isRevoking && revokingToken === inv.token ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${team.name}? Its rooms stay, but stop being team rooms.`
                  )
                )
                  destroy();
              }}
              className="btn btn-ghost btn-sm text-error gap-2"
              disabled={isDeletingTeam}
            >
              {isDeletingTeam ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeletingTeam ? "Deleting..." : "Delete team"}
            </button>
          </div>
        )}
      </div>

      {showRoom && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">New room for {team.name}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (roomForm.description.trim().length < 30) {
                  return toast.error(
                    "Describe the room in at least 30 characters"
                  );
                }
                addRoom(roomForm);
              }}
              className="space-y-4"
            >
              <fieldset className="fieldset">
                <label className="label" htmlFor="tr-name">
                  Room name
                </label>
                <input
                  id="tr-name"
                  className="input w-full"
                  placeholder="Design Standup"
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  disabled={isAddingRoom}
                />
              </fieldset>
              <fieldset className="fieldset">
                <label className="label" htmlFor="tr-desc">
                  What happens in it?
                </label>
                <textarea
                  id="tr-desc"
                  className="textarea h-24 w-full"
                  placeholder="Daily block for the product design team to work side by side."
                  value={roomForm.description}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, description: e.target.value })
                  }
                  disabled={isAddingRoom}
                />
              </fieldset>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm sm:btn-md"
                  onClick={() => setShowRoom(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm sm:btn-md"
                  disabled={isAddingRoom}
                >
                  Create room
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowRoom(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default TeamDetailPage;
