import { fetchParentChildrenOverviewAction } from "./actions";
import { fetchUserMeetingsAction } from "@/app/(platform)/admin/planning/actions";
import ParentDashboardClientView from "./ParentDashboardClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Espace Parent | Mon École en Live",
  description: "Suivi scolaire, assiduité, notes et devoirs de vos enfants.",
};

export default async function ParentDashboardPage() {
  const result = await fetchParentChildrenOverviewAction();
  const meetingsRes = await fetchUserMeetingsAction();

  return (
    <ParentDashboardClientView
      initialChildren={result.children || []}
      parentProfile={result.parentProfile}
      initialMeetings={meetingsRes.success ? meetingsRes.data : []}
    />
  );
}
