ALTER TABLE leads2
  ADD COLUMN sourceAgencyId int NULL AFTER agencyId,
  ADD COLUMN assignedAgencyId int NULL AFTER sourceAgencyId,
  ADD COLUMN assignmentStatus enum('UNASSIGNED','ASSIGNED','REASSIGNED') NOT NULL DEFAULT 'UNASSIGNED' AFTER assignedAgencyId,
  ADD COLUMN assignedBy int NULL AFTER assignmentStatus,
  ADD COLUMN assignedAt timestamp NULL AFTER assignedBy;

UPDATE leads2
SET sourceAgencyId = agencyId
WHERE sourceAgencyId IS NULL AND agencyId IS NOT NULL;

UPDATE leads2
SET assignedAgencyId = agencyId,
    assignmentStatus = 'ASSIGNED'
WHERE assignedAgencyId IS NULL
  AND agencyId IS NOT NULL
  AND source <> 'ai_chat';

CREATE INDEX idx_leads2_assignment_status_created ON leads2 (assignmentStatus, createdAt);
CREATE INDEX idx_leads2_assigned_agency_created ON leads2 (assignedAgencyId, createdAt);
CREATE INDEX idx_leads2_source_agency_created ON leads2 (sourceAgencyId, createdAt);