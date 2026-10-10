const buildHtmlDocument = ({ title, bannerColor = '#0284c7', content }) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #f8fafc; }
    .card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: ${bannerColor}; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
    .body { padding: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .box { background: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; }
    .box-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px; }
    .box-val { font-size: 15px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #e2e8f0; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .total-row { font-weight: 700; background: #f8fafc; font-size: 15px; }
    .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CHITKOTE LOGISTICS INDIA PRIVATE LIMITED</h1>
      <p>Official Transport & Freight Management System</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      Chitkote Logistics India Pvt Ltd · Head Office: Gachibowli, Hyderabad · Contact: 9390003955
    </div>
  </div>
</body>
</html>`;
};

// 1. Loading Slip Generator
const generateLoadingSlipHtml = (loadData = {}) => {
  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; pb-12px; margin-bottom: 20px;">
      <div>
        <h2 style="margin: 0; color: #0284c7;">DISPATCH LOADING SLIP</h2>
        <div style="font-size: 12px; color: #64748b;">Ref: ${loadData.load_id || 'CK-1025'}</div>
      </div>
      <div class="badge">STATUS: CONFIRMED</div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Pickup City / Origin</div>
        <div class="box-val">${loadData.from_city || loadData.from || 'Hyderabad'}</div>
      </div>
      <div class="box">
        <div class="box-title">Delivery City / Destination</div>
        <div class="box-val">${loadData.to_city || loadData.to || 'Chennai'}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Vehicle Required</div>
        <div class="box-val">${loadData.vehicle_type || '32 FT Open'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Vehicle No: <strong>${loadData.vehicle_number || 'TS09AB1234'}</strong></div>
      </div>
      <div class="box">
        <div class="box-title">Driver Information</div>
        <div class="box-val">${loadData.driver_name || 'Ravi Kumar'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Mobile: <strong>${loadData.driver_mobile || '919876543211'}</strong></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Material Description</th>
          <th>Shipment Weight</th>
          <th>Loading Date</th>
          <th>Consignor / Customer</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${loadData.material || 'General Cargo'}</td>
          <td>${loadData.weight || '15 MT'}</td>
          <td>${loadData.loading_date || '18 Sep'}</td>
          <td>${loadData.contact_person || 'ABC Industries'}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 12px; color: #64748b;">
      <div style="border-top: 1px solid #cbd5e1; pt: 8px;">Driver Signature</div>
      <div style="border-top: 1px solid #cbd5e1; pt: 8px;">Authorized Chitkote Logistics Officer</div>
    </div>
  `;

  return buildHtmlDocument({ title: `Loading Slip - ${loadData.load_id}`, bannerColor: '#0284c7', content });
};

