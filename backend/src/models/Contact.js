class Contact {
  constructor({ id, name, mobile, company, city, state, vehicle_type, is_active, created_at }) {
    this.id = id;
    this.name = name;
    this.mobile = mobile;
    this.company = company;
    this.city = city;
    this.state = state;
    this.vehicleType = vehicle_type;
    this.isActive = is_active;
    this.createdAt = created_at;
  }
}

module.exports = Contact;
