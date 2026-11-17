export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  requestId: string;
  changes: unknown;
  createdAt: string;
}
