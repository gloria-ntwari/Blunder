import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, Plus, Users, Pencil, Megaphone, X, Crown, Mail, UserRound, ChevronDown, Eye, EyeOff, SmilePlus, ImagePlus, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import Modal from '../../components/layout/Modal.jsx';

const canCreateGuild = ['student', 'student_leader', 'sv_committee', 'committee', 'mentor', 'super_admin'];

export default function GuildsPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [guilds, setGuilds] = useState([]);
  const [guildView, setGuildView] = useState('mine');
  const [announcements, setAnnouncements] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guildModal, setGuildModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [hiddenViews, setHiddenViews] = useState({});
  const [openReactionPicker, setOpenReactionPicker] = useState(null);
  const [editingGuild, setEditingGuild] = useState(null);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadGuilds = useCallback(async () => {
    try {
      const { data } = await api.get('/guilds', { params: { view: guildView } });
      setGuilds(data);
      const requestedGuildId = new URLSearchParams(location.search).get('guild');
      setSelectedGuild((current) => data.find((guild) => guild.id === requestedGuildId)
        || data.find((guild) => guild.id === current?.id) || data[0] || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load Guilds');
    } finally { setLoading(false); }
  }, [guildView, location.search]);

  useEffect(() => { loadGuilds(); }, [loadGuilds]);
  useEffect(() => {
    let active = true;
    const creatorView = selectedGuild?.created_by === user?.id;
    const directorySummary = user?.role === 'super_admin' && guildView === 'all' && !creatorView;
    if (!selectedGuild || directorySummary) { setAnnouncements([]); return () => { active = false; }; }
    api.get(`/guilds/${selectedGuild.id}/announcements`)
      .then(({ data }) => { if (active) setAnnouncements(data); })
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load Guild announcements'));
    return () => { active = false; };
  }, [selectedGuild?.id, selectedGuild?.created_by, guildView, user?.id, user?.role]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('announcement');
    if (!id || !announcements.some((announcement) => announcement.id === id)) return;
    requestAnimationFrame(() => document.getElementById(`guild-announcement-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [announcements, location.search]);

  const openGuildModal = (guild = null) => {
    setEditingGuild(guild);
    setName(guild?.name || '');
    setEmails((guild?.members || []).filter((member) => member.id !== user.id).map((member) => member.email).join(', '));
    setGuildModal(true);
  };

  const saveGuild = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { name, emails: emails.split(/[\n,;]+/).map((email) => email.trim()).filter(Boolean) };
    try {
      const { data } = editingGuild
        ? await api.put(`/guilds/${editingGuild.id}`, payload)
        : await api.post('/guilds', payload);
      setGuildModal(false);
      await loadGuilds();
      setSelectedGuild(data);
      toast.success(editingGuild ? 'Guild updated' : 'Guild created');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save Guild'); }
    finally { setSaving(false); }
  };

  const createAnnouncement = async (event) => {
    event.preventDefault();
    if (!selectedGuild) return;
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', title);
      payload.append('body', body);
      payload.append('expires_at', expiresAt);
      payload.append('is_pinned', String(isPinned));
      if (imageFile) payload.append('image', imageFile);
      await api.post(`/guilds/${selectedGuild.id}/announcements`, payload);
      const { data } = await api.get(`/guilds/${selectedGuild.id}/announcements`);
      setAnnouncements(data);
      setAnnouncementModal(false); setTitle(''); setBody(''); setExpiresAt(''); setImageFile(null); setImagePreview(''); setIsPinned(false);
      await loadGuilds();
      toast.success('Announcement posted');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not post announcement'); }
    finally { setSaving(false); }
  };

  const react = async (announcement, reaction) => {
    const previous = announcement.user_reactions || [];
    const removing = previous.includes(reaction);
    const userReactions = removing ? previous.filter((item) => item !== reaction) : [...previous, reaction];
    const reactionCounts = { ...(announcement.reaction_counts || {}) };
    reactionCounts[reaction] = Math.max(0, (reactionCounts[reaction] || 0) + (removing ? -1 : 1));
    setAnnouncements((current) => current.map((item) => item.id === announcement.id
      ? { ...item, user_reactions: userReactions, reaction_counts: reactionCounts } : item));
    try {
      await api.post(`/guilds/${selectedGuild.id}/announcements/${announcement.id}/reactions`, { reaction });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save reaction');
      const { data } = await api.get(`/guilds/${selectedGuild.id}/announcements`);
      setAnnouncements(data);
    }
  };

  const isCreator = selectedGuild?.created_by === user?.id;
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] ">Guilds</h1>
          <p className="mt-1 text-slate-600">Your shared spaces and their latest announcements.</p>
        </div>
        {canCreateGuild.includes(user?.role) && <button onClick={() => openGuildModal()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a2b49] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243d66]"><Plus className="w-4 h-4" /> Create Guild</button>}
      </header>

      {isSuperAdmin && <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label="Guild directory view">
        <button onClick={() => setGuildView('mine')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${guildView === 'mine' ? 'bg-[#1a2b49] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>My Guilds</button>
        <button onClick={() => setGuildView('all')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${guildView === 'all' ? 'bg-[#1a2b49] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>All Guilds</button>
      </div>}

      {loading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-[#64748b]">Loading your Guilds…</div> : guilds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Shield className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-800">You haven’t joined a Guild yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create one and invite people using their account email addresses.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-base font-bold text-[#0f172a]">{isSuperAdmin && guildView === 'all' ? 'Guild Directory' : 'Your Guilds'}</h2><p className="mt-0.5 text-sm text-[#64748b]">{isSuperAdmin && guildView === 'all' ? 'Guild names and their creators.' : 'Select a Guild to view its announcements.'}</p></div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{guilds.length} Guild{guilds.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {guilds.map((guild) => {
                const active = guild.id === selectedGuild?.id;
                return <button key={guild.id} onClick={() => { setSelectedGuild(guild); setMembersOpen(false); }} className={`rounded-lg border p-4 text-left transition ${active ? 'border-[#1a2b49] bg-[#f8fafb] ring-1 ring-[#1a2b49]/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2"><span className="text-base font-bold text-[#0f172a]">{guild.name}</span>{guild.created_by === user?.id && <span className="rounded-sm bg-[#e4f2fe] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2383c9]">Creator</span>}</div>
                  {(isSuperAdmin && guildView === 'all') && <span className="mt-1 inline-flex items-center gap-1 text-xs text-[#64748b]"><Crown className="h-3.5 w-3.5 text-amber-500" />Leader: {guild.creator_name}</span>}
                  {!(isSuperAdmin && guildView === 'all') && <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-[#64748b]"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{guild.member_count} members</span><span className="inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" />{guild.announcement_count} announcements</span></div>}
                </button>;
              })}
            </div>
          </section>

          {selectedGuild && isSuperAdmin && guildView === 'all' && !isCreator ? <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Guild leader</p><h2 className="mt-1 text-xl font-bold text-[#0f172a]">{selectedGuild.creator_name}</h2><p className="mt-1 text-sm text-[#64748b]">{selectedGuild.name}</p></div>
            <button onClick={() => openGuildModal(selectedGuild)} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#1a2b49] hover:bg-slate-50 sm:self-auto"><Pencil className="h-4 w-4" /> Edit Guild</button>
          </section> : selectedGuild && <>
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Selected Guild</p><h2 className="mt-1 text-xl font-bold text-[#0f172a]">{selectedGuild.name}</h2><p className="mt-1 text-sm text-[#64748b]">Created by {selectedGuild.creator_name}</p></div>
                <div className="flex flex-wrap gap-2">
                  {isCreator && <button onClick={() => setMembersOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1a2b49] hover:bg-slate-50"><Users className="h-4 w-4" /> Members <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{selectedGuild.member_count}</span><ChevronDown className={`h-4 w-4 transition-transform ${membersOpen ? 'rotate-180' : ''}`} /></button>}
                  {(isCreator || isSuperAdmin) && <button onClick={() => openGuildModal(selectedGuild)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#1a2b49] hover:bg-slate-50"><Pencil className="h-4 w-4" /> Edit Guild</button>}
                  {isCreator && <button onClick={() => { setTitle(''); setBody(''); setExpiresAt(''); setImageFile(null); setImagePreview(''); setIsPinned(false); setAnnouncementModal(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1a2b49] px-3 py-2 text-sm font-semibold text-white hover:bg-[#14223b]"><Plus className="h-4 w-4" /> New announcement</button>}
                </div>
              </div>
              {membersOpen && <div className="p-5">
                {isCreator ? <div className="overflow-hidden rounded-lg border border-slate-200"><div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] bg-[#1a2b49] px-4 py-3 text-xs font-bold uppercase tracking-wide text-white"><span>Member</span><span>Email</span></div><div className="divide-y divide-slate-100">{selectedGuild.members?.map((member) => <div key={member.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center px-4 py-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-semibold text-[#0f172a]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e4f2fe] text-xs font-bold text-[#2383c9]">{member.full_name?.charAt(0)?.toUpperCase() || <UserRound className="h-4 w-4" />}</span><span className="truncate">{member.full_name}</span></span><span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[#64748b]"><Mail className="h-3.5 w-3.5 shrink-0" />{member.email}</span></div>)}</div></div> : <p className="text-sm text-[#64748b]">Only the Guild creator can view the full member list.</p>}
              </div>}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-bold text-[#0f172a]">Announcements</h2><p className="mt-0.5 text-sm text-[#64748b]">Updates shared with {selectedGuild.name} members.</p></div><span className="text-xs font-semibold text-[#64748b]">{announcements.length} total</span></div>
              {announcements.length ? <div className="divide-y divide-slate-100">{announcements.map((announcement) => <article key={announcement.id} id={`guild-announcement-${announcement.id}`} className="px-5 py-5">
                <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-sm bg-[#e4f2fe] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2383c9]">{announcement.guild_name}</span>{announcement.is_pinned && <span className="inline-flex items-center gap-1 rounded-sm bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700"><Pin className="h-3 w-3" />Pinned</span>}<span className="text-xs text-[#64748b]">{format(new Date(announcement.created_at), 'MMM d, yyyy · h:mm a')}</span></div>
                {announcement.image_url && <img src={announcement.image_url} alt="" className="mb-3 max-h-80 w-full rounded-lg border border-slate-100 object-cover" />}
                <h3 className="text-base font-bold text-[#0f172a]">{announcement.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#64748b]">{announcement.body}</p>
                {announcement.expires_at && <p className="mt-2 text-xs text-[#64748b]">Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy · h:mm a')}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {[...new Set(['👍', '❤️', '😂', ...Object.keys(announcement.reaction_counts || {}), ...(announcement.user_reactions || [])])].map((emoji) => {
                    const count = announcement.reaction_counts?.[emoji] || 0;
                    const active = announcement.user_reactions?.includes(emoji);
                    return <button key={emoji} type="button" onClick={() => react(announcement, emoji)} title={emoji} className={`rounded-full border px-2 py-1 text-xs ${active ? 'border-[#2383c9] bg-[#e4f2fe] text-[#1a2b49]' : 'border-slate-200 text-[#64748b] hover:bg-slate-50'}`}>{emoji}{count ? ` ${count}` : ''}</button>;
                  })}
                  <div className="relative">
                    <button type="button" onClick={() => setOpenReactionPicker(openReactionPicker === announcement.id ? null : announcement.id)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-[#64748b] hover:bg-slate-50" aria-label="More reactions"><SmilePlus className="h-4 w-4" /></button>
                    {openReactionPicker === announcement.id && <div className="absolute bottom-10 left-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{['😍','😎','😮','😢','😡','🎉','👏','🙏','🔥','💯','🥰','🤔','🙌','💪','✅','❌','⭐','💐','🤩','🤣','😴','🤗','👀','💙','💚','🧡','🤍','💜','😇','🤝','🍾','🥳'].map((emoji) => <button key={emoji} type="button" onClick={() => { react(announcement, emoji); setOpenReactionPicker(null); }} className="h-7 w-7 rounded text-lg hover:bg-slate-100" aria-label={`React ${emoji}`}>{emoji}</button>)}</div>}
                  </div>
                  <button type="button" onClick={() => setHiddenViews((current) => ({ ...current, [announcement.id]: !current[announcement.id] }))} className="ml-auto inline-flex items-center gap-1 text-xs text-[#64748b]" title={hiddenViews[announcement.id] ? 'Show views' : 'Hide views'} aria-label={hiddenViews[announcement.id] ? 'Show view count' : 'Hide view count'}>{hiddenViews[announcement.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {hiddenViews[announcement.id] ? '•••' : announcement.view_count || 0}</button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#64748b]"><div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#e4f2fe] text-[10px] font-bold text-[#2383c9]">{announcement.author_avatar ? <img src={announcement.author_avatar} alt="" className="h-full w-full object-cover" /> : announcement.author_name?.charAt(0) || 'A'}</div><span className="font-medium text-[#0f172a]">{announcement.author_name}</span></div>
              </article>)}</div> : <div className="p-8 text-center"><Megaphone className="mx-auto mb-2 h-7 w-7 text-slate-300" /><p className="text-sm font-semibold text-[#0f172a]">No announcements yet</p><p className="mt-1 text-xs text-[#64748b]">Announcements from this Guild will appear here.</p></div>}
            </section>
          </>}
        </div>
      )}

      {guildModal && <Modal onClose={() => setGuildModal(false)} maxWidth="max-w-lg"><form onSubmit={saveGuild} className="p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700"></p><h2 className="mt-1 text-xl font-bold text-[#1a2b49]">{editingGuild ? 'Edit Guild' : 'Create a Guild'}</h2></div><button type="button" onClick={() => setGuildModal(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <label className="mb-4 block text-sm font-medium text-slate-700">Guild name<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="e.g. Robotics Guild" /></label>
        {(!editingGuild || editingGuild.created_by === user?.id) && <><label className="block text-sm font-medium text-slate-700">Invite people by email<textarea value={emails} onChange={(event) => setEmails(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="name@louisenlund.de" /></label>
        <p className="mt-2 text-xs leading-5 text-slate-500">Enter existing student or teacher account emails, separated by commas or new lines. Unknown emails won’t be added.</p></>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setGuildModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-lg bg-[#1a2b49] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : editingGuild ? 'Save changes' : 'Create Guild'}</button></div>
      </form></Modal>}

      {announcementModal && <Modal onClose={() => setAnnouncementModal(false)} maxWidth="max-w-lg"><form onSubmit={createAnnouncement} className="p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{selectedGuild?.name}</p><h2 className="mt-1 text-xl font-bold text-[#1a2b49]">New announcement</h2></div><button type="button" onClick={() => setAnnouncementModal(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-[#0f172a]"><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} className="rounded text-[#2383c9]" /><Pin className="h-3.5 w-3.5 text-[#f97316]" /><span>Pin to top</span></label>
        <label className="mb-4 block text-sm font-medium text-slate-700">Title<input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Announcement title" /></label>
        <label className="mb-4 block text-sm font-medium text-slate-700">Expiration date (optional)<input type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="block text-sm font-medium text-slate-700">Message<textarea required rows={6} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Write your announcement…" /></label>
        <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-[#1a2b49] hover:bg-slate-50"><ImagePlus className="h-4 w-4 text-[#2383c9]" /><span>{imageFile?.name || 'Add a photo'}</span><input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); } }} /></label>
        {imagePreview && <div className="relative mt-3"><img src={imagePreview} alt="Announcement preview" className="max-h-48 w-full rounded-lg border border-slate-100 object-cover" /><button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:text-red-600" aria-label="Remove photo"><X className="h-4 w-4" /></button></div>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAnnouncementModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-lg bg-[#1a2b49] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Posting…' : 'Post announcement'}</button></div>
      </form></Modal>}
    </div>
  );
}
