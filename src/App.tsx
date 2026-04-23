import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

// Import Pages (Assuming these exist in src/pages)
import Dashboard from './pages/Dashboard';
import JobManagement from './pages/Jobs';
import Candidates from './pages/Candidates';
import ResumeUpload from './pages/ResumeUpload';
import SkillsMatrix from './pages/SkillsMatrix';
import ShortlistReport from './pages/ShortlistReport';
import InterviewPipeline from './pages/InterviewPipeline';
import Settings from './pages/Settings';
import Unauthorized from './pages/Unauthorized';
import LinkedInAgent from './pages/LinkedInAgent';
import CandidateDetails from './pages/CandidateDetails';
import Inbox from './pages/Inbox';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<JobManagement />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateDetails />} />
          <Route path="resume-upload" element={<ResumeUpload />} />
          <Route path="skills-matrix" element={<SkillsMatrix />} />
          <Route path="shortlist-report" element={<ShortlistReport />} />
          <Route path="interview-pipeline" element={<InterviewPipeline />} />
          <Route path="settings" element={<Settings />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="linkedin-agent" element={<LinkedInAgent />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
