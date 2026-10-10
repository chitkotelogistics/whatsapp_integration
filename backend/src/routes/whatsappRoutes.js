const express = require('express');
const router = express.Router();
const { getLoads, createLoad, updateLoad, deleteLoad, clearAllLoads, broadcastLoads, getSettings, saveSettings, getMessageLogs, clearAllMessageHistory, retryFailedMessages, webhook, validateContactsEndpoint, sendTestMessage, getTemplatesEndpoint, getWebhookEvents, getInboundMessages, saveInboundAsContact, getMessageDrafts, saveMessageDraft, deleteMessageDraft } = require('../controllers/whatsappController');
const { listContacts, createContact, updateContact, importContacts, deleteContact, deleteContactsBulk } = require('../controllers/contactController');
const { listGroups, createGroup, getGroupContacts, deleteGroup, clearAllGroups } = require('../controllers/groupController');

const { makeCallToContact, broadcastVoiceCalls, getVoiceLogs, exotelStatusWebhook, exotelPassthru } = require('../controllers/voiceController');

const {
  getParties,
  createParty,
  updateParty,
  deleteParty,
  getTransporters,
  createTransporter,
  updateTransporter,
  deleteTransporter,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/mastersController');

router.get('/loads', getLoads);
router.post('/loads', createLoad);
router.put('/loads/:id', updateLoad);
router.delete('/loads/clear-all', clearAllLoads);
router.delete('/loads/:id', deleteLoad);
router.post('/broadcast', broadcastLoads);
router.get('/drafts', getMessageDrafts);
router.post('/drafts', saveMessageDraft);
router.delete('/drafts/:id', deleteMessageDraft);
router.post('/validate-contacts', validateContactsEndpoint);
router.post('/test-message', sendTestMessage);
router.get('/templates', getTemplatesEndpoint);
router.get('/settings', getSettings);
router.post('/settings', saveSettings);
router.get('/message-logs', getMessageLogs);
router.delete('/message-logs/clear-all', clearAllMessageHistory);
router.get('/webhook-events', getWebhookEvents);
router.get('/inbound-messages', getInboundMessages);
router.post('/inbound-messages/save-contact', saveInboundAsContact);
router.post('/retry-failed', retryFailedMessages);

const {
  submitNegotiation,
  getLoadNegotiations,
  acceptTransporterOffer,
  getInboxThreads,
  sendDirectReply,
} = require('../controllers/negotiationController');

const {
  getPortalDataByToken,
  uploadPortalDocument,
  updateDocumentVerificationStatus,
  handleDriverActionByToken,
  getDriverDataByToken,
  generateDocumentUploadLink,
  generateDriverActionLink,
} = require('../controllers/documentPortalController');

const {
  getTripWorkspace,
  downloadDocumentPdf,
  getCustomerTrackingByToken,
  notifyParticipants,
} = require('../controllers/tripController');

// Trip Workspace, PDF & Notification Routes
router.get('/trips/:loadId', getTripWorkspace);
router.get('/documents/:loadId/:docType.pdf', downloadDocumentPdf);
router.get('/documents/:loadId/:docType.html', downloadDocumentPdf);
router.get('/portal/track/:token', getCustomerTrackingByToken);
router.post('/notifications/notify-participants', notifyParticipants);

// Portal & Document Routes
router.get('/portal/upload/:token', getPortalDataByToken);
router.post('/portal/upload', uploadPortalDocument);
router.put('/documents/:docId/verify', updateDocumentVerificationStatus);
router.get('/portal/driver/:token', getDriverDataByToken);
router.post('/portal/driver/action', handleDriverActionByToken);
router.get('/loads/:loadId/generate-doc-link', generateDocumentUploadLink);
router.get('/loads/:loadId/generate-driver-link', generateDriverActionLink);


// Negotiation routes
router.post('/loads/:loadId/negotiate', submitNegotiation);
router.get('/loads/:loadId/negotiations', getLoadNegotiations);
router.post('/loads/:loadId/accept-offer', acceptTransporterOffer);

// Inbox routes
router.get('/inbox/threads', getInboxThreads);
router.post('/inbox/reply', sendDirectReply);


// Masters routes
router.get('/masters/parties', getParties);
router.post('/masters/parties', createParty);
router.put('/masters/parties/:id', updateParty);
router.delete('/masters/parties/:id', deleteParty);


router.get('/masters/transporters', getTransporters);
router.post('/masters/transporters', createTransporter);
router.put('/masters/transporters/:id', updateTransporter);
router.delete('/masters/transporters/:id', deleteTransporter);

router.get('/masters/vehicles', getVehicles);
router.post('/masters/vehicles', createVehicle);
router.put('/masters/vehicles/:id', updateVehicle);
router.delete('/masters/vehicles/:id', deleteVehicle);

router.get('/masters/drivers', getDrivers);
router.post('/masters/drivers', createDriver);
router.put('/masters/drivers/:id', updateDriver);
router.delete('/masters/drivers/:id', deleteDriver);


router.post('/voice/call', makeCallToContact);
router.post('/voice/broadcast', broadcastVoiceCalls);
router.get('/voice/logs', getVoiceLogs);
router.post('/voice/webhook', exotelStatusWebhook);
router.all('/voice/status', exotelStatusWebhook);
router.all('/voice/passthru', exotelPassthru);

router.get('/contacts', listContacts);
router.post('/contacts', createContact);
router.post('/contacts/import', importContacts);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);
router.post('/contacts/delete-bulk', deleteContactsBulk);
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.delete('/groups/clear-all', clearAllGroups);
router.delete('/groups/:id', deleteGroup);
router.get('/groups/:id/contacts', getGroupContacts);
router.get('/webhook', webhook);
router.post('/webhook', webhook);

module.exports = router;
