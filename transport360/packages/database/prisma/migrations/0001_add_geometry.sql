-- Enable PostGIS extension (if not present)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry columns
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS geom geometry(POINT, 4326);
ALTER TABLE "RouteStop" ADD COLUMN IF NOT EXISTS geom geometry(POINT, 4326);

-- Function to update geometry for Order
CREATE OR REPLACE FUNCTION update_order_geom()
RETURNS trigger AS $$
BEGIN
  IF (NEW.originLng IS NOT NULL AND NEW.originLat IS NOT NULL) THEN
    -- store origin point in geom for orders (could be origin or dest depending on design)
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.originLng, NEW.originLat), 4326);
  ELSE
    NEW.geom = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Order
DROP TRIGGER IF EXISTS trg_update_order_geom ON "Order";
CREATE TRIGGER trg_update_order_geom
BEFORE INSERT OR UPDATE ON "Order"
FOR EACH ROW
EXECUTE PROCEDURE update_order_geom();

-- Function to update geometry for RouteStop
CREATE OR REPLACE FUNCTION update_routestop_geom()
RETURNS trigger AS $$
BEGIN
  IF (NEW.lng IS NOT NULL AND NEW.lat IS NOT NULL) THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  ELSE
    NEW.geom = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for RouteStop
DROP TRIGGER IF EXISTS trg_update_routestop_geom ON "RouteStop";
CREATE TRIGGER trg_update_routestop_geom
BEFORE INSERT OR UPDATE ON "RouteStop"
FOR EACH ROW
EXECUTE PROCEDURE update_routestop_geom();