// 2. Customer Invoice Generator (Strictly Hides Transporter Rate)
const generateCustomerInvoiceHtml = (loadData = {}, partyData = {}) => {
  const partyRate = Number(loadData.party_rate || loadData.freight || 45000);
  const invoiceNo = `INV-${loadData.load_id || 'CK-1025'}`;

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; pb-12px; margin-bottom: 20px;">
      <div>
        <h2 style="margin: 0; color: #0d9488;">CUSTOMER FREIGHT INVOICE</h2>
        <div style="font-size: 12px; color: #64748b;">Invoice No: <strong>${invoiceNo}</strong></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
        <div style="font-size: 12px; color: #64748b;">Payment Terms: ${partyData.payment_terms || '15 Days'}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Billed To (Customer)</div>
        <div class="box-val">${partyData.company_name || loadData.contact_person || 'ABC Industries Ltd'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
          GSTIN: ${partyData.gstin || '36ABCDE1234F1Z5'}<br>
          Address: ${partyData.billing_address || 'Hyderabad, Telangana'}
        </div>
      </div>
      <div class="box">
        <div class="box-title">Shipment Summary</div>
        <div style="font-size: 13px; color: #0f172a; font-weight: 600;">
          Load ID: ${loadData.load_id || 'CK-1025'}<br>
          Route: ${loadData.from_city || 'Hyderabad'} → ${loadData.to_city || 'Chennai'}<br>
          Vehicle: ${loadData.vehicle_type || '32 FT Open'}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Weight</th>
          <th>Rate / Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Freight Transportation Charges (${loadData.from_city || 'Hyderabad'} to ${loadData.to_city || 'Chennai'})</td>
          <td>${loadData.weight || '15 MT'}</td>
          <td>₹${partyRate.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">Total Billed Amount Payable</td>
          <td>₹${partyRate.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 30px; font-size: 12px; color: #475569; background: #f1f5f9; padding: 12px; border-radius: 8px;">
      <strong>Bank Details for Payment:</strong><br>
      Account Name: Chitkote Logistics India Pvt Ltd<br>
      Bank: ICICI Bank · A/C No: 123405009988 · IFSC: ICIC0001234
    </div>
  `;

  return buildHtmlDocument({ title: `Customer Invoice - ${invoiceNo}`, bannerColor: '#0d9488', content });
};

// 3. Transporter Settlement Statement (Strictly Hides Customer Rate)
const generateTransporterSettlementHtml = (loadData = {}, transporterData = {}) => {
  const transporterRate = Number(loadData.transporter_rate || 38000);
  const advance = 10000;
  const balance = transporterRate - advance;
  const settlementNo = `STL-${loadData.load_id || 'CK-1025'}`;

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; pb-12px; margin-bottom: 20px;">
      <div>
        <h2 style="margin: 0; color: #4f46e5;">TRANSPORTER FREIGHT SETTLEMENT</h2>
        <div style="font-size: 12px; color: #64748b;">Settlement Ref: <strong>${settlementNo}</strong></div>
      </div>
      <div class="badge" style="background: #e0e7ff; color: #3730a3;">POD VERIFIED</div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Transporter / Fleet Owner</div>
        <div class="box-val">${transporterData.company_name || 'Sri Balaji Logistics'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
          Mobile: ${transporterData.mobile || '9390003955'}<br>
          Bank: ${transporterData.bank_name || 'HDFC Bank'} (A/C: ${transporterData.bank_account || '5010023456789'})
        </div>
      </div>
      <div class="box">
        <div class="box-title">Vehicle & Trip Details</div>
        <div style="font-size: 13px; color: #0f172a; font-weight: 600;">
          Load ID: ${loadData.load_id || 'CK-1025'}<br>
          Vehicle No: ${loadData.vehicle_number || 'TS09AB1234'}<br>
          Route: ${loadData.from_city || 'Hyderabad'} → ${loadData.to_city || 'Chennai'}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Particulars</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Agreed Transporter Freight Rate</td>
          <td>₹${transporterRate.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Advance Paid Amount</td>
          <td style="color: #dc2626;">- ₹${advance.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td>Net Balance Settlement Amount Payable</td>
          <td style="color: #16a34a;">₹${balance.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  `;

  return buildHtmlDocument({ title: `Transporter Settlement - ${settlementNo}`, bannerColor: '#4f46e5', content });
};

// 4. Commission / Margin Bill (Internal CK Accounts)
const generateCommissionBillHtml = (loadData = {}) => {
  const partyRate = Number(loadData.party_rate || 45000);
  const transporterRate = Number(loadData.transporter_rate || 38000);
  const margin = partyRate - transporterRate;

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; pb-12px; margin-bottom: 20px;">
      <div>
        <h2 style="margin: 0; color: #7c3aed;">INTERNAL COMMERCIAL MARGIN STATEMENT</h2>
        <div style="font-size: 12px; color: #64748b;">Load Ref: <strong>${loadData.load_id || 'CK-1025'}</strong></div>
      </div>
      <div class="badge" style="background: #f3e8ff; color: #6b21a8;">CONFIDENTIAL INTERNAL</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Commercial Head</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Billed Customer Rate (Party Rate)</td>
          <td>₹${partyRate.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Transporter Settlement Rate</td>
          <td style="color: #dc2626;">- ₹${transporterRate.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td>CK Logistics Net Gross Margin</td>
          <td style="color: #16a34a; font-size: 18px;">₹${margin.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  `;

  return buildHtmlDocument({ title: `Margin Statement - ${loadData.load_id}`, bannerColor: '#7c3aed', content });
};

module.exports = {
  generateLoadingSlipHtml,
  generateCustomerInvoiceHtml,
  generateTransporterSettlementHtml,
  generateCommissionBillHtml,
};
