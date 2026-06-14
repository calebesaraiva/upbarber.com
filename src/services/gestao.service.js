import { api } from './api';

export const gestaoService = {
  listAuditLogs: (params) => api.get('/audit-logs', { params }),
  listAccessGroups: () => api.get('/access-groups'),
  createAccessGroup: (data) => api.post('/access-groups', data),
  updateAccessGroup: (id, data) => api.put(`/access-groups/${id}`, data),
  deleteAccessGroup: (id) => api.delete(`/access-groups/${id}`),
  addUserToGroup: (groupId, userId) => api.post(`/access-groups/${groupId}/users`, { userId }),
  removeUserFromGroup: (groupId, userId) => api.delete(`/access-groups/${groupId}/users/${userId}`),
};
