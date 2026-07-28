import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CreditCard,
  LoaderIcon,
  MapPin,
  Palette,
  ShuffleIcon,
  Sparkles,
  UploadIcon,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuthUser from "../hooks/useAuthUser";
import { completeOnboarding, upgradePlan, uploadPhoto } from "../lib/api";
import { getRandomAvatarUrl } from "../lib/avatar";
import { ROLES, THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    line: "Everything you need to work alone or in public rooms.",
    features: [
      "Unlimited solo sessions",
      "Tasks, breaks and streaks",
      "Join any open room",
      "Join teams you're invited to",
      "Friends, chat and video calls",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8",
    cadence: "per month",
    line: "For companies and teams who need their own space.",
    features: [
      "Everything in Free",
      "Create companies, teams and groups",
      "Private rooms only members can open",
      "Live presence across your team",
      "Weekly hours per person",
      "Admin roles and member management",
    ],
  },
];

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User, hint: "Name, photo and role" },
  {
    id: "billing",
    label: "Plan & billing",
    icon: CreditCard,
    hint: "Your plan and what it unlocks",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    hint: "Light or dark",
  },
];

const SettingsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useThemeStore();

  // The section lives in the URL so "Upgrade to Pro" prompts elsewhere in the
  // app can link straight at /settings?tab=billing.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = SECTIONS.some((s) => s.id === requested) ? requested : "profile";
  const setActive = (id) => setSearchParams({ tab: id }, { replace: true });

  const [form, setForm] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    role: authUser?.role || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "/blank-pp.png",
  });
  const [isUploading, setIsUploading] = useState(false);

  const isPro = authUser?.plan === "pro";

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success("Profile saved.");
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.message ?? "Couldn't save your profile."
      ),
  });

  const { mutate: upgrade, isPending: isUpgrading } = useMutation({
    mutationFn: upgradePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success("You're on Pro. Go create a team.");
    },
    onError: () => toast.error("Couldn't start your upgrade."),
  });

  const handleUpload = async (file) => {
    setIsUploading(true);
    const img = await uploadPhoto(file);
    if (img?.success) {
      setForm((f) => ({ ...f, profilePic: img.url }));
      toast.success("Photo updated. Save to keep it.");
    } else {
      toast.error("Upload failed. Try again.");
    }
    setIsUploading(false);
  };

  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-5 sm:mb-6">
          Settings
        </h1>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* ---- section nav: rail on desktop, strip on small screens ---- */}
          <nav
            aria-label="Settings sections"
            className="lg:w-56 xl:w-64 shrink-0"
          >
            <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0 lg:sticky lg:top-20">
              {SECTIONS.map((section) => (
                <li key={section.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setActive(section.id)}
                    aria-current={active === section.id ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 rounded-field px-3 py-2.5 text-sm text-left whitespace-nowrap transition-colors ${
                      active === section.id
                        ? "bg-base-300 font-semibold"
                        : "hover:bg-base-200 text-base-content/70"
                    }`}
                  >
                    <section.icon className="size-4 shrink-0" />
                    {section.label}
                    {section.id === "billing" && (
                      <span
                        className={`badge badge-xs ml-auto hidden lg:inline-flex ${
                          isPro ? "badge-primary" : "badge-ghost"
                        }`}
                      >
                        {isPro ? "Pro" : "Free"}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 min-w-0 space-y-5">
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold">{activeSection.label}</h2>
              <p className="text-sm text-base-content/60">
                {activeSection.hint}
              </p>
            </div>

            {/* ---- profile ---- */}
            {active === "profile" && (
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-6">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!form.fullName.trim())
                        return toast.error("Your name can't be empty");
                      save(form);
                    }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="size-20 rounded-full bg-base-300 overflow-hidden shrink-0">
                        <img
                          src={form.profilePic}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              profilePic: getRandomAvatarUrl(),
                            }))
                          }
                          className="btn btn-sm btn-outline gap-2"
                        >
                          <ShuffleIcon className="size-4" />
                          Random avatar
                        </button>
                        <label
                          htmlFor="settings-photo"
                          className="btn btn-sm btn-outline gap-2 cursor-pointer"
                        >
                          {isUploading ? (
                            <LoaderIcon className="animate-spin size-4" />
                          ) : (
                            <UploadIcon className="size-4" />
                          )}
                          Upload
                        </label>
                        <input
                          id="settings-photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                          }}
                        />
                      </div>
                    </div>

                    <fieldset className="fieldset">
                      <label className="label" htmlFor="s-name">
                        Full name
                      </label>
                      <input
                        id="s-name"
                        className="input w-full"
                        value={form.fullName}
                        onChange={(e) =>
                          setForm({ ...form, fullName: e.target.value })
                        }
                      />
                    </fieldset>

                    <fieldset className="fieldset">
                      <label className="label" htmlFor="s-bio">
                        Bio
                      </label>
                      <textarea
                        id="s-bio"
                        className="textarea h-20 w-full"
                        placeholder="Tell others what you're working on"
                        value={form.bio}
                        onChange={(e) =>
                          setForm({ ...form, bio: e.target.value })
                        }
                      />
                    </fieldset>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <fieldset className="fieldset">
                        <label className="label" htmlFor="s-role">
                          What do you do?
                        </label>
                        <select
                          id="s-role"
                          className="select w-full"
                          value={form.role}
                          onChange={(e) =>
                            setForm({ ...form, role: e.target.value })
                          }
                        >
                          <option value="">Select your role</option>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </fieldset>

                      <fieldset className="fieldset">
                        <label className="label" htmlFor="s-location">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute top-1/2 -translate-y-1/2 left-3 size-4 opacity-60 pointer-events-none" />
                          <input
                            id="s-location"
                            className="input w-full pl-9"
                            placeholder="City, Country"
                            value={form.location}
                            onChange={(e) =>
                              setForm({ ...form, location: e.target.value })
                            }
                          />
                        </div>
                      </fieldset>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm w-full sm:w-auto"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Save profile"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            {/* ---- billing ---- */}
            {active === "billing" && (
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-6 gap-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PLANS.map((plan) => {
                      const current = (plan.id === "pro") === isPro;
                      return (
                        <div
                          key={plan.id}
                          className={`rounded-box border p-4 flex flex-col gap-3 ${
                            current
                              ? "border-primary bg-primary/5"
                              : "border-base-300 bg-base-100"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{plan.name}</span>
                              {plan.id === "pro" && (
                                <Sparkles className="size-3.5 text-primary" />
                              )}
                              {current && (
                                <span className="badge badge-primary badge-xs ml-auto">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-2xl font-bold font-mono tracking-tight">
                              {plan.price}
                              <span className="text-xs font-normal text-base-content/60 ml-1.5">
                                {plan.cadence}
                              </span>
                            </p>
                            <p className="text-xs text-base-content/60">
                              {plan.line}
                            </p>
                          </div>

                          <ul className="space-y-1.5 flex-1">
                            {plan.features.map((f) => (
                              <li
                                key={f}
                                className="flex items-start gap-2 text-xs"
                              >
                                <Check className="size-3.5 text-success mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>

                          {current ? (
                            <span className="text-xs text-center text-base-content/50 py-2">
                              You&apos;re on this plan
                            </span>
                          ) : plan.id === "pro" ? (
                            <button
                              onClick={() => upgrade()}
                              className="btn btn-sm btn-primary w-full"
                              disabled={isUpgrading}
                            >
                              {isUpgrading ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                "Upgrade to Pro"
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-center text-base-content/50 py-2">
                              Included in Pro
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-base-content/50">
                    Billing isn&apos;t connected to a payment provider yet.
                    Upgrading here switches your plan immediately so you can try
                    the team features.{" "}
                    {isPro && (
                      <Link to="/teams" className="link link-primary">
                        Go to teams
                      </Link>
                    )}
                  </p>
                </div>
              </section>
            )}

            {/* ---- appearance ---- */}
            {active === "appearance" && (
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-6 gap-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setTheme(t.name)}
                        aria-pressed={theme === t.name}
                        className={`btn btn-sm flex-1 justify-between ${
                          theme === t.name ? "btn-primary" : "btn-outline"
                        }`}
                      >
                        {t.label}
                        <span className="flex gap-1">
                          {t.colors.map((c, i) => (
                            <span
                              key={i}
                              className="size-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <div className="text-xs text-base-content/50 pb-2">
              <Link to="/terms" className="link link-hover">
                Terms
              </Link>
              {" · "}
              <Link to="/privacy" className="link link-hover">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
