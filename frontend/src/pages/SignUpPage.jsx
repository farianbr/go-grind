import { useState } from "react";
import {  Eye, EyeOff } from "lucide-react";
import { Link } from "react-router";

import { useThemeStore } from "../store/useThemeStore";

import useSignUp from "../hooks/useSignup";

// The demo sign-in lives on the login page, which is also what carries the
// redirect to the desk. Linking there keeps one code path for it.
const DEMO_DESK_HREF = `/login?demo=1&next=${encodeURIComponent("/focus")}`;

const SignUpPage = () => {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useThemeStore();

  const { signupMutation, isPending, error } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8"
      data-theme={theme}
    >
      <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">
        <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col">
          <Link
            to="/"
            className="mb-4 flex items-center justify-start gap-2 w-fit rounded-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Kendro home"
          >
            <img src="/logo.svg" alt="" width="40" height="40" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="wordmark text-3xl text-base-content">
              Kendro
            </span>
          </Link>

          {error && (
            <div className="alert alert-error mb-4">
              <span>
                {error?.response?.data?.message ??
                  "Can't reach the server. Check your connection and try again."}
              </span>
            </div>
          )}

          <div className="w-full">
            <form onSubmit={handleSignup}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Create an Account</h2>
                  <p className="text-sm opacity-70">
                    Open a room, take a desk, get to work.
                  </p>
                </div>

                <div className="space-y-3">
                  <fieldset className="fieldset">
                    <label htmlFor="fullName" className="label">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      className="input w-full"
                      value={signupData.fullName}
                      onChange={(e) =>
                        setSignupData({
                          ...signupData,
                          fullName: e.target.value,
                        })
                      }
                      required
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <label htmlFor="email" className="label">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="input w-full"
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData({ ...signupData, email: e.target.value })
                      }
                      required
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <label htmlFor="password" className="label">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="********"
                        className="input w-full pr-10"
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-2 right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </fieldset>

                  <fieldset className="fieldset">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        required
                      />
                      <span className="text-xs leading-tight">
                        I agree to the{" "}
                        <Link
                          to="/terms"
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          terms of service
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy"
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          privacy policy
                        </Link>
                      </span>
                    </label>
                  </fieldset>
                </div>

                <button
                  className="btn btn-primary w-full"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Creating your account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <Link to={DEMO_DESK_HREF} className="btn btn-outline w-full">
                  Take a desk, no signup
                </Link>

                <div className="text-center mt-4">
                  <p className="text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center">
          <div className="max-w-md p-8 space-y-6">
            <div className="rounded-xl border border-primary/20 bg-base-100/60 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-base-content/60">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  3 at their desks right now
                </span>
                <span className="font-mono">24:11</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Priya", task: "Finish the pricing page" },
                  { name: "Marcus", task: "Chapter 4 problem set" },
                  { name: "Ada", task: "Refactor the auth module" },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center gap-2.5 rounded-lg bg-base-200/70 px-3 py-2"
                  >
                    <span className="size-6 rounded-full bg-primary/20 grid place-items-center text-[10px] font-bold">
                      {row.name[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{row.name}</p>
                      <p className="text-[11px] text-base-content/60 truncate">
                        {row.task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">A room where work gets done</h2>
              <p className="opacity-70 text-sm">
                Take a desk, work the block alongside your team, and log what you finished.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
