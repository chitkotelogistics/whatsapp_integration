const crypto = require('crypto');

const generateLoadId = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CLI-${stamp}-${random}`;
};

const formatWhatsAppMessage = (payload = {}) => {
  const contactNum = payload.contactNumber || payload.contact_number || '9390003955';
  const fromCity = payload.from || payload.from_city || 'Hyderabad';
  const toCity = payload.to || payload.to_city || 'Chennai';
  const vehicle = payload.vehicleType || payload.vehicle_type || '32 FT Open Truck';
  const weight = payload.weight || '25 Tons';
  const freight = payload.freight || '42000';

  return [
    '*🚚 Chitkote Logistics Load Available*',
    '',
    `📍 Pickup City: ${fromCity}`,
    `📍 Delivery City: ${toCity}`,
    `🚚 Vehicle Type Required: ${vehicle}`,
    `⚖️ Shipment Weight: ${weight}`,
    `💰 Agreed Freight Rate: ${freight}`,
    `📞 Direct Contact Phone: ${contactNum}`,
    '',
    'Please call or reply to this message if you are available to accept this load.',
  ].join('\n');
};

module.exports = { generateLoadId, formatWhatsAppMessage };
