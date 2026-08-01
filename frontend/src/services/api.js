import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://whatsapp-integration-8aoz.onrender.com/api';
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
export const deleteGroup = (id) => api.delete(`/groups/${id}`);
export const clearAllGroups = () => api.delete('/groups/clear-all');
export const getGroupContacts = (id) => api.get(`/groups/${id}/contacts`);
export const getLoads = () => api.get('/loads');
export const createLoad = (payload) => api.post('/loads', payload);
export const updateLoad = (id, payload) => api.put(`/loads/${id}`, payload);
export const deleteLoad = (id) => api.delete(`/loads/${id}`);
export const saveSettings = (payload) => api.post('/settings', payload);
export const getSettings = () => api.get('/settings');
export const getLogs = () => api.get('/message-logs');
export const clearAllLogs = () => api.delete('/message-logs/clear-all');
export const broadcast = (payload) => api.post('/broadcast', payload);
export const validateContacts = (payload) => api.post('/validate-contacts', payload);
export const sendTestMessage = (payload) => api.post('/test-message', payload);
export const retryFailed = (payload) => api.post('/retry-failed', payload);
export const getWebhookEvents = () => api.get('/webhook-events');
export const getTemplates = () => api.get('/templates');
export const getInboundMessages = () => api.get('/inbound-messages');
export const saveInboundAsContact = (payload) => api.post('/inbound-messages/save-contact', payload);
export const makeVoiceCall = (payload) => api.post('/voice/call', payload);
export const broadcastVoiceCalls = (payload) => api.post('/voice/broadcast', payload);
export const getVoiceLogs = () => api.get('/voice/logs');
export default api;
