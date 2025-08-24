import api from './authService';

export const adminService = {
  async getDashboard() {
    return api.get('/admin/dashboard');
  },

  async getActivityLogs(page = 1, limit = 20) {
    return api.get('/admin/activity-logs', {
      params: { page, limit }
    });
  },

  async updateSettings(settings) {
    return api.put('/admin/settings', settings);
  },

  async getUsers() {
    return api.get('/users');
  },

  async createUser(userData) {
    return api.post('/users', userData);
  },

  async updateUser(userId, userData) {
    return api.put(`/users/${userId}`, userData);
  },

  async toggleUserStatus(userId) {
    return api.patch(`/users/${userId}/toggle-status`);
  },

  async resetUserPassword(userId, newPassword) {
    return api.post(`/users/${userId}/reset-password`, { newPassword });
  },

  async deleteUser(userId) {
    return api.delete(`/users/${userId}`);
  }
};