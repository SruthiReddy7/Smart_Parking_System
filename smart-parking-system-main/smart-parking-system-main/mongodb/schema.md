# MongoDB Document Schema & Implementation

## Collections Overview
The NoSQL schema structurally resolves 6 entities conceptually via Mongoose. `_id` ObjectIds function as default primary identifiers handling inter-document linking natively alongside business integers.

### 1. `users`
```json
{
  "_id": "ObjectId",
  "user_id": 1,
  "username": "customer_a",
  "password": "hashed_password",
  "role": "customer",
  "full_name": "Alice Johnson"
}
```

### 2. `vehicles`
```json
{
  "_id": "ObjectId",
  "vehicle_plate": "XYZ-9876",
  "user_id": "ObjectId(User)",
  "vehicle_model": "Tesla Model 3",
  "fuel_type": "Electric"
}
```

### 3. `zones`
```json
{
  "_id": "ObjectId",
  "zone_id": 1,
  "zone_name": "Downtown Central",
  "location": "123 Main St",
  "total_slots": 50,
  "available_slots": 48,
  "hourly_rate": 3.5
}
```J

### 4. `slots`
```json
{
  "_id": "ObjectId",
  "slot_id": 1,
  "zone_id": 1,
  "slot_number": "DO-001",
  "slot_type": "EV Charging",
  "status": "Available"
}
```

### 5. `sessions`
*(Derived attributes `duration_hours` and `amount_due` natively compute upon exit)*.
```json
{
  "_id": "ObjectId",
  "slot_id": 1,
  "zone_id": 1,
  "vehicle_plate": "XYZ-9876",
  "driver_name": "Alice Johnson",
  "entry_time": "2026-04-14T08:00:00Z",
  "exit_time": "2026-04-14T10:30:00Z",
  "duration_hours": 2.5,
  "amount_due": 8.75,
  "status": "Completed",
  "user_id": "ObjectId(User)"
}
```

### 6. `payments`
```json
{
  "_id": "ObjectId",
  "session_ref": "ObjectId(Session)",
  "amount": 8.75,
  "method": "Credit Card",
  "payment_time": "2026-04-14T10:31:00Z",
  "status": "Paid"
}
```\n