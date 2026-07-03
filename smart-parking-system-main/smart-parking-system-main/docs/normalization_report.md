# Normalization Report & Relational Schema Mapping

## Overview
This report documents the normalization analysis up to **Highest Normal Form (3NF)** and **BCNF**.
There are 6 baseline entities conceptually mapped to a relational structure. Note: Mongoose is actively used for the database representation, but standard relational normalization is verified below.

## Relational Schema Mapping
1. **User**(User_ID (PK), Username, Password, Role, Full_Name)
2. **Vehicle**(Vehicle_Plate (PK), User_ID (FK), Vehicle_Model, Fuel_Type)
3. **Zone**(Zone_ID (PK), Zone_Name, Location, Total_Slots, Hourly_Rate)
4. **Slot**(Slot_ID (PK), Zone_ID (FK), Slot_Number, Slot_Type, Status)
5. **Session**(Session_ID (PK), User_ID (FK), Vehicle_Plate (FK), Slot_ID (FK), Zone_ID (FK), Entry_Time, Exit_Time)
6. **Payment**(Payment_ID (PK), Session_ID (FK), Amount, Method, Payment_Time, Status)

---

## Normalization Process

### 1NF (First Normal Form)
**Condition:** All attributes must be atomic (no composite or multi-valued attributes).
- In the `Zone` entity, `Location` might be composite (Street, City, Zip). For relational mapping, it is mapped natively atomic.
- In the `User` entity, if they had multiple `Contact_Numbers`, it would violate 1NF. This was resolved conceptually by ensuring all stored fields are singular (no repeating arrays in the SQL equivalent representation).
- **Result:** All tables satisfy 1NF.

### 2NF (Second Normal Form)
**Condition:** Must be in 1NF, and all non-key attributes must be fully functionally dependent on the primary key (no partial dependencies).
- Since tables `User`, `Vehicle`, `Zone`, `Slot`, `Session`, and `Payment` all have single-attribute primary keys (User_ID, Vehicle_Plate, Zone_ID, Slot_ID, Session_ID, Payment_ID), there can be no partial dependency on a composite key.
- **Result:** All tables satisfy 2NF.

### 3NF (Third Normal Form)
**Condition:** Must be in 2NF, and there must be no transitive dependencies (a non-key attribute depending on another non-key attribute).
- `Session` initially could have had derived attributes (`duration_hours`, `amount_due`). Storing derived formulas relying on `entry_time` and `exit_time` directly is a transitive dependency that violates strict 3NF in RDBMS. 
- No other non-key attribute functionally determines another non-key attribute.
- **Result:** All tables satisfy 3NF.

### BCNF (Boyce-Codd Normal Form)
**Condition:** For every non-trivial functional dependency X -> Y, X must be a superkey.
- In all 6 tables, the only determinants are their respective primary keys.
- **Result:** All relations are in **BCNF** (and consequently 3NF).