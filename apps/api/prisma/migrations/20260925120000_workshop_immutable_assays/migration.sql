-- Assay history changes effective purity for future issues. Supersede an
-- earlier result with a new row instead of rewriting its evidence.
CREATE FUNCTION workshop_guard_material_assay() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Workshop material assays are immutable; record a new assay';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_material_assay_immutable
BEFORE UPDATE OR DELETE ON "WorkshopMaterialAssay"
FOR EACH ROW EXECUTE FUNCTION workshop_guard_material_assay();
