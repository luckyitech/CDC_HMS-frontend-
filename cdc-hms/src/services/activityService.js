import api from './api';

const activityService = {
  getLog: (params = {}) => api.get('/activity', { params }),
};

export default activityService;
