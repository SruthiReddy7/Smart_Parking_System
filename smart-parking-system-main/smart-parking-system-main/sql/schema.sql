-- ============================================================
-- Urban Smart Parking System (USPS)
-- Relational Schema — DDL
-- Compatible with: PostgreSQL 14+ / MySQL 8+
-- ============================================================

-- --------------------------------------------------------
-- 1. Parking_Zone
--    Composite attribute Zone_Location decomposed into:
--    Street, City, Zip_Code
-- --------------------------------------------------------
CREATE TABLE Parking_Zone (
    Zone_ID       INT           NOT NULL,
    Zone_Name     VARCHAR(100)  NOT NULL,
    Street        VARCHAR(150)  NOT NULL,
    City          VARCHAR(100)  NOT NULL,
    Zip_Code      VARCHAR(10)   NOT NULL,
    Slot_Rate     DECIMAL(8, 2) NOT NULL CHECK (Slot_Rate > 0),
    Zone_Capacity INT           NOT NULL CHECK (Zone_Capacity > 0),
    CONSTRAINT PK_Parking_Zone PRIMARY KEY (Zone_ID)
);

-- --------------------------------------------------------
-- 2. Parking_Slot
--    FK → Parking_Zone (1:N — one zone, many slots)
-- --------------------------------------------------------
CREATE TABLE Parking_Slot (
    Slot_ID     INT          NOT NULL,
    Zone_ID     INT          NOT NULL,
    Slot_Number VARCHAR(10)  NOT NULL,
    Slot_Type   VARCHAR(20)  NOT NULL
                    CHECK (Slot_Type IN ('Compact', 'Standard', 'EV', 'Handicapped')),
    Slot_Status VARCHAR(20)  NOT NULL DEFAULT 'Available'
                    CHECK (Slot_Status IN ('Available', 'Occupied', 'Reserved', 'Inactive')),
    CONSTRAINT PK_Parking_Slot  PRIMARY KEY (Slot_ID),
    CONSTRAINT FK_Slot_Zone     FOREIGN KEY (Zone_ID)
                                    REFERENCES Parking_Zone (Zone_ID)
                                    ON UPDATE CASCADE
                                    ON DELETE RESTRICT,
    CONSTRAINT UQ_Zone_SlotNum  UNIQUE (Zone_ID, Slot_Number)
);

-- --------------------------------------------------------
-- 3. Driver
--    Composite attribute Driver_Name decomposed into:
--    First_Name, Last_Name
--    Multivalued Contact_Numbers → separate Driver_Contact
-- --------------------------------------------------------
CREATE TABLE Driver (
    Driver_ID      INT          NOT NULL,
    First_Name     VARCHAR(50)  NOT NULL,
    Last_Name      VARCHAR(50)  NOT NULL,
    Email          VARCHAR(150) NOT NULL,
    License_Number VARCHAR(50)  NOT NULL,
    CONSTRAINT PK_Driver         PRIMARY KEY (Driver_ID),
    CONSTRAINT UQ_Driver_Email   UNIQUE (Email),
    CONSTRAINT UQ_Driver_License UNIQUE (License_Number)
);

-- --------------------------------------------------------
-- 4. Driver_Contact
--    Resolves the multivalued attribute Contact_Numbers
--    of Driver (1:N — one driver, many contact numbers)
-- --------------------------------------------------------
CREATE TABLE Driver_Contact (
    Contact_ID     INT          NOT NULL,
    Driver_ID      INT          NOT NULL,
    Contact_Number VARCHAR(20)  NOT NULL,
    Contact_Type   VARCHAR(20)  NOT NULL DEFAULT 'Mobile'
                       CHECK (Contact_Type IN ('Mobile', 'Home', 'Emergency', 'Work')),
    CONSTRAINT PK_Driver_Contact    PRIMARY KEY (Contact_ID),
    CONSTRAINT FK_Contact_Driver    FOREIGN KEY (Driver_ID)
                                        REFERENCES Driver (Driver_ID)
                                        ON UPDATE CASCADE
                                        ON DELETE CASCADE,
    CONSTRAINT UQ_Driver_Number     UNIQUE (Driver_ID, Contact_Number)
);

