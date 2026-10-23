import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Send,
  X,
  Trash2,
  Edit2,
  PackageSearch,
  PackageOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import Modal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';

export default function LostFoundPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');   // all | unclaimed | claimed
  const [filterType, setFilterType] = useState('all');        // all | found | lost
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Report / Edit modal — shared for both "found" and "lost" posts
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);    // null = create
  const [postType, setPostType] = useState('found');       // 'found' | 'lost'
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [locationField, setLocationField] = useState('');  // "where found" or "where last seen"
  const [dateField, setDateField] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  const canManage = user && ['super_admin', 'sv_committee'].includes(user.role);

  useEffect(() => { fetchItems(); }, [filterStatus, filterType]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/lost-found?status=${filterStatus}`;
      if (filterType !== 'all') url += `&post_type=${filterType}`;
      const res = await api.get(url);
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (item) => {
    try {
      const res = await api.get(`/lost-found/${item.id}`);
      setSelectedItem(res.data.item);
      setComments(res.data.comments || []);
    } catch {
      setSelectedItem(item);
      setComments([]);
    }
  };

  const openCreateModal = (type) => {
    setEditingItem(null);
    setPostType(type);
    setItemName(''); setDescription(''); setLocationField('');
    setDateField(format(new Date(), 'yyyy-MM-dd'));
    setPhoto(null); setPhotoPreview('');
    setShowFormModal(true);
  };

  const openEditModal = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setPostType(item.post_type || 'found');
    setItemName(item.item_name || '');
    setDescription(item.description || '');
    setLocationField(item.location_found || '');
    setDateField(item.date_found ? format(new Date(item.date_found), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setPhoto(null);
    setPhotoPreview(item.photo_url || '');
    setShowFormModal(true);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    try {
      await api.delete(`/lost-found/${confirmState.id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete item');
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const handleClaim = async (itemId) => {
    try {
      await api.post(`/lost-found/${itemId}/claim`);
      toast.success('You have claimed this item! Please contact the finder to collect.');
      fetchItems();
      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, is_claimed: true, claimed_by_name: user?.full_name }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not claim item.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedItem) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/lost-found/${selectedItem.id}/comments`, { body: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      toast.error('Could not post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!itemName || !locationField) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('item_name', itemName);
    formData.append('description', description);
    formData.append('location_found', locationField);
    formData.append('date_found', dateField);
    formData.append('post_type', postType);
    if (photo) formData.append('photo', photo);

    try {
      if (editingItem) {
        await api.put(`/lost-found/${editingItem.id}`, formData);
        toast.success('Item updated!');
      } else {
        await api.post('/lost-found', formData);
        toast.success(postType === 'found'
          ? 'Found item reported! Thank you for helping.'
          : 'Lost item posted! We hope someone finds it.');
      }
      setShowFormModal(false);
      fetchItems();
    } catch (err) {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to submit');
    } finally {
      setUploading(false);
    }
  };

  // ── Label helpers based on post_type ──
  const isFoundPost = (item) => (item?.post_type || 'found') === 'found';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
            {t('lostFound.title', 'Lost & Found')}
          </h1>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            Report a found item for others to claim, or post something you've lost so the community can help.
          </p>
        </div>

        {/* Two action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => openCreateModal('found')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <PackageOpen className="w-3.5 h-3.5" />
            <span>Report Found Item</span>
          </button>
          <button
            onClick={() => openCreateModal('lost')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <PackageSearch className="w-3.5 h-3.5" />
            <span>I Lost Something</span>
          </button>
        </div>
      </div>

      {/* Filter row: Type + Status */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        {[
          { key: 'all',   label: 'All' },
          { key: 'found', label: 'Found Items' },
          { key: 'lost',  label: 'Lost Items' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === f.key
                ? 'bg-[#1a2b49] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}>
            {f.label}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Status filter */}
        {['all', 'unclaimed', 'claimed'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filterStatus === s
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-200">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0f172a]">No items found</p>
          <p className="text-xs text-[#64748b] mt-1">Use the buttons above to report a found item or post something you lost.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const found = isFoundPost(item);
            return (
              <div key={item.id} onClick={() => openDetailModal(item)}
                className="bg-white rounded-lg border border-slate-200/70 overflow-hidden shadow-xs flex flex-col justify-between cursor-pointer group">

                {/* Image area */}
                <div className="relative h-48 overflow-hidden"
                  style={{ background: found ? 'linear-gradient(135deg,#e4f2fe,#c7e4fc)' : 'linear-gradient(135deg,#fff7ed,#fed7aa)' }}>
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
                      {found
                        ? <PackageOpen className="w-12 h-12 text-[#2383c9]" />
                        : <PackageSearch className="w-12 h-12 text-[#f97316]" />}
                      <span className="text-[11px] font-semibold mt-1 text-[#64748b]">
                        {found ? 'Found Item' : 'Lost Item'}
                      </span>
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                      found
                        ? 'bg-[#1a2b49] text-white'
                        : 'bg-[#f97316] text-white'
                    }`}>
                      {found ? 'Found' : 'Lost'}
                    </span>
                    {item.is_claimed && (
                      <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                        Resolved ✓
                      </span>
                    )}
                  </div>

                  {/* Edit / Delete buttons */}
                  {(canManage || user?.id === item.posted_by_id) && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openEditModal(item, e)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-[#2383c9] shadow-xs">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-red-500 shadow-xs">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Date badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-sm bg-black/60 text-white text-[10px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{item.date_found ? format(new Date(item.date_found), 'd MMM') : 'Recently'}</span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#0f172a] group-hover:text-[#2383c9] transition-colors">
                      {item.item_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b] mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#f97316]" />
                      <span>{item.location_found || 'Louisenlund Campus'}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#64748b] mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[#64748b] text-[11px]">
                      {found
                        ? `Found by ${item.posted_by_name?.split(' ')[0] || 'Student'}`
                        : `Lost by ${item.posted_by_name?.split(' ')[0] || 'Student'}`}
                    </span>
                    <span className="text-xs font-semibold text-[#2383c9] group-hover:underline">
                      {found ? 'View & Claim →' : 'View Details →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <Modal onClose={() => setSelectedItem(null)} maxWidth="max-w-xl">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                    isFoundPost(selectedItem) ? 'bg-[#1a2b49] text-white' : 'bg-[#f97316] text-white'
                  }`}>
                    {isFoundPost(selectedItem) ? 'Found' : 'Lost'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#0f172a]">{selectedItem.item_name}</h3>
                <p className="text-xs text-[#64748b]">
                  Reported on {selectedItem.date_found ? format(new Date(selectedItem.date_found), 'PPP') : 'Unknown'}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.photo_url && (
              <img src={selectedItem.photo_url} alt={selectedItem.item_name}
                className="w-full h-56 object-cover rounded-lg border border-slate-100" />
            )}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#f8fafb] text-xs">
              <div>
                <span className="text-[#64748b] block text-[11px]">
                  {isFoundPost(selectedItem) ? 'Where it was found' : 'Where last seen'}
                </span>
                <span className="font-semibold text-[#0f172a]">{selectedItem.location_found || '—'}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[11px]">
                  {isFoundPost(selectedItem) ? 'Finder' : 'Owner'}
                </span>
                <span className="font-semibold text-[#0f172a]">{selectedItem.posted_by_name || 'Anonymous'}</span>
              </div>
            </div>

            {selectedItem.description && (
              <div>
                <span className="text-xs font-semibold text-[#0f172a] block mb-1">Description</span>
                <p className="text-xs text-[#64748b] leading-relaxed bg-[#f8fafb] p-3 rounded-lg">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* Action button — different wording per type */}
            <div className="pt-1">
              {selectedItem.is_claimed ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isFoundPost(selectedItem)
                      ? `Item claimed by ${selectedItem.claimed_by_name || 'a student'}.`
                      : `This has been resolved by ${selectedItem.claimed_by_name || 'a student'}.`}
                  </span>
                </div>
              ) : isFoundPost(selectedItem) ? (
                <button onClick={() => handleClaim(selectedItem.id)}
                  className="w-full py-3 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>This is mine! Claim Item</span>
                </button>
              ) : (
                <button onClick={() => handleClaim(selectedItem.id)}
                  className="w-full py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Found This! Mark as Resolved</span>
                </button>
              )}
            </div>

            {/* Comments */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2383c9]" />
                <h4 className="text-xs font-bold text-[#0f172a]">Discussion & Replies</h4>
                <span className="text-[10px] text-[#64748b]">({comments.length})</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#64748b] italic py-2">No replies yet. Leave a message to coordinate.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-[#f8fafb] border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0f172a]">{c.author_name}</span>
                        <span className="text-[10px] text-[#64748b]">
                          {c.created_at ? format(new Date(c.created_at), 'HH:mm, d MMM') : ''}
                        </span>
                      </div>
                      <p className="text-[#64748b] leading-relaxed">{c.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input type="text" required value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a message to help coordinate..."
                  className="flex-1 bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
                <button type="submit" disabled={submittingComment}
                  className="px-4 py-2.5 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Report Found / I Lost Something Modal ── */}
      {showFormModal && (
        <Modal onClose={() => setShowFormModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4 font-['Outfit']">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">

                <h3 className="font-bold text-[18px] text-[#0f172a]">
                  {editingItem
                    ? 'Edit Item'
                    : postType === 'found'
                      ? 'Report Found Item'
                      : 'Report Lost Item'}
                </h3>
              </div>
              <button onClick={() => setShowFormModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Item Name</label>
                <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)}
                  placeholder={postType === 'found' ? 'e.g. Blue HydroFlask, TI-84 Calculator' : 'e.g. My Black Jacket, Student ID Card'}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  {postType === 'found' ? 'Where was it found?' : 'Where did you last see it?'}
                </label>
                <input type="text" required value={locationField} onChange={(e) => setLocationField(e.target.value)}
                  placeholder={postType === 'found' ? 'e.g. Library 2nd floor, Dining Hall' : 'e.g. Science Lab, Gym changing room'}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  {postType === 'found' ? 'Date Found' : 'Date Lost'}
                </label>
                <input type="date" required value={dateField} onChange={(e) => setDateField(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Description <span className="font-normal text-[#64748b]">(distinguishing features)</span>
                </label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any stickers, colour, brand, initials, scratches..."
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Photo <span className="font-normal text-[#64748b]">(optional — helps with identification)</span>
                </label>
                <input type="file" accept="image/*"
                  onChange={(e) => { if (e.target.files?.[0]) { setPhoto(e.target.files[0]); setPhotoPreview(URL.createObjectURL(e.target.files[0])); } }}
                  className="text-xs text-[#64748b] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e4f2fe] file:text-[#2383c9] hover:file:bg-[#2383c9] hover:file:text-white" />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-full h-28 object-cover rounded-lg mt-2" />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors ${
                    postType === 'found'
                      ? 'bg-[#1a2b49] hover:bg-[#14223b]'
                      : 'bg-[#f97316] hover:bg-[#ea580c]'
                  }`}>
                  {uploading
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : postType === 'found'
                        ? 'Publish Found Item'
                        : 'Post Lost Item'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={confirmState.open}
        title="Delete item?"
        message="This will permanently remove this item from Lost & Found."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
