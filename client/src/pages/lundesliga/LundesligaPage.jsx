import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CircleUserRound, Goal, Pencil, Plus, Search, Shield, Trash2, Trophy, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import SharedModal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';

const tabs = [
  { id: 'fixtures', label: 'Fixtures', icon: CalendarDays },
  { id: 'results', label: 'Results', icon: Goal },
  { id: 'houses', label: 'Houses', icon: Shield },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'top-scorers', label: 'Top scorers', icon: Trophy },
];
const genderLabel = (gender) => gender === 'girls' ? 'Girls' : 'Boys';
const dateLabel = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date to be confirmed';

function HouseCrest({ className = '' }) {
  return <span className={`flex h-12 w-12 shrink-0 items-center justify-center bg-[#e4f2fe] text-[#1a2b49] [clip-path:polygon(8%_0,92%_0,92%_60%,82%_82%,50%_100%,18%_82%,8%_60%)] ${className}`}>
    <Shield className="h-6 w-6" />
  </span>;
}

function PersonSearch({ onSelect, selected, placeholder = 'Search by name', disabled = false }) {
  const [term, setTerm] = useState(selected?.full_name || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => setTerm(selected?.full_name || ''), [selected?.id, selected?.full_name]);
  useEffect(() => {
    if (selected || term.trim().length < 2) { setItems([]); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const { data } = await api.get('/league/users', { params: { search: term.trim() } }); if (active) setItems(data); }
      catch { if (active) setItems([]); }
      finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [term, selected]);
  return <div className="relative">
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafb] px-3.5 focus-within:border-[#2383c9]">
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input disabled={disabled} value={term} onChange={(event) => { setTerm(event.target.value); onSelect(null); }} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none disabled:opacity-50" />
      {selected && <button type="button" onClick={() => { onSelect(null); setTerm(''); }} aria-label="Clear selected person"><X className="h-4 w-4 text-slate-400" /></button>}
    </div>
    {!selected && term.trim().length >= 2 && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
      {loading ? <p className="px-3 py-2 text-sm text-slate-500">Searching…</p> : items.length ? items.map((person) => <button key={person.id} type="button" onClick={() => { onSelect(person); setTerm(person.full_name); setItems([]); }} className="block w-full px-3 py-2 text-left hover:bg-slate-50"><span className="block text-sm font-medium text-[#0f172a]">{person.full_name}</span><span className="block text-xs text-slate-500">{person.email}</span></button>) : <p className="px-3 py-2 text-sm text-slate-500">No matching users found.</p>}
    </div>}
  </div>;
}

function Modal({ title, onClose, children }) {
  return <SharedModal onClose={onClose} maxWidth="max-w-lg">
    <div className="font-['Outfit']">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-bold text-[#0f172a]">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] transition-colors hover:bg-slate-100 hover:text-[#0f172a]" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </SharedModal>;
}

export default function LundesligaPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('fixtures');
  const [selectedHouseView, setSelectedHouseView] = useState(null);
  const [gender, setGender] = useState('girls');
  const [state, setState] = useState({ houses: [], fixtures: [], goals: [], standings: [], canManage: false });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [houseName, setHouseName] = useState('');
  const [leader, setLeader] = useState(null);
  const [editingHouse, setEditingHouse] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState('');
  const [player, setPlayer] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fixtureForm, setFixtureForm] = useState({ homeHouseId: '', awayHouseId: '', gender: 'girls', matchDate: '', venue: '' });
  const [activeFixture, setActiveFixture] = useState(null);
  const isManager = ['super_admin', 'sv_committee', 'committee'].includes(user?.role);
  const isCommittee = ['sv_committee', 'committee'].includes(user?.role);
  const myHouse = state.houses.find((house) => house.leader_id === user?.id);
  const canAddPlayers = isManager || Boolean(myHouse);
  const refresh = useCallback(async () => {
    try { const { data } = await api.get('/league'); setState(data); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not load Lundesliga'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const handleLiveUpdate = (event) => {
      if (event.detail?.entity === 'lundesliga') refresh();
    };
    window.addEventListener('blunder:data-changed', handleLiveUpdate);
    return () => window.removeEventListener('blunder:data-changed', handleLiveUpdate);
  }, [refresh]);
  useEffect(() => {
    if (!selectedHouseView) return;
    const updatedHouse = state.houses.find((house) => house.id === selectedHouseView.id);
    if (updatedHouse && updatedHouse !== selectedHouseView) setSelectedHouseView(updatedHouse);
  }, [state.houses, selectedHouseView]);

  const fixtures = useMemo(() => state.fixtures.filter((fixture) => fixture.gender === gender), [state.fixtures, gender]);
  const goals = useMemo(() => state.goals.filter((goal) => goal.fixture_gender === gender), [state.goals, gender]);
  const scorers = useMemo(() => {
    const counts = new Map();
    goals.forEach((goal) => { const key = `${goal.user_id || goal.player_name}:${goal.house_id}`; const previous = counts.get(key) || { ...goal, count: 0 }; previous.count += 1; counts.set(key, previous); });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.player_name.localeCompare(b.player_name));
  }, [goals]);
  const standings = state.standings.filter((house) => house.gender === gender);
  const playersByHouse = state.houses.map((house) => ({
    ...house,
    visiblePlayers: house.players.filter((item) => item.gender === gender),
  }));
  const resultFixtures = fixtures.filter((fixture) => fixture.status === 'completed')
    .sort((a, b) => new Date(b.match_date || 0) - new Date(a.match_date || 0));
  const actionClass = 'inline-flex items-center gap-1.5 rounded-lg bg-[#1a2b49] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#14223b] disabled:cursor-not-allowed disabled:opacity-50';
  const fieldClass = 'w-full rounded-lg border border-slate-200 bg-[#f8fafb] px-3.5 py-2.5 text-sm outline-none focus:border-[#2383c9]';
  const startModal = (name) => setModal(name);

  const openHouseEdit = (house) => {
    setEditingHouse(house);
    setHouseName(house.name);
    setLeader({ id: house.leader_id, full_name: house.leader_name });
    startModal('house');
  };

  const openPlayerEdit = (house, item) => {
    setEditingPlayer(item);
    setSelectedHouse(house.id);
    setPlayer({ id: item.user_id, full_name: item.full_name });
    setGender(item.gender);
    startModal('player');
  };

  async function submit(action) {
    setSubmitting(true);
    try { await action(); setModal(''); await refresh(); toast.success('Lundesliga updated'); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not save changes'); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === 'house') await api.delete(`/league/houses/${deleteTarget.house.id}`);
      else if (deleteTarget.type === 'player') {
        await api.delete(`/league/houses/${deleteTarget.houseId}/players/${deleteTarget.player.id}`);
        if (selectedHouseView?.id === deleteTarget.houseId) setSelectedHouseView((house) => ({ ...house, players: house.players.filter((item) => item.id !== deleteTarget.player.id) }));
      }
      else await api.delete(`/league/fixtures/${deleteTarget.fixture.id}`);
      toast.success(deleteTarget.type === 'house' ? 'House deleted' : deleteTarget.type === 'player' ? 'Player and their goals removed from the scores' : 'Result deleted');
      setDeleteTarget(null);
      await refresh();
      if (deleteTarget.type === 'house' && selectedHouseView?.id === deleteTarget.house.id) setSelectedHouseView(null);
      else if (deleteTarget.type === 'player' && selectedHouseView) {
        const { data } = await api.get('/league');
        setSelectedHouseView(data.houses.find((house) => house.id === selectedHouseView.id) || null);
      }
    } catch (error) { toast.error(error.response?.data?.message || 'Could not delete item'); }
    finally { setSubmitting(false); }
  }

  const showScorer = (goal, index) => (
    <div key={`${goal.user_id || goal.player_name}:${goal.house_id}`} className="flex items-center gap-3 border-b border-slate-200 py-3 last:border-0">
      <span className="w-6 shrink-0 text-sm font-bold text-[#64748b]">{index + 1}.</span>
      <CircleUserRound className="h-8 w-8 shrink-0 text-[#2383c9]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#0f172a]">{goal.player_name}</p>
        <p className="truncate text-xs text-[#64748b]">{goal.house_name}</p>
      </div>
      <span className="min-w-10 rounded-md bg-[#e4f2fe] px-2.5 py-1 text-center text-sm font-semibold text-[#1a2b49]">{goal.count}</span>
    </div>
  );

  return <div className="mx-auto max-w-7xl space-y-6 pb-12 font-['Outfit'] animate-fade-in">
    <header><h1 className="text-[30px] font-semibold leading-[37.5px] tracking-tight text-[#0f172a]">Lundesliga</h1><p className="mt-0.5 text-[16px] leading-6 text-[#64748b]">School football between the houses. Follow fixtures, results and goals.</p></header>
    <nav aria-label="Lundesliga sections" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${activeTab === id ? 'bg-[#1a2b49] text-white shadow-xs' : 'border border-slate-200/70 bg-white text-[#64748b] hover:border-slate-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
    </nav>
    <div className="flex flex-wrap items-center justify-between gap-3">{activeTab !== 'houses' && <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter by gender">{['girls', 'boys'].map((value) => <button key={value} type="button" onClick={() => setGender(value)} className={`rounded-md px-4 py-2 text-xs font-semibold transition ${gender === value ? 'bg-[#e4f2fe] text-[#1a2b49]' : 'text-[#64748b] hover:bg-slate-50'}`}>{genderLabel(value)}</button>)}</div>}
      {(activeTab === 'players' || (activeTab === 'houses' && selectedHouseView && canAddPlayers)) && canAddPlayers && <button type="button" onClick={() => { setEditingPlayer(null); setPlayer(null); setSelectedHouse(isManager ? selectedHouseView?.id || '' : myHouse?.id || ''); startModal('player'); }} className={actionClass}><Plus className="h-3.5 w-3.5" /> Add player</button>}
      {activeTab === 'fixtures' && isCommittee && <button type="button" onClick={() => startModal('fixture')} className={actionClass}><Plus className="h-3.5 w-3.5" /> Add fixture</button>}
    </div>
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-[#64748b]">Loading Lundesliga…</div> : <>
      {activeTab === 'fixtures' && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{fixtures.filter((fixture) => fixture.status !== 'completed').length ? fixtures.filter((fixture) => fixture.status !== 'completed').map((fixture) => <article key={fixture.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#2383c9]/50 hover:shadow-md"><div className="h-1.5 bg-gradient-to-r from-[#ef4444] via-[#e4f2fe] to-[#2383c9]"/><div className="p-4"><div className="mb-5 flex items-center justify-end"><span className="inline-flex items-center gap-2 text-xs font-medium text-[#64748b]"><span className="h-2 w-2 rounded-full bg-[#2383c9]"/>Upcoming</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><div className="min-w-0"><span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#ef4444] bg-red-50 text-xl font-semibold text-[#ef4444]">{fixture.home_name.slice(0, 1)}</span><p className="truncate text-sm font-semibold text-[#0f172a]" title={fixture.home_name}>{fixture.home_name}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-2 text-[10px] font-bold text-slate-400">VS</span><div className="min-w-0"><span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#2383c9] bg-[#e4f2fe] text-xl font-semibold text-[#2383c9]">{fixture.away_name.slice(0, 1)}</span><p className="truncate text-sm font-semibold text-[#0f172a]" title={fixture.away_name}>{fixture.away_name}</p></div></div><div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-[#64748b]"><span className="truncate px-2.5 py-2">{dateLabel(fixture.match_date)}</span><span className="truncate px-2.5 py-2 text-right" title={fixture.venue || 'Venue to be confirmed'}>{fixture.venue || 'Venue to be confirmed'}</span></div></div></article>) : <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-800">No {genderLabel(gender).toLowerCase()} fixtures yet</p><p className="mt-1 text-sm text-slate-500">New fixtures from the SV Committee will appear here.</p></div>}</section>}
      {activeTab === 'results' && <section className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><div className="border-b border-slate-100 px-4 py-3"><h2 className="text-lg font-semibold text-[#0f172a]">{genderLabel(gender)} league table</h2><p className="text-xs text-[#64748b]">3 points for a win, 1 for a draw.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f8fafb] text-xs text-[#64748b]"><tr>{['#','House','P','W','D','L','GF','GA','Pts'].map((heading) => <th key={heading} className="px-3 py-2.5 font-semibold">{heading}</th>)}</tr></thead><tbody>{standings.length ? standings.map((house, index) => <tr key={house.id} className="border-t border-slate-100"><td className="px-3 py-3 font-semibold text-slate-500">{index + 1}</td><td className="px-3 py-3 font-semibold text-[#0f172a]">{house.name}</td><td className="px-3 py-3">{house.played}</td><td className="px-3 py-3">{house.wins}</td><td className="px-3 py-3">{house.draws}</td><td className="px-3 py-3">{house.losses}</td><td className="px-3 py-3">{house.goals_for}</td><td className="px-3 py-3">{house.goals_against}</td><td className="px-3 py-3 font-bold text-[#1a2b49]">{house.points}</td></tr>) : <tr><td colSpan="9" className="px-3 py-6 text-center text-sm text-slate-500">Add {genderLabel(gender).toLowerCase()} houses to start the league table.</td></tr>}</tbody></table></div></div>
        {resultFixtures.length ? resultFixtures.map((fixture) => <article key={fixture.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[#0f172a]">Latest result</h2>{fixture.created_by === user?.id && <button type="button" onClick={() => setDeleteTarget({ type: 'result', fixture })} aria-label={`Delete result ${fixture.home_name} versus ${fixture.away_name}`} title="Delete this result" className="rounded-md p-2 text-[#64748b] transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafb]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#e4f2fe]/90 px-4 py-2.5">
              <span className="rounded-sm bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">Full time</span>
              <span className="rounded-sm bg-[#2383c9] px-2.5 py-1 text-[10px] font-bold uppercase text-white">{genderLabel(fixture.gender)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5 sm:px-8">
              <div className="flex flex-col items-center gap-2 text-center"><HouseCrest className="h-14 w-14" /><span className="text-xs font-semibold text-[#0f172a] sm:text-sm">{fixture.home_name}</span></div>
              <strong className="rounded-lg bg-[#1a2b49] px-4 py-2 text-2xl font-bold tracking-widest text-white">{fixture.home_score}–{fixture.away_score}</strong>
              <div className="flex flex-col items-center gap-2 text-center"><HouseCrest className="h-14 w-14" /><span className="text-xs font-semibold text-[#0f172a] sm:text-sm">{fixture.away_name}</span></div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#64748b]">{dateLabel(fixture.match_date)}{fixture.venue ? ` · ${fixture.venue}` : ''}</p>
        </article>) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Goal className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-800">No {genderLabel(gender).toLowerCase()} results yet</p><p className="mt-1 text-sm text-slate-500">Final scores will appear here when matches are completed.</p></div>}
        {isCommittee && fixtures.some((fixture) => fixture.status !== 'completed') && <div className="space-y-3 pt-2"><h2 className="text-base font-semibold text-[#0f172a]">In progress</h2>{fixtures.filter((fixture) => fixture.status !== 'completed').map((fixture) => <article key={fixture.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#64748b]">{dateLabel(fixture.match_date)}</span><span className="rounded-sm bg-[#fff7ed] px-2.5 py-1 text-[10px] font-bold uppercase text-[#c2410c]">Live score</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><span className="flex items-center justify-end gap-2 text-right text-sm font-semibold text-[#0f172a]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#ef4444] bg-white text-sm font-bold text-[#ef4444]">{fixture.home_name.slice(0, 1)}</span>{fixture.home_name}</span><strong className="rounded-lg bg-[#1a2b49] px-3 py-1.5 text-lg text-white">{fixture.home_score}–{fixture.away_score}</strong><span className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">{fixture.away_name}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2383c9] bg-white text-sm font-bold text-[#2383c9]">{fixture.away_name.slice(0, 1)}</span></span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { setActiveFixture(fixture); startModal('goal'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#1a2b49] hover:bg-slate-50"><Goal className="h-3.5 w-3.5" /> Record a goal</button><button type="button" onClick={() => submit(async () => { await api.post(`/league/fixtures/${fixture.id}/complete`); })} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4f2fe] px-3 py-2 text-xs font-semibold text-[#1a2b49] hover:bg-blue-100"><Check className="h-3.5 w-3.5" /> Finalize result</button></div></article>)}</div>}
      </section>}
      {activeTab === 'houses' && !selectedHouseView && <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-[#0f172a]">Houses</h2><span className="text-xs text-[#64748b]">{state.houses.length} registered</span></div>{isManager && <button type="button" onClick={() => { setEditingHouse(null); setHouseName(''); setLeader(null); startModal('house'); }} className={actionClass}><Plus className="h-3.5 w-3.5" /> Add house</button>}</div>
        {state.houses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{state.houses.map((house) => <button key={house.id} type="button" onClick={() => setSelectedHouseView(house)} className="relative flex min-h-[104px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-xs transition hover:border-[#2383c9]/50 hover:shadow-sm"><HouseCrest className="h-11 w-11"/><span className="min-w-0 flex-1 pr-12"><span className="block truncate text-base font-bold text-[#0f172a]">{house.name}</span><span className="block text-sm text-[#64748b]">House · {house.players.length} players</span><span className="block truncate text-xs text-[#64748b]">Leader: {house.leader_name}</span></span></button>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Shield className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-800">No houses added yet</p><p className="mt-1 text-sm text-slate-500">A league manager can register houses and their leaders.</p></div>}
      </section>}
      {activeTab === 'houses' && selectedHouseView && <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => setSelectedHouseView(null)} className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#1a2b49] transition hover:text-[#4e6387]" aria-label="Back to houses">
              <ArrowLeft className="h-4 w-4" /> Back to houses
            </button>
            <h2 className="text-xl font-bold text-[#0f172a]">{selectedHouseView.name}</h2>
            <p className="mt-1 text-sm text-[#64748b]">House leader: {selectedHouseView.leader_name}</p>
          </div>
          {isManager && <div className="flex gap-2">
            <button type="button" onClick={() => openHouseEdit(selectedHouseView)} className={actionClass}><Pencil className="h-3.5 w-3.5" /> Edit house</button>
            <button type="button" onClick={() => setDeleteTarget({ type: 'house', house: selectedHouseView })} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>}
        </div>
        {selectedHouseView.players?.length ? <div className="grid gap-6 md:grid-cols-2">
          {['girls', 'boys'].map((category) => {
            const housePlayers = selectedHouseView.players.filter((item) => item.gender === category);
            return <section key={category} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-base font-semibold text-[#0f172a]">{genderLabel(category)} players <span className="text-sm font-normal text-[#64748b]">· {housePlayers.length}</span></h3>
              {housePlayers.length ? <div className="space-y-2">{housePlayers.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#e4f2fe]">{item.avatar_url ? <img src={item.avatar_url} alt={item.full_name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[#2383c9]"><CircleUserRound className="h-8 w-8" /></div>}</div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0f172a]">{item.full_name}</span>
                {(isManager || selectedHouseView.leader_id === user?.id) && <div className="flex shrink-0">
                  <button type="button" onClick={() => openPlayerEdit(selectedHouseView, item)} aria-label={`Edit ${item.full_name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-[#e4f2fe]"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'player', houseId: selectedHouseView.id, player: item })} aria-label={`Remove ${item.full_name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>}
              </article>)}</div> : <p className="rounded-lg bg-[#f8fafb] px-3 py-5 text-center text-sm text-slate-500">No {category} players are registered in {selectedHouseView.name}.</p>}
            </section>;
          })}
        </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-semibold text-slate-800">No players in {selectedHouseView.name} yet</p>
          <p className="mt-1 text-sm text-slate-500">Players added to this house will appear here.</p>
        </div>}
      </section>}
      {activeTab === 'players' && <section className="space-y-6">
        {playersByHouse.some((house) => house.visiblePlayers.length) ? playersByHouse.filter((house) => house.visiblePlayers.length).map((house) => <div key={house.id}>
          <div className="mb-3 flex items-center gap-2"><h2 className="text-base font-semibold text-[#0f172a]">{house.name}</h2><span className="text-xs text-[#64748b]">Players · {genderLabel(gender)}</span></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{house.visiblePlayers.map((item) => <article key={item.id} className="flex min-h-[76px] items-center gap-3 border border-slate-200 bg-white p-2 shadow-xs"><div className="h-14 w-14 shrink-0 overflow-hidden border border-slate-200 bg-[#e4f2fe]">{item.avatar_url ? <img src={item.avatar_url} alt={item.full_name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[#9aa8b8]"><CircleUserRound className="h-10 w-10 stroke-[1.2]" /></div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#0f172a]" title={item.full_name}>{item.full_name}</p><p className="mt-0.5 truncate text-xs text-[#64748b]">{house.name} · {genderLabel(gender)}</p></div>{(isManager || house.leader_id === user?.id) && <div className="flex shrink-0 gap-0.5"><button type="button" onClick={() => openPlayerEdit(house, item)} aria-label={`Edit ${item.full_name}`} className="rounded-md p-1.5 text-[#64748b] hover:bg-[#e4f2fe] hover:text-[#2383c9]"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDeleteTarget({ type: 'player', houseId: house.id, player: item })} aria-label={`Remove ${item.full_name}`} className="rounded-md p-1.5 text-[#64748b] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>}</article>)}</div>
        </div>) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Users className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-800">No {genderLabel(gender).toLowerCase()} players added yet</p></div>}
      </section>}
      {activeTab === 'top-scorers' && <section className="max-w-2xl rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs sm:px-6"><div className="mb-1 flex items-center gap-2"><h2 className="text-lg font-semibold text-[#0f172a]">Top scorers</h2></div>{scorers.length ? scorers.map(showScorer) : <div className="py-8 text-center"><p className="font-medium text-slate-700">No goals scored yet</p><p className="mt-1 text-sm text-slate-500">Goal scorers appear here as match results are recorded.</p></div>}</section>}
    </>}

    {modal === 'house' && <Modal title={editingHouse ? 'Edit house' : 'Add a house'} onClose={() => setModal('')}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!leader) return toast.error('Search for and select a house leader'); submit(async () => { const payload = { name: houseName, leaderId: leader.id }; if (editingHouse) await api.put(`/league/houses/${editingHouse.id}`, payload); else await api.post('/league/houses', payload); setHouseName(''); setLeader(null); setEditingHouse(null); }); }}><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">House name</span><input required value={houseName} onChange={(event) => setHouseName(event.target.value)} placeholder="e.g. Red House" className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">House leader</span><PersonSearch selected={leader} onSelect={setLeader} placeholder="Type a student name or email" /></label><p className="text-xs text-slate-500">Search returns matching students as you type.</p><div className="flex justify-end"><button disabled={submitting || !leader} className={actionClass}><Check className="h-3.5 w-3.5" /> {editingHouse ? 'Save changes' : 'Save house'}</button></div></form></Modal>}
    {modal === 'player' && <Modal title={editingPlayer ? 'Edit house player' : 'Add a house player'} onClose={() => setModal('')}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!player || !selectedHouse) return toast.error('Choose a house and student'); submit(async () => { const payload = { userId: player.id, gender }; if (editingPlayer) await api.put(`/league/houses/${selectedHouse}/players/${editingPlayer.id}`, payload); else await api.post(`/league/houses/${selectedHouse}/players`, payload); setPlayer(null); setEditingPlayer(null); }); }}><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">House</span><select required disabled={!isManager || Boolean(editingPlayer)} value={selectedHouse} onChange={(event) => setSelectedHouse(event.target.value)} className={fieldClass}><option value="">Select a house</option>{state.houses.filter((house) => isManager || house.id === myHouse?.id).map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">Player</span><PersonSearch selected={player} onSelect={setPlayer} placeholder="Type a student name or email" /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">Category</span><select value={gender} onChange={(event) => setGender(event.target.value)} className={fieldClass}><option value="girls">Girls</option><option value="boys">Boys</option></select></label><div className="flex justify-end"><button disabled={submitting || !selectedHouse || !player} className={actionClass}>{editingPlayer ? 'Save changes' : 'Add player'}</button></div></form></Modal>}
    {modal === 'fixture' && <Modal title="Add a fixture" onClose={() => setModal('')}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(async () => { await api.post('/league/fixtures', fixtureForm); setFixtureForm({ homeHouseId: '', awayHouseId: '', gender: 'girls', matchDate: '', venue: '' }); }); }}><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">house 1</span><select required value={fixtureForm.homeHouseId} onChange={(event) => setFixtureForm({ ...fixtureForm, homeHouseId: event.target.value })} className={fieldClass}><option value="">Select a house</option>{state.houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">house 2</span><select required value={fixtureForm.awayHouseId} onChange={(event) => setFixtureForm({ ...fixtureForm, awayHouseId: event.target.value })} className={fieldClass}><option value="">Select a house</option>{state.houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}</select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">Category</span><select value={fixtureForm.gender} onChange={(event) => setFixtureForm({ ...fixtureForm, gender: event.target.value })} className={fieldClass}><option value="girls">Girls</option><option value="boys">Boys</option></select></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">Kick-off</span><input type="datetime-local" value={fixtureForm.matchDate} onChange={(event) => setFixtureForm({ ...fixtureForm, matchDate: event.target.value })} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0f172a]">Venue (optional)</span><input value={fixtureForm.venue} onChange={(event) => setFixtureForm({ ...fixtureForm, venue: event.target.value })} className={fieldClass} /></label><div className="flex justify-end"><button disabled={submitting || state.houses.length < 2} className={actionClass}>Save fixture</button></div></form></Modal>}
    {modal === 'goal' && activeFixture && <Modal title={`Record a ${genderLabel(activeFixture.gender).toLowerCase()} goal`} onClose={() => setModal('')}><p className="mb-4 text-sm text-[#64748b]">{activeFixture.home_name} vs {activeFixture.away_name}. The score and top scorers update when a goal is added.</p><div className="space-y-2">{state.houses.filter((house) => [activeFixture.home_house_id, activeFixture.away_house_id].includes(house.id)).map((house) => <div key={house.id} className="rounded-lg border border-slate-200 p-3"><p className="mb-2 text-sm font-semibold text-[#0f172a]">{house.name}</p><div className="space-y-1">{house.players.filter((item) => item.gender === activeFixture.gender).map((item) => <button key={item.id} type="button" disabled={submitting} onClick={() => submit(async () => { await api.post(`/league/fixtures/${activeFixture.id}/goals`, { playerId: item.id }); })} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[#1a2b49] hover:bg-[#e4f2fe] disabled:opacity-50"><span>{item.full_name}</span><Plus className="h-4 w-4" /></button>)}{house.players.every((item) => item.gender !== activeFixture.gender) && <p className="px-3 py-2 text-xs text-slate-500">No {genderLabel(activeFixture.gender).toLowerCase()} players are registered for this house.</p>}</div></div>)}</div></Modal>}
    <ConfirmModal
      open={Boolean(deleteTarget)}
      title={deleteTarget?.type === 'house' ? 'Delete house?' : deleteTarget?.type === 'player' ? 'Remove player from house?' : 'Delete result?'}
      message={deleteTarget?.type === 'house'
        ? `Delete ${deleteTarget.house.name}? Upcoming fixtures must be removed first. Completed results will keep their history.`
        : deleteTarget?.type === 'player'
          ? `Remove ${deleteTarget?.player?.full_name || 'this player'} from the house? Their recorded goals will also be removed from live scores and results.`
          : `Delete the result ${deleteTarget?.fixture?.home_name} versus ${deleteTarget?.fixture?.away_name}? Its recorded goals will be deleted too.`}
      confirmLabel={submitting ? 'Deleting…' : deleteTarget?.type === 'house' ? 'Delete house' : deleteTarget?.type === 'player' ? 'Remove player' : 'Delete result'}
      onConfirm={confirmDelete}
      onCancel={() => { if (!submitting) setDeleteTarget(null); }}
    />
  </div>;
}
