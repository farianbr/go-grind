import { Link } from "react-router";
import {
  ArrowRight,
  Building2,
  Check,
  Coffee,
  ListChecks,
  Radio,
  Timer,
  UserRound,
  Users,
} from "lucide-react";

import { useThemeStore } from "../store/useThemeStore";

// A static, deterministic streak pattern for the hero. Not user data — it is a
// picture of what the product gives you, so it must render before any request.
const HERO_WEEKS = 26;
const heroCells = Array.from({ length: HERO_WEEKS * 7 }, (_, i) => {
  const wave = Math.sin(i / 9) + Math.sin(i / 3.5);
  if (i > HERO_WEEKS * 7 - 12) return 0;
  if (wave > 1.1) return 3;
  if (wave > 0.4) return 2;
  if (wave > -0.4) return 1;
  return 0;
});

const INTENSITY = ["bg-base-300", "bg-success/30", "bg-success/60", "bg-success"];

// One click into a working session. This used to drop the visitor on /login,
// and signing in from there put them on a dashboard. It also used to promise a
// room, which is the wrong first thing: a room is only worth anything once
// there are people in it, a desk works on your own.
const DEMO_DESK_HREF = `/login?demo=1&next=${encodeURIComponent("/focus")}`;

const AUDIENCES = [
  {
    icon: Building2,
    who: "Companies",
    line: "Give a distributed workforce somewhere to actually show up.",
    detail:
      "Department rooms, visible progress, and a record of what got done, without another status meeting.",
  },
  {
    icon: Users,
    who: "Teams",
    line: "Run focus blocks together instead of scattering into calendars.",
    detail:
      "Everyone posts a goal, works the same hour, and closes out with what they shipped.",
  },
  {
    icon: Coffee,
    who: "Friends",
    line: "Study or build side projects in the same room, from anywhere.",
    detail:
      "Invite a few people, set a standing time, and let the streak keep you all honest.",
  },
  {
    icon: UserRound,
    who: "Solo",
    line: "Take a desk in a public room when working alone isn't working.",
    detail:
      "No invite needed. Open a room, see who's already in it, and get started.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    line: "Everything you need to work alone or in public rooms.",
    cta: "Start free",
    featured: false,
    features: [
      "Unlimited sessions with tasks and breaks",
      "Streaks and weekly stats",
      "Join any open room",
      "Join teams you're invited to",
      "Friends, chat and video calls",
    ],
  },
  {
    name: "Pro",
    price: "$8",
    cadence: "per member / month",
    line: "For companies and teams who need their own space.",
    cta: "Start free, upgrade later",
    featured: true,
    features: [
      "Everything in Free",
      "Create companies, teams and groups",
      "Private rooms only your members can open",
      "See who is at their desk, live",
      "Weekly hours per person",
      "Admin roles and member management",
    ],
  },
];

const STEPS = [
  {
    icon: Timer,
    title: "Take a desk",
    body: "Say what you're working on and how long you've got. That's the whole setup.",
  },
  {
    icon: ListChecks,
    title: "Work the block",
    body: "Tick off tasks, take a break when you need one, extend if you're in flow.",
  },
  {
    icon: Radio,
    title: "Close it out",
    body: "Log what you finished. Your room sees it, and your streak grows.",
  },
];

