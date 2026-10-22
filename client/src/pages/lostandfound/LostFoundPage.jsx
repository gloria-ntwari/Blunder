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
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Report / Edit modal (shared)
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = create, object = edit
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [locationFound, setLocationFound] = useState('');
  const [dateFound, setDateFound] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  const canManage = user && ['super_admin', 'admin'].includes(user.role);

  useEffect(() => { fetchItems(); }, [filterStatus]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/lost-found?status=${filterStatus}`);
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

  const openReportModal = () => {
    setEditingItem(null);
    setItemName(''); setDescription(''); setLocationFound('');
    setDateFound(format(new Date(), 'yyyy-MM-dd'));
    setPhoto(null); setPhotoPreview('');
    setShowReportModal(true);
  };

  const openEditModal = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setItemName(item.item_name || '');
    setDescription(item.description || '');
    setLocationFound(item.location_found || '');
    setDateFound(item.date_found ? format(new Date(item.date_found), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setPhoto(null);
    setPhotoPreview(item.photo_url || '');
    setShowReportModal(true);
  };

  const handleDelete = async (id, e) => {
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
      toast.success('Comment posted');
    } catch (err) {
      toast.error('Could not post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!itemName || !locationFound) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('item_name', itemName);
    formData.append('description', description);
    formData.append('location_found', locationFound);
    formData.append('date_found', dateFound);
    if (photo) formData.append('photo', photo);

    try {
      if (editingItem) {
        await api.put(`/lost-found/${editingItem.id}`, formData);
        toast.success('Item updated!');
      } else {
        await api.post('/lost-found', formData);
        toast.success('Found item reported! Thank you for helping.');
      }
      setShowReportModal(false);
      fetchItems();
    } catch (err) {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to report item');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
            {t('lostFound.title', 'Lost & Found')}
          </h1>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            Found something or lost an essential? Claim it or report it here instead of asking around in WhatsApp.
          </p>
        </div>

        <button
          onClick={openReportModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('Report found item')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'unclaimed', 'claimed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              filterStatus === status
                ? 'bg-[#1a2b49] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Loading lost & found items...</div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-200">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0f172a]">No items found in this filter</p>
          <p className="text-xs text-[#64748b] mt-1">Found something? Click the button above to report it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => openDetailModal(item)}
              className="bg-white rounded-lg border border-slate-200/70 overflow-hidden shadow-xs flex flex-col justify-between cursor-pointer group"
            >
              <div className="relative h-48 bg-[#e4f2fe] overflow-hidden">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.item_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#2383c9]/60 bg-gradient-to-br from-[#e4f2fe] to-[#c7e4fc]">
                    <Search className="w-12 h-12" />
                    <span className="text-[11px] font-semibold mt-1">Item Photo</span>
                  </div>
                )}

                <div className="absolute top-3 left-3">
                  {item.is_claimed ? (
                    <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                      Claimed ✓
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#1a2b49] text-white shadow-xs">
                      Unclaimed
                    </span>
                  )}
                </div>

                {/* Edit / Delete — visible on hover for owner or admin */}
                {(canManage || user?.id === item.posted_by_id) && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditModal(item, e)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-[#2383c9] shadow-xs"
                      title="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-red-500 shadow-xs"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-sm bg-black/60 text-white text-[10px] backdrop-blur-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date_found ? format(new Date(item.date_found), 'd MMM') : 'Recently'}</span>
                </div>
              </div>

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
                    Found by {item.posted_by_name?.split(' ')[0] || 'Student'}
                  </span>
                  <span className="text-xs font-semibold text-[#2383c9] group-hover:underline">View & Claim →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <Modal onClose={() => setSelectedItem(null)} maxWidth="max-w-xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
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
                <span className="text-[#64748b] block text-[11px]">Where it was found</span>
                <span className="font-semibold text-[#0f172a]">{selectedItem.location_found}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[11px]">Finder</span>
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

            <div className="pt-1">
              {selectedItem.is_claimed ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Item already claimed by {selectedItem.claimed_by_name || 'a student'}.</span>
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(selectedItem.id)}
                  className="w-full py-3 bg-[#1a2b49] hover:bg-[#14223b] text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I lost this! Claim Item</span>
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2383c9]" />
                <h4 className="text-xs font-bold text-[#0f172a]">Discussion & Replies</h4>
                <span className="text-[10px] text-[#64748b]">({comments.length})</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#64748b] italic py-2">No replies yet. Ask a question below to coordinate pickup.</p>
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
                <input
                  type="text" required value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ask where to meet or give identifying detail..."
                  className="flex-1 bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                />
                <button type="submit" disabled={submittingComment}
                  className="px-4 py-2.5 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Report / Edit Item Modal */}
      {showReportModal && (
        <Modal onClose={() => setShowReportModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#0f172a]">
                {editingItem ? 'Edit Found Item' : 'Report Found Item'}
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Item Name</label>
                <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Blue HydroFlask Bottle, TI-84 Calculator"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Where was it found?</label>
                <input type="text" required value={locationFound} onChange={(e) => setLocationFound(e.target.value)}
                  placeholder="e.g. Library 2nd floor, Dining Hall counter"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Date Found</label>
                <input type="date" required value={dateFound} onChange={(e) => setDateFound(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Description / Distinguishing features</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any stickers, scratches, initials or brand marks..."
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                  Photo <span className="font-normal text-[#64748b]">(optional)</span>
                </label>
                <input type="file" accept="image/*"
                  onChange={(e) => { if (e.target.files?.[0]) { setPhoto(e.target.files[0]); setPhotoPreview(URL.createObjectURL(e.target.files[0])); } }}
                  className="text-xs text-[#64748b] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e4f2fe] file:text-[#2383c9] hover:file:bg-[#2383c9] hover:file:text-white" />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-full h-28 object-cover rounded-lg mt-2" />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg">
                  {uploading ? (editingItem ? 'Saving...' : 'Uploading...') : (editingItem ? 'Save Changes' : 'Publish Found Item')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={confirmState.open}
        title="Delete item?"
        message="This will permanently remove this lost & found item."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
