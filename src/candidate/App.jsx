import { Routes, Route } from "react-router-dom";

import CandidateLayout from "../pages/candidate/CandidateLayout";
import Listings from "../pages/candidate/Listings";
import JobDetail from "../pages/candidate/JobDetail";
import Confirmation from "../pages/candidate/Confirmation";
import StatusCheck from "../pages/candidate/StatusCheck";

export default function CandidateApp() {
  return (
    <Routes>
      <Route element={<CandidateLayout />}>
        <Route path="/" element={<Listings />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/confirmation/:jobId" element={<Confirmation />} />
        <Route path="/status" element={<StatusCheck />} />
      </Route>
    </Routes>
  );
}
