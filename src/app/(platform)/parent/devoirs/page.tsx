import { fetchParentChildrenOverviewAction } from "../actions";
import ParentDevoirsClientView from "./ParentDevoirsClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Devoirs & Travail | Espace Parent",
  description: "Suivi des devoirs et évaluations de votre enfant.",
};

export default async function ParentDevoirsPage() {
  const result = await fetchParentChildrenOverviewAction();

  return (
    <ParentDevoirsClientView
      initialChildren={result.children || []}
    />
  );
}
