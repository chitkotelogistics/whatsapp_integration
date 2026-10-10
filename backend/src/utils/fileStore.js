const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const GROUP_CONTACTS_FILE = path.join(DATA_DIR, 'group_contacts.json');
const LOADS_FILE = path.join(DATA_DIR, 'loads.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LOGS_FILE = path.join(DATA_DIR, 'message_logs.json');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound_messages.json');

const PARTIES_FILE = path.join(DATA_DIR, 'parties.json');
const TRANSPORTERS_FILE = path.join(DATA_DIR, 'transporters.json');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const DRIVERS_FILE = path.join(DATA_DIR, 'drivers.json');
const NEGOTIATIONS_FILE = path.join(DATA_DIR, 'load_negotiations.json');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'load_documents.json');
const TOKENS_FILE = path.join(DATA_DIR, 'public_tokens.json');
const MESSAGE_DRAFTS_FILE = path.join(DATA_DIR, 'message_drafts.json');

const seedContacts = [];

const seedSettings = {
  phone_number_id: '1198488923355389',
  business_account_id: '1568445654798459',
  access_token: '',
  webhook_verify_token: 'chitkote_webhook_secret_123',
};

const ensureStore = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readJsonFile = (filePath, fallback) => {
  ensureStore();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(content);
  } catch (error) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
};

const writeJsonFile = (filePath, data) => {
  ensureStore();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const readFallbackContacts = () => readJsonFile(CONTACTS_FILE, seedContacts);
const writeFallbackContacts = (contacts) => writeJsonFile(CONTACTS_FILE, contacts);
const readFallbackGroups = () => readJsonFile(GROUPS_FILE, []);
const writeFallbackGroups = (groups) => writeJsonFile(GROUPS_FILE, groups);
const readFallbackGroupContacts = () => readJsonFile(GROUP_CONTACTS_FILE, {});
const writeFallbackGroupContacts = (groupContacts) => writeJsonFile(GROUP_CONTACTS_FILE, groupContacts);
const readFallbackLoads = () => readJsonFile(LOADS_FILE, []);
const writeFallbackLoads = (loads) => writeJsonFile(LOADS_FILE, loads);
const readFallbackSettings = () => readJsonFile(SETTINGS_FILE, seedSettings);
const writeFallbackSettings = (settings) => writeJsonFile(SETTINGS_FILE, settings);
const readFallbackLogs = () => readJsonFile(LOGS_FILE, []);
const writeFallbackLogs = (logs) => writeJsonFile(LOGS_FILE, logs);
const readFallbackInbound = () => readJsonFile(INBOUND_FILE, []);
const writeFallbackInbound = (inbound) => writeJsonFile(INBOUND_FILE, inbound);

const TRIPS_FILE = path.join(DATA_DIR, 'trips.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const SETTLEMENTS_FILE = path.join(DATA_DIR, 'settlements.json');
const COMMISSIONS_FILE = path.join(DATA_DIR, 'commissions.json');
const TIMELINE_FILE = path.join(DATA_DIR, 'load_timeline.json');

const readFallbackParties = () => readJsonFile(PARTIES_FILE, []);
const writeFallbackParties = (parties) => writeJsonFile(PARTIES_FILE, parties);
const readFallbackTransporters = () => readJsonFile(TRANSPORTERS_FILE, []);
const writeFallbackTransporters = (transporters) => writeJsonFile(TRANSPORTERS_FILE, transporters);
const readFallbackVehicles = () => readJsonFile(VEHICLES_FILE, []);
const writeFallbackVehicles = (vehicles) => writeJsonFile(VEHICLES_FILE, vehicles);
const readFallbackDrivers = () => readJsonFile(DRIVERS_FILE, []);
const writeFallbackDrivers = (drivers) => writeJsonFile(DRIVERS_FILE, drivers);
const readFallbackNegotiations = () => readJsonFile(NEGOTIATIONS_FILE, []);
const writeFallbackNegotiations = (negotiations) => writeJsonFile(NEGOTIATIONS_FILE, negotiations);
const readFallbackDocuments = () => readJsonFile(DOCUMENTS_FILE, []);
const writeFallbackDocuments = (documents) => writeJsonFile(DOCUMENTS_FILE, documents);
const readFallbackTokens = () => readJsonFile(TOKENS_FILE, []);
const writeFallbackTokens = (tokens) => writeJsonFile(TOKENS_FILE, tokens);

const readFallbackTrips = () => readJsonFile(TRIPS_FILE, []);
const writeFallbackTrips = (trips) => writeJsonFile(TRIPS_FILE, trips);
const readFallbackInvoices = () => readJsonFile(INVOICES_FILE, []);
const writeFallbackInvoices = (invoices) => writeJsonFile(INVOICES_FILE, invoices);
const readFallbackSettlements = () => readJsonFile(SETTLEMENTS_FILE, []);
const writeFallbackSettlements = (settlements) => writeJsonFile(SETTLEMENTS_FILE, settlements);
const readFallbackCommissions = () => readJsonFile(COMMISSIONS_FILE, []);
const writeFallbackCommissions = (commissions) => writeJsonFile(COMMISSIONS_FILE, commissions);
const readFallbackTimeline = () => readJsonFile(TIMELINE_FILE, []);
const writeFallbackTimeline = (timeline) => writeJsonFile(TIMELINE_FILE, timeline);
const readFallbackDrafts = () => readJsonFile(MESSAGE_DRAFTS_FILE, []);
const writeFallbackDrafts = (drafts) => writeJsonFile(MESSAGE_DRAFTS_FILE, drafts);

module.exports = {
  readFallbackContacts,
  writeFallbackContacts,
  readFallbackGroups,
  writeFallbackGroups,
  readFallbackGroupContacts,
  writeFallbackGroupContacts,
  readFallbackLoads,
  writeFallbackLoads,
  readFallbackSettings,
  writeFallbackSettings,
  readFallbackLogs,
  writeFallbackLogs,
  readFallbackInbound,
  writeFallbackInbound,
  readFallbackParties,
  writeFallbackParties,
  readFallbackTransporters,
  writeFallbackTransporters,
  readFallbackVehicles,
  writeFallbackVehicles,
  readFallbackDrivers,
  writeFallbackDrivers,
  readFallbackNegotiations,
  writeFallbackNegotiations,
  readFallbackDocuments,
  writeFallbackDocuments,
  readFallbackTokens,
  writeFallbackTokens,
  readFallbackTrips,
  writeFallbackTrips,
  readFallbackInvoices,
  writeFallbackInvoices,
  readFallbackSettlements,
  writeFallbackSettlements,
  readFallbackCommissions,
  writeFallbackCommissions,
  readFallbackTimeline,
  writeFallbackTimeline,
  readFallbackDrafts,
  writeFallbackDrafts,
};




