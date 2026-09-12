"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  Video,
  Link2,
  Download,
  ExternalLink,
  Search,
  Sparkles,
  Calendar,
  AlertCircle,
  Play,
  FileDown,
  X,
} from "lucide-react";
import { CourseMaterial, MaterialType, Profile } from "@/lib/types";
import { fetchStudentMaterialsAction } from "./actions";
import { createClient } from "@/lib/supabase/client";
import UniversalDocumentViewerModal, { DocumentViewerItem } from "@/components/platform/UniversalDocumentViewerModal";
import AttachmentActionCard from "@/components/platform/AttachmentActionCard";

interface EtudiantCoursClientViewProps {
  student: Profile;
  initialMaterials: CourseMaterial[];
  hasClass: boolean;
  classSubjects?: { id: string; name: string }[];
  initialSubjectFilter?: string;
}

export default function EtudiantCoursClientView({
  student,
  initialMaterials,
  hasClass,
  classSubjects = [],
  initialSubjectFilter = "all",
}: EtudiantCoursClientViewProps) {
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get("subject");

  const [materials, setMaterials] = useState<CourseMaterial[]>(initialMaterials);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>(classSubjects);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(urlSubject || initialSubjectFilter);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | MaterialType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<DocumentViewerItem | null>(null);

  const openDocumentViewer = (url: string, fileName?: string, title?: string) => {
    if (!url) return;
    setActiveDocumentViewer({
      url,
      fileName: fileName || "Support de cours",
      title: title || fileName || "Support de cours",
      subtitle: `${student.first_name || ""} ${student.last_name || ""} • Mes Cours`,
    });
  };

  // Synchroniser le filtre si le paramètre d'URL change en navigation client
  useEffect(() => {
    if (urlSubject) {
      setSelectedSubjectFilter(urlSubject);
    } else if (initialSubjectFilter) {
      setSelectedSubjectFilter(initialSubjectFilter);
    }
  }, [urlSubject, initialSubjectFilter]);

  // Synchronisation Realtime des cours (Zéro Polling)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const reloadMaterials = () => {
      fetchStudentMaterialsAction().then((res) => {
        if (res.success) {
          if (res.data) setMaterials(res.data);
          if (res.subjects && res.subjects.length > 0) setSubjectsList(res.subjects);
        }
      });
    };

    const uniqueChannelName = `student_cours_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_materials" },
        reloadMaterials
      )
      .subscribe();

    const handleOnline = reloadMaterials;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now();
      } else if (document.visibilityState === "visible") {
        if (Date.now() - hiddenSince > 120000) {
          reloadMaterials();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Liste des matières à afficher dans les puces (matières de la classe ou déduites)
  const displaySubjects =
    subjectsList.length > 0
      ? subjectsList
      : classSubjects.length > 0
      ? classSubjects
      : Array.from(
          new Map(
            materials
              .filter((m) => m.subject)
              .map((m) => [m.subject_id, { id: m.subject_id, name: m.subject?.name || "Matière" }])
          ).values()
        );

  const activeSubjectObj = displaySubjects.find((s) => s.id === selectedSubjectFilter);

  const filteredMaterials = materials.filter((m) => {
    if (selectedSubjectFilter !== "all" && m.subject_id !== selectedSubjectFilter) return false;
    if (selectedTypeFilter !== "all" && m.material_type !== selectedTypeFilter) return false;
    if (
      searchQuery &&
      !m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-dark text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Médiathèque &amp; Révisions
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            {activeSubjectObj ? `Supports de Cours : ${activeSubjectObj.name}` : "Mes Supports de Cours & Documents"}
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {activeSubjectObj
              ? `Retrouvez tous les polycopiés, fiches et vidéos partagés par votre professeur de ${activeSubjectObj.name}.`
              : "Téléchargez les fiches de cours en PDF, visionnez les vidéos explicatives et consultez les ressources partagées par vos professeurs."}
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un cours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Bannière de focus matière si filtrée */}
      {activeSubjectObj && (
        <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-turquoise/20 text-teal-dark flex items-center justify-center font-black">
              <BookOpen className="w-5 h-5 text-turquoise" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-teal-dark tracking-wider">
                Matière Sélectionnée
              </div>
              <div className="text-base font-black text-navy">{activeSubjectObj.name}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className="text-xs font-bold text-navy/70 hover:text-navy bg-white px-3.5 py-2 rounded-xl border border-navy/10 hover:border-navy/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Voir toutes les matières</span>
          </button>
        </div>
      )}

      {/* Filtres par Matière */}
      {displaySubjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedSubjectFilter === "all"
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
            }`}
          >
            Toutes les matières ({materials.length})
          </button>
          {displaySubjects.map((sub) => {
            const count = materials.filter((m) => m.subject_id === sub.id).length;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === sub.id
                    ? "bg-turquoise text-white shadow-sm"
                    : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
                }`}
              >
                {sub.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres par format */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedTypeFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedTypeFilter === "all"
              ? "bg-navy/80 text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
          }`}
        >
          Tous les formats
        </button>
        <button
          onClick={() => setSelectedTypeFilter("document")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedTypeFilter === "document"
              ? "bg-orange text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Documents PDF ({materials.filter((m) => (selectedSubjectFilter === "all" || m.subject_id === selectedSubjectFilter) && m.material_type === "document").length})
        </button>
        <button
          onClick={() => setSelectedTypeFilter("video")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedTypeFilter === "video"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Vidéos ({materials.filter((m) => (selectedSubjectFilter === "all" || m.subject_id === selectedSubjectFilter) && m.material_type === "video").length})
        </button>
        <button
          onClick={() => setSelectedTypeFilter("link")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedTypeFilter === "link"
              ? "bg-turquoise text-white shadow-sm"
              : "bg-white text-navy/60 hover:bg-navy/5 border border-navy/5"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Liens utiles ({materials.filter((m) => (selectedSubjectFilter === "all" || m.subject_id === selectedSubjectFilter) && m.material_type === "link").length})
        </button>
      </div>

      {/* Liste des supports */}
      {!hasClass ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-navy">Non inscrit dans une classe</h3>
          <p className="text-xs text-navy/60 max-w-md mx-auto">
            Vous n&apos;êtes pas encore assigné à un groupe de cours. L&apos;administration scolaire doit d&apos;abord vous inscrire dans votre classe.
          </p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-dark flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">
            {activeSubjectObj
              ? `Aucun support disponible en ${activeSubjectObj.name}`
              : "Aucun support de cours pour le moment"}
          </h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            {activeSubjectObj
              ? `Votre professeur d'${activeSubjectObj.name} n'a pas encore publié de polycopiés ou de vidéos. Ils apparaîtront ici dès leur mise en ligne.`
              : "Vos professeurs publieront ici vos polycopiés de cours, fiches de révision et ressources utiles."}
          </p>
          {selectedSubjectFilter !== "all" && (
            <button
              onClick={() => setSelectedSubjectFilter("all")}
              className="bg-navy text-white text-xs font-bold px-6 py-3 rounded-2xl hover:bg-navy/90 cursor-pointer shadow-md transition-all"
            >
              Afficher toutes les matières ({materials.length} supports)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => {
            const createdAtObj = new Date(mat.created_at);

            return (
              <div
                key={mat.id}
                className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                      {mat.subject?.name || "Matière"}
                    </span>
                    <span className="text-xs text-navy/40 font-medium">
                      {createdAtObj.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Type Badge & Titre */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="p-2 rounded-xl bg-blue-vlight/60 text-navy shrink-0 mt-0.5">
                      {mat.material_type === "document" && <FileText className="w-4 h-4 text-orange" />}
                      {mat.material_type === "video" && <Video className="w-4 h-4 text-purple-600" />}
                      {mat.material_type === "link" && <Link2 className="w-4 h-4 text-turquoise" />}
                    </div>
                    <h3 className="font-black text-navy text-base leading-snug">
                      {mat.title}
                    </h3>
                  </div>

                  {mat.description && (
                    <p className="text-xs text-navy/60 line-clamp-3 leading-relaxed mb-4">
                      {mat.description}
                    </p>
                  )}

                  {mat.author && (
                    <div className="text-[11px] text-navy/40 font-medium">
                      Partagé par {mat.author.first_name} {mat.author.last_name}
                    </div>
                  )}
                </div>

                {/* Bouton d'action */}
                <div className="pt-3 border-t border-navy/5">
                  {mat.material_type === "document" && mat.file_url && (
                    <AttachmentActionCard
                      url={mat.file_url}
                      fileName={mat.title}
                      label={mat.subject?.name || "Support de cours"}
                      onView={openDocumentViewer}
                    />
                  )}

                  {mat.material_type === "video" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(mat.external_url || mat.file_url || "", mat.title, mat.subject?.name)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Lire la vidéo</span>
                      </button>
                      <a
                        href={mat.external_url || mat.file_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Lien externe</span>
                      </a>
                    </div>
                  )}

                  {mat.material_type === "link" && mat.external_url && (
                    <a
                      href={mat.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-teal-50 hover:bg-teal-100 text-teal-dark font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-turquoise/20"
                    >
                      <ExternalLink className="w-4 h-4 text-turquoise" />
                      <span>Ouvrir le Lien Web</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📄 Visionneuse de document universelle */}
      <UniversalDocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />
    </div>
  );
}
