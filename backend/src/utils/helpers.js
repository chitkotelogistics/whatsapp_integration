const crypto = require('crypto');

const generateLoadId = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CLI-${stamp}-${random}`;
};

const formatWhatsAppMessage = (payload = {}) => {
  const contactNum = payload.contactNumber || payload.contact_number || '9390003955';
  return [
    '🚛 Chitkote Logistics',
    '',
    'A new load is available.',
    '',
    `📍 From: ${payload.from || payload.from_city || 'Hyderabad'}`,
    `📍 To: ${payload.to || payload.to_city || 'Chennai'}`,
    '',
    `🚚 Vehicle: ${payload.vehicleType || payload.vehicle_type || '32 FT Open Truck'}`,
    `⚖️ Weight: ${payload.weight || '25 Tons'}`,
    `💰 Freight: ${payload.freight || '42000'}`,
    '',
    `📞 Contact: ${contactNum}`,
    '',
    'Reply if you are interested or call the contact number.',
  ].join('\n');
};

module.exports = { generateLoadId, formatWhatsAppMessage };
