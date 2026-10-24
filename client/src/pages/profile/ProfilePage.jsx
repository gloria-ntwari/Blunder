import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getClassesForTrack } from '../../utils/academicTracks';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [academicTrack, setAcademicTrack] = useState(user?.academic_track || '');
  const [classYear, setClassYear] = useState(user?.class_year || '');
  const [mentorGroupId, setMentorGroupId] = useState(user?.mentor_group_id || '');
  const [mentorGroups, setMentorGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadGroups = async () => {
      if (!academicTrack) {
        setMentorGroups([]);
        return;
      }
      setLoadingGroups(true);
      try {
        const query = classYear
          ? `?academic_track=${encodeURIComponent(academicTrack)}&class_year=${encodeURIComponent(classYear)}`
          : `?academic_track=${encodeURIComponent(academicTrack)}`;
        const res = await api.get(`/mentor-groups${query}`);
        if (active) setMentorGroups(res.data || []);
      } catch {
        if (active) setMentorGroups([]);
      } finally {
        if (active) setLoadingGroups(false);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, [academicTrack, classYear]);

  const handleAvatarChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('email', email);
    formData.append('academic_track', academicTrack);
    formData.append('class_year', classYear);
    formData.append('mentor_group_id', mentorGroupId);
    if (avatarFile) formData.append('avatar', avatarFile);
    try {
      const { data } = await api.put('/users/me', formData);
      const updatedUser = data.user;
      updateUser(updatedUser);
      setAvatarPreview(updatedUser.avatar_url || '');
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div>
        <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
          {t('profile.title', 'My Profile')}
        </h1>
        <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
          Manage your personal details and view your campus affiliations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Avatar Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200/70 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-white shadow-md">
              {avatarPreview ? (
                <img src={avatarPreview} alt={user?.full_name} className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[#2383c9] text-white hover:bg-[#1a6ba8] transition-colors shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div>
            <h2 className="font-bold text-base text-[#0f172a]">{user?.full_name}</h2>
            <p className="text-xs text-[#64748b] mt-0.5">{user?.email}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e4f2fe] text-[#2383c9]">
              {user?.role?.replace('_', ' ')}
            </span>
            {user?.academic_track && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600">
                {user.academic_track}
              </span>
            )}
          </div>

          <div className="w-full pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-lg border border-red-100 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Right: Profile Details Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg border border-slate-200/70 shadow-xs space-y-6">
          <h3 className="font-bold text-[20px] leading-[28px] text-[#0f172a]">Profile Information</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                {t('profile.fullName', 'Full name')}
              </label>
              <input
                type="text" required value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                {t('profile.email', 'Email address')}
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f8fafb] text-xs text-[#0f172a] px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Academic Track</label>
                <select value={academicTrack} onChange={(e) => { setAcademicTrack(e.target.value); setClassYear(''); setMentorGroupId(''); }}
                  className="w-full bg-[#f8fafb] text-xs text-[#0f172a] px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                  <option value="">Not assigned</option>
                  {['IB', 'MINT', 'Abitur'].map((track) => <option key={track} value={track}>{track}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Class / Year</label>
                <select value={classYear} onChange={(e) => { setClassYear(e.target.value); setMentorGroupId(''); }} disabled={!academicTrack}
                  className="w-full bg-[#f8fafb] text-xs text-[#0f172a] px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9] disabled:opacity-50">
                  <option value="">Not assigned</option>
                  {getClassesForTrack(academicTrack).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Mentor Group</label>
                <select value={mentorGroupId} onChange={(e) => setMentorGroupId(e.target.value)} disabled={!academicTrack || loadingGroups}
                  className="w-full bg-[#f8fafb] text-xs text-[#0f172a] px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9] disabled:opacity-50">
                  <option value="">No mentor group assigned</option>
                  {mentorGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit" disabled={saving}
                className="px-5 py-2.5 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {saving ? 'Saving...' : t('profile.saveChanges', 'Save changes')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
