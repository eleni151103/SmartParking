-- parking_db.sql

CREATE TABLE parking_spots (
                               id SERIAL PRIMARY KEY,
                               latitude DOUBLE PRECISION NOT NULL,
                               longitude DOUBLE PRECISION NOT NULL,
                               location VARCHAR(100) NOT NULL,
                               city VARCHAR(50),
                               area VARCHAR(50),
                               status VARCHAR(20) NOT NULL DEFAULT 'Available',
                               last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_parking_spots_city_area ON parking_spots (city, area);

CREATE INDEX idx_parking_spots_status ON parking_spots (status);
CREATE INDEX idx_parking_spots_location ON parking_spots (location);

-- Status log
CREATE TABLE spot_status_log (
                                 id SERIAL PRIMARY KEY,
                                 spot_id INTEGER NOT NULL,
                                 status VARCHAR(20) NOT NULL,
                                 timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
                                 FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE
);

-- Users
CREATE Table users (
                       id SERIAL PRIMARY KEY,
                       email VARCHAR(100) UNIQUE NOT NULL,
                       password_hash TEXT NOT NULL,
                       full_name VARCHAR(100),
                       is_admin BOOLEAN DEFAULT FALSE,
                       created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Default Admin User (password: 'Admin123')
INSERT INTO users (email, password_hash, full_name, is_admin)
VALUES ('admin@smartparking.gr', '$2b$12$Ilve63iK7KtdrQPxUCmtIezXNoZMMalCMhNETygMQQKsoKBL9ckedO', 'System Administrator', TRUE);

-- Favorites
CREATE TABLE user_favorites (
                                user_id INTEGER,
                                spot_id INTEGER,
                                PRIMARY KEY (user_id, spot_id),
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE
);

-- Reservations
CREATE TABLE reservations (
                              id SERIAL PRIMARY KEY,
                              user_id INTEGER NOT NULL,
                              spot_id INTEGER NOT NULL,
                              start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                              end_time TIMESTAMP WITHOUT TIME ZONE,
                              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                              FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE
);

CREATE INDEX idx_spots_bbox ON parking_spots USING BTREE(latitude, longitude);
CREATE INDEX idx_spots_bbox_status ON parking_spots USING BTREE(status, latitude, longitude);

-- Paid parking spots
CREATE TABLE paid_parking (
    spot_id        INTEGER PRIMARY KEY
                   REFERENCES parking_spots(id) ON DELETE CASCADE,
    price_per_hour NUMERIC(8,2) NOT NULL CHECK (price_per_hour >= 0)
);

CREATE INDEX idx_paid_parking_price ON paid_parking (price_per_hour);


-- Athens parking spots
INSERT INTO parking_spots (latitude, longitude, location, status, city, area) VALUES
(37.9755, 23.7348, 'Athens - Syntagma Square', 'Available', 'Athens', 'Syntagma Square'),
(37.9838, 23.7275, 'Athens - Monastiraki', 'Available', 'Athens', 'Monastiraki'),
(37.9879, 23.7300, 'Athens - Plaka District', 'Occupied', 'Athens', 'Plaka District'),
(37.9742, 23.7370, 'Athens - National Garden', 'Available', 'Athens', 'National Garden'),
(37.9842, 23.7278, 'Athens - Omonia Square', 'Occupied', 'Athens', 'Omonia Square'),
(37.9807, 23.7339, 'Athens - Panepistimiou', 'Available', 'Athens', 'Panepistimiou'),
(37.9786, 23.7406, 'Athens - Kolonaki', 'Available', 'Athens', 'Kolonaki'),
(37.9653, 23.7284, 'Athens - Koukaki', 'Occupied', 'Athens', 'Koukaki'),
(37.9757, 23.7200, 'Athens - Thissio', 'Available', 'Athens', 'Thissio'),
(37.9685, 23.7285, 'Athens - Acropolis Museum', 'Reserved', 'Athens', 'Acropolis Museum'),
(37.9724, 23.7361, 'Athens - Zappeion', 'Available', 'Athens', 'Zappeion'),
(37.9770, 23.7187, 'Athens - Kerameikos', 'Occupied', 'Athens', 'Kerameikos'),
(37.9785, 23.7116, 'Athens - Gazi', 'Available', 'Athens', 'Gazi'),
(37.9680, 23.7085, 'Athens - Petralona', 'Available', 'Athens', 'Petralona'),
(37.9675, 23.7450, 'Athens - Pangrati', 'Occupied', 'Athens', 'Pangrati'),
(37.9870, 23.7380, 'Athens - Exarchia', 'Reserved', 'Athens', 'Exarchia'),
(37.9952, 23.7303, 'Athens - Victoria Square', 'Available', 'Athens', 'Victoria Square'),
(37.9830, 23.7210, 'Athens - Metaxourgeio', 'Available', 'Athens', 'Metaxourgeio'),
(37.9762, 23.7278, 'Athens - Ermou Street', 'Occupied', 'Athens', 'Ermou Street'),
(37.9724, 23.7288, 'Athens - Anafiotika', 'Available', 'Athens', 'Anafiotika'),
(37.9789, 23.7320, 'Athens - Stadiou Street', 'Reserved', 'Athens', 'Stadiou Street'),
(37.9696, 23.7411, 'Athens - Panathenaic Stadium (Kallimarmaro)', 'Available', 'Athens', 'Panathenaic Stadium (Kallimarmaro)'),
(37.9826, 23.7445, 'Athens - Lycabettus Hill Base', 'Occupied', 'Athens', 'Lycabettus Hill Base'),
(37.9891, 23.7610, 'Athens - Ampelokipoi', 'Available', 'Athens', 'Ampelokipoi'),
(37.9769, 23.7690, 'Athens - Zografou', 'Available', 'Athens', 'Zografou'),
(37.9563, 23.7289, 'Athens - Neos Kosmos', 'Occupied', 'Athens', 'Neos Kosmos'),
(37.9458, 23.7142, 'Athens - Nea Smyrni Square', 'Available', 'Athens', 'Nea Smyrni Square'),
(37.9644, 23.7266, 'Athens - Syngrou Fix', 'Reserved', 'Athens', 'Syngrou Fix'),
(37.9780, 23.7365, 'Athens - Syntagma North', 'Available', 'Athens', 'Syntagma North'),
(37.9751, 23.7379, 'Athens - Syntagma East', 'Available', 'Athens', 'Syntagma East'),
(37.9761, 23.7245, 'Athens - Monastiraki Flea Market', 'Occupied', 'Athens', 'Monastiraki Flea Market'),
(37.9890, 23.7315, 'Athens - National Archaeological Museum', 'Available', 'Athens', 'National Archaeological Museum'),
(37.9768, 23.7480, 'Athens - Evangelismos', 'Available', 'Athens', 'Evangelismos'),
(37.9799, 23.7573, 'Athens - Ilisia', 'Occupied', 'Athens', 'Ilisia'),
(37.9493, 23.7357, 'Athens - Dafni', 'Available', 'Athens', 'Dafni'),
(37.9935, 23.7638, 'Athens - Kifisias (Ampelokipoi)', 'Reserved', 'Athens', 'Kifisias (Ampelokipoi)'),
(37.9767, 23.7331, 'Athens - Syntagma West', 'Available', 'Athens', 'Syntagma West'),
(37.9780, 23.7238, 'Athens - Psyrri', 'Occupied', 'Athens', 'Psyrri'),
(37.9740, 23.7280, 'Athens - Acropolis North Slope', 'Available', 'Athens', 'Acropolis North Slope'),
(37.9720, 23.7207, 'Athens - Areopagus Hill', 'Available', 'Athens', 'Areopagus Hill');


-- Larissa parking spots
INSERT INTO parking_spots (latitude, longitude, location, status, city, area) VALUES
(39.6390, 22.4194, 'Larissa - Central Square', 'Available', 'Larissa', 'Central Square'),
(39.6420, 22.4150, 'Larissa - Railway Station', 'Occupied', 'Larissa', 'Railway Station'),
(39.6360, 22.4220, 'Larissa - Shopping Center', 'Available', 'Larissa', 'Shopping Center'),
(39.6380, 22.4180, 'Larissa - Municipal Park', 'Reserved', 'Larissa', 'Municipal Park');

-- paid parking spots
INSERT INTO paid_parking (spot_id, price_per_hour) VALUES
(1, 2.50),
(3, 3.00),
(5, 2.00),
(10, 4.00),
(11, 2.00),
(12, 5.00),
(15, 2.75);
