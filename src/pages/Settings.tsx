import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { useIsManager } from '../roles';
import { User, Bell, Building, Shield, Save, Slack, Linkedin, Mail, CheckCircle2, Lock, Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {
  searchQuery?: string;
}

// ── LinkedIn integration card — extracted to honour React's hooks rules ──
interface LinkedInCardProps {
  connected: boolean;
  busy: boolean;
  isManager: boolean;
  onToggle: () => void;
  onShowToast: (msg: string) => void;
}
const LinkedInIntegrationCard: React.FC<LinkedInCardProps> = ({ connected, busy, isManager, onToggle, onShowToast }) => {
  const [showGuide, setShowGuide] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const copyToken = () => {
    try {
      const raw = localStorage.getItem('token') || localStorage.getItem('jwt') || '';
      const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {} as Record<string,string>; } })();
      const token = raw || (user as Record<string,string>).token || (user as Record<string,string>).jwt || '';
      if (!token) {
        onShowToast('No active session token found. Please log out and log back in.');
        return;
      }
      navigator.clipboard.writeText(token).then(() => {
        setTokenCopied(true);
        onShowToast('JWT token copied! Paste it into the extension popup.');
        setTimeout(() => setTokenCopied(false), 3000);
      });
    } catch {
      onShowToast('Could not copy token. Please copy manually from the browser console.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
      {/* Header row */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Linkedin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-gray-900 uppercase flex items-center gap-2">
              LinkedIn
              {connected && (
                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5 uppercase tracking-widest">
                  ● Connected
                </span>
              )}
            </h4>
            <p className="text-[9px] text-gray-600 font-bold">Chrome extension — extract profiles directly from LinkedIn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide(g => !g)}
            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            {showGuide ? 'Hide Guide' : 'Setup Guide'}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={busy || !isManager}
            title={!isManager ? 'HR Manager access required' : ''}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              connected
                ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100'
            }`}
          >
            {busy ? '…' : (connected ? 'Disconnect' : 'Connect')}
          </button>
        </div>
      </div>

      {/* Expandable install guide */}
      {showGuide && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">How to install &amp; connect</p>
            <ol className="space-y-2">
              {[
                { n: '1', text: 'The extension folder is linkedin-extension/ inside this project directory.' },
                { n: '2', text: 'Open Chrome → type chrome://extensions in the address bar.' },
                { n: '3', text: 'Enable Developer Mode (toggle, top-right corner), then click Load unpacked.' },
                { n: '4', text: 'Select the linkedin-extension/ folder. The RecruitAI icon appears in your toolbar.' },
                { n: '5', text: 'Copy your JWT token below and paste it into the extension popup to authenticate.' },
              ].map(s => (
                <li key={s.n} className="flex gap-2.5 items-start">
                  <span className="min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center mt-0.5">{s.n}</span>
                  <span className="text-[10px] text-slate-700 font-medium leading-relaxed">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* JWT copy widget */}
          <div className="bg-white border border-slate-300 rounded-lg p-3 space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Your Session Token</p>
            <p className="text-[10px] text-slate-600 font-medium">Copy this token and paste it into the extension popup to authenticate.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyToken}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                  tokenCopied
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {tokenCopied ? (<><CheckCircle2 className="w-3 h-3" /> Copied!</>) : <>Copy JWT Token</>}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">
              Token is tied to your current session. Re-copy after logging out and back in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ searchQuery = '' }) => {

  const [activeTab, setActiveTab] = useState('profile');
  // Company & Integrations are HR Manager-only to edit (FR-901, BR-09).
  // Recruiters can view but not change them. Profile & Notifications stay personal/editable.
  const isManager = useIsManager();

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profilePic: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  // Field-level validation error for the profile email input (SET-002 / FR-902).
  const [emailError, setEmailError] = useState('');
  // The email the account is currently identified by (may differ from the edited value).
  const [originalEmail, setOriginalEmail] = useState('');

  // Standard email shape: non-space local part, "@", domain with a dot.
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // Split name into first and last for the form
      const nameParts = (user.name || '').split(' ');
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        profilePic: user.profilePicture || '',
      });
      setOriginalEmail(user.email || '');
      if (user.notificationPreferences) {
        setNotificationPrefs(user.notificationPreferences);
      }
    }

    // Fetch company data
    const fetchCompanyData = async () => {
      try {
        const response = await api.get('/company');
        if (response.data && response.data.name) {
          setCompanyData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch company data', error);
      }
    };
    fetchCompanyData();
  }, []);

  // Company state
  const [companyData, setCompanyData] = useState({
    logo: '',
    name: '',
    website: '',
    description: '',
    headquarters: '',
    size: '1-50 employees',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notificationPrefs, setNotificationPrefs] = useState({
    newApplications: true,
    interviewReminders: true,
    weeklyReports: true,
    teamMentions: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Integrations state â€” loaded from /api/users/integrations
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    linkedin: false,
    slack: false,
    gmail: false,
  });
  const [togglingIntegration, setTogglingIntegration] = useState<string | null>(null);

  // Inline success toast (replaces blocking alert() calls)
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Fetch integrations whenever we know the email
  useEffect(() => {
    if (!profileData.email) return;
    (async () => {
      try {
        const r = await api.get('/users/integrations', { params: { email: profileData.email } });
        if (r.data && typeof r.data === 'object') {
          setIntegrations(prev => ({ ...prev, ...r.data }));
        }
      } catch (e) {
        // Endpoint may 404 for guest accounts â€” fall back to defaults silently
      }
    })();
  }, [profileData.email]);

  const toggleIntegration = async (name: string) => {
    if (!isManager) {
      showToast('Only an HR Manager can change integrations.');
      return;
    }
    if (!profileData.email) {
      showToast('Sign in first to manage integrations.');
      return;
    }
    const next = !integrations[name];
    setTogglingIntegration(name);
    // Optimistic update
    setIntegrations(prev => ({ ...prev, [name]: next }));
    try {
      await api.patch(`/users/integrations/${name}`, null, {
        params: { email: profileData.email, enabled: next },
      });
      showToast(next ? `${capitalize(name)} connected` : `${capitalize(name)} disconnected`);
    } catch (e) {
      // Revert on failure
      setIntegrations(prev => ({ ...prev, [name]: !next }));
      showToast(`Failed to update ${name}.`);
    } finally {
      setTogglingIntegration(null);
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Shield },
  ];

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const filteredTabs = tabs.filter(tab => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(query) || tab.id.toLowerCase().includes(query);
  });

  // Show search results message if searching
  const showSearchResults = searchQuery && (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p className="text-sm text-yellow-800">
        Searching for: <strong>{searchQuery}</strong>
      </p>
      <p className="text-xs text-yellow-600 mt-1">
        {filteredTabs.length > 0
          ? `Found ${filteredTabs.length} matching section(s)`
          : 'No matching sections found'}
      </p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-700 relative">
      {/* Inline toast for save / integration feedback */}
      {toast && (
        <div className="fixed top-20 right-6 z-[120] bg-white border border-emerald-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-black text-slate-700 tracking-tight">{toast}</span>
        </div>
      )}
      {/* Premium Header Container */}
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-100/50">
            <SettingsIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 leading-none">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">System Control</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Settings</h2>
          </div>
        </div>
      </div>

      {showSearchResults}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Tabs with Premium Active State */}
        <aside className="lg:w-44 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 p-1 bg-white rounded-xl border border-slate-300 shadow-sm sticky top-4">
            {filteredTabs.length === 0 && searchQuery ? (
              <div className="text-center text-gray-600 text-[10px] font-black uppercase py-4">No results</div>
            ) : (
              filteredTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black rounded-lg transition-all duration-300
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'text-slate-600 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <tab.icon size={14} />
                    <span className="uppercase tracking-widest leading-none">{highlightText(tab.label)}</span>
                  </button>
                );
              }))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Profile Information</h3>
                <p className="text-[10px] text-gray-600 font-bold">Update your personal details and photo.</p>
              </div>

              <div className="flex items-center gap-4 pb-4 border-b border-slate-300">
                <div
                  onClick={() => profilePicInputRef.current?.click()}
                  className="cursor-pointer group relative rounded-lg overflow-hidden shrink-0"
                  title="Click to upload profile photo"
                >
                  {profileData.profilePic ? (
                    <img className="h-12 w-12 rounded-lg object-cover border border-blue-100 shadow-sm group-hover:opacity-80 transition" src={profileData.profilePic} alt="Profile" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base font-black shadow-sm group-hover:bg-blue-700 transition">
                      {profileData.firstName ? profileData.firstName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => profilePicInputRef.current?.click()}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    {isSaving ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const targetEmail = profileData.email || originalEmail || (() => {
                      try { return JSON.parse(localStorage.getItem('user') || '{}').email; } catch { return ''; }
                    })();

                    if (!targetEmail) {
                      alert('Please specify your email address first.');
                      return;
                    }

                    if (file.size > 2 * 1024 * 1024) {
                      alert('File size too large. Please select an image under 2MB.');
                      e.target.value = '';
                      return;
                    }

                    setIsSaving(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('email', targetEmail);

                    try {
                      // NOTE: do NOT set Content-Type here. Letting the browser serialize the
                      // FormData adds the required `multipart/form-data; boundary=…` header.
                      const response = await api.put('/users/profile-picture', formData);

                      if (response.data) {
                        const newPic = response.data.profilePicture;
                        setProfileData(prev => ({ ...prev, profilePic: newPic }));
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, profilePicture: newPic };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                          window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
                        }
                        showToast('Profile photo updated successfully');
                      }
                    } catch (error) {
                      console.error('Upload failed', error);
                      alert('Failed to upload profile picture. Please try again.');
                    } finally {
                      setIsSaving(false);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    aria-invalid={!!emailError}
                    onChange={(e) => { setProfileData(prev => ({ ...prev, email: e.target.value })); if (emailError) setEmailError(''); }}
                    className={`w-full px-3 py-2 border rounded-lg text-[11px] font-bold outline-none focus:ring-1 ${emailError ? 'border-rose-400 ring-1 ring-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'}`}
                  />
                  {emailError && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600">{emailError}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
              <div className="flex justify-end pt-2">
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    // Reject an invalid email format before hitting the API — no save.
                    if (!isValidEmail(profileData.email)) {
                      setEmailError('Please enter a valid email address.');
                      return;
                    }
                    setEmailError('');
                    setIsSaving(true);
                    try {
                      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
                      const response = await api.put('/users/profile', {
                        email: profileData.email,
                        name: fullName
                      }, {
                        // Identify the account by its current email so an email change persists.
                        params: { currentEmail: originalEmail || profileData.email },
                      });

                      if (response.data) {
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = {
                            ...user,
                            name: response.data.name,
                            email: response.data.email,
                          };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                        // The new email is now the account identifier for subsequent saves.
                        setOriginalEmail(response.data.email);
                        setProfileData(prev => ({ ...prev, email: response.data.email }));
                        showToast('Saved successfully');
                      }
                    } catch (error: any) {
                      // Surface a server-side rejection (e.g. invalid email) at the field.
                      const data = error?.response?.data;
                      const msg = typeof data === 'string' ? data : data?.message;
                      if (error?.response?.status === 400) {
                        setEmailError(msg || 'Please enter a valid email address.');
                      } else {
                        console.error('Save failed', error);
                      }
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Notification Preferences</h3>
                <p className="text-[10px] text-gray-600 font-bold">Manage how you receive alerts.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2 border-b border-slate-300">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Applications</h4>
                    <p className="text-[9px] text-gray-600 font-bold">New candidate notifications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.newApplications}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, newApplications: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-300">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Reminders</h4>
                    <p className="text-[9px] text-gray-600 font-bold">Interview alerts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.interviewReminders}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, interviewReminders: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-300">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Reports</h4>
                    <p className="text-[9px] text-gray-600 font-bold">Weekly activity summaries.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.weeklyReports}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Mentions</h4>
                    <p className="text-[9px] text-gray-600 font-bold">Team tag alerts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.teamMentions}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, teamMentions: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  disabled={isSavingNotifications}
                  onClick={async () => {
                    if (!profileData.email) return;
                    setIsSavingNotifications(true);
                    try {
                      const response = await api.put(`/users/notification-preferences?email=${profileData.email}`, notificationPrefs);
                      if (response.data) {
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, notificationPreferences: response.data.notificationPreferences };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                        showToast('Saved successfully');
                      }
                    } catch (error) {
                      console.error('Save failed', error);
                    } finally {
                      setIsSavingNotifications(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition ${isSavingNotifications ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* INTEGRATIONS TAB */}
                  {activeTab === 'integrations' && (
                    <div className="space-y-3">
                      {!isManager && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">View only — HR Manager access required to change integrations.</span>
                        </div>
                      )}

                      {/* ── LinkedIn Card (enhanced with JWT + install guide) ── */}
                      <LinkedInIntegrationCard
                        connected={!!integrations['linkedin']}
                        busy={togglingIntegration === 'linkedin'}
                        isManager={isManager}
                        onToggle={() => toggleIntegration('linkedin')}
                        onShowToast={(msg) => showToast(msg)}
                      />


                      {/* ── Other integrations (Slack, Gmail) ── */}
                      {[
                        { key: 'slack', label: 'Slack', desc: 'Send team alerts to a channel', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', icon: <Slack className="w-5 h-5" /> },
                        { key: 'gmail', label: 'Gmail', desc: 'Send and track candidate email', iconBg: 'bg-red-50',    iconColor: 'text-red-600',    icon: <Mail className="w-5 h-5" /> },
                      ].map(item => {
                        const connected = !!integrations[item.key];
                        const busy = togglingIntegration === item.key;
                        return (
                          <div key={item.key} className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${item.iconBg} rounded-lg ${item.iconColor}`}>{item.icon}</div>
                              <div>
                                <h4 className="text-[11px] font-black text-gray-900 uppercase flex items-center gap-2">
                                  {item.label}
                                  {connected && (
                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5 uppercase tracking-widest">
                                      ● Connected
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[9px] text-gray-600 font-bold">{item.desc}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleIntegration(item.key)}
                              disabled={busy || !isManager}
                              title={!isManager ? 'HR Manager access required' : ''}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                connected
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                                  : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100'
                              }`}
                            >
                              {busy ? '…' : (connected ? 'Disconnect' : 'Connect')}
                            </button>
                          </div>
                        );
                      })}

                      <p className="text-[9px] font-bold text-slate-400 text-center pt-2 uppercase tracking-widest">
                        Integration state is saved to your user profile.
                      </p>
                    </div>
                  )}

                  {/* COMPANY TAB */}
                  {activeTab === 'company' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 space-y-5">
                      <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Company Details</h3>
                <p className="text-[10px] text-gray-600 font-bold">Manage organization settings.</p>
              </div>

              {!isManager && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">View only — HR Manager access required to edit company details.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Logo</label>
                  <div className="flex items-center gap-3">
                    {companyData.logo ? (
                      <img src={companyData.logo} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-slate-300 p-1" />
                    ) : (
                      <img src="/oryfolks-logo.webp" alt="OryFolks" className="h-10 w-auto max-w-[170px] rounded-lg object-contain border border-slate-300 bg-white p-1" />
                    )}
                    <button
                      onClick={() => companyLogoInputRef.current?.click()}
                      disabled={!isManager}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Logo
                    </button>
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setCompanyData(prev => ({ ...prev, logo: reader.result as string }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyData.name}
                    disabled={!isManager}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Website</label>
                  <input
                    type="text"
                    value={companyData.website}
                    disabled={!isManager}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={companyData.description}
                    disabled={!isManager}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Headquarters</label>
                  <input
                    type="text"
                    value={companyData.headquarters}
                    disabled={!isManager}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, headquarters: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Size</label>
                  <select
                    value={companyData.size}
                    disabled={!isManager}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option>1-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  disabled={isSavingCompany || !isManager}
                  onClick={async () => {
                    if (!isManager) return; // HR Manager-only (FR-901, BR-09)
                    setIsSavingCompany(true);
                    try {
                      const response = await api.put('/company', companyData);
                      if (response.data) {
                        setCompanyData(response.data);
                        showToast('Saved successfully');
                      }
                    } catch (error) {
                      console.error('Save failed', error);
                    } finally {
                      setIsSavingCompany(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition ${(isSavingCompany || !isManager) ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingCompany ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;