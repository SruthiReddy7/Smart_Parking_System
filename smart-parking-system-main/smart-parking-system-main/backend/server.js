const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Vehicle, Zone, Slot, Session, Payment } = require('./models');

require('dotenv').config();

const app = express();

// Fix #4: Restrict CORS to the configured frontend origin instead of wildcard
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));

app.use(express.json());

// Rate limiting — prevents API abuse and database-level denial-of-service attacks.
// General limiter applied to all API routes: 200 requests per minute per IP.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter limiter for write operations: 30 requests per minute per IP.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', generalLimiter);

// JWT secret — must be set in .env for production.
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set. Using an insecure default. Set JWT_SECRET in backend/.env');
}
const JWT_SECRET = process.env.JWT_SECRET || 'insecure_dev_default_change_me';

// Middleware: require a valid JWT, attach decoded payload to req.user.
const requireAuth = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware: require a valid JWT with role === 'admin'.
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Middleware: attach req.user if a valid JWT is present, but don't block if absent.
const optionalAuth = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    } catch {
      // ignore invalid token
    }
  }
  next();
};

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment. Create backend/.env to configure it.');
  process.exit(1);
}

const initializeUsers = async () => {
  const users = await User.find({ user_id: { $exists: false } }).sort({ _id: 1 });
  if (users.length > 0) {
    let maxUser = await User.findOne({}, 'user_id').sort({ user_id: -1 });
    let nextId = maxUser && maxUser.user_id ? maxUser.user_id + 1 : 1;
    for (const user of users) {
      user.user_id = nextId++;
      await user.save();
    }
    console.log(`Assigned user_ids to ${users.length} existing users.`);
  }
};

