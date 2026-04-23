export type ViewState = 'dashboard' | 'jobs' | 'candidates' | 'resume-upload' | 'skills-matrix' | 'shortlist' | 'settings';

export interface Candidate {
  id: string;
  sequenceId?: number;
  name: string;
  role: string;
  email: string;
  experience: number; // years
  status: 'New' | 'Screening' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected' | 'Hired';
  fitScore: number;
  skills: string[];
  avatar: string;
  appliedDate: string;
  source?: string;
  resumeId?: string;
  phone?: string;
  confidenceScore?: number;
  auditLogId?: string;
  matchReason?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewType?: 'Video Call' | 'In-Person' | 'Phone';
  interviewNotes?: string;
  interviewMeetingLink?: string;
  rejectionReason?: string;
  jobId?: string;
  interviewRound?: 'Screening' | 'Technical' | 'Managerial' | 'HR';
  roundStatus?: 'Scheduled' | 'Feedback Pending' | 'Passed' | 'Rejected';
  // New detailed fields
  currentOrganization?: string;
  noticePeriod?: number;
  postalCode?: string;
  currentEmploymentStatus?: string;
  languageSkills?: string[];
  currentSalary?: string;
  salaryExpectation?: string;
  relevantExperience?: number;
  country?: string;
  availableFrom?: string;
  salaryType?: string;
  locality?: string;
  willingToRelocate?: boolean;
  summary?: string;
  hotlist?: string;
  assignedBy?: string;
  jobAssignedBy?: string;
  assignedTo?: string;
  uploadedBy?: string;
  japaneseLanguageProficiency?: string;
  visaType?: string;
  visaValidity?: string;
  reasonForChange?: string;
  recentlyAppliedCompanies?: string;
  createdAt?: string;
  updatedAt?: string;
  socialLinks?: { platform: string; url: string }[];
}

export interface SkillWeight {
  name: string;
  weight: number;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  applicants: number;
  status: string;
  postedDate: string;
  description: string;
  company: string;
  salary: string;
  experienceLevel: string;
  remote: boolean;
  skills: SkillWeight[];
  education: string[];
  industry: string;
  benefits: string[];
  deadline: string;
}

export interface SkillMetric {
  skill: string;
  proficiency: number; // 0-100
}

export interface CandidateSkillMatrix {
  candidateId: string;
  candidateName: string;
  metrics: SkillMetric[];
  totalScore: number;
}

export interface JobApplication {
  id: string;
  candidateId: string;
  jobId: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN' | 'NOT_ELIGIBLE';
  appliedDate: string;
  resumeUrl?: string;
  coverLetter?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  stage?: string;
  stageDate?: string;
  remarks?: string;
  job?: Job; // Optional nested job details for UI
}

export interface Interview {
  id?: string;
  candidateId: string;
  candidateName: string;
  startTime: string; // ISO format
  endTime: string; // ISO format
  type: string;
  interviewer: string;
  notes?: string;
  status?: string;
  meetingLink?: string;
}
