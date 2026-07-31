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
