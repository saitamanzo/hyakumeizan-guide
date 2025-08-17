-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create mountains table
CREATE TABLE IF NOT EXISTS mountains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    elevation INTEGER NOT NULL,
    location VARCHAR(255) NOT NULL,
    prefecture VARCHAR(255) NOT NULL,
    description TEXT,
    best_season VARCHAR(255),
    difficulty_level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    distance DECIMAL(5,2),
    elevation_gain INTEGER,
    estimated_time INTEGER, -- in minutes
    difficulty_level VARCHAR(50),
    starting_point VARCHAR(255),
    trail_head_access TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    display_name VARCHAR(255),
    biography TEXT,
    experience_level VARCHAR(50),
    mountains_climbed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create climbs table
CREATE TABLE IF NOT EXISTS climbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    climb_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    weather_conditions TEXT,
    notes TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mountain_id UUID REFERENCES mountains(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mountains_name ON mountains(name);
CREATE INDEX IF NOT EXISTS idx_routes_mountain_id ON routes(mountain_id);
CREATE INDEX IF NOT EXISTS idx_climbs_user_id ON climbs(user_id);
CREATE INDEX IF NOT EXISTS idx_climbs_mountain_id ON climbs(mountain_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mountain_id ON reviews(mountain_id);
CREATE INDEX IF NOT EXISTS idx_reviews_route_id ON reviews(route_id);

-- Add trigger for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mountains_updated_at ON mountains;
CREATE TRIGGER update_mountains_updated_at
    BEFORE UPDATE ON mountains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_climbs_updated_at ON climbs;
CREATE TRIGGER update_climbs_updated_at
    BEFORE UPDATE ON climbs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
