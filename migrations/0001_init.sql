DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment;

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- Seed อุปกรณ์เริ่มต้นอย่างน้อย 2 ชิ้นตามโจทย์
INSERT OR IGNORE INTO equipment (id, name, location) VALUES 
('eq-1', 'Projector A', 'Building 1'),
('eq-2', 'Sony 4K Camera', 'Media Lab B'),
('eq-3', 'Meeting Room 301', 'Floor 3');