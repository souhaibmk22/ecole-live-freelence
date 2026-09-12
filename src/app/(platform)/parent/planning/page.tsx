import { fetchParentChildrenOverviewAction } from "../actions";
import { fetchUserMeetingsAction } from "@/app/(platform)/admin/planning/actions";
import ParentPlanningClientView from "./ParentPlanningClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Planning & Replays | Espace Parent",
  description: "Emploi du temps, assiduité et replays des cours de votre enfant.",
};

export default async function ParentPlanningPage() {
  const result = await fetchParentChildrenOverviewAction();
  const meetingsRes = await fetchUserMeetingsAction();

  return (
    <ParentPlanningClientView
      initialChildren={result.children || []}
      parentProfile={result.parentProfile}
      initialMeetings={meetingsRes.success ? meetingsRes.data : []}
    />
  );
}
