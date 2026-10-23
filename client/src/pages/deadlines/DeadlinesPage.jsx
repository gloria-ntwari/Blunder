import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Plus,
  X,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';

import Modal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';
import { getClassesForTrack } from '../../utils/academicTracks';

export default function DeadlinesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [deadlines, setDeadlines] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('personal');
  const [track, setTrack] = useState(user?.academic_track || 'IB');
  const [targetClass, setTargetClass] = useState('');
  const [targetMentorId, setTargetMentorId] = useState('');
  const [mentorsForClass, setMentorsForClass] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  const isAdmin = user && ['super_admin', 'sv_committee', 'teacher', 'student_leader'].includes(user.role);

  const fetchMentorsForClass = async (tr, classYr) => {
    if (!tr || !classYr) { setMentorsForClass([]); setTargetMentorId(''); return; }
    setLoadingMentors(true);
    try {
      const res = await api.get(`/users/mentors?academic_track=${tr}&class_year=${encodeURIComponent(classYr)}`);
      setMentorsForClass(res.data || []);
      setTargetMentorId('');
    } catch {
      setMentorsForClass([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  useEffect(() => { fetchDeadlines(); }, []);

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deadlines');
      setDeadlines(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !dueDate) return;
    setSubmitting(true);
    try {
      await api.post('/deadlines', {
        title, description,
        due_date: dueDate,
        type: isAdmin ? type : 'personal',
        track: type === 'academic' ? track : null,
        target_class: type === 'academic' && targetClass ? targetClass : null,
        target_mentor_id: type === 'academic' && targetClass && targetMentorId ? targetMentorId : null,
      });
      toast.success('Deadline saved!');
      setShowModal(false);
      setTitle(''); setDescription(''); setTargetClass(''); setTargetMentorId(''); setMentorsForClass([]);
      fetchDeadlines();
    } catch (err) {
      toast.error('Could not create deadline');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    try {
      await api.delete(`/deadlines/${confirmState.id}`);
      toast.success('Deadline removed');
      fetchDeadlines();
    } catch (err) {
      toast.error('Failed to delete deadline');
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const getCountdownChip = (due) => {
    const diff = differenceInCalendarDays(new Date(due), new Date());
    if (diff < 0) return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
        Overdue by {Math.abs(diff)}d
      </span>
    );
    if (diff === 0) return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#f97316] animate-pulse">
        Due today!
      </span>
    );
    if (diff <= 3) return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
        {diff} days left
      </span>
    );
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e4f2fe] text-[#2383c9]">
        {diff} days left
      </span>
    );
  };

  const filtered = deadlines.filter((d) =>
    activeTab === 'all' ? true : d.type === activeTab
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
              {t('deadlines.title', 'Deadlines')}
            </h1>
          </div>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            Keep track of IB CAS / IA / EE submissions, MINT deadlines, and your personal reminders.
          </p>
        </div>

        <button
          onClick={() => { setType(isAdmin ? 'academic' : 'personal'); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdmin ? ' Add Deadline' : t('deadlines.addPersonal', 'Add personal reminder')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'academic', 'personal'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#1a2b49] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Deadlines List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Loading deadlines...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0f172a]">{t('deadlines.noDeadlines', 'All caught up! No deadlines.')}</p>
          <p className="text-xs text-[#64748b] mt-1">Add personal study goals or reminders using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <div key={d.id} className="p-5 rounded-lg bg-white border border-slate-200/70 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      d.type === 'academic' ? 'bg-purple-50 text-purple-600' : 'bg-[#e4f2fe] text-[#2383c9]'
                    }`}>
                      {d.type}
                    </span>
                    {d.track && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-[#64748b]">
                        {d.track} {d.target_class ? `• ${d.target_class}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getCountdownChip(d.due_date)}
                    {(user?.id === d.owner_id || user?.id === d.created_by || isAdmin) && (
                      <button onClick={() => handleDelete(d.id)} className="text-[#64748b] hover:text-red-500 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-base text-[#0f172a] mt-3">{d.title}</h3>
                {d.description && (
                  <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">{d.description}</p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748b]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due {format(new Date(d.due_date), 'EEEE, d MMMM yyyy')}</span>
                </div>
                <span>{d.created_by_name || 'Personal'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Deadline Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#0f172a]">
                {isAdmin ? 'Add School / Personal Deadline' : 'Add Personal Reminder'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IB Physics IA First Draft, Math Homework"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">Deadline Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                    <option value="academic">Academic (School / Track wide)</option>
                    <option value="personal">Personal (Just for me)</option>
                  </select>
                </div>
              )}

              {type === 'academic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">Academic Track</label>
                    <select
                      value={track}
                      onChange={(e) => {
                        setTrack(e.target.value);
                        setTargetClass('');
                        setMentorsForClass([]);
                        setTargetMentorId('');
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                    >
                      <option value="IB">IB</option>
                      <option value="MINT">MINT</option>
                      <option value="Abitur">Abitur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">Class / Year Level</label>
                    <select
                      value={targetClass}
                      onChange={(e) => {
                        const cls = e.target.value;
                        setTargetClass(cls);
                        if (cls) fetchMentorsForClass(track, cls);
                        else { setMentorsForClass([]); setTargetMentorId(''); }
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                    >
                      <option value="">All Classes in {track}</option>
                      {getClassesForTrack(track).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {targetClass && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f172a] mb-1">Mentor Group</label>
                      {loadingMentors ? (
                        <div className="text-xs text-[#64748b] py-1">Loading mentor groups...</div>
                      ) : mentorsForClass.length > 0 ? (
                        <select
                          value={targetMentorId}
                          onChange={(e) => setTargetMentorId(e.target.value)}
                          className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                        >
                          <option value="">All mentor groups in {targetClass}</option>
                          {mentorsForClass.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name}'s Group</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-[#64748b] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          No mentor groups found for {track} / {targetClass}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Due Date</label>
                <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Notes / Instructions</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Submission instructions, word count, checklist..."
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg">
                  {submitting ? 'Saving...' : 'Add Deadline'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={confirmState.open}
        title="Delete deadline?"
        message="This will permanently remove this deadline. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
