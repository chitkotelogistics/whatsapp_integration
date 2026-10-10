const crypto = require('crypto');

const generateLoadId = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CLI-${stamp}-${random}`;
};

const getISTGreeting = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const hour = ist.getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning,';
  if (hour >= 12 && hour < 17) return 'Good Afternoon,';
  if (hour >= 17 && hour < 22) return 'Good Evening,';
  return 'Hello,';
};

const formatWhatsAppMessage = (payload = {}) => {
  const greeting = payload.greeting || getISTGreeting();
  const contactNum = payload.contactNumber || payload.contact_number || '9390003955 / 9390006942';
  const fromCity = payload.from || payload.from_city || 'Hyderabad';
  const toCity = payload.to || payload.to_city || 'Chennai';
  const vehicle = payload.vehicleType || payload.vehicle_type || '32 FT Open Truck';
  const weight = payload.weight || '15 MT';
  const freightVal = String(payload.freight || payload.transporter_rate || '45000').replace(/[^\d\.]/g, '') || '45000';

  const lines = [
    greeting,
    '',
    '*🚚 Chitkote Logistics Load Available*',
    '',
    `📍 Pickup: ${fromCity}`,
    `📍 Delivery: ${toCity}`,
    `🚛 Vehicle Required: ${vehicle}`,
  ];

  if (payload.material) lines.push(`📦 Material: ${payload.material}`);
  if (weight) lines.push(`⚖️ Weight: ${weight}`);
  lines.push(`💰 Freight: ₹${freightVal}`);
  lines.push('');
  lines.push(`📞 Contact: ${contactNum}`);
  lines.push('');
  lines.push('Please contact us if you are interested in any of the above loads.');
  lines.push('');
  lines.push('Thank you,');
  lines.push('Chitkote Logistics');

  return lines.join('\n');
};

module.exports = { generateLoadId, formatWhatsAppMessage, getISTGreeting };
