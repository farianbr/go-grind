import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, Check, Plus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import {
  acceptTeamInvite,
  createTeam,
  getMyTeams,
  getPendingTeamInvites,
  upgradePlan,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

const KINDS = [
  { value: "company", label: "Company" },
  { value: "team", label: "Team" },
  { value: "group", label: "Group" },
];

const PRO_FEATURES = [
  "Create companies, teams and study groups",
  "Private rooms only your members can open",
  "See who is working right now, across the team",
  "Weekly hours and session counts per person",
  "Admin roles for managing people and rooms",
];

const TeamsPage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", kind: "team" });

  const isPro = authUser?.plan === "pro";

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: getMyTeams,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["teamInvites"],
    queryFn: getPendingTeamInvites,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["teamInvites"] });
  };

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: createTeam,
    onSuccess: (team) => {
      toast.success(`${team.name} is ready.`);
      setShowCreate(false);
      setForm({ name: "", description: "", kind: "team" });
      refresh();
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message ?? "Couldn't create that team."),
  });

  const { mutate: upgrade, isPending: isUpgrading } = useMutation({
    mutationFn: upgradePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success("You're on Pro. Create your first team.");
    },
    onError: () => toast.error("Couldn't start your upgrade."),
  });

  const {
    mutate: accept,
    isPending: isAccepting,
    variables: acceptingToken,
  } = useMutation({
    mutationFn: acceptTeamInvite,
    onSuccess: (team) => {
      toast.success(`You're in ${team.name}.`);
      refresh();
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message ?? "Couldn't accept that invite."),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Give the team a name");
    create(form);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-4 mb-1 border-b border-base-300">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Teams
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              Companies, teams and study groups, each with rooms only their
              members can open.
            </p>
          </div>
          {isPro && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="size-4" />
              New team
            </button>
          )}
        </header>

        {/* Invites sit above your own teams: they expire, and they are the one
            thing on this page that needs an answer. */}
        {invites.length > 0 && (
          <ul className="divide-y divide-base-300 border-b border-base-300">
            {invites.map((inv) => (
              <li
                key={inv.token}
                className="py-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {inv.owner?.fullName} invited you to {inv.name}
                  </p>
                  <p className="text-sm text-base-content/55 mt-0.5">
                    Joining as {inv.role}, free for you
                  </p>
                </div>
                <button
                  onClick={() => accept(inv.token)}
                  className="btn btn-primary btn-sm gap-2 shrink-0"
                  disabled={isAccepting && acceptingToken === inv.token}
                >
                  {isAccepting && acceptingToken === inv.token && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  Accept invite
                </button>
              </li>
            ))}
          </ul>
        )}

        {isLoading ? (
          <ul className="divide-y divide-base-300">
            {[0, 1, 2].map((i) => (
              <li key={i} className="py-4 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
              </li>
            ))}
          </ul>
        ) : teams.length > 0 ? (
          <ul className="divide-y divide-base-300">
            {teams.map((team) => (
              <li key={team._id}>
                <Link
                  to={`/teams/${team._id}`}
                  className="group flex items-center gap-4 py-4 -mx-3 px-3 rounded-field hover:bg-base-200 transition-colors"
                >
                  <Building2 className="size-5 text-base-content/35 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold truncate">{team.name}</h2>
                      <span className="badge badge-sm badge-ghost capitalize shrink-0">
                        {team.kind}
                      </span>
                    </div>
                    {team.description && (
                      <p className="text-sm text-base-content/60 line-clamp-1 mt-0.5">
                        {team.description}
                      </p>
                    )}
                    <p className="text-xs text-base-content/45 mt-1.5">
                      {team.members.length}{" "}
                      {team.members.length === 1 ? "member" : "members"} ·{" "}
                      {team.roomCount}{" "}
                      {team.roomCount === 1 ? "room" : "rooms"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] uppercase tracking-wide text-base-content/45">
                      {team.myRole}
                    </span>
                    <ArrowRight className="size-4 text-base-content/25 group-hover:text-base-content/50 transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : isPro ? (
          <div className="py-10 max-w-md">
            <h2 className="font-semibold">No teams yet</h2>
            <p className="text-sm text-base-content/60 mt-1">
              Create one for your company, your squad, or the friends you study
              with. You can invite people straight after.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary btn-sm mt-4"
            >
              Create a team
            </button>
          </div>
        ) : (
          /* The one paywall in the product, stated plainly rather than dressed
             up as a promotion. */
          <section className="py-8 sm:py-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" />
              Kendro Pro
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">
              Bring your company into Kendro
            </h2>
            <p className="text-sm text-base-content/70 max-w-lg mt-1.5">
              Working solo stays free forever. Teams add private rooms, shared
              presence and weekly hours, for whoever is paying for the
              workspace.
            </p>

            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-6 border-t border-base-300 pt-5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 text-success mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-6">
              <button
                onClick={() => upgrade()}
                className="btn btn-primary gap-2 w-full sm:w-auto"
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-base-content/50">
                Invited to a team? Accepting is always free.
              </p>
            </div>
          </section>
        )}
      </div>

      {showCreate && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Create a team</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <fieldset className="fieldset">
                <label className="label" htmlFor="team-name">
                  Name
                </label>
                <input
                  id="team-name"
                  className="input w-full"
                  placeholder="Acme Design"
                  value={form.name}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={isCreating}
                />
              </fieldset>

              <fieldset className="fieldset">
                <span className="label">Type</span>
                <div className="flex gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      aria-pressed={form.kind === k.value}
                      onClick={() => setForm({ ...form, kind: k.value })}
                      className={`btn btn-sm flex-1 ${
                        form.kind === k.value ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <label className="label" htmlFor="team-desc">
                  What is it for?{" "}
                  <span className="text-base-content/50">(optional)</span>
                </label>
                <textarea
                  id="team-desc"
                  className="textarea h-20 w-full"
                  placeholder="Product and brand team, working Europe hours."
                  value={form.description}
                  maxLength={300}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  disabled={isCreating}
                />
              </fieldset>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCreate(false)}
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
                  {isCreating ? "Creating..." : "Create team"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCreate(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default TeamsPage;
