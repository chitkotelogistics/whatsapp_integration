const db = require('../config/db');
const { readFallbackGroups, writeFallbackGroups, readFallbackGroupContacts, writeFallbackGroupContacts } = require('../utils/fileStore');

const listGroups = async (req, res) => {
  const fallbackGroups = readFallbackGroups();
  try {
    const [rows] = await db.query('SELECT * FROM groups ORDER BY created_at DESC');
    const existingIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const g of fallbackGroups) {
      if (!existingIds.has(String(g.id))) {
        existingIds.add(String(g.id));
        merged.push(g);
      }
    }
    res.json(merged);
  } catch (error) {
    res.json(fallbackGroups);
  }
};

const createGroup = async (req, res) => {
  const { name, contactIds = [] } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Group name is required' });
  }

  const fallbackId = Date.now();
  const fallbackGroups = readFallbackGroups();
  const fallbackGroupContacts = readFallbackGroupContacts();
  fallbackGroups.unshift({ id: fallbackId, name, created_at: new Date().toISOString() });
  fallbackGroupContacts[fallbackId] = [...new Set(contactIds)];
  writeFallbackGroups(fallbackGroups);
  writeFallbackGroupContacts(fallbackGroupContacts);

  try {
    const [groupResult] = await db.execute('INSERT INTO groups (name) VALUES (?)', [name]);
    const groupId = groupResult.insertId;

    for (const contactId of contactIds) {
      await db.execute('INSERT INTO group_contacts (group_id, contact_id) VALUES (?, ?)', [groupId, contactId]);
    }
    res.status(201).json({ success: true, id: groupId, name, contactIds });
  } catch (error) {
    res.status(201).json({ success: true, id: fallbackId, name, contactIds, fallback: true });
  }
};

const getGroupContacts = async (req, res) => {
  const { id } = req.params;
  const fallbackGroupContacts = readFallbackGroupContacts();
  try {
    const [rows] = await db.query('SELECT contact_id FROM group_contacts WHERE group_id = ?', [id]);
    const contactIds = rows.map((row) => row.contact_id);
    const fallbackIds = fallbackGroupContacts[id] || [];
    const merged = Array.from(new Set([...contactIds, ...fallbackIds]));
    res.json({ success: true, contactIds: merged });
  } catch (error) {
    res.json({ success: true, contactIds: fallbackGroupContacts[id] || [] });
  }
};

const deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM group_contacts WHERE group_id = ?', [id]);
    await db.execute('DELETE FROM groups WHERE id = ?', [id]);
  } catch (e) {
    // DB error ignore
  }

  const fallbackGroups = readFallbackGroups().filter((g) => String(g.id) !== String(id));
  const fallbackGroupContacts = readFallbackGroupContacts();
  delete fallbackGroupContacts[id];

  writeFallbackGroups(fallbackGroups);
  writeFallbackGroupContacts(fallbackGroupContacts);

  res.json({ success: true, id });
};

const clearAllGroups = async (_req, res) => {
  try {
    await db.execute('DELETE FROM group_contacts');
    await db.execute('DELETE FROM groups');
  } catch (e) {
    // DB error ignore
  }

  writeFallbackGroups([]);
  writeFallbackGroupContacts({});

  res.json({ success: true, message: 'All groups cleared' });
};

module.exports = { listGroups, createGroup, getGroupContacts, deleteGroup, clearAllGroups };
