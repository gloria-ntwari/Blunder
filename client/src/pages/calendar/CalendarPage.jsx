import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  X,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

import Modal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';
import { getClassesForTrack } from '../../utils/academicTracks';

export default function CalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = create, object = edit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:30');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState('school');
  const [targetTrack, setTargetTrack] = useState(user?.academic_track || 'IB');
  const [targetClass, setTargetClass] = useState('');
  const [targetMentorId, setTargetMentorId] = useState('');
  const [mentorsForClass, setMentorsForClass] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [eventImage, setEventImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  const canCreate = user && ['super_admin', 'sv_committee', 'teacher', 'student_leader', 'mentor'].includes(user.role);

  useEffect(() => { fetchEvents(); }, [currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    try {
      const res = await api.get(`/events?from=${start}&to=${end}`);
      setEvents(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorsForClass = async (track, classYr) => {
    if (!track || !classYr) { setMentorsForClass([]); setTargetMentorId(''); return; }
    setLoadingMentors(true);
    try {
      const res = await api.get(`/mentor-groups?academic_track=${track}&class_year=${encodeURIComponent(classYr)}`);
      setMentorsForClass(res.data || []);
      setTargetMentorId('');
    } catch {
      setMentorsForClass([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle(''); setDescription(''); setLocation('');
    setEventDate(format(selectedDay, 'yyyy-MM-dd'));
    setStartTime('14:00'); setEndTime('15:30');
    setScope('school'); setTargetTrack(user?.academic_track || 'IB');
    setTargetClass(''); setTargetMentorId(''); setMentorsForClass([]);
    setEventImage(null); setImagePreview('');
    setShowModal(true);
  };

  const openEditEventModal = (ev) => {
    setEditingEvent(ev);
    setTitle(ev.title || '');
    setDescription(ev.description || '');
    setLocation(ev.location || '');
    setEventDate(ev.event_date ? format(new Date(ev.event_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setStartTime(ev.start_time ? ev.start_time.substring(0, 5) : '14:00');
    setEndTime(ev.end_time ? ev.end_time.substring(0, 5) : '15:30');
    setScope(ev.scope || 'school');
    setTargetTrack(ev.target_track || user?.academic_track || 'IB');
    setTargetClass(ev.target_class || '');
    setTargetMentorId(''); setMentorsForClass([]);
    if (ev.target_class) {
      fetchMentorsForClass(ev.target_track || user?.academic_track || 'IB', ev.target_class)
        .then(() => setTargetMentorId(ev.target_mentor_group_id || ''));
    }
    setEventImage(null);
    setImagePreview(ev.image_url || '');
    setShowModal(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!title || !eventDate) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('event_date', eventDate);
    formData.append('start_time', startTime);
    formData.append('end_time', endTime);
    formData.append('location', location);
    formData.append('scope', scope);
    if (scope === 'academic') {
      formData.append('target_track', targetTrack);
      if (targetClass) formData.append('target_class', targetClass);
      if (targetClass && targetMentorId) formData.append('target_mentor_group_id', targetMentorId);
    }
    if (scope === 'mentor_group' && user?.mentor_group_id) formData.append('target_mentor_group_id', user.mentor_group_id);
    if (eventImage) formData.append('image', eventImage);

    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, formData);
        toast.success('Event updated!');
      } else {
        await api.post('/events', formData);
        toast.success('Event added to calendar!');
      }
      setShowModal(false);
      setEditingEvent(null);
      setTitle(''); setDescription(''); setLocation(''); setTargetClass('');
      setTargetMentorId(''); setMentorsForClass([]);
      setEventImage(null); setImagePreview('');
      fetchEvents();
    } catch (err) {
      toast.error(editingEvent ? 'Failed to update event' : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    try {
      await api.delete(`/events/${confirmState.id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error('Could not delete event');
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const eventsOnSelectedDay = events.filter((e) =>
    isSameDay(new Date(e.event_date), selectedDay)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
              {t('calendar.title', 'Calendar & Events')}
            </h1>
          </div>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            School trips, assemblies, IB/MINT/Abitur sessions, and mentor activities in one place.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('Add event')}</span>
          </button>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Calendar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#0f172a]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748b] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-2.5 py-1 text-xs font-semibold rounded-sm bg-[#e4f2fe] text-[#2383c9] hover:bg-[#2383c9] hover:text-white transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748b] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#64748b] uppercase tracking-wider py-1 border-b border-slate-100">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`blank-${i}`} className="h-16 md:h-20 p-1" />
            ))}

            {daysInMonth.map((day) => {
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const dayEvents = events.filter((e) => isSameDay(new Date(e.event_date), day));

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`h-16 md:h-20 p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#2383c9] bg-[#e4f2fe]/40 shadow-xs ring-1 ring-[#2383c9]'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-[#f97316] text-white' : 'text-[#0f172a]'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#2383c9]" />}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="truncate text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-[#1a2b49] text-white">
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-[#64748b] block text-right font-bold">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Schedule */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm md:text-base text-[#0f172a]">
                  {format(selectedDay, 'EEEE, d MMMM')}
                </h3>
                <p className="text-[11px] text-[#64748b]">
                  {eventsOnSelectedDay.length} {eventsOnSelectedDay.length === 1 ? 'event scheduled' : 'events scheduled'}
                </p>
              </div>
              <CalendarIcon className="w-5 h-5 text-[#2383c9]" />
            </div>

            <div className="mt-4 space-y-3">
              {eventsOnSelectedDay.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748b]">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                  <p>No events scheduled for this day.</p>
                </div>
              ) : (
                eventsOnSelectedDay.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-lg bg-[#f8fafb] border border-slate-100 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#e4f2fe] text-[#2383c9]">
                          {ev.scope}
                        </span>
                        {ev.target_track && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700">
                            {ev.target_track} {ev.target_class ? `• ${ev.target_class}` : ''}
                          </span>
                        )}
                      </div>
                      {canCreate && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditEventModal(ev)}
                            className="p-1 text-[#64748b] hover:text-[#2383c9] hover:bg-[#e4f2fe] rounded-lg transition-colors"
                            title="Edit event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(ev.id)} className="p-1 text-[#64748b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-[#0f172a]">{ev.title}</h4>

                    <div className="space-y-1 text-xs text-[#64748b]">
                      {ev.start_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>{ev.start_time.substring(0, 5)} {ev.end_time ? `- ${ev.end_time.substring(0, 5)}` : ''}</span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#f97316]" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-[#64748b] pt-1 leading-relaxed border-t border-slate-200/50">
                        {ev.description}
                      </p>
                    )}

                    {ev.image_url && (
                      <img
                        src={ev.image_url}
                        alt={ev.title}
                        className="w-full h-32 object-cover rounded-lg mt-2 border border-slate-100"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#0f172a]">{editingEvent ? 'Edit Event' : 'Add Calendar Event'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Event Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IB Physics Lab Session, Autumn Assembly"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Date</label>
                <input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">End Time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Science Building Lab 3, Sports Hall"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Scope</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                  <option value="school">School-wide Event</option>
                  <option value="academic">Academic Track Dedicated</option>
                </select>
              </div>

              {scope === 'academic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">Academic Track</label>
                    <select
                      value={targetTrack}
                      onChange={(e) => {
                        setTargetTrack(e.target.value);
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
                        if (cls) fetchMentorsForClass(targetTrack, cls);
                        else { setMentorsForClass([]); setTargetMentorId(''); }
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                    >
                      <option value="">All Classes in {targetTrack}</option>
                      {getClassesForTrack(targetTrack).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mentor group selector — appears only when a specific class is selected */}
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
                            <option key={m.id} value={m.id}>{m.name}</option>
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
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event agenda, requirements, what to bring..."
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                  Event Photo <span className="font-normal text-[#64748b]">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setEventImage(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs text-[#64748b] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e4f2fe] file:text-[#2383c9] hover:file:bg-[#2383c9] hover:file:text-white file:transition-colors"
                />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview"
                    className="w-full h-28 object-cover rounded-lg mt-2 border border-slate-100" />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg">
                  {submitting ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Add to Calendar')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={confirmState.open}
        title="Delete event?"
        message="This will permanently remove this event from the calendar."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
