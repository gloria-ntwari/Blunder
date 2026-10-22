import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UtensilsCrossed,
  Plus,
  BellRing,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  X,
  Upload
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek } from 'date-fns';

import Modal from '../../components/layout/Modal.jsx';
export const getMealItemsList = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items.map((i) => (typeof i === 'string' ? i : i.name)).filter(Boolean);
  if (typeof items === 'string') {
    try {
      let parsed = JSON.parse(items);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed.map((i) => (typeof i === 'string' ? i : i.name)).filter(Boolean);
    } catch {}
    return items.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export default function FoodMenuPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [menuItems, setMenuItems] = useState([]);
  const [activeSnackAlerts, setActiveSnackAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSnackModal, setShowSnackModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formMealType, setFormMealType] = useState('lunch');
  const [formItemsText, setFormItemsText] = useState('');
  const [formIsSpecial, setFormIsSpecial] = useState(false);
  const [formImage, setFormImage] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState('');

  const [snackMessage, setSnackMessage] = useState('');
  const [snackExpires, setSnackExpires] = useState(60);

  const canEditMenu = user && ['super_admin', 'admin'].includes(user.role);

  useEffect(() => {
    fetchMenu();
    fetchSnackAlerts();
  }, [selectedDate]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/food?date=${selectedDate}`);
      setMenuItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnackAlerts = async () => {
    try {
      const res = await api.get('/food/snack-alerts');
      setActiveSnackAlerts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddModal = (existing = null) => {
    if (existing) {
      setEditItem(existing);
      setFormDate(format(new Date(existing.menu_date), 'yyyy-MM-dd'));
      const existingItems = getMealItemsList(existing.items);
      setFormItemsText(existingItems.join('\n'));
      setFormIsSpecial(existing.is_special_snack);
      setFormImagePreview(existing.image_url || '');
    } else {
      setEditItem(null);
      setFormDate(selectedDate);
      setFormMealType('lunch');
      setFormItemsText('');
      setFormIsSpecial(false);
      setFormImagePreview('');
    }
    setFormImage(null);
    setShowAddModal(true);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    const itemsArray = formItemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const formData = new FormData();
    formData.append('menu_date', formDate);
    formData.append('meal_type', formMealType);
    formData.append('items', JSON.stringify(itemsArray));
    formData.append('is_special_snack', formIsSpecial);
    if (formImage) formData.append('image', formImage);

    try {
      if (editItem) {
        await api.put(`/food/${editItem.id}`, formData);
        toast.success('Meal updated!');
      } else {
        await api.post('/food', formData);
        toast.success('Meal saved to timetable!');
      }
      setShowAddModal(false);
      fetchMenu();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving menu.');
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm('Delete this meal entry?')) return;
    try {
      await api.delete(`/food/${id}`);
      toast.success('Meal deleted');
      fetchMenu();
    } catch (err) {
      toast.error('Failed to delete meal');
    }
  };

  const handlePostSnackAlert = async (e) => {
    e.preventDefault();
    if (!snackMessage) return;
    try {
      await api.post('/food/snack-alert', {
        message: snackMessage,
        expires_minutes: Number(snackExpires)
      });
      toast.success('Snack alert broadcasted to everyone!');
      setSnackMessage('');
      setShowSnackModal(false);
      fetchSnackAlerts();
    } catch (err) {
      toast.error('Could not post snack alert');
    }
  };

  const startDay = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDay, i));

  const filteredItems = menuItems.filter((item) =>
    selectedMealType === 'all' ? true : item.meal_type === selectedMealType
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Active Snack Alert Banner */}
      {activeSnackAlerts.length > 0 && (
        <div className="bg-[#fff7ed] border border-[#f97316]/30 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-[#f97316] text-white flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#c2410c] uppercase tracking-wider">
                Real-Time Snack Alert!
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
              <span className="text-[11px] text-[#f97316] font-medium">Available right now at snack station</span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-[#0f172a] mt-0.5">
              {activeSnackAlerts[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
              {t('food.title', 'Food Menu')}
            </h1>

          </div>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            {t('food.subtitle', "See what's on the plate today across breakfast, lunch, dinner and snacks.")}
          </p>
        </div>

        {canEditMenu && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowSnackModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#fff7ed] hover:bg-[#ffedd5] text-[#c2410c] text-xs font-semibold rounded-lg border border-[#fed7aa] transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-[#f97316]" />
              <span>Post Snack Alert</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('Add meal')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Week Day Strip */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/70 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        {weekDays.map((dateObj) => {
          const formatted = format(dateObj, 'yyyy-MM-dd');
          const isSelected = selectedDate === formatted;
          const isToday = format(new Date(), 'yyyy-MM-dd') === formatted;

          return (
            <button
              key={formatted}
              onClick={() => setSelectedDate(formatted)}
              className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-lg text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1a2b49] text-white shadow-xs font-semibold'
                  : 'hover:bg-[#e4f2fe]/60 text-[#64748b]'
              }`}
            >
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                {format(dateObj, 'EEE')}
              </p>
              <p className="text-base font-bold mt-0.5">{format(dateObj, 'd')}</p>
              {isToday && (
                <span className={`block w-1.5 h-1.5 rounded-full mx-auto mt-1 ${isSelected ? 'bg-white' : 'bg-[#f97316]'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Meal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedMealType(type)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              selectedMealType === type
                ? 'bg-[#1a2b49] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-slate-200/70 hover:border-slate-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Meals Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Loading meals...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-200">
          <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0f172a]">No menu items found for this day</p>
          <p className="text-xs text-[#64748b] mt-1">Kitchen staff updates the timetable regularly.</p>
          {canEditMenu && (
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-4 px-4 py-2 bg-[#1a2b49] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Add First Meal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-lg border border-slate-200/70 overflow-hidden shadow-xs flex flex-col justify-between group"
            >
              <div className="relative h-44 bg-[#e4f2fe] overflow-hidden">
                {meal.image_url ? (
                  <img
                    src={meal.image_url}
                    alt={meal.meal_type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#2383c9]/60 bg-gradient-to-br from-[#e4f2fe] to-[#c7e4fc]">
                    <UtensilsCrossed className="w-12 h-12" />
                    <span className="text-[11px] font-semibold mt-1">Dining Hall</span>
                  </div>
                )}

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-white/95 text-[#2383c9] shadow-xs backdrop-blur-xs">
                    {meal.meal_type}
                  </span>
                  {meal.is_special_snack && (
                    <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#f97316] text-white shadow-xs">
                      Special ⭐
                    </span>
                  )}
                </div>

                {canEditMenu && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenAddModal(meal)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-[#2383c9] shadow-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(meal.id)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#64748b] hover:text-red-500 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#0f172a] capitalize">
                    {meal.meal_type} Buffet & Specials
                  </h3>

                  {(() => {
                    const dishItems = getMealItemsList(meal.items);
                    if (dishItems.length > 0) {
                      return (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-semibold text-[#2383c9] uppercase tracking-wider">
                            Dishes & Menu:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dishItems.map((dish, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e4f2fe]/80 text-[#1a6ba8] text-xs font-medium border border-[#2383c9]/20 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2383c9]" />
                                <span>{dish}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <p className="text-xs text-[#64748b] mt-2 italic">
                        Fresh seasonal school buffet selection
                      </p>
                    );
                  })()}
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748b]">
                  <span>Dining Hall Louisenlund</span>
                  <span className="font-medium text-[#2383c9]">Active on timetable</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Meal Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-5 font-['Outfit']">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[18px] text-[#0f172a]">
                  {editItem ? 'Edit Meal Entry' : 'Add New Meal'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Meal Type</label>
                <select
                  value={formMealType}
                  onChange={(e) => setFormMealType(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Menu Items <span className="font-normal text-[#64748b]">(one per line)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formItemsText}
                  onChange={(e) => setFormItemsText(e.target.value)}
                  placeholder={"Chicken Curry with Jasmine Rice\nVegetarian Lentil Dal\nFresh Salad Bowl"}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="specialCheck"
                  checked={formIsSpecial}
                  onChange={(e) => setFormIsSpecial(e.target.checked)}
                  className="rounded text-[#2383c9]"
                />
                <span className="text-xs font-medium text-[#0f172a]">Mark as Special Snack / Surprise Treat</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">
                  Food Photo <span className="font-normal text-[#64748b]">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFormImage(e.target.files[0]);
                      setFormImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs text-[#64748b] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e4f2fe] file:text-[#2383c9] hover:file:bg-[#2383c9] hover:file:text-white file:transition-colors"
                />
                {formImagePreview && (
                  <img
                    src={formImagePreview}
                    alt="Preview"
                    className="w-full h-28 object-cover rounded-lg mt-2 border border-slate-100"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {editItem ? 'Save Changes' : 'Save Meal'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Post Snack Alert Modal */}
      {showSnackModal && (
        <Modal onClose={() => setShowSnackModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-5 font-['Outfit']">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fff7ed] text-[#f97316] flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[18px] text-[#0f172a]">Broadcast Snack Alert</h3>
              </div>
              <button
                onClick={() => setShowSnackModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed">
              Alerts all students instantly about snacks not on the official timetable.
            </p>

            <form onSubmit={handlePostSnackAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Snack Message</label>
                <input
                  type="text"
                  required
                  value={snackMessage}
                  onChange={(e) => setSnackMessage(e.target.value)}
                  placeholder="e.g. Freshly baked cinnamon rolls at the kitchen counter!"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1.5">Expires in</label>
                <select
                  value={snackExpires}
                  onChange={(e) => setSnackExpires(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2383c9] transition-colors"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSnackModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
