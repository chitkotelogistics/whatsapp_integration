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
};
