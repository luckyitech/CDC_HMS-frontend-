import api from './api';

// Session cache — every autocomplete input needs the sources, but they only
// change when the admin flips the toggle (which clears this).
let sourcesPromise = null;

// Admin-managed clinical catalogs (medication names, diagnoses) that power
// the autocomplete inputs. type: 'medication' | 'diagnosis'
export const catalogService = {
  search: (type, search, limit = 8) => api.get(`/catalog/${type}`, { params: { search, limit } }),
  listAll: (type) => api.get(`/catalog/${type}`),
  create: (type, data) => api.post(`/catalog/${type}`, data),
  bulkCreate: (type, names) => api.post(`/catalog/${type}/bulk`, { names }),
  update: (type, id, data) => api.put(`/catalog/${type}/${id}`, data),
  delete: (type, id) => api.delete(`/catalog/${type}/${id}`),

  // Which suggestion source each catalog uses: 'catalog' | 'external'
  getSources: () => {
    if (!sourcesPromise) {
      sourcesPromise = api.get('/catalog/sources')
        .then((res) => (res.success ? res.data : {}))
        .catch(() => ({}));
    }
    return sourcesPromise;
  },
  clearSourcesCache: () => { sourcesPromise = null; },
  setSource: (type, source) => api.put(`/catalog/${type}/source`, { source }),
};

export default catalogService;