-- --------------------------------------------------------
-- 5. Vehicle
--    FK → Driver (1:N — one driver, many vehicles)
--    Simple attributes: Vehicle_Model, Fuel_Type
-- --------------------------------------------------------
CREATE TABLE Vehicle (
    Vehicle_ID    INT          NOT NULL,
    Driver_ID     INT          NOT NULL,
    License_Plate VARCHAR(20)  NOT NULL,
    Vehicle_Model VARCHAR(100) NOT NULL,
    Fuel_Type     VARCHAR(20)  NOT NULL
                      CHECK (Fuel_Type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid')),
    CONSTRAINT PK_Vehicle         PRIMARY KEY (Vehicle_ID),
    CONSTRAINT FK_Vehicle_Driver  FOREIGN KEY (Driver_ID)
                                      REFERENCES Driver (Driver_ID)
                                      ON UPDATE CASCADE
                                      ON DELETE RESTRICT,
    CONSTRAINT UQ_License_Plate   UNIQUE (License_Plate)
);

-- --------------------------------------------------------
-- 6. Parking_Session
--    Resolves the M:N relationship between Vehicle and
--    Parking_Slot.
--    FKs → Vehicle (N), Parking_Slot (N)
--    Derived attributes (NOT stored):
--      Total_Duration = Exit_Time - Entry_Time
--      Total_Bill     = Total_Duration (hrs) * Slot_Rate
-- --------------------------------------------------------
CREATE TABLE Parking_Session (
    Session_ID  INT       NOT NULL,
    Vehicle_ID  INT       NOT NULL,
    Slot_ID     INT       NOT NULL,
    Entry_Time  TIMESTAMP NOT NULL,
    Exit_Time   TIMESTAMP NULL,
    CONSTRAINT PK_Parking_Session  PRIMARY KEY (Session_ID),
    CONSTRAINT FK_Session_Vehicle  FOREIGN KEY (Vehicle_ID)
                                       REFERENCES Vehicle (Vehicle_ID)
                                       ON UPDATE CASCADE
                                       ON DELETE RESTRICT,
    CONSTRAINT FK_Session_Slot     FOREIGN KEY (Slot_ID)
                                       REFERENCES Parking_Slot (Slot_ID)
                                       ON UPDATE CASCADE
                                       ON DELETE RESTRICT,
    CONSTRAINT CHK_Session_Times   CHECK (Exit_Time IS NULL OR Exit_Time > Entry_Time)
);

-- --------------------------------------------------------
-- 7. Payment
--    FK → Parking_Session (1:1 — one payment per session)
-- --------------------------------------------------------
CREATE TABLE Payment (
    Payment_ID     INT            NOT NULL,
    Session_ID     INT            NOT NULL,
    Amount         DECIMAL(10, 2) NOT NULL CHECK (Amount >= 0),
    Payment_Method VARCHAR(20)    NOT NULL
                       CHECK (Payment_Method IN ('Cash', 'Card', 'UPI', 'Wallet')),
    Payment_Status VARCHAR(20)    NOT NULL DEFAULT 'Pending'
                       CHECK (Payment_Status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    Payment_Time   TIMESTAMP      NOT NULL,
    CONSTRAINT PK_Payment         PRIMARY KEY (Payment_ID),
    CONSTRAINT FK_Payment_Session FOREIGN KEY (Session_ID)
                                      REFERENCES Parking_Session (Session_ID)
                                      ON UPDATE CASCADE
                                      ON DELETE RESTRICT,
    CONSTRAINT UQ_Payment_Session UNIQUE (Session_ID)
);
