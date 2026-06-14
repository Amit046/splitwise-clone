import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const groupService = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  get: (groupId) => api.get(`/groups/${groupId}`),
  addMember: (groupId, email) => api.post(`/groups/${groupId}/members`, { email }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
};

export const expenseService = {
  list: (groupId, params) => api.get(`/groups/${groupId}/expenses`, { params }),
  get: (groupId, expenseId) => api.get(`/groups/${groupId}/expenses/${expenseId}`),
  create: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  update: (groupId, expenseId, data) => api.put(`/groups/${groupId}/expenses/${expenseId}`, data),
  remove: (groupId, expenseId) => api.delete(`/groups/${groupId}/expenses/${expenseId}`),
};

export const balanceService = {
  getGroupBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getMyBalance: () => api.get('/balances/me'),
};

export const settlementService = {
  list: (groupId) => api.get(`/groups/${groupId}/settlements`),
  create: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
};

export const csvService = {
  import: (groupId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/groups/${groupId}/csv/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const commentService = {
  list: (groupId, expenseId) => api.get(`/groups/${groupId}/expenses/${expenseId}/comments`),
  create: (groupId, expenseId, message) =>
    api.post(`/groups/${groupId}/expenses/${expenseId}/comments`, { message }),
};
