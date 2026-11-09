import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays,
  Check,
  Crown,
  ImagePlus,
  Pencil,
  ListMusic,
  Megaphone,
  Plus,
  Send,
  Shirt,
  SmilePlus,
  ThumbsUp,
  Trash2,
  Upload,
  Vote,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useSocket } from '../../context/SocketContext.jsx';
import Modal from '../../components/layout/Modal.jsx';

const validWebUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

const DEFAULT_REACTIONS = ['👍', '❤️', '😂'];
const EXTRA_REACTIONS = ['😍','😎','😮','😢','😡','🎉','👏','🙏','🔥','💯','🥰','🤔','🙌','💪','✅','❌','⭐','💐','🤩','🤣','😴','🤗','👀','💙','💚','🧡','🤍','💜','😇','🤝','🍾','🥳'];

export default function SchulhausPage() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const location = useLocation();
  const isDjTeam = ['dj_team', 'super_admin'].includes(user?.role);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('announcements');
  const [dressCodes, setDressCodes] = useState([]);
  const [songs, setSongs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dressTitle, setDressTitle] = useState('');
  const [dressDetails, setDressDetails] = useState('');
  const [wearDate, setWearDate] = useState('');
  const [dressImage, setDressImage] = useState(null);
  const [dressPreview, setDressPreview] = useState('');
  const [dressRemoveImage, setDressRemoveImage] = useState(false);
  const [editingDressCode, setEditingDressCode] = useState(null);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songLink, setSongLink] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementImage, setAnnouncementImage] = useState(null);
  const [announcementPreview, setAnnouncementPreview] = useState('');
  const [announcementRemoveImage, setAnnouncementRemoveImage] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistArtist, setPlaylistArtist] = useState('');
  const [playlistLink, setPlaylistLink] = useState('');
  const [editingPlaylistSong, setEditingPlaylistSong] = useState(null);
  const [expandedDressComments, setExpandedDressComments] = useState({});
  const [dressCommentDrafts, setDressCommentDrafts] = useState({});
  const [openDressReactionPicker, setOpenDressReactionPicker] = useState(null);

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section');
    if (['announcements', 'dress-code', 'music'].includes(section)) setActiveSection(section);
  }, [location.search]);

  const loadSchulhaus = useCallback(async () => {
    try {
      const { data } = await api.get('/schulhaus');
      setDressCodes(data.dress_codes || []);
      setSongs(data.songs || []);
      setAnnouncements(data.announcements || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load Schülerhaus');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSchulhaus(); }, [loadSchulhaus]);
  useEffect(() => {
    if (!socket) return;
    socket.on('schulhaus_changed', loadSchulhaus);
    return () => socket.off('schulhaus_changed', loadSchulhaus);
  }, [socket, loadSchulhaus]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get('announcement') || params.get('dressCode') || params.get('song');
    if (!targetId || loading) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`schulhaus-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.search, loading, announcements, dressCodes, songs, activeSection]);

  const openDressModal = (code = null) => {
    setEditingDressCode(code);
    setDressTitle(code?.title || '');
    setDressDetails(code?.details || '');
    setWearDate(code?.wear_date?.slice(0, 10) || '');
    setDressPreview(code?.image_url || '');
    setDressImage(null);
    setDressRemoveImage(false);
    setModal('dress');
  };

  const openAnnouncementModal = (announcement = null) => {
    setEditingAnnouncement(announcement);
    setAnnouncementTitle(announcement?.title || '');
    setAnnouncementBody(announcement?.body || '');
    setAnnouncementPreview(announcement?.image_url || '');
    setAnnouncementImage(null);
    setAnnouncementRemoveImage(false);
    setModal('announcement');
  };

  const closeModal = () => {
    setModal(null);
    setEditingDressCode(null);
    setDressImage(null);
    setDressPreview('');
    setDressRemoveImage(false);
    setDressTitle('');
    setDressDetails('');
    setWearDate('');
    setAnnouncementTitle('');
    setAnnouncementBody('');
    setEditingAnnouncement(null);
    setAnnouncementImage(null);
    setAnnouncementPreview('');
    setAnnouncementRemoveImage(false);
    setPlaylistTitle('');
    setPlaylistArtist('');
    setPlaylistLink('');
    setEditingPlaylistSong(null);
  };

  const openPlaylistSongModal = (song = null) => {
    setEditingPlaylistSong(song);
    setPlaylistTitle(song?.title || '');
    setPlaylistArtist(song?.artist || '');
    setPlaylistLink(song?.link || '');
    setModal('playlist-song');
  };

  const saveDressCode = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', dressTitle);
      payload.append('details', dressDetails);
      payload.append('wear_date', wearDate);
      if (dressImage) payload.append('image', dressImage);
      if (dressRemoveImage) payload.append('remove_image', 'true');
      if (editingDressCode) await api.put(`/schulhaus/dress-codes/${editingDressCode.id}`, payload);
      else await api.post('/schulhaus/dress-codes', payload);
      closeModal();
      await loadSchulhaus();
      toast.success(editingDressCode ? 'Dress code updated' : 'Dress code shared');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not share dress code'); }
    finally { setSaving(false); }
  };

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', announcementTitle);
      payload.append('body', announcementBody);
      if (announcementImage) payload.append('image', announcementImage);
      if (announcementRemoveImage) payload.append('remove_image', 'true');
      if (editingAnnouncement) await api.put(`/schulhaus/announcements/${editingAnnouncement.id}`, payload);
      else await api.post('/schulhaus/announcements', payload);
      closeModal();
      await loadSchulhaus();
      toast.success(editingAnnouncement ? 'Announcement updated' : 'Schülerhaus announcement posted');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not post announcement'); }
    finally { setSaving(false); }
  };

  const savePlaylistSong = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingPlaylistSong) await api.put(`/schulhaus/songs/${editingPlaylistSong.id}`, { title: playlistTitle, artist: playlistArtist, link: playlistLink });
      else await api.post('/schulhaus/songs/playlist', { title: playlistTitle, artist: playlistArtist, link: playlistLink });
      closeModal();
      await loadSchulhaus();
      toast.success(editingPlaylistSong ? 'Playlist song updated' : 'Song added to the playlist');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not add song to playlist'); }
    finally { setSaving(false); }
  };

  const submitSuggestion = async (event) => {
    event.preventDefault();
    if (!songTitle.trim()) return;
    setSaving(true);
    try {
      await api.post('/schulhaus/songs', { title: songTitle, artist: songArtist, link: songLink });
      setSongTitle(''); setSongArtist(''); setSongLink('');
      await loadSchulhaus();
      toast.success('Your music suggestion was added');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not add music suggestion'); }
    finally { setSaving(false); }
  };

  const suggestExisting = async (song) => {
    try {
      await api.post('/schulhaus/songs', { song_id: song.id });
      await loadSchulhaus();
      toast.success(`You suggested “${song.title}”`);
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save your suggestion'); }
  };

  const unsuggestSong = async (song) => {
    try {
      await api.delete(`/schulhaus/songs/${song.id}/suggestion`);
      await loadSchulhaus();
      toast.success(`Removed your suggestion for “${song.title}”`);
    } catch (error) { toast.error(error.response?.data?.message || 'Could not remove your suggestion'); }
  };

  const voteForSong = async (song) => {
    try {
      const { data } = await api.post(`/schulhaus/songs/${song.id}/vote`);
      setSongs((current) => current.map((item) => item.id === song.id
        ? { ...item, has_voted: data.has_voted, vote_count: data.vote_count } : item));
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save your vote'); }
  };

  const reactToDressCode = async (code, reaction) => {
    try {
      const { data } = await api.post(`/schulhaus/dress-codes/${code.id}/reactions`, { reaction });
      setDressCodes((current) => current.map((item) => item.id === code.id ? {
        ...item,
        reaction_counts: data.reaction_counts,
        user_reactions: data.user_reactions,
      } : item));
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save your reaction'); }
  };

  const submitDressComment = async (event, code) => {
    event.preventDefault();
    const body = dressCommentDrafts[code.id]?.trim() || '';
    if (!body) return;
    const wordCount = body.split(/\s+/u).filter(Boolean).length;
    if (wordCount > 10) return toast.error('Comments can be up to 10 words');
    try {
      await api.post(`/schulhaus/dress-codes/${code.id}/comments`, { body });
      setDressCommentDrafts((current) => ({ ...current, [code.id]: '' }));
      setExpandedDressComments((current) => ({ ...current, [code.id]: true }));
      await loadSchulhaus();
    } catch (error) { toast.error(error.response?.data?.message || 'Could not add comment'); }
  };

  const setPlaylistStatus = async (song, inPlaylist) => {
    try {
      await api.put(`/schulhaus/songs/${song.id}/playlist`, { in_playlist: inPlaylist });
      await loadSchulhaus();
      toast.success(inPlaylist ? 'Added to the playlist' : 'Removed from the playlist');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not update playlist'); }
  };

  const removeDressCode = async (id) => {
    try { await api.delete(`/schulhaus/dress-codes/${id}`); await loadSchulhaus(); toast.success('Dress code removed'); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not remove dress code'); }
  };

  const removeAnnouncement = async (id) => {
    try { await api.delete(`/schulhaus/announcements/${id}`); await loadSchulhaus(); toast.success('Announcement removed'); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not remove announcement'); }
  };

  const playlist = songs.filter((song) => song.in_playlist)
    .sort((left, right) => right.vote_count - left.vote_count || new Date(left.created_at) - new Date(right.created_at));
  const suggestions = songs.filter((song) => song.suggestion_count > 0)
    .sort((left, right) => right.vote_count - left.vote_count || right.suggestion_count - left.suggestion_count);
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 font-['Outfit']">
    
        
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] ">Schülerhaus</h1>
            <p className="mt-1 text-[#64748b]">Dress codes, music picks, the playlist, and announcements for the next campus gathering.</p>
          </div>

        </div>
      

      <nav className="flex flex-wrap items-center gap-2" aria-label="Schülerhaus sections">
        {[
          { key: 'announcements', label: 'Announcements' },
          { key: 'dress-code', label: 'Dress Code' },
          { key: 'music', label: 'Music' },
        ].map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveSection(section.key)}
            aria-pressed={activeSection === section.key}
            className={`rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors ${activeSection === section.key
              ? 'border-[#1a2b49] bg-[#1a2b49] text-white shadow-xs'
              : 'border-slate-200 bg-white text-[#64748b] hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold'
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading Schülerhaus…</div> : (
        <>
          {activeSection === 'announcements' && <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]">Schülerhaus announcements</h2><p className="mt-0.5 text-sm text-slate-500">The latest updates from the DJ team.</p></div>
              {isDjTeam && <button onClick={() => openAnnouncementModal()} className="inline-flex items-center gap-2 rounded-lg bg-[#1a2b49] px-3 py-2 text-xs font-semibold text-white hover:bg-[#243d66]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Post update</span></button>}
            </div>
            {announcements.length ? <div className="grid gap-3 md:grid-cols-2">{announcements.map((announcement) => <article id={`schulhaus-${announcement.id}`} key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col items-start gap-4 sm:flex-row"><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-bold text-[#0f172a]">{announcement.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.body}</p></div>{isDjTeam && <div className="flex shrink-0 items-center gap-1"><button onClick={() => openAnnouncementModal(announcement)} title="Edit announcement" className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#2383c9]"><Pencil className="h-4 w-4" /></button><button onClick={() => removeAnnouncement(announcement.id)} title="Remove announcement" className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>}</div></div>{announcement.image_url && <img src={announcement.image_url} alt="" className="h-32 w-full shrink-0 rounded-lg object-cover sm:h-28 sm:w-36" />}</div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span>{announcement.author_name || 'DJ-TEAM'}</span><span>{format(new Date(announcement.created_at), 'MMM d · h:mm a')}</span></div>
            </article>)}</div> : <EmptyState icon={Megaphone} title="No announcements yet" message="DJ team updates will show here." />}
          </section>}

          {activeSection === 'dress-code' && <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]"> Dress code</h2><p className="mt-0.5 text-sm text-slate-500">What to wear for the next gathering.</p></div>{isDjTeam && <button onClick={() => openDressModal()} className="inline-flex items-center gap-2 rounded-lg bg-[#1a2b49] px-3 py-2 text-xs font-semibold text-white hover:bg-[#243d66]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add dress code</span></button>}</div>
            {dressCodes.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{dressCodes.map((code) => {
              const reactionCounts = code.reaction_counts || {};
              const userReactions = code.user_reactions || [];
              const commentCount = Number(code.comment_count || 0);
              const commentDraft = dressCommentDrafts[code.id] || '';
              const commentWords = commentDraft.trim() ? commentDraft.trim().split(/\s+/u).filter(Boolean).length : 0;
              return <article id={`schulhaus-${code.id}`} key={code.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 bg-gradient-to-br from-[#e4f2fe] via-[#f5f8fc] to-[#dbeafe]">{code.image_url ? <img src={code.image_url} alt={code.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><Shirt className="h-16 w-16 text-[#2383c9]/40" /></div>}
                {code.wear_date && <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1a2b49] shadow-sm"><CalendarDays className="h-3.5 w-3.5" />{format(parseISO(code.wear_date), 'EEE, MMM d')}</span>}
                {isDjTeam && <div className="absolute right-3 top-3 flex gap-1"><button onClick={() => openDressModal(code)} title="Edit dress code" className="rounded-full bg-white/95 p-2 text-slate-500 shadow-sm hover:text-[#2383c9]"><Pencil className="h-4 w-4" /></button><button onClick={() => removeDressCode(code.id)} title="Remove dress code" className="rounded-full bg-white/95 p-2 text-slate-500 shadow-sm hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>}
              </div>
              <div className="p-4"><h3 className="font-bold text-[#0f172a]">{code.title}</h3>{code.details && <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{code.details}</p>}
                <div className="relative mt-3 flex flex-wrap items-center gap-1.5">{[...new Set([...DEFAULT_REACTIONS, ...Object.keys(reactionCounts), ...userReactions])].map((emoji) => {
                  const count = reactionCounts[emoji] || 0;
                  const active = userReactions.includes(emoji);
                  return <button key={emoji} type="button" onClick={() => reactToDressCode(code, emoji)} aria-label={`React ${emoji}`} aria-pressed={active} title={emoji} className={`rounded-full border px-2 py-1 text-xs transition-colors ${active ? 'border-[#2383c9] bg-[#e4f2fe] text-[#1a2b49]' : 'border-slate-200 text-[#64748b] hover:bg-slate-50'}`}>{emoji}{count ? ` ${count}` : ''}</button>;
                })}
                  <button type="button" onClick={() => setOpenDressReactionPicker(openDressReactionPicker === code.id ? null : code.id)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-[#64748b] hover:bg-slate-50" aria-label="More reactions"><SmilePlus className="h-4 w-4" /></button>
                  {openDressReactionPicker === code.id && <div className="absolute bottom-10 left-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{EXTRA_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => { reactToDressCode(code, emoji); setOpenDressReactionPicker(null); }} className="h-7 w-7 rounded text-lg hover:bg-slate-100" aria-label={`React ${emoji}`}>{emoji}</button>)}</div>}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2.5"><button type="button" onClick={() => setExpandedDressComments((current) => ({ ...current, [code.id]: !current[code.id] }))} aria-expanded={Boolean(expandedDressComments[code.id])} className="text-xs font-semibold text-[#1a2b49] hover:text-[#2383c9]">{expandedDressComments[code.id] ? 'Hide comments' : 'Comments'} ({commentCount})</button>
                  {expandedDressComments[code.id] && <div className="mt-2 space-y-2">{code.comments?.length > 0 && <ul className="max-h-36 space-y-2 overflow-y-auto">{code.comments.map((comment) => <li key={comment.id} className="rounded-md bg-slate-50 px-2.5 py-2"><p className="text-xs text-slate-700">{comment.body}</p><p className="mt-1 text-[10px] text-slate-400">{comment.author_name || 'Student'}</p></li>)}</ul>}
                    <form onSubmit={(event) => submitDressComment(event, code)} className="space-y-1.5"><div className="flex gap-2"><input value={commentDraft} onChange={(event) => setDressCommentDrafts((current) => ({ ...current, [code.id]: event.target.value }))} maxLength={300} placeholder="Add a short comment" aria-label="Dress-code comment, up to 10 words" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#2383c9]" /><button type="submit" disabled={!commentDraft.trim() || commentWords > 10} className="rounded-lg bg-[#1a2b49] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Send</button></div><p className={`text-right text-[10px] ${commentWords > 10 ? 'text-red-600' : 'text-slate-400'}`}>{commentWords}/10 words</p></form>
                  </div>}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">Shared by {code.author_name || 'DJ-TEAM'}</p></div>
              </article>;
            })}</div> : <EmptyState icon={Shirt} title="No dress codes posted" message="The DJ team will share outfit inspiration here." />}
          </section>}

          {activeSection === 'music' && <section className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]"> Playlist</h2><p className="mt-0.5 text-sm text-slate-500">Vote for your favorites. The top-voted playlist song stays at the top.</p></div>{isDjTeam && <button onClick={() => setModal('playlist-song')} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1a2b49] px-3 py-2 text-xs font-semibold text-white hover:bg-[#243d66]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add music</span></button>}</div>
              {playlist.length ? <PlaylistTable songs={playlist} isDjTeam={isDjTeam} onVote={voteForSong} onEdit={openPlaylistSongModal} onPlaylistChange={setPlaylistStatus} /> : <EmptyState icon={ListMusic} title="The playlist is taking shape" message={isDjTeam ? 'Add music directly or choose a community suggestion.' : 'Vote for songs in the suggestions list. The DJ team will choose what goes on the playlist.'} />}
            </div>

            <div className="space-y-7 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div><h2 className="flex items-center gap-2 text-lg font-bold text-[#0f172a]"><Vote className="h-5 w-5 text-[#1a2b49]" /> Music suggestions</h2><p className="mt-0.5 text-sm leading-5 text-slate-500">Suggestions with matching music names are grouped together. Add an existing pick or share a new one.</p></div>
              <form onSubmit={submitSuggestion} className="space-y-4 rounded-lg bg-[#f8fafb] p-3">
                <label className="block text-xs font-semibold text-slate-700">Music name<input required list="schulhaus-song-suggestions" maxLength={200} value={songTitle} onChange={(event) => setSongTitle(event.target.value)} placeholder="Search or enter a song" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /><datalist id="schulhaus-song-suggestions">{songs.map((song) => <option key={song.id} value={song.title}>{song.artist || ''}</option>)}</datalist></label>
                <div className="grid gap-2 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Artist <span className="font-normal text-slate-400">(optional)</span><input maxLength={200} value={songArtist} onChange={(event) => setSongArtist(event.target.value)} placeholder="Artist or performer" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label><label className="block text-xs font-semibold text-slate-700">Music link <span className="font-normal text-slate-400">(optional)</span><input type="url" value={songLink} onChange={(event) => setSongLink(event.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label></div>
                <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a2b49] px-3 py-2.5 text-xs font-semibold  text-white transition-colors hover:bg-slate-700 disabled:opacity-60"><Send className="h-3.5 w-3.5" />{saving ? 'Adding…' : 'Suggest music'}</button>
              </form>
              {suggestions.length ? <div className="space-y-1.5">{suggestions.map((song) => <SuggestionRow key={song.id} song={song} id={`schulhaus-${song.id}`} isDjTeam={isDjTeam} onSuggest={suggestExisting} onUnsuggest={unsuggestSong} onPlaylistChange={setPlaylistStatus} />)}</div> : <EmptyState icon={Vote} title="No music suggestions yet" />}
            </div>
          </section>}
        </>
      )}

      {modal === 'dress' && <Modal onClose={closeModal} maxWidth="max-w-xl"><form onSubmit={saveDressCode} className="space-y-4 p-6">
        <ModalHeading icon={Shirt} title={editingDressCode ? 'Edit dress code' : 'Share a dress code'} subtitle="Add a photo and a few details so everyone knows what to wear." onClose={closeModal} />
        <label className="block text-xs font-semibold text-slate-700">Look name<input required maxLength={160} value={dressTitle} onChange={(event) => setDressTitle(event.target.value)} placeholder="e.g. Summer garden party" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="block text-xs font-semibold text-slate-700">Details<textarea rows={3} value={dressDetails} onChange={(event) => setDressDetails(event.target.value)} placeholder="Colors, style, or anything to keep in mind…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="block text-xs font-semibold text-slate-700">Wear date <span className="font-normal text-slate-400">(optional)</span><input type="date" value={wearDate} onChange={(event) => setWearDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#2383c9]/40 bg-[#e4f2fe]/40 p-3 text-xs font-semibold text-[#1a2b49]"><ImagePlus className="h-4 w-4" /><span>{dressImage?.name || 'Add an outfit photo'}</span><input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setDressImage(file); setDressRemoveImage(false); setDressPreview(URL.createObjectURL(file)); } }} /></label>
        {dressPreview && <div className="space-y-2"><img src={dressPreview} alt="Dress code preview" className="max-h-64 w-full rounded-lg object-cover" />{editingDressCode && <button type="button" onClick={() => { setDressPreview(''); setDressImage(null); setDressRemoveImage(true); }} className="text-xs font-semibold text-red-600 hover:underline">Remove current photo</button>}</div>}
        <ModalActions onCancel={closeModal} saving={saving} action={editingDressCode ? 'Save changes' : 'Share dress code'} />
      </form></Modal>}

      {modal === 'announcement' && <Modal onClose={closeModal} maxWidth="max-w-lg"><form onSubmit={saveAnnouncement} className="space-y-4 p-6">
        <ModalHeading icon={Megaphone} title={editingAnnouncement ? 'Edit Schülerhaus update' : 'Post a Schülerhaus update'} subtitle="Share a message with everyone who can access Schülerhaus." onClose={closeModal} />
        <label className="block text-xs font-semibold text-slate-700">Title<input required maxLength={200} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="block text-xs font-semibold text-slate-700">Message<textarea required rows={5} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} placeholder="Write your update…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#2383c9]/40 bg-[#e4f2fe]/40 p-3 text-xs font-semibold text-[#1a2b49]"><ImagePlus className="h-4 w-4" /><span>{announcementImage?.name || 'Add an announcement photo (optional)'}</span><input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setAnnouncementImage(file); setAnnouncementRemoveImage(false); setAnnouncementPreview(URL.createObjectURL(file)); } }} /></label>
        {announcementPreview && <div className="space-y-2"><img src={announcementPreview} alt="Announcement preview" className="max-h-56 w-full rounded-lg object-cover" />{editingAnnouncement && <button type="button" onClick={() => { setAnnouncementPreview(''); setAnnouncementImage(null); setAnnouncementRemoveImage(true); }} className="text-xs font-semibold text-red-600 hover:underline">Remove current photo</button>}</div>}
        <ModalActions onCancel={closeModal} saving={saving} action={editingAnnouncement ? 'Save changes' : 'Post update'} />
      </form></Modal>}

      {modal === 'playlist-song' && <Modal onClose={closeModal} maxWidth="max-w-lg"><form onSubmit={savePlaylistSong} className="space-y-4 p-6">
        <ModalHeading icon={ListMusic} title={editingPlaylistSong ? 'Edit playlist song' : 'Add music to the playlist'} subtitle="Students can vote for tracks on the playlist." onClose={closeModal} />
        <label className="block text-xs font-semibold text-slate-700">Music name<input required maxLength={200} value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} placeholder="Song title" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="block text-xs font-semibold text-slate-700">Artist <span className="font-normal text-slate-400">(optional)</span><input maxLength={200} value={playlistArtist} onChange={(event) => setPlaylistArtist(event.target.value)} placeholder="Artist or performer" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <label className="block text-xs font-semibold text-slate-700">Music link <span className="font-normal text-slate-400">(optional)</span><input type="url" value={playlistLink} onChange={(event) => setPlaylistLink(event.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2383c9]" /></label>
        <ModalActions onCancel={closeModal} saving={saving} action={editingPlaylistSong ? 'Save changes' : 'Add to playlist'} />
      </form></Modal>}
    </div>
  );
}

function PlaylistTable({ songs, isDjTeam, onVote, onEdit, onPlaylistChange }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="hidden grid-cols-[44px_minmax(0,1fr)_100px_130px] items-center gap-3 border-b border-slate-100 bg-[#1a2b49] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:grid">
      <span>Rank</span><span>Song</span><span className="text-center">Votes</span><span className="text-right">Status</span>
    </div>
    <ol className="divide-y divide-slate-100">{songs.map((song, index) => <li id={`schulhaus-${song.id}`} key={song.id} className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-3 sm:grid-cols-[44px_minmax(0,1fr)_100px_130px] sm:gap-3 sm:px-4 ${index === 0 ? 'bg-[#f4f8fc]' : 'bg-white'}`}>
      <span className={`text-sm font-bold ${index === 0 ? 'text-[#2383c9]' : 'text-slate-400'}`}>{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-[#0f172a]">{song.title}</p>{index === 0 && <span className="shrink-0 rounded-xs bg-[#e4f2fe] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1a6ba8]">Leading</span>}</div><p className="mt-0.5 truncate text-xs text-slate-500">{song.artist || 'Artist not listed'}</p>{validWebUrl(song.link) && <a href={validWebUrl(song.link)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-medium text-[#2383c9] hover:underline">Open music link</a>}</div>
      <button onClick={() => onVote(song)} aria-pressed={song.has_voted} aria-label={`${song.has_voted ? 'Remove vote from' : 'Vote for'} ${song.title}; ${song.vote_count} votes`} className={`inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold sm:justify-self-center ${song.has_voted ? 'border-[#2383c9] bg-[#e4f2fe] text-[#1a2b49]' : 'border-slate-200 text-slate-600 hover:border-[#2383c9] hover:text-[#1a6ba8]'}`}><ThumbsUp className="h-3.5 w-3.5" /><span>{song.vote_count}</span></button>
      <div className="col-span-3 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">{isDjTeam ? <div className="flex items-center gap-3"><button onClick={() => onEdit(song)} className="text-[11px] font-medium text-[#2383c9] hover:underline">Edit</button><button onClick={() => onPlaylistChange(song, false)} className="text-[11px] font-medium text-slate-500 hover:text-red-600">Remove</button></div> : <span className="text-[10px] text-slate-400">{song.suggestion_count} {song.suggestion_count === 1 ? 'suggestion' : 'suggestions'}</span>}</div>
    </li>)}</ol>
  </div>;
}

function SuggestionRow({ song, id, isDjTeam, onSuggest, onUnsuggest, onPlaylistChange }) {
  return (
    <article id={id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300">
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0f172a]">{song.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{[song.artist, `${song.suggestion_count} ${song.suggestion_count === 1 ? 'suggestion' : 'suggestions'}`].filter(Boolean).join(' · ')}</p></div>
      <div className="flex shrink-0 items-center gap-1.5">{song.has_suggested ? <><span className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-emerald-700"><Check className="h-3.5 w-3.5" />Suggested</span><button onClick={() => onUnsuggest(song)} className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-red-600">Undo</button></> : <button onClick={() => onSuggest(song)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#2383c9] hover:bg-[#e4f2fe]">Suggest</button>}{isDjTeam && !song.in_playlist && <button onClick={() => onPlaylistChange(song, true)} className="rounded-md bg-[#1a2b49] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#243d66]">Add to playlist</button>}</div>
    </article>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center"><Icon className="mx-auto mb-3 h-9 w-9 text-slate-300" /><h3 className="text-lg font-semibold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{message}</p></div>;
}

function ModalHeading({ icon: Icon, title, subtitle, onClose }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e4f2fe] text-[#2383c9]"><Icon className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-[#1a2b49]">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>;
}

function ModalActions({ onCancel, saving, action }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1a2b49] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243d66] disabled:opacity-60"><Upload className="h-3.5 w-3.5" />{saving ? 'Saving…' : action}</button></div>;
}
