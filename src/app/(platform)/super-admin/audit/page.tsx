import { getAuditLogsPageAction } from "./actions";
import AuditLogsClientView from "./AuditLogsClientView";

export default async function AuditLogsPage() {
  const initialRes = await getAuditLogsPageAction(null, 20);

  return (
    <AuditLogsClientView
      initialLogs={initialRes.data || []}
      initialActorsMap={initialRes.actorsMap || {}}
      initialNextCursor={initialRes.nextCursor}
    />
  );
}
