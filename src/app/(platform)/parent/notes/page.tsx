import { fetchParentChildrenOverviewAction } from "../actions";
import ParentNotesClientView from "./ParentNotesClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Notes & Bulletins | Espace Parent",
  description: "Relevé des notes et moyennes de votre enfant.",
};

export default async function ParentNotesPage() {
  const result = await fetchParentChildrenOverviewAction();

  return (
    <ParentNotesClientView
      initialChildren={result.children || []}
    />
  );
}
