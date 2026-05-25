import api from './api';

const notificationService = {
  getAll:       ()   => api.get('/notifications'),
  markAsRead:   (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: ()  => api.patch('/notifications/read-all'),
};

export default notificationService;
