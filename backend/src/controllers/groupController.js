const db = require('../config/db');
const { readFallbackGroups, writeFallbackGroups, readFallbackGroupContacts, writeFallbackGroupContacts } = require('../utils/fileStore');

const listGroups = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM groups ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    const fallbackGroups = readFallbackGroups();
    res.json(fallbackGroups);
  }
};

const createGroup = async (req, res) => {
  const { name, contactIds = [] } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Group name is required' });
  }

  try {
    const [groupResult] = await db.execute('INSERT INTO groups (name) VALUES (?)', [name]);
    const groupId = groupResult.insertId;

    for (const contactId of contactIds) {
      await db.execute('INSERT INTO group_contacts (group_id, contact_id) VALUES (?, ?)', [groupId, contactId]);
    }

    res.status(201).json({ success: true, id: groupId, name, contactIds });
  } catch (error) {
    const fallbackGroups = readFallbackGroups();
    const fallbackGroupContacts = readFallbackGroupContacts();
    const fallbackId = Date.now();
    fallbackGroups.unshift({ id: fallbackId, name, created_at: new Date().toISOString() });
    fallbackGroupContacts[fallbackId] = [...new Set(contactIds)];
    writeFallbackGroups(fallbackGroups);
    writeFallbackGroupContacts(fallbackGroupContacts);
    res.status(201).json({ success: true, id: fallbackId, name, contactIds, fallback: true });
  }
};

const getGroupContacts = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT contact_id FROM group_contacts WHERE group_id = ?', [id]);
    const contactIds = rows.map((row) => row.contact_id);
    res.json({ success: true, contactIds });
  } catch (error) {
    const fallbackGroupContacts = readFallbackGroupContacts();
    res.json({ success: true, contactIds: fallbackGroupContacts[id] || [] });
  }
};

module.exports = { listGroups, createGroup, getGroupContacts };
