import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Pin,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import Modal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';
import { getClassesForTrack } from '../../utils/academicTracks';

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  // Create / Edit modal (shared)
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null); // null = create, object = edit
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('school_wide');
  const [targetTrack, setTargetTrack] = useState(user?.academic_track || 'IB');
  const [targetClass, setTargetClass] = useState('');
  const [targetMentorId, setTargetMentorId] = useState('');
  const [mentorsForClass, setMentorsForClass] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  const canPost = user && ['super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee', 'mentor'].includes(user.role);

  // Scope options available per role
  const canPostSchoolWide = ['super_admin', 'sv_committee', 'teacher'].includes(user?.role);
  const canPostTrack      = ['super_admin', 'sv_committee', 'teacher', 'student_leader', 'committee'].includes(user?.role);
  const canPostMentorGroup = user?.role === 'mentor';

  const fetchMentorsForClass = async (track, classYr) => {
    if (!track || !classYr) { setMentorsForClass([]); setTargetMentorId(''); return; }
    setLoadingMentors(true);
    try {
      const res = await api.get(`/users/mentors?academic_track=${track}&class_year=${encodeURIComponent(classYr)}`);
      setMentorsForClass(res.data || []);
      setTargetMentorId('');
    } catch {
      setMentorsForClass([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  const openCreateModal = () => {
    setEditingAnn(null);
    // Default scope based on role
    const defaultScope = canPostSchoolWide ? 'school_wide' : canPostTrack ? 'academic_track' : 'mentor_group';
    setTitle(''); setBody(''); setScope(defaultScope);
    setTargetTrack(user?.academic_track || 'IB'); setTargetClass('');
    setTargetMentorId(''); setMentorsForClass([]);
    setIsPinned(false); setIsUrgent(false);
    setShowModal(true);
  };

  const openEditModal = (ann) => {
    setEditingAnn(ann);
    setTitle(ann.title || '');
    setBody(ann.body || '');
    setScope(ann.scope || 'school_wide');
    setTargetTrack(ann.target_track || user?.academic_track || 'IB');
    setTargetClass(ann.target_class || '');
    setTargetMentorId('');
    setMentorsForClass([]);
    setIsPinned(ann.is_pinned || false);
    setIsUrgent(ann.is_urgent || false);
    setShowModal(true);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnnouncement = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSubmitting(true);
    const payload = {
      title, body, scope,
      target_track: scope === 'academic_track' ? targetTrack : null,
      target_class: scope === 'academic_track' && targetClass ? targetClass : null,
      target_mentor_id: scope === 'academic_track' && targetClass && targetMentorId ? targetMentorId : null,
      target_mentor_group_id: scope === 'mentor_group' ? user?.mentor_group_id : null,
      is_pinned: isPinned,
      is_urgent: isUrgent,
    };
    try {
      if (editingAnn) {
        await api.put(`/announcements/${editingAnn.id}`, payload);
        toast.success('Announcement updated!');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement broadcasted!');
      }
      setShowModal(false);
      setEditingAnn(null);
      setTitle(''); setBody(''); setIsPinned(false); setIsUrgent(false);
      setTargetClass(''); setTargetMentorId(''); setMentorsForClass([]);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || (editingAnn ? 'Failed to update' : 'Failed to post announcement'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    try {
      await api.delete(`/announcements/${confirmState.id}`);
      toast.success('Announcement removed');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Could not delete announcement');
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const filtered = announcements.filter((a) =>
    activeTab === 'all' ? true : a.scope === activeTab
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
              {t('announcements.title', 'Announcements')}
            </h1>

          </div>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            Centralised updates replacing scattered WhatsApp groups across school, tracks, and mentor groups.
          </p>
        </div>

        {canPost && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('New announcement')}</span>
          </button>
        )}
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: t('announcements.all', 'All') },
          { key: 'school_wide', label: t('announcements.schoolWide', 'School-wide') },
          { key: 'academic_track', label: `${user?.academic_track || 'Academic'} Track` },
          { key: 'mentor_group', label: t('announcements.mentorGroup', 'Mentor Group') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#1a2b49] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Loading announcements...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-200">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0f172a]">No announcements in this category</p>
          <p className="text-xs text-[#64748b] mt-1">Check back later or view all announcements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => (
            <div
              key={ann.id}
              className={`p-6 rounded-lg bg-white border transition-all ${
                ann.is_urgent
                  ? 'border-red-200 bg-red-50/20'
                  : ann.is_pinned
                  ? 'border-[#2383c9]/30 bg-[#e4f2fe]/20'
                  : 'border-slate-200/70'
              } shadow-xs`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#e4f2fe] text-[#2383c9]">
                    {ann.scope.replace('_', ' ')}
                  </span>
                  {ann.target_track && (
                    <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600">
                      {ann.target_track} {ann.target_class ? `• ${ann.target_class}` : ''}
                    </span>
                  )}
                  {ann.is_pinned && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#f97316]">
                      <Pin className="w-2.5 h-2.5 fill-[#f97316]" />
                      Pinned
                    </span>
                  )}
                  {ann.is_urgent && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Urgent
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#64748b]">
                    {ann.created_at ? format(new Date(ann.created_at), 'd MMM yyyy, HH:mm') : ''}
                  </span>
                  {(user?.id === ann.created_by || user?.role === 'super_admin') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(ann)}
                        className="p-1.5 text-[#64748b] hover:text-[#2383c9] hover:bg-[#e4f2fe] rounded-lg transition-colors"
                        title="Edit announcement"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 text-[#64748b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-base md:text-lg font-bold text-[#0f172a] mt-3">{ann.title}</h2>
              <p className="text-xs md:text-sm text-[#64748b] mt-2 leading-relaxed whitespace-pre-line">
                {ann.body}
              </p>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748b]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center font-bold text-[10px] overflow-hidden">
                    {ann.author_avatar ? (
                      <img src={ann.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      ann.author_name?.charAt(0) || 'A'
                    )}
                  </div>
                  <span className="font-medium text-[#0f172a]">{ann.author_name || 'Campus Admin'}</span>
                </div>
                <span className="text-[11px] text-[#64748b]">Stiftung Louisenlund</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth="max-w-lg">
          <div className="p-6 space-y-5 font-['Outfit']">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[18px] text-[#0f172a]">{editingAnn ? 'Edit Announcement' : 'New Announcement'}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Autumn Donation Drive Starts Monday"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Audience</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                >
                  {canPostSchoolWide && <option value="school_wide">School-wide (All Students & Staff)</option>}
                  {canPostTrack && <option value="academic_track">Academic Track</option>}
                  {canPostMentorGroup && <option value="mentor_group">My Mentor Group</option>}
                </select>
              </div>

              {scope === 'academic_track' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Target Track</label>
                    <select
                      value={targetTrack}
                      onChange={(e) => {
                        setTargetTrack(e.target.value);
                        setTargetClass('');
                        setMentorsForClass([]);
                        setTargetMentorId('');
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                    >
                      <option value="IB">IB</option>
                      <option value="MINT">MINT</option>
                      <option value="Abitur">Abitur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Target Class / Year Level</label>
                    <select
                      value={targetClass}
                      onChange={(e) => {
                        const cls = e.target.value;
                        setTargetClass(cls);
                        if (cls) fetchMentorsForClass(targetTrack, cls);
                        else { setMentorsForClass([]); setTargetMentorId(''); }
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                    >
                      <option value="">All Classes in {targetTrack}</option>
                      {getClassesForTrack(targetTrack).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {targetClass && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Mentor Group</label>
                      {loadingMentors ? (
                        <div className="text-xs text-[#64748b] py-1">Loading mentor groups...</div>
                      ) : mentorsForClass.length > 0 ? (
                        <select
                          value={targetMentorId}
                          onChange={(e) => setTargetMentorId(e.target.value)}
                          className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                        >
                          <option value="">All mentor groups in {targetClass}</option>
                          {mentorsForClass.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name}'s Group</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-[#64748b] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          No mentor groups found for {targetTrack} / {targetClass}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Message</label>
                <textarea
                  rows={5}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the announcement details..."
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-[#0f172a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-[#2383c9]"
                  />
                  <Pin className="w-3 h-3 text-[#f97316]" />
                  <span>Pin to top</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#0f172a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded text-red-500"
                  />
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>Mark as Urgent</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {submitting ? (editingAnn ? 'Saving...' : 'Broadcasting...') : (editingAnn ? 'Save Changes' : 'Publish Announcement')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={confirmState.open}
        title="Delete announcement?"
        message="This will permanently remove this announcement for all students."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
