-- PR #54 already protects posted journal headers and lines with database
-- triggers. Protect the stored physical source evidence as well.
CREATE FUNCTION workshop_guard_scale_reading() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Captured Workshop scale readings are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_scale_reading_immutable
BEFORE UPDATE OR DELETE ON "WorkshopScaleReading"
FOR EACH ROW EXECUTE FUNCTION workshop_guard_scale_reading();
