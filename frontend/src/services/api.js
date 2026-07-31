import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({ 
  baseURL: getBaseUrl() 
});

export const getContacts = () => api.get('/contacts');
export const createContact = (payload) => api.post('/contacts', payload);
export const importContacts = (payload) => api.post('/contacts/import', payload);
export const updateContact = (id, payload) => api.put(`/contacts/${id}`, payload);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const deleteContactsBulk = (ids) => api.post('/contacts/delete-bulk', { ids });
export const getGroups = () => api.get('/groups');
export const createGroup = (payload) => api.post('/groups', payload);
export const getGroupContacts = (id) => api.get(`/groups/${id}/contacts`);
export const getLoads = () => api.get('/loads');
export const createLoad = (payload) => api.post('/loads', payload);
export const updateLoad = (id, payload) => api.put(`/loads/${id}`, payload);
export const deleteLoad = (id) => api.delete(`/loads/${id}`);
export const saveSettings = (payload) => api.post('/settings', payload);
export const getSettings = () => api.get('/settings');
export const getLogs = () => api.get('/message-logs');
export const broadcast = (payload) => api.post('/broadcast', payload);
export const validateContacts = (payload) => api.post('/validate-contacts', payload);
export const sendTestMessage = (payload) => api.post('/test-message', payload);
export const retryFailed = (payload) => api.post('/retry-failed', payload);
export const getWebhookEvents = () => api.get('/webhook-events');
export const getTemplates = () => api.get('/templates');
export const getInboundMessages = () => api.get('/inbound-messages');
export const saveInboundAsContact = (payload) => api.post('/inbound-messages/save-contact', payload);
export default api;
