import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getClassesForTrack } from '../../utils/academicTracks';

import Modal from '../../components/layout/Modal.jsx';
import ConfirmModal from '../../components/layout/ConfirmModal.jsx';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const PAGE_SIZE = 8;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedSuccessInfo, setInvitedSuccessInfo] = useState(null);
  const [inviteRole, setInviteRole] = useState('school_leader');
  const [inviteAdminType, setInviteAdminType] = useState('school_leader');
  const [inviteTrack, setInviteTrack] = useState('IB');
  const [inviteClass, setInviteClass] = useState('DP2');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMentors, setInviteMentors] = useState([]);
  const [inviteMentorId, setInviteMentorId] = useState('');
  const [loadingInviteMentors, setLoadingInviteMentors] = useState(false);

  // ── Edit User modal state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAdminType, setEditAdminType] = useState('');
  const [editTrack, setEditTrack] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editMentorId, setEditMentorId] = useState('');
  const [editMentors, setEditMentors] = useState([]);
  const [loadingEditMentors, setLoadingEditMentors] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, id: null });

  useEffect(() => { setCurrentPage(1); }, [roleFilter, searchTerm]);
  useEffect(() => { fetchUsers(); }, [roleFilter, searchTerm, currentPage]);

  const fetchInviteMentors = async (track) => {
    if (!track) return;
    setLoadingInviteMentors(true);
    try {
      const res = await api.get(`/users/mentors?academic_track=${track}`);
      const list = res.data || [];
      setInviteMentors(list);
      setInviteMentorId(list.length > 0 ? list[0].mentor_group_id : '');
    } catch {
      setInviteMentors([]);
      setInviteMentorId('');
    } finally {
      setLoadingInviteMentors(false);
    }
  };

  const fetchEditMentors = async (track) => {
    if (!track) { setEditMentors([]); setEditMentorId(''); return; }
    setLoadingEditMentors(true);
    try {
      const res = await api.get(`/users/mentors?academic_track=${track}`);
      const list = res.data || [];
      setEditMentors(list);
      setEditMentorId(''); // will be set to current group in openEditModal
    } catch {
      setEditMentors([]);
      setEditMentorId('');
    } finally {
      setLoadingEditMentors(false);
    }
  };

  const openInviteModal = () => {
    setInviteRole('school_leader');
    setInviteTrack('IB');
    const firstClass = getClassesForTrack('IB')[0]?.value || 'DP2';
    setInviteClass(firstClass);
    setInviteFullName('');
    setInviteEmail('');
    setInviteMentors([]);
    setInviteMentorId('');
    setShowInviteModal(true);
    // Load mentors immediately for the default track
    fetchInviteMentors('IB');
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?role=${roleFilter}&search=${searchTerm}&page=${currentPage}&limit=${PAGE_SIZE}`);
      setUsers(res.data.users || []);
      setTotalPages(res.data.pages || 1);
      setTotalUsers(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteFullName || !inviteEmail) return;
    setInviting(true);
    try {
      const { data } = await api.post('/auth/invite', {
        full_name: inviteFullName,
        email: inviteEmail,
        role: inviteRole,
        admin_type: inviteRole === 'admin' ? inviteAdminType : null,
        academic_track: inviteTrack,
        class_year: inviteClass || null,
        mentor_group_id: ['school_leader', 'student'].includes(inviteRole) ? (inviteMentorId || null) : null,
      });

      setShowInviteModal(false);
      setInvitedSuccessInfo({
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });

      if (data.emailSent) {
        toast.success(`Invitation email sent to ${inviteEmail}!`);
      } else {
        toast.error('User invited, but email could not be delivered.');
      }

      setInviteFullName('');
      setInviteEmail('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    setConfirmState({ open: true, id });
  };

  const doDeleteUser = async () => {
    try {
      await api.delete(`/users/${confirmState.id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setEditFullName(u.full_name || '');
    setEditRole(u.role || '');
    setEditAdminType(u.admin_type || '');
    setEditTrack(u.academic_track || '');
    setEditClass(u.class_year || '');
    setEditMentors([]);
    setEditActive(u.is_active !== false);
    setShowEditModal(true);
    // Load mentors then pre-select the user's current mentor_group_id
    if (['school_leader', 'student'].includes(u.role) && u.academic_track) {
      fetchEditMentors(u.academic_track).then(() => {
        setEditMentorId(u.mentor_group_id || '');
      });
    } else {
      setEditMentorId(u.mentor_group_id || '');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditing(true);
    try {
      await api.put(`/users/${editUser.id}`, {
        full_name: editFullName,
        role: editRole,
        admin_type: editRole === 'admin' ? editAdminType : null,
        academic_track: editRole === 'admin' ? null : editTrack || null,
        class_year: editRole === 'admin' ? null : editClass || null,
        mentor_group_id: ['school_leader', 'student'].includes(editRole) ? (editMentorId || null) : null,
        is_active: editActive,
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-semibold leading-[37.5px] text-[#0f172a] tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-[16px] font-normal leading-[24px] text-[#64748b] mt-0.5">
            Manage students, invite staff and mentors, and manage user roles.
          </p>
        </div>

        {user?.role === 'super_admin' && (
          <button
            onClick={openInviteModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Admin or Mentor</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['', 'super_admin', 'admin', 'school_leader', 'mentor', 'student'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-[#1a2b49] text-white shadow-xs'
                  : 'bg-[#f8fafb] text-[#64748b] hover:bg-slate-100'
              }`}
            >
              {r ? r.replace('_', ' ') : 'All Roles'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafb] text-xs text-[#0f172a] pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 focus:border-[#2383c9] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a2b49] text-white uppercase text-[10px] tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Role & Type</th>
                <th className="py-3 px-5">Academic Track</th>
                <th className="py-3 px-5">Class / Group</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#0f172a]">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#64748b]">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#64748b]">No users match this criteria.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f8fafb] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#e4f2fe] text-[#2383c9] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0f172a]">{u.full_name}</p>
                          <p className="text-[11px] text-[#64748b]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-block w-fit px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'super_admin' ? 'bg-red-50 text-red-600'
                          : u.role === 'school_leader' ? 'bg-indigo-50 text-indigo-600'
                          : u.role === 'admin' ? 'bg-orange-50 text-[#f97316]'
                          : u.role === 'mentor' ? 'bg-purple-50 text-purple-600'
                          : 'bg-[#e4f2fe] text-[#2383c9]'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                        {u.admin_type && u.role === 'admin' && (
                          <span className="text-[10px] text-[#64748b] capitalize">
                            {u.admin_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      {u.academic_track
                        ? <span className="font-medium text-[#0f172a]">{u.academic_track}</span>
                        : <span className="text-[#64748b]">—</span>}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="text-[#64748b]">
                        {u.class_year && <span className="text-[#0f172a]">{u.class_year}</span>}
                        {u.mentor_group_name && !['mentor', 'super_admin'].includes(u.role) && (
                          <span className="block text-[11px] text-[#64748b]">{u.mentor_group_name}</span>
                        )}
                        {(!u.class_year && (!u.mentor_group_name || ['mentor', 'super_admin'].includes(u.role))) && <span>—</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      {u.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /><span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <Clock className="w-3.5 h-3.5" /><span>Pending OTP</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      {user?.role === 'super_admin' && u.id !== user?.id && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-[#64748b] hover:text-[#2383c9] hover:bg-[#e4f2fe] rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-[#64748b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#64748b]">
          <span>
            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalUsers)} of {totalUsers} users
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#64748b] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-[#64748b]">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === p
                        ? 'bg-[#1a2b49] text-white'
                        : 'border border-slate-200 text-[#64748b] hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#64748b] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2383c9]" />
                <h3 className="font-bold text-base text-[#0f172a]">Invite Staff / Mentor</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748b]">
              The invited user will receive an email with a setup link to create their password and activate their account.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Full Name</label>
                <input type="text" required value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="e.g. Mr. David Schmidt"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Email Address</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@louisenlund.de"
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setInviteRole(nextRole);
                    if (nextRole === 'admin') {
                      setInviteTrack('');
                      setInviteClass('');
                      setInviteMentors([]);
                      setInviteMentorId('');
                    } else if (['school_leader', 'student'].includes(nextRole) && inviteTrack) {
                      fetchInviteMentors(inviteTrack);
                    }
                  }}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                >
                  <option value="school_leader">School Leader</option>
                  <option value="admin">Admin</option>
                  <option value="mentor">Mentor</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {inviteRole !== 'admin' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">Academic Track</label>
                    <select
                      value={inviteTrack}
                      onChange={(e) => {
                        const nextTrack = e.target.value;
                        setInviteTrack(nextTrack);
                        const classes = getClassesForTrack(nextTrack);
                        const firstClass = classes[0]?.value || '';
                        setInviteClass(firstClass);
                        if (inviteRole === 'school_leader') fetchInviteMentors(nextTrack);
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
                      value={inviteClass}
                      onChange={(e) => {
                        setInviteClass(e.target.value);
                        if (inviteRole === 'school_leader') fetchInviteMentors(inviteTrack);
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                    >
                      <option value="">All Classes in {inviteTrack}</option>
                      {getClassesForTrack(inviteTrack).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Show mentor selector for school_leader and student */}
                  {['school_leader', 'student'].includes(inviteRole) && inviteClass && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f172a] mb-1">Assign to Mentor</label>
                      {loadingInviteMentors ? (
                        <div className="text-xs text-[#64748b] py-1">Loading mentors...</div>
                      ) : inviteMentors.length > 0 ? (
                        <select
                          value={inviteMentorId}
                          onChange={(e) => setInviteMentorId(e.target.value)}
                          className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                        >
                          <option value="">No mentor assigned</option>
                          {inviteMentors.map((m) => (
                            <option key={m.mentor_group_id} value={m.mentor_group_id}>{m.group_name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-[#64748b] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          No mentors found for {inviteTrack} / {inviteClass}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={inviting}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                  {inviting ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Invite Success Modal */}
      {invitedSuccessInfo && (
        <Modal onClose={() => setInvitedSuccessInfo(null)} maxWidth="max-w-md">
          <div className="p-6 space-y-4 font-['Outfit']">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#0f172a]">Invitation Sent!</h3>
              </div>
              <button
                onClick={() => setInvitedSuccessInfo(null)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#64748b]">
                <strong className="text-[#0f172a]">{invitedSuccessInfo.fullName}</strong> ({invitedSuccessInfo.email}) has been invited as a <strong>{invitedSuccessInfo.role.replace('_', ' ')}</strong>.
              </p>

              {invitedSuccessInfo.emailSent ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>A setup email has been sent to <strong>{invitedSuccessInfo.email}</strong>. They can click the link in the email to set their password and activate their account.</span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Email delivery failed</span>
                    <span>The invitation email could not be delivered. Please check the SMTP configuration and try inviting this user again.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInvitedSuccessInfo(null)}
                className="w-full py-2.5 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <Modal onClose={() => setShowEditModal(false)} maxWidth="max-w-md">
          <div className="p-6 space-y-4 font-['Outfit']">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#2383c9]" />
                <h3 className="font-bold text-base text-[#0f172a]">Edit User</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Full Name</label>
                <input type="text" required value={editFullName} onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Role</label>
                <select value={editRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setEditRole(nextRole);
                    if (nextRole === 'admin') {
                      setEditTrack('');
                      setEditClass('');
                    }
                  }}
                  className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="school_leader">School Leader</option>
                  <option value="mentor">Mentor</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {editRole === 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">Admin Type</label>
                  <select value={editAdminType} onChange={(e) => setEditAdminType(e.target.value)}
                    className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                    <option value="school_leader">School Leader</option>
                    <option value="it_admin">IT Admin</option>
                    <option value="kitchen_admin">Kitchen Admin</option>
                    <option value="general">General</option>
                  </select>
                </div>
              )}

              {editRole !== 'admin' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">Academic Track</label>
                    <select value={editTrack}
                      onChange={(e) => {
                        const nextTrack = e.target.value;
                        setEditTrack(nextTrack);
                        const classes = getClassesForTrack(nextTrack);
                        const firstClass = classes[0]?.value || '';
                        setEditClass(firstClass);
                        if (['school_leader', 'student'].includes(editRole)) {
                          fetchEditMentors(nextTrack);
                        }
                      }}
                      className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                      <option value="">None</option>
                      <option value="IB">IB</option>
                      <option value="MINT">MINT</option>
                      <option value="Abitur">Abitur</option>
                    </select>
                  </div>

                  {editTrack && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f172a] mb-1">Class / Year Level</label>
                      <select value={editClass}
                        onChange={(e) => {
                          setEditClass(e.target.value);
                          if (['school_leader', 'student'].includes(editRole)) {
                            fetchEditMentors(editTrack);
                          }
                        }}
                        className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]">
                        <option value="">All Classes</option>
                        {getClassesForTrack(editTrack).map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mentor selector — shown for school_leader and student when class is set */}
                  {['school_leader', 'student'].includes(editRole) && editTrack && editClass && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0f172a] mb-1">Assign Mentor</label>
                      {loadingEditMentors ? (
                        <div className="text-xs text-[#64748b] py-1">Loading mentors...</div>
                      ) : editMentors.length > 0 ? (
                        <select
                          value={editMentorId}
                          onChange={(e) => setEditMentorId(e.target.value)}
                          className="w-full bg-[#f8fafb] text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#2383c9]"
                        >
                          <option value="">No mentor assigned</option>
                          {editMentors.map((m) => (
                            <option key={m.mentor_group_id} value={m.mentor_group_id}>{m.group_name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-[#64748b] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          No mentors found for {editTrack} / {editClass}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between py-2 px-3 bg-[#f8fafb] rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-[#0f172a]">Account Active</span>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    editActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    editActive ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={editing}
                  className="px-4 py-2 bg-[#1a2b49] hover:bg-[#14223b] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={confirmState.open}
        title="Delete user?"
        message="This will permanently remove this user and all their data. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
