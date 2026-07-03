-- ============================================================
-- Urban Smart Parking System (USPS)
-- Useful SQL Queries
-- ============================================================


-- --------------------------------------------------------
-- Q1: Compute derived attributes — Total_Duration and
--     Total_Bill for all completed parking sessions
-- --------------------------------------------------------
SELECT
    ps.Session_ID,
    v.License_Plate,
    d.First_Name || ' ' || d.Last_Name     AS Driver_Name,
    pz.Zone_Name,
    pk.Slot_Number,
    ps.Entry_Time,
    ps.Exit_Time,
    -- Derived: Total_Duration in hours (PostgreSQL syntax)
    EXTRACT(EPOCH FROM (ps.Exit_Time - ps.Entry_Time)) / 3600.0
                                            AS Total_Duration_Hours,
    -- Derived: Total_Bill = Duration (hrs) * Slot_Rate
    ROUND(
        EXTRACT(EPOCH FROM (ps.Exit_Time - ps.Entry_Time)) / 3600.0
        * pz.Slot_Rate,
        2
    )                                       AS Total_Bill
FROM  Parking_Session ps
JOIN  Vehicle         v   ON v.Vehicle_ID = ps.Vehicle_ID
JOIN  Driver          d   ON d.Driver_ID  = v.Driver_ID
JOIN  Parking_Slot    pk  ON pk.Slot_ID   = ps.Slot_ID
JOIN  Parking_Zone    pz  ON pz.Zone_ID   = pk.Zone_ID
WHERE ps.Exit_Time IS NOT NULL
ORDER BY ps.Session_ID;


-- --------------------------------------------------------
-- Q2: List all Available slots in a specific Zip Code
--     (used by the MongoDB Read example equivalent)
-- --------------------------------------------------------
SELECT
    pk.Slot_ID,
    pk.Slot_Number,
    pk.Slot_Type,
    pz.Zone_Name,
    pz.Street,
    pz.City,
    pz.Zip_Code,
    pz.Slot_Rate
FROM  Parking_Slot  pk
JOIN  Parking_Zone  pz ON pz.Zone_ID = pk.Zone_ID
WHERE pk.Slot_Status = 'Available'
  AND pz.Zip_Code    = '62701'
ORDER BY pk.Slot_Number;


-- --------------------------------------------------------
-- Q3: Full driver profile — name, contact numbers, vehicles
-- --------------------------------------------------------
SELECT
    d.Driver_ID,
    d.First_Name,
    d.Last_Name,
    d.Email,
    d.License_Number,
    dc.Contact_Number,
    dc.Contact_Type,
    v.License_Plate,
    v.Vehicle_Model,
    v.Fuel_Type
FROM  Driver         d
LEFT JOIN Driver_Contact dc ON dc.Driver_ID = d.Driver_ID
LEFT JOIN Vehicle         v  ON v.Driver_ID  = d.Driver_ID
ORDER BY d.Driver_ID, dc.Contact_Type, v.License_Plate;


-- --------------------------------------------------------
-- Q4: Active (ongoing) parking sessions with driver details
-- --------------------------------------------------------
SELECT
    ps.Session_ID,
    v.License_Plate,
    d.First_Name || ' ' || d.Last_Name AS Driver_Name,
    pk.Slot_Number,
    pz.Zone_Name,
    ps.Entry_Time,
    -- Duration so far (still parked)
    ROUND(
        EXTRACT(EPOCH FROM (NOW() - ps.Entry_Time)) / 3600.0,
        2
    )                                   AS Hours_So_Far
FROM  Parking_Session ps
JOIN  Vehicle         v  ON v.Vehicle_ID = ps.Vehicle_ID
JOIN  Driver          d  ON d.Driver_ID  = v.Driver_ID
JOIN  Parking_Slot    pk ON pk.Slot_ID   = ps.Slot_ID
JOIN  Parking_Zone    pz ON pz.Zone_ID   = pk.Zone_ID
WHERE ps.Exit_Time IS NULL
ORDER BY ps.Entry_Time;


-- --------------------------------------------------------
-- Q5: Revenue report per zone
-- --------------------------------------------------------
SELECT
    pz.Zone_ID,
    pz.Zone_Name,
    pz.City,
    COUNT(py.Payment_ID)                AS Total_Payments,
    SUM(py.Amount)                      AS Total_Revenue,
    ROUND(AVG(py.Amount), 2)            AS Avg_Payment
FROM  Parking_Zone    pz
JOIN  Parking_Slot    pk ON pk.Zone_ID   = pz.Zone_ID
JOIN  Parking_Session ps ON ps.Slot_ID   = pk.Slot_ID
JOIN  Payment         py ON py.Session_ID = ps.Session_ID
WHERE py.Payment_Status = 'Completed'
GROUP BY pz.Zone_ID, pz.Zone_Name, pz.City
ORDER BY Total_Revenue DESC;


-- --------------------------------------------------------
-- Q6: Slots currently occupied — show entry time and driver
-- --------------------------------------------------------
SELECT
    pk.Slot_ID,
    pk.Slot_Number,
    pk.Slot_Type,
    pz.Zone_Name,
    v.License_Plate,
    d.First_Name || ' ' || d.Last_Name AS Driver_Name,
    ps.Entry_Time
FROM  Parking_Slot    pk
JOIN  Parking_Zone    pz ON pz.Zone_ID   = pk.Zone_ID
JOIN  Parking_Session ps ON ps.Slot_ID   = pk.Slot_ID
JOIN  Vehicle         v  ON v.Vehicle_ID = ps.Vehicle_ID
JOIN  Driver          d  ON d.Driver_ID  = v.Driver_ID
WHERE pk.Slot_Status = 'Occupied'
  AND ps.Exit_Time   IS NULL
ORDER BY pz.Zone_Name, pk.Slot_Number;


-- --------------------------------------------------------
-- Q7: Payment summary for a single driver (Driver_ID = 1)
-- --------------------------------------------------------
SELECT
    d.Driver_ID,
    d.First_Name || ' ' || d.Last_Name AS Driver_Name,
    ps.Session_ID,
    ps.Entry_Time,
    ps.Exit_Time,
    py.Amount,
    py.Payment_Method,
    py.Payment_Status
FROM  Driver          d
JOIN  Vehicle         v  ON v.Driver_ID  = d.Driver_ID
JOIN  Parking_Session ps ON ps.Vehicle_ID = v.Vehicle_ID
JOIN  Payment         py ON py.Session_ID = ps.Session_ID
WHERE d.Driver_ID = 1
ORDER BY ps.Entry_Time DESC;


-- --------------------------------------------------------
-- Q8: Log a check-out for Session_ID = 1003
--     (Update Slot_Status to Available and set Exit_Time)
-- --------------------------------------------------------
UPDATE Parking_Session
SET    Exit_Time = '2024-03-10 12:30:00'
WHERE  Session_ID = 1003;

UPDATE Parking_Slot
SET    Slot_Status = 'Available'
WHERE  Slot_ID = (
    SELECT Slot_ID
    FROM   Parking_Session
    WHERE  Session_ID = 1003
);
