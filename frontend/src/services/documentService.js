import api from './authService';

export const documentService = {
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('document', file);
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  async searchByDomain(domain, page = 1, limit = 20) {
    return api.get('/documents/search', {
      params: { domain, page, limit }
    });
  },

  async exportResults(domain, format) {
    return api.post('/documents/export', { domain, format }, {
      responseType: 'blob'
    });
  },

  async getDocuments(page = 1, limit = 20) {
    return api.get('/documents', {
      params: { page, limit }
    });
  }
};