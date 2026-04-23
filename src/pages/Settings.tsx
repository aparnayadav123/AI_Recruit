import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { User, Bell, Building, Shield, Save, Slack, Linkedin, Mail, Check, X, Upload, Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {
  searchQuery?: string;
}

const Settings: React.FC<SettingsProps> = ({ searchQuery = '' }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    firstName: 'Aparna',
    lastName: '',
    email: '',
    profilePic: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // Split name into first and last for the form
      const nameParts = (user.name || '').split(' ');
      setProfileData({
        firstName: nameParts[0] || 'Aparna',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        profilePic: user.profilePicture || '',
      });
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

  // Integrations state
  const [integrations, setIntegrations] = useState({
    linkedin: false,
    slack: true,
    gmail: false,
  });

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
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-700">
      {/* Premium Header Container */}
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-blue-50 shadow-sm transition-all duration-300">
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
          <nav className="flex lg:flex-col gap-1 p-1 bg-white rounded-xl border border-blue-50 shadow-sm sticky top-4">
            {filteredTabs.length === 0 && searchQuery ? (
              <div className="text-center text-gray-400 text-[10px] font-black uppercase py-4">No results</div>
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
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
            <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4 space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Profile Information</h3>
                <p className="text-[10px] text-gray-400 font-bold">Update your personal details and photo.</p>
              </div>

              <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                {profileData.profilePic ? (
                  <img className="h-12 w-12 rounded-lg object-cover border border-blue-100 shadow-sm" src={profileData.profilePic} alt="Profile" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base font-black shadow-sm">
                    {profileData.firstName ? profileData.firstName.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => profilePicInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition"
                  >
                    Upload
                  </button>
                </div>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !profileData.email) return;

                    if (file.size > 2 * 1024 * 1024) {
                      alert('Max 2MB');
                      return;
                    }

                    setIsSaving(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('email', profileData.email);

                    try {
                      const response = await api.put('/users/profile-picture', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });

                      if (response.data) {
                        setProfileData(prev => ({ ...prev, profilePic: response.data.profilePicture }));
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, profilePicture: response.data.profilePicture };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                      }
                    } catch (error) {
                      console.error('Upload failed', error);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
              <div className="flex justify-end pt-2">
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
                      const response = await api.put('/users/profile', {
                        email: profileData.email,
                        name: fullName
                      });

                      if (response.data) {
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          const user = JSON.parse(userData);
                          const updatedUser = { ...user, name: response.data.name };
                          localStorage.setItem('user', JSON.stringify(updatedUser));
                          window.dispatchEvent(new Event('storage'));
                        }
                        alert('Saved!');
                      }
                    } catch (error) {
                      console.error('Save failed', error);
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
            <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Notification Preferences</h3>
                <p className="text-[10px] text-gray-400 font-bold">Manage how you receive alerts.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Applications</h4>
                    <p className="text-[9px] text-gray-400 font-bold">New candidate notifications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.newApplications}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, newApplications: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-200 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Reminders</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Interview alerts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.interviewReminders}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, interviewReminders: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-200 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Reports</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Weekly activity summaries.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.weeklyReports}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-200 rounded"
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-700">Mentions</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Team tag alerts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.teamMentions}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, teamMentions: e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-200 rounded"
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
                        alert('Saved!');
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
              <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-gray-900 uppercase">LinkedIn</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Sync candidates.</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50">Connect</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Slack className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-gray-900 uppercase">Slack</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Team alerts.</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Connected</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-gray-900 uppercase">Gmail</h4>
                    <p className="text-[9px] text-gray-400 font-bold">Sync emails.</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50">Connect</button>
              </div>
            </div>
          )}

          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-50 p-4 space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Company Details</h3>
                <p className="text-[10px] text-gray-400 font-bold">Manage organization settings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Logo</label>
                  <div className="flex items-center gap-3">
                    {companyData.logo ? (
                      <img src={companyData.logo} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-gray-200 p-1" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-300">
                        <Building size={16} />
                      </div>
                    )}
                    <button
                      onClick={() => companyLogoInputRef.current?.click()}
                      className="px-3 py-1.5 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition"
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
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Website</label>
                  <input
                    type="text"
                    value={companyData.website}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={companyData.description}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Headquarters</label>
                  <input
                    type="text"
                    value={companyData.headquarters}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, headquarters: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Size</label>
                  <select
                    value={companyData.size}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
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
                  disabled={isSavingCompany}
                  onClick={async () => {
                    setIsSavingCompany(true);
                    try {
                      const response = await api.put('/company', companyData);
                      if (response.data) {
                        setCompanyData(response.data);
                        alert('Saved!');
                      }
                    } catch (error) {
                      console.error('Save failed', error);
                    } finally {
                      setIsSavingCompany(false);
                    }
                  }}
                  className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition ${isSavingCompany ? 'opacity-70 cursor-not-allowed' : ''}`}
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