import { useCallback, useEffect, useMemo, useState } from 'react';
import { CarFront, Check, Clock3, MapPin, Plus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import Modal from '../../components/layout/Modal.jsx';

const tabs = [
  { id: 'available', label: 'Available seats' },
  { id: 'requests', label: 'Seat requests' },
  { id: 'mine', label: 'My posts & requests' },
];
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-[#f8fafb] px-3.5 py-2.5 text-sm outline-none focus:border-[#2383c9]';
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a2b49] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14223b] disabled:cursor-not-allowed disabled:opacity-50';
const dateLabel = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Time not specified';

export default function TaxiPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('available');
  const [rides, setRides] = useState([]);
  const [seatRequests, setSeatRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ride_type: 'offer', departure: '', destination: '', departure_at: '', notes: '', total_seats: 1 });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [seatRequestForm, setSeatRequestForm] = useState({ departure: '', destination: '', departure_at: '', seats_needed: 1, notes: '' });
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerForm, setOfferForm] = useState({ seats_offered: 1, message: '' });
  const refresh = useCallback(async () => {
    try { const { data } = await api.get('/taxi'); setRides(data); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not load Taxi Bookings'); }
    try { const { data } = await api.get('/taxi/seat-requests'); setSeatRequests(data); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not load seat requests'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const visibleRides = useMemo(() => {
    if (activeTab === 'available') return rides.filter((ride) => ride.status === 'open');
    return activeTab === 'mine' ? rides.filter((ride) => ride.posted_by === user?.id || ride.requests?.some((request) => request.requester_id === user?.id)) : [];
  }, [activeTab, rides, user?.id]);
  const visibleSeatRequests = useMemo(() => activeTab === 'requests'
    ? seatRequests.filter((request) => request.status === 'open')
    : seatRequests.filter((request) => request.requester_id === user?.id || request.offers?.some((offer) => offer.driver_id === user?.id)),
  [activeTab, seatRequests, user?.id]);

  const openForm = (type) => {
    setForm({ ride_type: type, departure: '', destination: '', departure_at: '', notes: '', total_seats: 1 });
    setShowForm(true);
  };

  async function runAction(action, success) {
    setSubmitting(true);
    try { await action(); toast.success(success); await refresh(); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not complete this action'); }
    finally { setSubmitting(false); }
  }

  async function createPost(event) {
    event.preventDefault();
    await runAction(async () => { await api.post('/taxi', form); setShowForm(false); }, 'Taxi post published');
  }

  async function createSeatRequest(event) {
    event.preventDefault();
    await runAction(async () => { await api.post('/taxi/seat-requests', seatRequestForm); setShowRequestForm(false); }, 'Seat request published');
  }

  async function createOffer(event) {
    event.preventDefault();
    await runAction(async () => { await api.post(`/taxi/seat-requests/${offerTarget.id}/offers`, offerForm); setOfferTarget(null); }, 'Your seat offer was sent');
  }

  const requestList = (ride) => (ride.requests || []).filter((request) => request.requester_id === user?.id || ride.posted_by === user?.id);

  return <div className="mx-auto max-w-6xl space-y-6 pb-12 font-['Outfit'] animate-fade-in">
    <header><h1 className="text-[30px] font-semibold leading-[37.5px] tracking-tight text-[#0f172a]">Taxi Bookings</h1><p className="mt-0.5 text-base leading-6 text-[#64748b]">Share an available seat or find a ride with other students.</p></header>
    <nav aria-label="Taxi Bookings pages" className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-[#1a2b49] text-white' : 'border border-slate-200 bg-white text-[#64748b] hover:border-slate-300'}`}>{tab.label}</button>)}</nav>
    <div className="flex justify-end">{activeTab === 'available' && <button type="button" onClick={() => openForm('offer')} className={actionClass}><Plus className="h-4 w-4" />Post available seats</button>}{activeTab === 'requests' && <button type="button" onClick={() => { setSeatRequestForm({ departure: '', destination: '', departure_at: '', seats_needed: 1, notes: '' }); setShowRequestForm(true); }} className={actionClass}><Plus className="h-4 w-4" />Request a ride</button>}</div>

    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading rides…</div> : activeTab === 'requests' || activeTab === 'mine' ? <>{activeTab === 'mine' && visibleRides.length > 0 && <><h2 className="text-lg font-semibold text-[#0f172a]">My available-seat posts</h2><section className="grid gap-4 lg:grid-cols-2">{visibleRides.map((ride) => <article key={ride.id} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold">{ride.departure} → {ride.destination}</h3><p className="mt-1 text-sm text-slate-500">{ride.available_seats} seats left · {ride.status}</p></article>)}</section></>}{visibleSeatRequests.length ? <section className="grid gap-4 lg:grid-cols-2">{visibleSeatRequests.map((request) => {
      const isRequester = request.requester_id === user?.id;
      const myOffer = (request.offers || []).find((offer) => offer.driver_id === user?.id);
      return <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[#0f172a]">{request.departure} <span className="text-slate-400">→</span> {request.destination}</h2><p className="mt-1 text-xs text-slate-500">Requested by {isRequester ? 'you' : request.requester_name}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === 'matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{request.status === 'matched' ? 'Matched' : 'Looking for a ride'}</span></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />Needs {request.seats_needed} seat{request.seats_needed === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{dateLabel(request.departure_at)}</span></div>{request.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{request.notes}</p>}
        {request.offers?.length > 0 && <div className="mt-4 space-y-2 border-t border-slate-100 pt-3"><h3 className="text-sm font-semibold text-[#0f172a]">Seat offers</h3>{request.offers.map((offer) => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8fafb] px-3 py-2"><div><p className="text-sm font-medium text-slate-700">{offer.driver_name} offers {offer.seats_offered} seat{offer.seats_offered === 1 ? '' : 's'}</p>{offer.message && <p className="mt-0.5 text-xs text-slate-500">{offer.message}</p>}<p className="text-xs capitalize text-slate-500">{offer.status}</p></div>{isRequester && request.status === 'open' && offer.status === 'pending' && <button type="button" disabled={submitting} onClick={() => runAction(() => api.put(`/taxi/seat-requests/${request.id}/offers/${offer.id}`, { decision: 'accepted' }), 'Seat offer accepted')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Accept offer</button>}</div>)}</div>}
        {request.status === 'open' && isRequester && <button type="button" disabled={submitting} onClick={() => runAction(() => api.delete(`/taxi/seat-requests/${request.id}`), 'Seat request removed')} className="mt-3 rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remove request</button>}
        {request.status === 'open' && !isRequester && !myOffer && <button type="button" disabled={submitting} onClick={() => { setOfferTarget(request); setOfferForm({ seats_offered: Math.min(1, request.seats_needed), message: '' }); }} className={`${actionClass} mt-4`}>I have space</button>}
        {myOffer && <p className="mt-3 text-sm text-slate-600">Your offer: {myOffer.seats_offered} seat{myOffer.seats_offered === 1 ? '' : 's'} · <span className="capitalize">{myOffer.status}</span></p>}
      </article>;
    })}</section> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><MapPin className="mx-auto mb-3 h-8 w-8 text-slate-300" /><h2 className="font-semibold text-slate-800">{activeTab === 'mine' ? 'No requests yet' : 'No seat requests yet'}</h2><p className="mt-1 text-sm text-slate-500">{activeTab === 'mine' ? 'Your seat requests and offers will appear here.' : 'Post that you need a ride, or check again later.'}</p></div>}</> : visibleRides.length ? <section className="grid gap-4 lg:grid-cols-2">{visibleRides.map((ride) => {
      const isOwner = ride.posted_by === user?.id;
      const myRequest = (ride.requests || []).find((request) => request.requester_id === user?.id);
      const relevantRequests = requestList(ride);
      return <article key={ride.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4f2fe] text-[#2383c9]"><CarFront className="h-6 w-6" /></span><div><h2 className="font-semibold text-[#0f172a]">{ride.departure} <span className="text-slate-400">→</span> {ride.destination}</h2><p className="text-xs text-slate-500">Posted by {isOwner ? 'you' : ride.posted_by_name}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ride.status === 'full' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{ride.status === 'full' ? 'Full' : 'Open'}</span></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{ride.available_seats} of {ride.total_seats} seats available</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{dateLabel(ride.departure_at)}</span></div>
        {ride.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{ride.notes}</p>}
        {isOwner && ride.status === 'open' && <button type="button" disabled={submitting} onClick={() => runAction(() => api.delete(`/taxi/${ride.id}`), 'Ride removed')} className="mt-3 rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remove post</button>}
      </article>;
    })}</section> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><MapPin className="mx-auto mb-3 h-8 w-8 text-slate-300" /><h2 className="font-semibold text-slate-800">No available seats yet</h2><p className="mt-1 text-sm text-slate-500">Post your ride and available passenger seats.</p></div>}

    {showForm && <Modal onClose={() => setShowForm(false)} maxWidth="max-w-lg"><div className="font-['Outfit']"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h2 className="text-base font-bold text-[#0f172a]">Post available seats</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-1.5 text-[#64748b] transition-colors hover:bg-slate-100 hover:text-[#0f172a]"><X className="h-4 w-4" /></button></div><form onSubmit={createPost} className="space-y-4 p-6">
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Leaving from</span><input required maxLength="200" value={form.departure} onChange={(event) => setForm({ ...form, departure: event.target.value })} className={fieldClass} placeholder="e.g. School" /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Going to</span><input required maxLength="200" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} className={fieldClass} placeholder="e.g. Kiel" /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Departure time (optional)</span><input type="datetime-local" value={form.departure_at} onChange={(event) => setForm({ ...form, departure_at: event.target.value })} className={fieldClass} /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Available passenger seats</span><input type="number" required min="1" max="20" value={form.total_seats} onChange={(event) => setForm({ ...form, total_seats: event.target.value })} className={fieldClass} /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Details (optional)</span><textarea maxLength="1000" rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={fieldClass} placeholder="Add a pickup point or other details" /></label>
      <div className="flex justify-end"><button type="submit" disabled={submitting} className={actionClass}><Check className="h-4 w-4" />{submitting ? 'Posting…' : 'Publish post'}</button></div>
    </form></div></Modal>}
    {showRequestForm && <Modal onClose={() => setShowRequestForm(false)} maxWidth="max-w-lg"><div className="font-['Outfit']"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h2 className="text-base font-bold text-[#0f172a]">Request a ride</h2><button type="button" onClick={() => setShowRequestForm(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={createSeatRequest} className="space-y-4 p-6"><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Leaving from</span><input required maxLength="200" value={seatRequestForm.departure} onChange={(event) => setSeatRequestForm({ ...seatRequestForm, departure: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Going to</span><input required maxLength="200" value={seatRequestForm.destination} onChange={(event) => setSeatRequestForm({ ...seatRequestForm, destination: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">When</span><input type="datetime-local" value={seatRequestForm.departure_at} onChange={(event) => setSeatRequestForm({ ...seatRequestForm, departure_at: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Number of seats needed</span><input type="number" required min="1" max="20" value={seatRequestForm.seats_needed} onChange={(event) => setSeatRequestForm({ ...seatRequestForm, seats_needed: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Message (optional)</span><textarea rows="3" maxLength="1000" value={seatRequestForm.notes} onChange={(event) => setSeatRequestForm({ ...seatRequestForm, notes: event.target.value })} className={fieldClass} placeholder="Add helpful details for drivers" /></label><div className="flex justify-end"><button type="submit" disabled={submitting} className={actionClass}>Publish request</button></div></form></div></Modal>}
    {offerTarget && <Modal onClose={() => setOfferTarget(null)} maxWidth="max-w-md"><div className="font-['Outfit']"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h2 className="text-base font-bold text-[#0f172a]">Offer a seat</h2><button type="button" onClick={() => setOfferTarget(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={createOffer} className="space-y-4 p-6"><p className="text-sm text-slate-600">Replying to {offerTarget.requester_name} · {offerTarget.departure} → {offerTarget.destination}</p><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Seats you can offer</span><input type="number" required min="1" max={offerTarget.seats_needed} value={offerForm.seats_offered} onChange={(event) => setOfferForm({ ...offerForm, seats_offered: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Message</span><textarea rows="3" maxLength="500" value={offerForm.message} onChange={(event) => setOfferForm({ ...offerForm, message: event.target.value })} className={fieldClass} placeholder="Let them know where you can pick them up" /></label><div className="flex justify-end"><button type="submit" disabled={submitting} className={actionClass}>Send seat offer</button></div></form></div></Modal>}
  </div>;
}