const LandingPage = () => {
  const { theme } = useThemeStore();

  return (
    <div className="min-h-screen bg-base-100" data-theme={theme}>
      <header className="border-b border-base-300 sticky top-0 z-30 bg-base-100/90 backdrop-blur">
        <nav className="container mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2" aria-label="Kendro home">
            <img src="/logo.svg" alt="" width="32" height="32" className="w-8 h-8" />
            <span className="wordmark text-xl sm:text-2xl text-base-content">
              Kendro
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#pricing" className="btn btn-ghost btn-sm px-2 sm:px-4 hidden sm:inline-flex">
              Pricing
            </a>
            <Link to="/login" className="btn btn-ghost btn-sm px-2 sm:px-4">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn-primary btn-sm px-2.5 sm:px-4 whitespace-nowrap">
              Open a room
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* hero */}
        <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center min-w-0">
            <div className="space-y-5 sm:space-y-6 min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                <Radio className="size-3.5" />
                Virtual co-working
              </div>

              <h1 className="text-[clamp(1.75rem,8.5vw,3.75rem)] font-extrabold tracking-tight leading-[1.05] text-balance">
                A room where
                <br />
                work gets done.
              </h1>

              <p className="text-base sm:text-lg text-base-content/70 max-w-lg text-pretty">
                Kendro is a co-working room for remote teams, companies,
                friends and anyone working alone. Take a desk, say what you're
                doing, and work the block alongside people doing the same.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="btn btn-primary btn-block sm:btn-wide gap-2">
                  Open a room, free
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to={DEMO_DESK_HREF}
                  className="btn btn-outline btn-block sm:btn-wide"
                >
                  Take a desk, no signup
                </Link>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-base-content/60">
                {["Free to use", "No card required", "Working in 30 seconds"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="size-4 text-success" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="card bg-base-200 border border-base-300 shadow-xl min-w-0">
              <div className="card-body gap-3.5 sm:gap-4 p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-sm sm:text-base">
                    Deep Work Mornings
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs text-success">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-success" />
                    </span>
                    3 at their desks
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { n: "Priya", t: "Finish the pricing page", c: "24:11" },
                    { n: "Marcus", t: "Chapter 4 lit review", c: "41:02" },
                    { n: "Ada", t: "Refactor the auth module", c: "08:37" },
                  ].map((row) => (
                    <div
                      key={row.n}
                      className="flex items-center gap-2.5 rounded-field bg-base-100 px-3 py-2"
                    >
                      <span className="size-7 rounded-full bg-primary/15 grid place-items-center text-[11px] font-bold shrink-0">
                        {row.n[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{row.n}</p>
                        <p className="text-[11px] text-base-content/60 truncate">
                          {row.t}
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-base-content/70">
                        {row.c}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-base-300 pt-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-base-content/60">
                      Your record, last six months
                    </p>
                    {/* A span, not a p: DaisyUI's card-body gives paragraphs
                        flex-grow, which left-aligns this against the middle of
                        the row instead of the right edge. */}
                    <span className="text-xs font-mono tabular-nums text-base-content/50 shrink-0">
                      142h
                    </span>
                  </div>
                  {/* Sized in fractions rather than fixed 10px squares, so the
                      grid ends flush with the card instead of stopping short of
                      the right edge at every width. */}
                  <div
                    className="grid grid-flow-col grid-rows-7 auto-cols-fr gap-[3px]"
                    aria-hidden="true"
                  >
                    {heroCells.map((level, i) => (
                      <span
                        key={i}
                        className={`w-full aspect-square rounded-xs ${INTENSITY[level]}`}
                      />
                    ))}
                  </div>
                  <p className="sr-only">
                    A contribution-style grid showing daily work sessions
                    building into a streak.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* who it's for */}
        <section className="border-y border-base-300 bg-base-200/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
            <div className="max-w-2xl space-y-2 mb-6 sm:mb-10">
              <h2 className="text-[clamp(1.4rem,5.5vw,1.875rem)] font-bold tracking-tight">
                Who takes a desk here
              </h2>
              <p className="text-base-content/70">
                The same room works whether you're forty people or one.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.who}
                    className="card bg-base-100 border border-base-300 h-full"
                  >
                    <div className="card-body p-4 sm:p-5 gap-1.5 sm:gap-2">
                      <Icon className="size-5 text-primary" />
                      <h3 className="font-semibold">{a.who}</h3>
                      <p className="text-sm font-medium text-base-content/80">
                        {a.line}
                      </p>
                      <p className="text-sm text-base-content/60">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="max-w-2xl space-y-2 mb-6 sm:mb-10">
            <h2 className="text-[clamp(1.4rem,5.5vw,1.875rem)] font-bold tracking-tight">
              How a session runs
            </h2>
            <p className="text-base-content/70">
              Three steps, about thirty seconds of setup.
            </p>
          </div>

          <ol className="grid sm:grid-cols-3 gap-5 sm:gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center size-7 rounded-full bg-primary text-primary-content text-xs font-bold">
                      {i + 1}
                    </span>
                    <Icon className="size-4 text-base-content/50" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-base-content/70">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* pricing */}
        <section
          id="pricing"
          className="border-t border-base-300 bg-base-200/40"
        >
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
            {/* Centred as a block: the cards stop at 3xl, so left-aligning
                them in a wide container reads as a layout bug. */}
            <div className="max-w-2xl mx-auto text-center space-y-2 mb-6 sm:mb-10">
              <h2 className="text-[clamp(1.4rem,5.5vw,1.875rem)] font-bold tracking-tight">
                Free for people. Paid for companies.
              </h2>
              <p className="text-base-content/70">
                Working alone or in a public room costs nothing, forever. You
                only pay to run a team, and the people you invite never do.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`card h-full ${
                    plan.featured
                      ? "bg-base-100 border-2 border-primary"
                      : "bg-base-100 border border-base-300"
                  }`}
                >
                  <div className="card-body p-5 sm:p-6 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        {plan.featured && (
                          <span className="badge badge-primary badge-sm">
                            For teams
                          </span>
                        )}
                      </div>
                      <p className="text-3xl font-bold font-mono tracking-tight">
                        {plan.price}
                        <span className="text-sm font-normal text-base-content/60 ml-1.5">
                          {plan.cadence}
                        </span>
                      </p>
                      <p className="text-sm text-base-content/60">{plan.line}</p>
                    </div>

                    <ul className="space-y-2 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="size-4 text-success mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/signup"
                      className={`btn btn-block ${
                        plan.featured ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* closing */}
        <section className="border-t border-base-300 bg-base-200/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
            <h2 className="text-[clamp(1.4rem,5.5vw,1.875rem)] font-bold tracking-tight">
              Your desk is free right now
            </h2>
            <p className="mt-3 text-base-content/70 max-w-md mx-auto">
              Open a room for your team, or drop into one that's already
              running.
            </p>
            <Link to="/signup" className="btn btn-primary btn-block sm:btn-wide sm:mx-auto mt-6 gap-2">
              Open a room, free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-base-300">
        <div className="container mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-base-content/60">
          <span>© {new Date().getFullYear()} Kendro, virtual co-working</span>
          <div className="flex gap-4">
            <Link to="/terms" className="link link-hover">
              Terms
            </Link>
            <Link to="/privacy" className="link link-hover">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
