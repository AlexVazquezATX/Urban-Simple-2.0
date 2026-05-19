-- Compound indexes for the clients & locations redesign.
--
-- The clients and locations list/detail pages filter on companyId + branchId +
-- deletedAt, clientId + isActive, and locationId + isActive. Before these
-- indexes those filters did sequential scans (the clients, locations and
-- service_agreements tables carried almost no indexes). Additive and
-- idempotent — safe to run more than once, and reversible with DROP INDEX.

CREATE INDEX IF NOT EXISTS "clients_company_id_branch_id_deleted_at_idx"
  ON "clients"("company_id", "branch_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "locations_client_id_is_active_deleted_at_idx"
  ON "locations"("client_id", "is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "locations_branch_id_is_active_deleted_at_idx"
  ON "locations"("branch_id", "is_active", "deleted_at");

CREATE INDEX IF NOT EXISTS "service_agreements_client_id_is_active_idx"
  ON "service_agreements"("client_id", "is_active");

CREATE INDEX IF NOT EXISTS "service_agreements_location_id_is_active_idx"
  ON "service_agreements"("location_id", "is_active");
