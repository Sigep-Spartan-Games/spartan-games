ALTER TABLE teams
ADD COLUMN tier TEXT NOT NULL DEFAULT 'gold' CHECK (tier IN ('gold', 'purple', 'red'));;