const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB Atlas successfully!');
      await initializeUsers();
    })
    .catch((err) => {
      console.error('MongoDB connection failed, retrying in 5 seconds...', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// --- AUTH ---

// Register a new customer account.
app.post('/api/auth/register', writeLimiter, async (req, res) => {
  try {
    const { username, password, full_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    // Enforce string types to prevent NoSQL operator injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'username and password must be strings' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    const hash = await bcrypt.hash(password, 10);
    
    // Assign numerical user_id
    const maxUser = await User.findOne({}, 'user_id').sort({ user_id: -1 });
    const nextId = maxUser && maxUser.user_id ? maxUser.user_id + 1 : 1;

    const user = new User({ 
      user_id: nextId,
      username, 
      password: hash, 
      role: 'customer', 
      full_name: full_name ? String(full_name) : '' 
    });
    await user.save();
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Login — returns a JWT valid for 24 hours.
app.post('/api/auth/login', writeLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    // Enforce string types to prevent NoSQL operator injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'username and password must be strings' });
    }
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { userId: String(user._id), role: user.role, username: user.username, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: user.role, username: user.username, full_name: user.full_name });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Fix #1: Only allow seeding in development (or locally) — prevents public database wipe in production
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.post('/api/seed', writeLimiter, async (req, res) => {
    try {
      // Clear existing
      await User.deleteMany({});
      await Vehicle.deleteMany({});
      await Zone.deleteMany({});
      await Slot.deleteMany({});
      await Session.deleteMany({});
      await Payment.deleteMany({});

      // Seed demo users
      const adminHash = await bcrypt.hash('admin123', 10);
      const customerHash = await bcrypt.hash('customer123', 10);
      const users = await User.insertMany([
        { username: 'admin', password: adminHash, role: 'admin', full_name: 'System Admin' },
        { username: 'alice', password: customerHash, role: 'customer', full_name: 'Alice Johnson' }
      ]);
      
      const alice = users.find(u => u.username === 'alice');

      // Seed vehicles
      await Vehicle.insertMany([
        { vehicle_plate: 'ABC-1234', user_id: alice._id, vehicle_model: 'Toyota Prius', fuel_type: 'Hybrid' },
        { vehicle_plate: 'XYZ-5678', user_id: alice._id, vehicle_model: 'Honda Civic', fuel_type: 'Petrol' }
      ]);

      // The data from frontend
      const zones = [
        { zone_id: 1, zone_name: "Downtown Central", location: "123 Main St", total_slots: 50, available_slots: 48, hourly_rate: 3.5 },
        { zone_id: 2, zone_name: "Westside Mall", location: "456 West Ave", total_slots: 120, available_slots: 120, hourly_rate: 2.0 },
        { zone_id: 3, zone_name: "Airport Terminal A", location: "Airport Rd", total_slots: 200, available_slots: 200, hourly_rate: 5.0 },
        { zone_id: 4, zone_name: "North Park Plaza", location: "789 North Blvd", total_slots: 80, available_slots: 80, hourly_rate: 1.5 },
      ];
      
      // Auto-generate realistic slot lists for these zones instead of just 4
      const slots = [];
      let slotCounter = 1;
      for (const z of zones) {
        let occupiedCount = z.total_slots - z.available_slots;
        for (let i = 1; i <= z.total_slots; i++) {
          slots.push({
            slot_id: slotCounter++,
            zone_id: z.zone_id,
            slot_number: `${z.zone_name.substring(0,2).toUpperCase()}-${i.toString().padStart(3, '0')}`,
            slot_type: i % 10 === 0 ? "Handicapped" : i % 8 === 0 ? "EV Charging" : "Standard",
            status: occupiedCount > 0 ? "Occupied" : "Available"
          });
          if (occupiedCount > 0) occupiedCount--;
        }
      }

      // Insert sessions and capture the inserted _ids for payment references
      const sessionDocs = await Session.insertMany([
        { slot_id: 1, zone_id: 1, slot_number: "DO-001", zone_name: "Downtown Central", vehicle_plate: "ABC-1234", driver_name: "Alice Johnson", entry_time: new Date("2026-03-29T08:00:00"), exit_time: new Date("2026-03-29T10:30:00"), duration_hours: 2.5, amount_due: 8.75, status: "Completed" },
        { slot_id: 2, zone_id: 1, slot_number: "DO-002", zone_name: "Downtown Central", vehicle_plate: "XYZ-5678", driver_name: "Bob Smith", entry_time: new Date("2026-03-29T09:15:00"), exit_time: null, duration_hours: null, amount_due: null, status: "Active" }
      ]);

      const payments = [
        { session_ref: sessionDocs[0]._id, amount: 8.75, method: "Credit Card", payment_time: new Date("2026-03-29T10:32:00"), status: "Paid" }
      ];

      await Zone.insertMany(zones);
      await Slot.insertMany(slots);
      await Payment.insertMany(payments);

      res.json({ message: 'Database seeded successfully. Admin: admin/admin123 | Customer: alice/customer123' });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  });
}

// Admin: get all registered users
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

app.put('/api/users/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { username, full_name, role } = req.body;
    const updated = await User.findByIdAndUpdate(req.params.id, { username, full_name, role }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ZONES ---
app.get('/api/zones', async (req, res) => {
  try {
    const data = await Zone.find();
    res.json(data);
  } catch (err) {
    console.error('GET /api/zones error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Require admin JWT for infrastructure mutations.
app.post('/api/zones', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { zone_id, zone_name, location, total_slots, available_slots, hourly_rate } = req.body;
    const newZone = new Zone({ zone_id, zone_name, location, total_slots, available_slots, hourly_rate });
    await newZone.save();

    // Auto-generate slots for this new zone so it's usable immediately
    const slotsToCreate = [];
    const lastSlot = await Slot.findOne().sort({ slot_id: -1 });
    let nextSlotId = lastSlot ? lastSlot.slot_id + 1 : 1;

    for (let i = 1; i <= newZone.total_slots; i++) {
        slotsToCreate.push({
            slot_id: nextSlotId++,
            zone_id: newZone.zone_id,
            slot_number: `${newZone.zone_name.substring(0,2).toUpperCase()}-${i.toString().padStart(3, '0')}`,
            slot_type: i % 10 === 0 ? "Handicapped" : i % 8 === 0 ? "EV Charging" : "Standard",
            status: "Available"
        });
    }

    if (slotsToCreate.length > 0) {
        await Slot.insertMany(slotsToCreate);
    }

    res.status(201).json(newZone);
  } catch (err) {
    console.error('POST /api/zones error:', err);
    res.status(400).json({ error: err.message || 'Invalid zone data provided' });
  }
});

app.put('/api/zones/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    // Exclude available_slots if you don't want it overwritten directly.
    // E.g., if total_slots changes, we might recalculate available_slots or keep the occupied difference the same.
    const { zone_name, location, total_slots, hourly_rate } = req.body;
    
    // Calculate new available_slots by preserving occupied_slots
    const oldZone = await Zone.findOne({ zone_id: req.params.id });
    if (!oldZone) return res.status(404).json({ error: "Zone not found" });

    const occupied_slots = oldZone.total_slots - oldZone.available_slots;
    const new_available_slots = Math.max(0, total_slots - occupied_slots);

    const updated = await Zone.findOneAndUpdate(
      { zone_id: req.params.id },
      { zone_name, location, total_slots, available_slots: new_available_slots, hourly_rate },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/zones error:', err);
    res.status(400).json({ error: err.message || 'Invalid zone data provided' });
  }
});

app.delete('/api/zones/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);

    const zone = await Zone.findOne({ zone_id: zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Prevent deletion if there is an active session
    // Included fallback to zone_name to support legacy sample data
    const activeSession = await Session.findOne({
      $or: [{ zone_id: zoneId }, { zone_name: zone.zone_name }],
      status: 'Active'
    });
    
    if (activeSession) {
      return res.status(400).json({ error: 'Cannot delete a zone with active parking sessions' });
    }

    await Zone.findOneAndDelete({ zone_id: zoneId });
    // Also delete associated slots
    await Slot.deleteMany({ zone_id: zoneId });
    res.json({ message: 'Zone deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/zones error:', err);
    res.status(500).json({ error: err.message || 'Error deleting zone' });
  }
});

// --- SLOTS ---
app.get('/api/slots', async (req, res) => {
  try {
    const data = await Slot.find();
    res.json(data);
  } catch (err) {
    console.error('GET /api/slots error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

app.post('/api/slots', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { slot_id, zone_id, slot_number, slot_type, status } = req.body;
    const obj = new Slot({ slot_id, zone_id, slot_number, slot_type, status });
    await obj.save();
    res.status(201).json(obj);
  } catch (err) {
    console.error('POST /api/slots error:', err);
    res.status(400).json({ error: err.message || 'Invalid slot data provided' });
  }
});

app.put('/api/slots/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { slot_number, slot_type, status } = req.body;
    const updated = await Slot.findOneAndUpdate(
      { slot_id: req.params.id },
      { slot_number, slot_type, status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/slots error:', err);
    res.status(400).json({ error: err.message || 'Invalid slot data provided' });
  }
});

app.delete('/api/slots/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const slotId = Number(req.params.id);

    const slot = await Slot.findOne({ slot_id: slotId });
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Prevent deletion if there is an active session
    // Included fallback to slot_number to support legacy sample data
    const activeSession = await Session.findOne({
      $or: [{ slot_id: slotId }, { slot_number: slot.slot_number }],
      status: 'Active'
    });
    
    if (activeSession) {
      return res.status(400).json({ error: 'Cannot delete a slot with an active parking session' });
    }

    await Slot.findOneAndDelete({ slot_id: slotId });
    res.json({ message: 'Slot deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/slots error:', err);
    res.status(500).json({ error: err.message || 'Error deleting slot' });
  }
});

// --- SESSIONS ---

// Customer: get only their own sessions (must be before the general /api/sessions route).
app.get('/api/sessions/my', requireAuth, async (req, res) => {
  try {
    const data = await Session.find({ user_id: req.user.userId }).sort({ _id: -1 });
    res.json(data);
  } catch (err) {
    console.error('GET /api/sessions/my error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Admin: paginated list of all sessions.
// Fix #6: Paginated response — prevents unbounded queries on large datasets.
// Clients may pass ?page=<n>&limit=<n>; defaults to page 1, up to 100 records.
app.get('/api/sessions', requireAdmin, async (req, res) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const hasValidIntegerPage = rawPage === undefined || (String(rawPage).trim() !== '' && Number.isInteger(Number(rawPage)));
    const hasValidIntegerLimit = rawLimit === undefined || (String(rawLimit).trim() !== '' && Number.isInteger(Number(rawLimit)));
    if (!hasValidIntegerPage || !hasValidIntegerLimit) {
      return res.status(400).json({ error: 'page and limit must be numeric' });
    }
    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 100));
    const skip = (page - 1) * limit;
    const data = await Session.find().sort({ _id: -1 }).skip(skip).limit(limit);
    res.json(data);
  } catch (err) {
    console.error('GET /api/sessions error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

app.post('/api/sessions', writeLimiter, requireAuth, async (req, res) => {
  try {
    // Fix #2: Destructure only the expected fields.
    // Fix #8: No manual session_id — MongoDB _id (ObjectId) is unique by design
    //         and eliminates the race condition from manual auto-increment.
    // slot_id and zone_id are FK references; slot_number and zone_name are denormalized display fields.
    const { slot_id, zone_id, slot_number, zone_name, vehicle_plate, driver_name, entry_time, status } = req.body;
    const user_id = req.user.userId;

    // Prevent user from starting multiple sessions for the exact same vehicle plate
    const existingActiveSession = await Session.findOne({
      user_id: user_id,
      vehicle_plate: { $regex: new RegExp('^' + vehicle_plate + '$', 'i') },
      status: 'Active'
    });
    if (existingActiveSession) {
      return res.status(400).json({ error: `You already have an active session for the vehicle plate "${vehicle_plate}".` });
    }

    const obj = new Session({ slot_id, zone_id, slot_number, zone_name, vehicle_plate, driver_name, entry_time, status, user_id });
    await obj.save();

    // Mark slot as occupied using the integer FK — immune to slot_number renames
    await Slot.findOneAndUpdate(
      { slot_id: obj.slot_id },
      { status: "Occupied" }
    );

    // Decrease zone availability using the integer FK — immune to zone_name renames
    await Zone.findOneAndUpdate(
      { zone_id: obj.zone_id },
      { $inc: { available_slots: -1 } }
    );

    // Create a pending payment linked by session ObjectId.
    // driver_name and vehicle_plate are NOT stored in Payment (3NF) — join from Session when needed.
    await Payment.create({
      session_ref: obj._id,
      status: "Pending"
    });

    res.status(201).json(obj);
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    res.status(400).json({ error: err.message || 'Invalid session data provided' });
  }
});

app.put('/api/sessions/:id', writeLimiter, requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Customers can only end their own sessions.
    if (req.user.role === 'customer' && String(session.user_id) !== req.user.userId) {
      return res.status(403).json({ error: 'You can only modify your own sessions' });
    }

    // Fix #2: Destructure only the expected fields.
    const { exit_time, duration_hours, amount_due, status } = req.body;
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      { exit_time, duration_hours, amount_due, status },
      { new: true }
    );

    if (updatedSession.status === "Completed") {
      // Mark slot as available using the integer FK — immune to slot_number renames
      await Slot.findOneAndUpdate(
        { slot_id: updatedSession.slot_id },
        { status: "Available" }
      );

      // Increase zone availability using the integer FK — immune to zone_name renames
      await Zone.findOneAndUpdate(
        { zone_id: updatedSession.zone_id },
        { $inc: { available_slots: 1 } }
      );

      // Complete the payment
      await Payment.findOneAndUpdate(
        { session_ref: updatedSession._id },
        { 
          amount: updatedSession.amount_due, 
          status: "Paid", 
          payment_time: updatedSession.exit_time,
          method: "Credit Card" 
        }
      );
    }

    res.json(updatedSession);
  } catch (err) {
    console.error('PUT /api/sessions error:', err);
    res.status(400).json({ error: err.message || 'Invalid session data provided' });
  }
});

// --- PAYMENTS ---

// Customer: get only payments linked to their own sessions.
app.get('/api/payments/my', requireAuth, async (req, res) => {
  try {
    const mySessions = await Session.find({ user_id: req.user.userId }, '_id');
    const sessionIds = mySessions.map(s => s._id);
    const data = await Payment.find({ session_ref: { $in: sessionIds } })
      .populate('session_ref', 'driver_name vehicle_plate entry_time')
      .sort({ _id: -1 });
    res.json(data);
  } catch (err) {
    console.error('GET /api/payments/my error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Admin: all payments.
app.get('/api/payments', requireAdmin, async (req, res) => {
  try {
    // Populate session_ref so the frontend can display driver/plate from the linked Session.
    // This avoids duplicating those fields in the Payment document (3NF).
    const data = await Payment.find().populate('session_ref', 'driver_name vehicle_plate entry_time');
    res.json(data);
  } catch (err) {
    console.error('GET /api/payments error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

app.post('/api/payments', writeLimiter, requireAdmin, async (req, res) => {
  try {
    // Fix #2: Destructure only the expected fields.
    // Fix #8: payment_id removed — MongoDB _id (ObjectId) is used as identifier.
    // driver_name and vehicle_plate are not stored in Payment (3NF) — join from Session when needed.
    const { session_ref, amount, method, payment_time, status } = req.body;
    const obj = new Payment({ session_ref, amount, method, payment_time, status });
    await obj.save();
    res.status(201).json(obj);
  } catch (err) {
    console.error('POST /api/payments error:', err);
    res.status(400).json({ error: err.message || 'Invalid payment data provided' });
  }
});

app.put('/api/payments/:id', writeLimiter, requireAdmin, async (req, res) => {
  try {
    const { amount, method, status } = req.body;
    const updated = await Payment.findByIdAndUpdate(req.params.id, { amount, method, status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// --- VEHICLES ---
app.get('/api/vehicles', requireAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user_id: req.user.userId };
    const data = await Vehicle.find(filter).populate('user_id', 'username full_name');
    res.json(data);
  } catch (err) {
    console.error('GET /api/vehicles error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

app.post('/api/vehicles', writeLimiter, requireAuth, async (req, res) => {
  try {
    const { vehicle_plate, vehicle_model, fuel_type } = req.body;
    let userId = req.user.userId;
    if (req.user.role === 'admin' && req.body.user_id) {
      userId = req.body.user_id;
    }
    const newObj = new Vehicle({ vehicle_plate, user_id: userId, vehicle_model, fuel_type });
    await newObj.save();
    res.status(201).json(newObj);
  } catch (err) {
    console.error('POST /api/vehicles error:', err);
    res.status(400).json({ error: err.message || 'Invalid vehicle data provided' });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
