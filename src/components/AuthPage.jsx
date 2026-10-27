import React, { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, UserRound } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const authCopy = {
  login: {
    eyebrow: "Welcome back",
    title: "Pick up where your progress left off.",
    description: "Sign in to keep your notes, revision plans, and quiz history in one place.",
    submit: "Sign in",
    switchPrompt: "New to ExamVault?",
    switchLabel: "Create an account",
    switchPath: "/auth/register",
  },
  register: {
    eyebrow: "Start studying smarter",
    title: "Build a calmer path to exam day.",
    description: "Create your ExamVault account and turn your study material into a plan that moves with you.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchPath: "/auth/login",
  },
};

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AuthPage({ mode = "login" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({ email: "", fullName: "", password: "" });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const copy = authCopy[mode];
  const isRegister = mode === "register";

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    const action = isRegister
      ? register(form.email, form.fullName, form.password)
      : login(form.email, form.password);
    action.catch((error) => setFormError(error.message)).finally(() => setIsSubmitting(false));
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="sa-root min-h-screen flex flex-col">
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 md:px-10">
        <button type="button" onClick={() => navigateTo("/")} className="flex items-center gap-2" aria-label="Go to ExamVault home">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--ink)" }}>
            <GraduationCap size={19} color="var(--accent)" />
          </span>
          <span className="sa-serif text-xl font-semibold">ExamVault</span>
        </button>
        <ThemeToggle />
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:px-10 md:py-12 flex items-center">
        <div className="w-full grid lg:grid-cols-[minmax(0,1fr)_460px] gap-12 lg:gap-20 items-center">
          <section className="hidden lg:block max-w-xl sa-fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: "var(--accent-ink)" }}>
              <span className="w-8 h-px" style={{ background: "var(--accent)" }} />
              Your study companion
            </div>
            <h1 className="sa-serif text-5xl xl:text-6xl font-semibold leading-[1.02] mb-6">Study with more clarity. Walk into exams with confidence.</h1>
            <p className="text-base leading-relaxed max-w-lg" style={{ color: "var(--muted)" }}>
              ExamVault brings your materials, practice, and progress together so every session has a clear next step.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-10 max-w-md">
              {["Notes that stay organized", "Quizzes made for your gaps", "Plans built around your time", "Progress you can actually see"].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sa-card sa-card-lg p-6 sm:p-8 shadow-sm sa-fade-in" style={{ boxShadow: "0 20px 60px var(--shadow-color)" }}>
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--accent-ink)" }}>{copy.eyebrow}</p>
              <h2 className="sa-serif text-3xl font-semibold leading-tight mb-2">{isRegister ? "Create your account" : "Sign in to ExamVault"}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{copy.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{formError}</div>}
              {isRegister && (
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Full name</span>
                  <span className="relative block">
                    <UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                    <input required type="text" name="full_name" value={form.fullName} onChange={updateField("fullName")} autoComplete="name" placeholder="Your name" className="sa-auth-input pl-10" />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Email address</span>
                <span className="relative block">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                  <input required type="email" name="email" value={form.email} onChange={updateField("email")} autoComplete="email" placeholder="you@example.com" className="sa-auth-input pl-10" />
                </span>
              </label>

              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Password</span>
                <span className="relative block">
                  <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                  <input required minLength={8} type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={updateField("password")} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} className="sa-auth-input pl-10 pr-11" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted)" }} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--muted)" }}>
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="accent-[var(--accent)]" />
                  Keep me signed in
                </label>
                {!isRegister && <button type="button" className="font-medium" style={{ color: "var(--accent-ink)" }}>Forgot password?</button>}
              </div>

              <button type="submit" disabled={isSubmitting} className="sa-btn-accent w-full py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait">
                {isSubmitting ? "Please wait..." : copy.submit}
                <ArrowRight size={16} />
              </button>
            </form>

            <p className="text-center text-sm mt-7" style={{ color: "var(--muted)" }}>
              {copy.switchPrompt}{" "}
              <button type="button" onClick={() => navigateTo(copy.switchPath)} className="font-semibold" style={{ color: "var(--accent-ink)" }}>{copy.switchLabel}</button>
            </p>
          </section>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-6 pb-6 md:px-10 flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>© {new Date().getFullYear()} ExamVault</span>
        <span>Curriculum-grounded exam preparation.</span>
      </footer>
    </div>
  );
}

export default AuthPage;
