-- Modify foreign keys to SET NULL on delete for user profiles
-- This allows deletion of drivers/admins while preserving historical records

-- Orders table - driver, admin, and deleted_by references
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_driver_id_fkey,
  DROP CONSTRAINT IF EXISTS orders_admin_id_fkey,
  DROP CONSTRAINT IF EXISTS orders_deleted_by_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT orders_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT orders_deleted_by_fkey 
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Delivery status updates - driver references
ALTER TABLE delivery_status_updates 
  DROP CONSTRAINT IF EXISTS delivery_status_updates_driver_id_fkey;

ALTER TABLE delivery_status_updates
  ADD CONSTRAINT delivery_status_updates_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Delivery photos - driver references
ALTER TABLE delivery_photos 
  DROP CONSTRAINT IF EXISTS delivery_photos_driver_id_fkey;

ALTER TABLE delivery_photos
  ADD CONSTRAINT delivery_photos_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Activity logs - admin references
ALTER TABLE activity_logs 
  DROP CONSTRAINT IF EXISTS activity_logs_admin_id_fkey;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Order returns - created_by and processed_by references
ALTER TABLE order_returns 
  DROP CONSTRAINT IF EXISTS order_returns_created_by_fkey,
  DROP CONSTRAINT IF EXISTS order_returns_processed_by_fkey;

ALTER TABLE order_returns
  ADD CONSTRAINT order_returns_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT order_returns_processed_by_fkey 
    FOREIGN KEY (processed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Business settings - updated_by references
ALTER TABLE business_settings 
  DROP CONSTRAINT IF EXISTS business_settings_updated_by_fkey;

ALTER TABLE business_settings
  ADD CONSTRAINT business_settings_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Product specials - created_by references
ALTER TABLE product_specials 
  DROP CONSTRAINT IF EXISTS product_specials_created_by_fkey;

ALTER TABLE product_specials
  ADD CONSTRAINT product_specials_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Delivery routes - driver references
ALTER TABLE delivery_routes 
  DROP CONSTRAINT IF EXISTS delivery_routes_driver_id_fkey;

ALTER TABLE delivery_routes
  ADD CONSTRAINT delivery_routes_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Driver locations - driver references
ALTER TABLE driver_locations 
  DROP CONSTRAINT IF EXISTS driver_locations_driver_id_fkey;

ALTER TABLE driver_locations
  ADD CONSTRAINT driver_locations_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE SET NULL;