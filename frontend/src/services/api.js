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

// Master Endpoints
export const getParties = () => api.get('/masters/parties');
export const createParty = (payload) => api.post('/masters/parties', payload);
export const updateParty = (id, payload) => api.put(`/masters/parties/${id}`, payload);
export const deleteParty = (id) => api.delete(`/masters/parties/${id}`);

export const getTransporters = () => api.get('/masters/transporters');
export const createTransporter = (payload) => api.post('/masters/transporters', payload);
export const updateTransporter = (id, payload) => api.put(`/masters/transporters/${id}`, payload);
export const deleteTransporter = (id) => api.delete(`/masters/transporters/${id}`);

export const getVehicles = () => api.get('/masters/vehicles');
export const createVehicle = (payload) => api.post('/masters/vehicles', payload);
export const updateVehicle = (id, payload) => api.put(`/masters/vehicles/${id}`, payload);
export const deleteVehicle = (id) => api.delete(`/masters/vehicles/${id}`);

export const getDrivers = () => api.get('/masters/drivers');
export const createDriver = (payload) => api.post('/masters/drivers', payload);
export const updateDriver = (id, payload) => api.put(`/masters/drivers/${id}`, payload);
export const deleteDriver = (id) => api.delete(`/masters/drivers/${id}`);

// Negotiation & Inbox Endpoints
export const submitNegotiation = (loadId, payload) => api.post(`/loads/${loadId}/negotiate`, { loadId, ...payload });
export const getLoadNegotiations = (loadId) => api.get(`/loads/${loadId}/negotiations`);
export const acceptTransporterOffer = (loadId, payload) => api.post(`/loads/${loadId}/accept-offer`, { loadId, ...payload });
export const getInboxThreads = () => api.get('/inbox/threads');
export const sendDirectReply = (payload) => api.post('/inbox/reply', payload);
// Portal & Document Endpoints
export const getPortalDataByToken = (token) => api.get(`/portal/upload/${token}`);
export const uploadPortalDocument = (payload) => api.post('/portal/upload', payload);
export const updateDocumentVerificationStatus = (docId, payload) => api.put(`/documents/${docId}/verify`, payload);
export const getDriverDataByToken = (token) => api.get(`/portal/driver/${token}`);
export const handleDriverActionByToken = (payload) => api.post('/portal/driver/action', payload);
// Trip Workspace & Tracking Endpoints
export const getTripWorkspace = (loadId, role = 'CK_OPERATIONS') => api.get(`/trips/${loadId}?role=${role}`);
export const getCustomerTrackingByToken = (token) => api.get(`/portal/track/${token}`);
export const notifyParticipants = (payload) => api.post('/notifications/notify-participants', payload);

// Message Drafts Endpoints
export const getMessageDrafts = () => api.get('/drafts');
export const saveMessageDraft = (payload) => api.post('/drafts', payload);
export const deleteMessageDraft = (id) => api.delete(`/drafts/${id}`);

export default api;




