CREATE DATABASE IF NOT EXISTS chitkote_logistics;
USE chitkote_logistics;

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  company VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  vehicle_type VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contacts_mobile (mobile),
  INDEX idx_contacts_city (city),
  INDEX idx_contacts_vehicle (vehicle_type)
);

CREATE TABLE IF NOT EXISTS groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  contact_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_group_contact (group_id, contact_id),
  INDEX idx_group_contacts_group (group_id),
  INDEX idx_group_contacts_contact (contact_id)
);

CREATE TABLE IF NOT EXISTS message_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NULL,
  scheduled_message_id INT NULL,
  mobile VARCHAR(20),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  message_id VARCHAR(255),
  response_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_message_logs_status (status),
  INDEX idx_message_logs_msgid (message_id),
  INDEX idx_message_logs_mobile (mobile),
  INDEX idx_message_logs_created (created_at)
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NULL,
  mobile VARCHAR(20),
  message TEXT,
  type VARCHAR(50) DEFAULT 'text',
  scheduled_at DATETIME,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scheduled_messages_status_date (status, scheduled_at)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number_id VARCHAR(255),
  business_account_id VARCHAR(255),
  access_token VARCHAR(500),
  webhook_verify_token VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS loads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_city VARCHAR(255),
  to_city VARCHAR(255),
  material VARCHAR(255),
  weight VARCHAR(100),
  vehicle_type VARCHAR(100),
  loading_date VARCHAR(100),
  freight VARCHAR(100),
  contact_person VARCHAR(255),
  contact_number VARCHAR(20),
  load_id VARCHAR(100),
  message_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_loads_load_id (load_id),
  INDEX idx_loads_created (created_at)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100),
  payload JSON,
  identifier VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_webhook_events_type (event_type),
  INDEX idx_webhook_events_identifier (identifier)
);

-- Parties Master (Customers)
CREATE TABLE IF NOT EXISTS parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  gstin VARCHAR(50),
  pan VARCHAR(50),
  billing_address TEXT,
  payment_terms VARCHAR(100) DEFAULT '15 Days',
  document_requirements JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_parties_mobile (mobile)
);

-- Transporters Master (Truck Owners / Fleet Operators)
CREATE TABLE IF NOT EXISTS transporters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  mobile VARCHAR(20) NOT NULL UNIQUE,
  alt_mobile VARCHAR(20),
  gstin VARCHAR(50),
  pan VARCHAR(50),
  address TEXT,
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  ifsc_code VARCHAR(50),
  upi_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transporters_mobile (mobile)
);

-- Vehicle Master
CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transporter_id INT NULL,
  vehicle_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100) NOT NULL,
  body_type VARCHAR(100),
  capacity_mt VARCHAR(50),
  rc_number VARCHAR(100),
  insurance_number VARCHAR(100),
  puc_number VARCHAR(100),
  permit_number VARCHAR(100),
  fitness_number VARCHAR(100),
  rc_expiry DATE,
  insurance_expiry DATE,
  puc_expiry DATE,
  permit_expiry DATE,
  fitness_expiry DATE,
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicles_number (vehicle_number)
);

-- Driver Master
CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transporter_id INT NULL,
  vehicle_id INT NULL,
  driver_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  license_number VARCHAR(100),
  license_expiry DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_drivers_mobile (mobile)
);

-- Load Negotiations Table (Multi-transporter quotes & counter offers)
CREATE TABLE IF NOT EXISTS load_negotiations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_id VARCHAR(100) NOT NULL,
  transporter_id INT NULL,
  transporter_mobile VARCHAR(20) NOT NULL,
  transporter_name VARCHAR(255),
  offered_rate DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_negotiations_load (load_id),
  INDEX idx_negotiations_mobile (transporter_mobile)
);

-- Load Documents Table
CREATE TABLE IF NOT EXISTS load_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_id VARCHAR(100) NOT NULL,
  doc_type VARCHAR(100) NOT NULL,
  doc_number VARCHAR(100),
  file_url LONGTEXT NOT NULL,
  uploaded_by VARCHAR(100),
  uploader_role VARCHAR(50),
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  rejection_reason TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at DATETIME,
  ocr_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_docs_load (load_id),
  INDEX idx_docs_type (doc_type)
);

-- Public Tokens Table for Secure Unauthenticated Mobile Links
CREATE TABLE IF NOT EXISTS public_tokens (
  token VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- DOC_UPLOAD, DRIVER_ACTION, CUSTOMER_TRACK
  target_id VARCHAR(100) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tokens_type_target (type, target_id)
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_id VARCHAR(100) NOT NULL UNIQUE,
  vehicle_id INT NULL,
  driver_id INT NULL,
  transporter_id INT NULL,
  party_id INT NULL,
  status VARCHAR(50) DEFAULT 'ASSIGNED',
  current_location VARCHAR(255),
  pickup_at DATETIME,
  loaded_at DATETIME,
  dispatched_at DATETIME,
  delivered_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trips_load (load_id)
);

-- POD Records Table
CREATE TABLE IF NOT EXISTS pod_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_id VARCHAR(100) NOT NULL,
  file_url LONGTEXT NOT NULL,
  delivery_date DATE,
  receiver_name VARCHAR(255),
  receiver_signature_url TEXT,
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pod_load (load_id)
);

-- Customer Invoices Table
CREATE TABLE IF NOT EXISTS customer_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  load_id VARCHAR(100) NOT NULL,
  party_id INT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'UNPAID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoices_load (load_id)
);

-- Transporter Settlements Table
CREATE TABLE IF NOT EXISTS transporter_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settlement_number VARCHAR(100) NOT NULL UNIQUE,
  load_id VARCHAR(100) NOT NULL,
  transporter_id INT NULL,
  transporter_rate DECIMAL(12,2) NOT NULL,
  advance_paid DECIMAL(12,2) DEFAULT 0.00,
  deductions DECIMAL(12,2) DEFAULT 0.00,
  balance_payable DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_settlements_load (load_id)
);

-- Commission / Margin Bills Table
CREATE TABLE IF NOT EXISTS commission_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_number VARCHAR(100) NOT NULL UNIQUE,
  load_id VARCHAR(100) NOT NULL,
  customer_rate DECIMAL(12,2) NOT NULL,
  transporter_rate DECIMAL(12,2) NOT NULL,
  gross_margin DECIMAL(12,2) NOT NULL,
  commission_fee DECIMAL(12,2) DEFAULT 0.00,
  net_margin DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_commissions_load (load_id)
);

-- Load Timeline / Audit Log Table
CREATE TABLE IF NOT EXISTS load_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_id VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) DEFAULT 'CK_OPERATIONS',
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timeline_load (load_id)
);

-- Multi-Load Message Drafts Table
CREATE TABLE IF NOT EXISTS message_drafts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'today',
  plan_date VARCHAR(50),
  greeting VARCHAR(50),
  language VARCHAR(50) DEFAULT 'en',
  selected_loads JSON,
  message_text TEXT,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_message_drafts_updated (updated_at)
);




