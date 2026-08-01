const express = require('express');
const router = express.Router();
const { getLoads, createLoad, updateLoad, deleteLoad, clearAllLoads, broadcastLoads, getSettings, saveSettings, getMessageLogs, clearAllMessageHistory, retryFailedMessages, webhook, validateContactsEndpoint, sendTestMessage, getTemplatesEndpoint, getWebhookEvents, getInboundMessages, saveInboundAsContact } = require('../controllers/whatsappController');
const { listContacts, createContact, updateContact, importContacts, deleteContact, deleteContactsBulk } = require('../controllers/contactController');
const { listGroups, createGroup, getGroupContacts, deleteGroup, clearAllGroups } = require('../controllers/groupController');

const { makeCallToContact, broadcastVoiceCalls, getVoiceLogs, exotelStatusWebhook } = require('../controllers/voiceController');

router.get('/loads', getLoads);
router.post('/loads', createLoad);
router.put('/loads/:id', updateLoad);
router.delete('/loads/clear-all', clearAllLoads);
router.delete('/loads/:id', deleteLoad);
router.post('/broadcast', broadcastLoads);
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

router.post('/voice/call', makeCallToContact);
router.post('/voice/broadcast', broadcastVoiceCalls);
router.get('/voice/logs', getVoiceLogs);
router.post('/voice/webhook', exotelStatusWebhook);
router.all('/voice/status', exotelStatusWebhook);

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
