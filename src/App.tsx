import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { SearchProvider } from './contexts/SearchContext';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import CareersPublic from './pages/CareersPublic';

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
import CandidateHistory from './pages/CandidateHistory';
import RejectedCandidates from './pages/RejectedCandidates';
import SuggestedCandidates from './pages/SuggestedCandidates';
import ApplicationTracker from './pages/ApplicationTracker';
import Reports from './pages/Reports';
import Inbox from './pages/Inbox';
import DeletionRequests from './pages/DeletionRequests';

const App: React.FC = () => {
  return (
    <Router>
      <SearchProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/careers" element={<CareersPublic />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<JobManagement />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:id" element={<CandidateDetails />} />
          <Route path="candidates/:id/history" element={<CandidateHistory />} />
          <Route path="resume-upload" element={<ResumeUpload />} />
          <Route path="skills-matrix" element={<SkillsMatrix />} />
          <Route path="shortlist-report" element={<ShortlistReport />} />
          <Route path="interview-pipeline" element={<InterviewPipeline />} />
          <Route path="suggested-candidates" element={<SuggestedCandidates />} />
          <Route path="rejected-candidates" element={<RejectedCandidates />} />
          <Route path="application-tracker" element={<ApplicationTracker />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="linkedin-agent" element={<LinkedInAgent />} />
          <Route path="deletion-requests" element={<DeletionRequests />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </SearchProvider>
    </Router>
  );
};

export default App;
