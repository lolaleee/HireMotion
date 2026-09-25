import { Link, Outlet } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";

export default function CandidateLayout() {
  return (
    <div className="min-h-screen bg-navy-0 text-ink-0 relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="teal-blob absolute rounded-full opacity-30 blur-[90px] w-[420px] h-[420px] bg-[#2a6f6f] -top-36 -right-24"
          style={{ animation: "driftA 30s ease-in-out infinite" }}
        />
        <div
          className="teal-blob absolute rounded-full opacity-30 blur-[90px] w-[340px] h-[340px] bg-[#1f4f52] -bottom-32 -left-20"
          style={{ animation: "driftB 26s ease-in-out infinite" }}
        />
        <div
          className="teal-blob absolute rounded-full opacity-30 blur-[90px] w-[260px] h-[260px] bg-[#234a5e] top-[45%] left-[55%]"
          style={{ animation: "driftC 34s ease-in-out infinite" }}
        />
      </div>

      <header className="relative z-10 max-w-3xl mx-auto flex items-center justify-between px-6 pt-7">
        <Link to="/" className="text-[1.05rem] font-semibold tracking-tight">
          Hire<span className="text-teal">Motion</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-ink-2">
          <Link to="/">Open roles</Link>
          <Link to="/status">Check status</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
