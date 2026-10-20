import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);

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
    if (avatarFile) formData.append('avatar', avatarFile);
    try {
      await api.put('/users/me', formData);
      updateUser({ full_name: fullName, avatar_url: avatarPreview });
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
                type="email" disabled value={user?.email || ''}
                className="w-full bg-slate-50 text-xs text-[#64748b] px-3.5 py-2.5 rounded-lg border border-slate-200 cursor-not-allowed"
              />
              <span className="text-[10px] text-[#64748b] mt-0.5 block">
                Email is managed through Louisenlund directory and cannot be changed here.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[#f8fafb] border border-slate-100 text-xs">
                <span className="text-[#64748b] block text-[11px] font-medium">Academic Track</span>
                <span className="font-bold text-[#0f172a] mt-0.5 block">{user?.academic_track || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8fafb] border border-slate-100 text-xs">
                <span className="text-[#64748b] block text-[11px] font-medium">Class / Year</span>
                <span className="font-bold text-[#0f172a] mt-0.5 block">{user?.class_year || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f8fafb] border border-slate-100 text-xs col-span-2">
                <span className="text-[#64748b] block text-[11px] font-medium">Mentor Group</span>
                <span className="font-bold text-[#0f172a] mt-0.5 block">{user?.mentor_group_name || 'No mentor group assigned'}</span>
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
