import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Login from "./pages/hr/Login";
import { useAuth } from "./lib/AuthContext";

import CandidateLayout from "./pages/candidate/CandidateLayout";
import Listings from "./pages/candidate/Listings";
import JobDetail from "./pages/candidate/JobDetail";
import Confirmation from "./pages/candidate/Confirmation";
import StatusCheck from "./pages/candidate/StatusCheck";

import HrLayout from "./pages/hr/HrLayout";
import JobPostings from "./pages/hr/JobPostings";
import Applications from "./pages/hr/Applications";
import ApplicantDetail from "./pages/hr/ApplicantDetail";
import Interviews from "./pages/hr/Interviews";
import TalentPool from "./pages/hr/TalentPool";
import Settings from "./pages/hr/Settings";

export default function App() {
  return (
    <Routes>
      {/* Candidate site — public */}
      <Route element={<CandidateLayout />}>
        <Route path="/" element={<Listings />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/confirmation/:jobId" element={<Confirmation />} />
        <Route path="/status" element={<StatusCheck />} />
      </Route>

      <Route path="/hr/login" element={<Login />} />
      <Route path="/hr" element={<ProtectedRoute />}>
        <Route element={<HrLayout />}>
          <Route index element={<Navigate to="postings" replace />} />
          <Route path="postings" element={<JobPostings />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:applicationId" element={<ApplicantDetail />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="pool" element={<TalentPool />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}

function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-navy-0" />;
  if (!user || !profile || !["owner", "hr"].includes(profile.role)) return <Navigate to="/hr/login" replace state={{ from: location }} />;

  return <Outlet />;
}
