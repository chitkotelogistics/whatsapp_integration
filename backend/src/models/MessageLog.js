class MessageLog {
  constructor({ id, contact_id, message, status, response_data, created_at, updated_at }) {
    this.id = id;
    this.contactId = contact_id;
    this.message = message;
    this.status = status;
    this.responseData = response_data;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}

module.exports = MessageLog;
