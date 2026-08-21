-- Rollback: cannot restore deleted live mock bars.
-- Clears GBM paths that drifted to ~₩100–200 so hydrate starts empty
-- and the engine resumes from fallback ₩75,000.
DELETE FROM candle;
