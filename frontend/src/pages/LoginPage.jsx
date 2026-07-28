import { useEffect, useRef, useState } from "react";
import {  Eye, EyeOff } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { useThemeStore } from "../store/useThemeStore";

import useLogin from "../hooks/useLogin";

const DEMO = { email: "demo@kendro.dev", password: "000000" };
// A desk is the thing a first-time visitor can use on their own. Rooms need
// other people in them to be worth anything, so they are not the first stop.
const DEMO_LANDING = "/focus";

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useThemeStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isPending, error, loginMutation } = useLogin();

  const wantsDemo = searchParams.get("demo") === "1";
  const demoStarted = useRef(false);

  // The redirect after sign-in reads ?next=, so the destination has to be on
  // the URL before a session exists. Both entry points therefore put it there
  // and let this effect do the signing in.
  useEffect(() => {
    if (!wantsDemo || demoStarted.current) return;
    demoStarted.current = true;
    loginMutation(DEMO);
  }, [wantsDemo, loginMutation]);

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  const handleDemoLogin = () => {
    setSearchParams({ demo: "1", next: DEMO_LANDING }, { replace: true });
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
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Welcome Back</h2>
                  <p className="text-sm opacity-70">
                    Your room is waiting.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <fieldset className="fieldset space-y-2">
                    <label className="label" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="input w-full"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                    />
                  </fieldset>

                  <fieldset className="fieldset space-y-2">
                    <label className="label" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="input w-full pr-10"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
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
                  </fieldset>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isPending}
                  >
                    {isPending && !wantsDemo ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="btn btn-outline w-full"
                    disabled={isPending}
                  >
                    {wantsDemo && isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Taking you to a desk...
                      </>
                    ) : (
                      "Take a desk, no signup"
                    )}
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-sm">
                      Don't have an account?{" "}
                      <Link
                        to="/signup"
                        className="text-primary hover:underline"
                      >
                        Create one
                      </Link>
                    </p>
                  </div>
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
export default LoginPage;
