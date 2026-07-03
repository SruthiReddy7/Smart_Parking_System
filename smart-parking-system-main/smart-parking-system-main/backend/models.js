const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true, sparse: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
  full_name: { type: String, default: '' }
});
const User = mongoose.model('User', UserSchema);

const VehicleSchema = new mongoose.Schema({
  vehicle_plate: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  vehicle_model: { type: String, default: '' },
  fuel_type: { type: String, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Other'], default: 'Petrol' }
});
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

const ZoneSchema = new mongoose.Schema({
  zone_id: { type: Number, required: true, unique: true },
  zone_name: { type: String, required: true },
  location: { type: String, required: true },
  total_slots: { type: Number, required: true, min: 1 },
  available_slots: { type: Number, required: true, min: 0 },
  hourly_rate: { type: Number, required: true, min: 0 }
});
const Zone = mongoose.model('Zone', ZoneSchema);

const SlotSchema = new mongoose.Schema({
  slot_id: { type: Number, required: true, unique: true },
  // Foreign key referencing Zone — links each slot to its zone by integer primary key
  zone_id: { type: Number, required: true, ref: 'Zone' },
  slot_number: { type: String, required: true, unique: true },
  slot_type: { type: String, enum: ['Standard', 'Handicapped', 'EV Charging'], default: 'Standard' },
  status: { type: String, enum: ['Available', 'Occupied', 'Maintenance'], default: 'Available' }
});
const Slot = mongoose.model('Slot', SlotSchema);

// MongoDB _id (ObjectId) is the primary key — session_id removed to avoid race conditions.
const SessionSchema = new mongoose.Schema({
  // Foreign keys referencing infrastructure by integer IDs — robust against name renames
  slot_id: { type: Number, required: true, ref: 'Slot' },
  zone_id: { type: Number, required: true, ref: 'Zone' },
  // Convenience display fields — denormalized for read performance
  slot_number: String,
  zone_name: String,
  vehicle_plate: { type: String, required: true },
  driver_name: { type: String, required: true },
  // Date type enables accurate duration calculation and range queries
  entry_time: { type: Date, required: true },
  exit_time: Date,
  duration_hours: Number,
  amount_due: Number,
  status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
  // Optional FK to User — set when a logged-in customer starts the session
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Session = mongoose.model('Session', SessionSchema);

// MongoDB _id (ObjectId) is the primary key — payment_id removed to avoid race conditions.
// driver_name and vehicle_plate removed (3NF) — retrieve from the linked Session when needed.
const PaymentSchema = new mongoose.Schema({
  // Foreign key referencing Session — required so every payment is traceable to a session
  session_ref: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Session' },
  amount: Number,
  method: String,
  // Date type enables accurate timestamp queries and formatting
  payment_time: Date,
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
});
const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { User, Vehicle, Zone, Slot, Session, Payment };