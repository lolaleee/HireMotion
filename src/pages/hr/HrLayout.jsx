import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

const NAV = [
  { to: "/hr/postings", label: "Job postings" },
  { to: "/hr/applications", label: "Applications" },
  { to: "/hr/interviews", label: "Interviews" },
  { to: "/hr/pool", label: "Talent pool" },
  { to: "/hr/settings", label: "Settings" },
];

export default function HrLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleSignOut() {
    await supabase?.auth.signOut();
    navigate("/hr/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-navy-0 text-ink-0 flex flex-col md:flex-row">
      <aside className="w-full md:w-[200px] flex-shrink-0 bg-navy-1 border-b md:border-b-0 md:border-r border-[var(--card-border)] p-4 md:p-6 flex md:block items-center justify-between">
        <Link to="/hr/postings" className="text-[1rem] font-semibold tracking-tight md:block md:mb-6 px-0 md:px-2">
          Hire<span className="text-teal">Motion</span>
        </Link>
        <nav className="flex md:block gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block whitespace-nowrap px-2.5 py-2 rounded-lg text-sm mb-0 md:mb-0.5 ${
                  isActive ? "bg-navy-2 text-ink-0" : "text-ink-2"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={handleSignOut} className="mt-4 w-full text-left px-2.5 py-2 text-sm text-ink-2 hover:text-ink-0">
          Sign out{user?.email ? ` (${user.email})` : ""}
        </button>
      </aside>

      <div className="flex-1 min-w-0 p-4 md:p-8 pb-20">
        <Outlet />
      </div>
    </div>
  );
}
