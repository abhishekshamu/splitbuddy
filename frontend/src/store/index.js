/**
 * SplitBuddy – Global State (Zustand)
 * src/store/index.js
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import api from '../lib/api';

// ── Auth Store ────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      isAuth:  false,
      loading: false,
      error:   null,

      setAuth: (user, token) => set({ user, token, isAuth: true }),
      updateUser: (updates)  => set(s => ({ user: { ...s.user, ...updates } })),
      updateProfile: async (data) => {
        set({ loading: true });
        try {
          const response = await api.auth.updateProfile(data);
          set({ user: response.data.user, loading: false });
          return response.data.user;
        } catch (err) {
          set({ error: err.response?.data?.message || err.message, loading: false });
          throw err;
        }
      },
      searchUsers: async (q) => {
        try {
          const res = await api.auth.search(q, get().token);
          return res.users;
        } catch (err) { return []; }
      },
      logout: () => {
        set({ user: null, token: null, isAuth: false });
        localStorage.removeItem('splitbuddy-auth');
      },
      getToken: () => get().token,
    }),
    { name: 'splitbuddy-auth', partialize: s => ({ user: s.user, token: s.token, isAuth: s.isAuth }) }
  )
);

// ── Groups Store ──────────────────────────────────────────────────
export const useGroupStore = create((set, get) => ({
  groups:       [],
  activeGroup:  null,
  loading:      false,
  error:        null,

  fetchGroups: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true });
    try {
      const data = await api.groups.list(token);
      set({ groups: data.groups, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setActiveGroup:  (group)   => set({ activeGroup: group }),
  
  addGroup: async (groupData) => {
    const token = useAuthStore.getState().token;
    set({ loading: true });
    try {
      const data = await api.groups.create(groupData, token);
      set(s => ({ groups: [data.group, ...s.groups], loading: false }));
      return data.group;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateGroup: async (id, upd) => {
    const token = useAuthStore.getState().token;
    try {
      const data = await api.groups.update(id, upd, token);
      set(s => ({ 
        groups: s.groups.map(g => g._id === id ? data.group : g), 
        activeGroup: s.activeGroup?._id === id ? data.group : s.activeGroup 
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  removeGroup: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      await api.groups.archive(id, token);
      set(s => ({ groups: s.groups.filter(g => g._id !== id) }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  setLoading: (v) => set({ loading: v }),
  setError:   (v) => set({ error: v }),
}));

// ── Expenses Store ────────────────────────────────────────────────
export const useExpenseStore = create((set, get) => ({
  expenses:     [],
  allExpenses:  [],
  total:        0,
  loading:      false,
  settlePlan:   [],
  balances:     [],
  settleHistory: [],
  groceries:    [],
  chores:       [],
  reminders:    [],
  notes:        [],
  links:        [],
  payments:     [],
  activities:   [],
  error:        null,

  // ── Unified Refresh Helper ──────────────────────────────────────
  refreshGroupContext: async (groupId) => {
    const token = useAuthStore.getState().token;
    if (!token || !groupId) return;
    
    // Refresh core financial and activity data in parallel
    await Promise.all([
      get().fetchExpenses(groupId),
      get().fetchSettlePlan(groupId),
      get().fetchSettlementHistory(groupId),
      get().fetchActivities(groupId),
      get().fetchAllExpenses() // Refresh global list too
    ]);
  },

  fetchExpenses: async (groupId) => {
    const token = useAuthStore.getState().token;
    if (!token || !groupId) return;
    set({ loading: true });
    try {
      const data = await api.expenses.list(groupId, {}, token);
      set({ expenses: data.expenses, total: data.total, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchAllExpenses: async (filters = {}) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const data = await api.expenses.all(filters, token);
      set({ allExpenses: data.expenses });
    } catch (err) {
      set({ error: err.message });
    }
  },

  addExpense: async (expData) => {
    const token = useAuthStore.getState().token;
    set({ loading: true });
    try {
      const data = await api.expenses.add(expData, token);
      await get().refreshGroupContext(expData.group_id);
      set({ loading: false });
      return data.expense;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateExpense: async (id, upd) => {
    const token = useAuthStore.getState().token;
    set({ loading: true });
    try {
      const data = await api.expenses.update(id, upd, token);
      const gid = data.expense.group?._id || data.expense.group;
      if (gid) await get().refreshGroupContext(gid);
      set({ loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  removeExpense: async (id) => {
    const token = useAuthStore.getState().token;
    const { allExpenses, expenses, refreshGroupContext } = get();
    const expense = allExpenses.find(e => e._id === id) || expenses.find(e => e._id === id);
    const gid = expense?.group?._id || expense?.group;

    set({ loading: true });
    try {
      const res = await api.expenses.delete(id, token);
      if (res.success) {
        toast.success("Expense deleted successfully");
        // Update local state immediately
        set({
          allExpenses: allExpenses.filter(e => e._id !== id),
          expenses: expenses.filter(e => e._id !== id)
        });
        if (gid) await refreshGroupContext(gid);
      }
      set({ loading: false });
    } catch (err) {
      toast.error("Failed to delete expense: " + err.message);
      set({ error: err.message, loading: false });
    }
  },

  fetchSettlePlan: async (groupId) => {
    const token = useAuthStore.getState().token;
    if (!groupId) return;
    try {
      const data = await api.settle.plan(groupId, token);
      set({ settlePlan: data.transactions, balances: data.balances });
    } catch (err) {
      set({ error: err.message });
    }
  },

  recordSettlement: async (settleData) => {
    const token = useAuthStore.getState().token;
    set({ loading: true });
    try {
      const data = await api.settle.record(settleData, token);
      await get().refreshGroupContext(settleData.group_id || 'all');
      set({ loading: false });
      return data.settlement;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchSettlementHistory: async (groupId) => {
    const token = useAuthStore.getState().token;
    try {
      const data = await api.settle.history(groupId, token);
      set({ settleHistory: data.history });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // ── Utilities Actions ───────────────────────────────────────────
  fetchGroceries: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.groceryList(gid, t);
      set({ groceries: res.items });
    } catch (err) { set({ error: err.message }); }
  },
  addGrocery: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addGrocery(data, t);
      set(s => ({ groceries: [res.item, ...s.groceries] }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  updateGrocery: async (id, data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.updateGrocery(id, data, t);
      set(s => ({ groceries: s.groceries.map(i => i._id === id ? res.item : i) }));
    } catch (err) { set({ error: err.message }); }
  },
  toggleGrocery: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.toggleGrocery(id, t);
      set(s => ({ groceries: s.groceries.map(i => i._id === id ? res.item : i) }));
      get().fetchActivities(res.item.group);
    } catch (err) { set({ error: err.message }); }
  },
  deleteGrocery: async (id) => {
    const t = useAuthStore.getState().token;
    const item = get().groceries.find(i => i._id === id);
    try {
      await api.utility.deleteGrocery(id, t);
      set(s => ({ groceries: s.groceries.filter(i => i._id !== id) }));
      if (item) get().fetchActivities(item.group);
    } catch (err) { set({ error: err.message }); }
  },

  fetchChores: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.chores(gid, t);
      set({ chores: res.chores });
    } catch (err) { set({ error: err.message }); }
  },
  addChore: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addChore(data, t);
      set(s => ({ chores: [...s.chores, res.chore] }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  updateChore: async (id, data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.updateChore(id, data, t);
      set(s => ({ chores: s.chores.map(c => c._id === id ? res.chore : c) }));
      if (data.status === 'done') get().fetchActivities(res.chore.group);
    } catch (err) { set({ error: err.message }); }
  },
  rotateChores: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.rotateChores(gid, t);
      get().fetchChores(gid);
      get().fetchActivities(gid);
    } catch (err) { set({ error: err.message }); }
  },
  deleteChore: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.deleteChore(id, t);
      set(s => ({ chores: s.chores.filter(c => c._id !== id) }));
    } catch (err) { set({ error: err.message }); }
  },

  fetchReminders: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.reminders(gid, t);
      set({ reminders: res.reminders });
    } catch (err) { set({ error: err.message }); }
  },
  addReminder: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addReminder(data, t);
      set(s => ({ reminders: [...s.reminders, res.reminder] }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  updateReminder: async (id, data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.updateReminder(id, data, t);
      set(s => ({ reminders: s.reminders.map(r => r._id === id ? res.reminder : r) }));
    } catch (err) { set({ error: err.message }); }
  },
  toggleReminder: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.toggleReminder(id, t);
      set(s => ({ reminders: s.reminders.map(r => r._id === id ? res.reminder : r) }));
    } catch (err) { set({ error: err.message }); }
  },
  deleteReminder: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.deleteReminder(id, t);
      set(s => ({ reminders: s.reminders.filter(r => r._id !== id) }));
    } catch (err) { set({ error: err.message }); }
  },

  fetchNotes: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.notes(gid, t);
      set({ notes: res.notes });
    } catch (err) { set({ error: err.message }); }
  },
  addNote: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addNote(data, t);
      set(s => ({ notes: [res.note, ...s.notes] }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  updateNote: async (id, data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.updateNote(id, data, t);
      set(s => ({ notes: s.notes.map(n => n._id === id ? res.note : n) }));
    } catch (err) { set({ error: err.message }); }
  },
  deleteNote: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.deleteNote(id, t);
      set(s => ({ notes: s.notes.filter(n => n._id !== id) }));
    } catch (err) { set({ error: err.message }); }
  },

  fetchLinks: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.links(gid, t);
      set({ links: res.links });
    } catch (err) { set({ error: err.message }); }
  },
  addLink: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addLink(data, t);
      set(s => ({ links: [res.link, ...s.links] }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  deleteLink: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.deleteLink(id, t);
      set(s => ({ links: s.links.filter(l => l._id !== id) }));
    } catch (err) { set({ error: err.message }); }
  },

  fetchPayments: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.payments(gid, t);
      set({ payments: res.payments });
    } catch (err) { set({ error: err.message }); }
  },
  addPayment: async (data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.addPayment(data, t);
      set(s => ({ payments: [...s.payments, res.payment], error: null }));
      get().fetchActivities(data.group_id);
    } catch (err) { set({ error: err.message }); throw err; }
  },
  updatePayment: async (id, data) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.updatePayment(id, data, t);
      set(s => ({ payments: s.payments.map(p => p._id === id ? res.payment : p), error: null }));
    } catch (err) { set({ error: err.message }); }
  },
  deletePayment: async (id) => {
    const t = useAuthStore.getState().token;
    try {
      await api.utility.deletePayment(id, t);
      set(s => ({ payments: s.payments.filter(p => p._id !== id), error: null }));
    } catch (err) { set({ error: err.message }); }
  },
  removeSettlement: async (id, groupId) => {
    const t = useAuthStore.getState().token;
    try {
      await api.settle.delete(id, t);
      if (groupId) get().refreshGroupContext(groupId);
      toast.success("Settlement record removed");
    } catch (err) { toast.error("Failed: " + err.message); }
  },

  fetchActivities: async (gid) => {
    const t = useAuthStore.getState().token;
    try {
      const res = await api.utility.activities(gid, t);
      set({ activities: res.activities });
    } catch (err) { set({ error: err.message }); }
  },

  setLoading: (v) => set({ loading: v }),
  setError:   (v) => set({ error: v }),
}));

// ── UI Store ──────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  page:            'dashboard',
  pageData:        null,
  sidebarOpen:     true,
  showAddExpense:  false,
  showCreateGroup: false,
  notifications:   [],
  unreadCount:     0,

  navigate:          (page, data) => set({ page, pageData: data || null }),
  setSidebarOpen:    (v)          => set({ sidebarOpen: v }),
  setShowAddExpense: (v)          => set({ showAddExpense: v }),
  setShowCreateGroup:(v)          => set({ showCreateGroup: v }),

  fetchNotifications: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const res = await api.notifications.list(token);
      set({ notifications: res.notifications, unreadCount: res.notifications.filter(n => !n.is_read).length });
    } catch (err) { console.error(err); }
  },

  markAsRead: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      await api.notifications.markRead(id, token);
      set(s => {
        const notifs = s.notifications.map(n => n._id === id ? { ...n, is_read: true } : n);
        return { notifications: notifs, unreadCount: notifs.filter(x => !x.is_read).length };
      });
    } catch (err) { console.error(err); }
  },

  markAllAsRead: async () => {
    const token = useAuthStore.getState().token;
    try {
      await api.notifications.markAllRead(token);
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (err) { console.error(err); }
  },

  deleteNotification: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      await api.notifications.delete(id, token);
      set(s => {
        const notifs = s.notifications.filter(n => n._id !== id);
        return { notifications: notifs, unreadCount: notifs.filter(x => !x.is_read).length };
      });
    } catch (err) { console.error(err); }
  },

  clearAll: async () => {
    const token = useAuthStore.getState().token;
    try {
      await api.notifications.clearAll(token);
      set({ notifications: [], unreadCount: 0 });
    } catch (err) { console.error(err); }
  }
}));
