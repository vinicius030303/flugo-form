export type AuditActor = { uid?: string | null; email?: string | null };
export type AuditEntity = { type: string; id?: string | null; name?: string | null };

export type AuditEvent = {
  action: string;          // "colaborador:create" | "colaborador:update" | "departamento:create" | ...
  actor?: AuditActor;
  entity?: AuditEntity;
  payload?: any;
};
