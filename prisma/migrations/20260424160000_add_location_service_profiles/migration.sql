-- CreateTable
CREATE TABLE "location_service_profiles" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "service_days" JSONB NOT NULL DEFAULT '[]',
    "preferred_start_time" TEXT,
    "preferred_end_time" TEXT,
    "estimated_duration_mins" INTEGER NOT NULL DEFAULT 120,
    "default_manager_id" TEXT,
    "route_priority" INTEGER NOT NULL DEFAULT 50,
    "auto_schedule" BOOLEAN NOT NULL DEFAULT false,
    "review_required" BOOLEAN NOT NULL DEFAULT true,
    "dispatch_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_service_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_service_profiles_location_id_key" ON "location_service_profiles"("location_id");

-- CreateIndex
CREATE INDEX "location_service_profiles_default_manager_id_idx" ON "location_service_profiles"("default_manager_id");

-- CreateIndex
CREATE INDEX "location_service_profiles_auto_schedule_idx" ON "location_service_profiles"("auto_schedule");

-- AddForeignKey
ALTER TABLE "location_service_profiles" ADD CONSTRAINT "location_service_profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_service_profiles" ADD CONSTRAINT "location_service_profiles_default_manager_id_fkey" FOREIGN KEY ("default_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
