import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

import { useThemeStore } from "../store/useThemeStore";

const UPDATED = "27 July 2026";

const TERMS = [
  {
    h: "What Kendro is",
    p: "Kendro is a virtual co-working room. You take a desk, set a goal, run a clock, and optionally work alongside other people in shared rooms. It is provided as-is, free of charge.",
  },
  {
    h: "Your account",
    p: "You are responsible for what happens under your account and for keeping your password to yourself. Tell us if you think someone else has access to it. You must be old enough to agree to these terms in your country.",
  },
  {
    h: "How to behave",
    p: "Rooms are shared, and some carry live audio and video. Do not harass other people, share unlawful material, impersonate anyone, or broadcast anything you would not want a stranger to see. Room hosts can remove participants, and we can suspend accounts that make the product worse for others.",
  },
  {
    h: "Your content",
    p: "You keep ownership of what you write and broadcast. You give us only the permission needed to show it to the people you have shared it with. For example, displaying your session goal to others in the same room.",
  },
  {
    h: "Availability",
    p: "We may change or discontinue features. We do not guarantee uninterrupted service, and we are not liable for work, streaks, or data lost as a result of downtime.",
  },
  {
    h: "Ending it",
    p: "You can stop using Kendro and delete your account at any time. We can close accounts that breach these terms.",
  },
];

const PRIVACY = [
  {
    h: "What we collect",
    p: "Your name, email address, and password (stored only as a salted hash, never in a readable form). Anything you choose to add to your profile, such as a bio, location, avatar, or work role. Your sessions: what you were working on, how long it took, and which room you were in.",
  },
  {
    h: "What we do with it",
    p: "We use it to run the product: signing you in, showing your streak and statistics, and displaying your presence to others in shared rooms. We do not sell your data and we do not run advertising against it.",
  },
  {
    h: "What other people can see",
    p: "Your name, avatar, bio, and session goals are visible to people in the same room, and your profile is visible to people you connect with. Your email address is never shown to other users.",
  },
  {
    h: "Processors we rely on",
    p: "Chat and live video are delivered through Stream, and data is stored with MongoDB Atlas. Profile images you upload are hosted by ImgBB. These providers process data on our behalf in order to make the features work.",
  },
  {
    h: "Cookies",
    p: "One cookie, holding your sign-in session. No advertising or third-party tracking cookies.",
  },
  {
    h: "Your choices",
    p: "You can edit or clear your profile fields at any time from your profile page. To delete your account and its sessions, contact us and we will remove them.",
  },
];

const Section = ({ title, updated, items, children }) => (
  <article className="space-y-6">
    <header className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-base-content/60">Last updated {updated}</p>
    </header>
    {children}
    <div className="space-y-5">
      {items.map(({ h, p }) => (
        <section key={h} className="space-y-1.5">
          <h2 className="font-semibold">{h}</h2>
          <p className="text-sm text-base-content/70 leading-relaxed">{p}</p>
        </section>
      ))}
    </div>
  </article>
);

const LegalPage = ({ kind }) => {
  const { theme } = useThemeStore();
  const isTerms = kind === "terms";

  return (
    <div className="min-h-screen bg-base-100" data-theme={theme}>
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <Link to="/" className="btn btn-ghost btn-sm gap-2 -ml-2">
          <ArrowLeft className="size-4" />
          Back to Kendro
        </Link>

        <Section
          title={isTerms ? "Terms of Service" : "Privacy Policy"}
          updated={UPDATED}
          items={isTerms ? TERMS : PRIVACY}
        >
          <p className="text-sm text-base-content/70 leading-relaxed">
            {isTerms
              ? "Plain-language terms for using Kendro. By creating an account you agree to them."
              : "What Kendro stores about you, why, and who else can see it."}
          </p>
        </Section>

        <div className="pt-2 border-t border-base-300">
          <Link
            to={isTerms ? "/privacy" : "/terms"}
            className="link link-primary text-sm"
          >
            {isTerms ? "Read the Privacy Policy" : "Read the Terms of Service"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
