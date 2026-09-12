"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  FileText,
  Video,
  Link2,
  Download,
  ExternalLink,
  Trash2,
  X,
  UploadCloud,
  Loader2,
  Calendar,
  Sparkles,
  Play,
  FileDown,
  Camera,
  Search,
  GraduationCap,
  Filter,
  Check,
  RotateCcw,
  Layers,
} from "lucide-react";
import { CourseMaterial, MaterialType, Profile, SubjectItem } from "@/lib/types";
import { createMaterialAction, deleteMaterialAction, fetchTeacherMaterialsAction } from "./actions";
import CameraCaptureModal from "@/components/platform/CameraCaptureModal";
import UniversalDocumentViewerModal, { DocumentViewerItem } from "@/components/platform/UniversalDocumentViewerModal";
import AttachmentActionCard from "@/components/platform/AttachmentActionCard";

import { createClient } from "@/lib/supabase/client";

interface ProfCoursClientViewProps {
  teacher: Profile;
  assignedSubjects: SubjectItem[];
  initialMaterials: CourseMaterial[];
  allClasses?: { id: string; name: string }[];
}

export default function ProfCoursClientView({
  teacher,
  assignedSubjects,
  initialMaterials,
  allClasses = [],
}: ProfCoursClientViewProps) {
  const isAdmin = teacher.role === "admin" || teacher.role === "super_admin";

  const [materials, setMaterials] = useState<CourseMaterial[]>(initialMaterials);
  const [activeDocumentViewer, setActiveDocumentViewer] = useState<DocumentViewerItem | null>(null);

  const openDocumentViewer = (url: string, fileName?: string, title?: string) => {
    if (!url) return;
    setActiveDocumentViewer({
      url,
      fileName: fileName || "Support de cours",
      title: title || fileName || "Support de cours",
      subtitle: `${teacher.first_name || ""} ${teacher.last_name || ""} • Espace Enseignant`,
    });
  };

  // Synchronisation Realtime des cours (Zéro Polling)
  useEffect(() => {
    const supabase = createClient();
    let hiddenSince = 0;

    const reloadMaterials = () => {
      fetchTeacherMaterialsAction().then((res) => {
        if (res.success && res.data) setMaterials(res.data);
      });
    };

    const uniqueChannelName = `prof_cours_${Math.random().toString(36).substring(2, 9)}`;
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

  // Extraire les classes uniques
  const distinctClasses =
    allClasses.length > 0
      ? allClasses
      : Array.from(
          new Map(
            assignedSubjects
              .filter((s) => s.class_id && s.class_name)
              .map((s) => [s.class_id, { id: s.class_id, name: s.class_name }])
          ).values()
        );

  // Modale de création
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedModalClassId, setSelectedModalClassId] = useState(
    distinctClasses.length > 0 ? distinctClasses[0].id : ""
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    assignedSubjects.length > 0 ? assignedSubjects[0].id : ""
  );
  const [materialType, setMaterialType] = useState<MaterialType>("document");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filtres principaux
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | MaterialType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const hasActiveFilters =
    selectedClassFilter !== "all" ||
    selectedSubjectFilter !== "all" ||
    selectedTypeFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setSelectedClassFilter("all");
    setSelectedSubjectFilter("all");
    setSelectedTypeFilter("all");
    setSearchQuery("");
  };

  // Matières disponibles pour le filtre selon la classe sélectionnée
  const distinctSubjectNames = Array.from(
    new Set(assignedSubjects.map((s) => s.name.trim()))
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const availableSubjectsInSelectedClass =
    selectedClassFilter === "all"
      ? []
      : assignedSubjects.filter((s) => s.class_id === selectedClassFilter);

  // Matières disponibles dans la modale selon la classe choisie
  const availableSubjectsForModal = assignedSubjects.filter(
    (s) => s.class_id === selectedModalClassId
  );

  // Mise à jour de la matière dans la modale quand la classe change
  const handleModalClassChange = (classId: string) => {
    setSelectedModalClassId(classId);
    const subjectsInClass = assignedSubjects.filter((s) => s.class_id === classId);
    if (subjectsInClass.length > 0) {
      setSelectedSubjectId(subjectsInClass[0].id);
    } else {
      setSelectedSubjectId("");
    }
  };

  const filteredMaterials = materials.filter((m) => {
    // Filtre par classe
    if (selectedClassFilter !== "all") {
      const sub = assignedSubjects.find((s) => s.id === m.subject_id);
      if (sub && sub.class_id !== selectedClassFilter) return false;
    }
    // Filtre par matière
    if (selectedSubjectFilter !== "all") {
      if (selectedClassFilter === "all") {
        // Filtre par nom de matière distinct
        const subName = m.subject?.name || assignedSubjects.find((s) => s.id === m.subject_id)?.name;
        if (subName !== selectedSubjectFilter) return false;
      } else {
        // Filtre par ID de matière spécifique dans la classe
        if (m.subject_id !== selectedSubjectFilter) return false;
      }
    }
    // Filtre par type/format
    if (selectedTypeFilter !== "all" && m.material_type !== selectedTypeFilter) return false;
    // Filtre de recherche textuelle
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchSub = m.subject?.name?.toLowerCase().includes(q);
      const matchClass = m.class_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSub && !matchClass) return false;
    }
    return true;
  });

  // Nom de la classe et matière actuellement filtrée
  const currentFilteredClassObj = distinctClasses.find((c) => c.id === selectedClassFilter);
  const currentFilteredSubjectObj = assignedSubjects.find((s) => s.id === selectedSubjectFilter);

  // 1. Publier une ressource
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId) return;
    setCreating(true);

    let fileUrl = "";
    let fileName = "";
    let fileSize = 0;

    if (materialType === "document" || (materialType === "video" && uploadFile)) {
      if (uploadFile) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", uploadFile);
          formData.append("folder", "course_materials");
          formData.append("assignmentId", selectedSubjectId);

          const res = await fetch("/api/assignments/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.success) {
            fileUrl = data.fileUrl;
            fileName = data.fileName;
            fileSize = data.fileSize;
          }
        } catch (uploadErr) {
          console.error("Material upload error:", uploadErr);
        } finally {
          setUploading(false);
        }
      }
    }

    const res = await createMaterialAction({
      subjectId: selectedSubjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      materialType,
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      externalUrl: externalUrl.trim() || undefined,
    });

    if (res.success && res.data) {
      const subjectObj = assignedSubjects.find((s) => s.id === selectedSubjectId);
      const newMaterial: CourseMaterial = {
        id: res.data.id,
        subject_id: res.data.subject_id,
        author_id: res.data.author_id,
        title: res.data.title,
        description: res.data.description,
        material_type: res.data.material_type,
        file_url: res.data.file_url,
        file_name: res.data.file_name,
        file_size: res.data.file_size,
        external_url: res.data.external_url,
        created_at: res.data.created_at,
        subject: subjectObj,
        author: teacher,
        class_name: subjectObj?.class_name || "Classe",
      };

      setMaterials([newMaterial, ...materials]);
      setCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setExternalUrl("");
      setUploadFile(null);
    } else {
      alert(res.error || "Erreur lors de la publication du support.");
    }
    setCreating(false);
  };

  // 2. Supprimer une ressource
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce support de cours ?")) return;

    const res = await deleteMaterialAction(materialId);
    if (res.success) {
      setMaterials(materials.filter((m) => m.id !== materialId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-dark text-xs font-black uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            {isAdmin ? "Supervision Médiathèque & Ressources" : "Médiathèque Pédagogique"}
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Supports de Cours &amp; Documents
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {isAdmin
              ? "Supervisez et consultez l'ensemble des polycopiés PDF, fiches et vidéos classés par classe et matière."
              : "Publiez des polycopiés PDF, fiches de révision, vidéos explicatives et liens utiles pour vos élèves."}
          </p>
        </div>

        <button
          onClick={() => {
            if (distinctClasses.length > 0) {
              handleModalClassChange(distinctClasses[0].id);
            }
            setCreateModalOpen(true);
          }}
          disabled={assignedSubjects.length === 0}
          className="bg-turquoise hover:bg-turquoise/90 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-turquoise/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Publier un support
        </button>
      </div>

      {/* HUB DE FILTRAGE & RECHERCHE PÉDAGOGIQUE AVANCÉ */}
      <div className="bg-white rounded-3xl p-6 border border-navy/5 shadow-sm space-y-5">
        {/* Titre du Hub & Bouton Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-turquoise" />
            <h3 className="text-sm font-black text-navy uppercase tracking-wider">
              Filtres &amp; Recherche par Classe et Matière
            </h3>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-xs font-bold text-orange hover:text-orange/80 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto bg-orange/5 px-3 py-1 rounded-xl border border-orange/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>

        {/* Ligne 1 : Classe, Matière et Recherche */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          {/* 1. Sélecteur de Classe */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-navy/70" />
              <span>1. Choisir une Classe</span>
            </label>
            <div className="relative">
              <select
                value={selectedClassFilter}
                onChange={(e) => {
                  setSelectedClassFilter(e.target.value);
                  setSelectedSubjectFilter("all");
                }}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all border outline-none cursor-pointer appearance-none ${
                  selectedClassFilter !== "all"
                    ? "bg-teal-50/70 border-turquoise text-teal-dark font-black shadow-xs"
                    : "bg-blue-vlight/40 border-navy/10 text-navy hover:border-navy/20"
                }`}
              >
                <option value="all">🏫 Toutes les classes</option>
                {distinctClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Sélecteur de Matière */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-turquoise" />
              <span>2. Choisir une Matière</span>
            </label>
            <div className="relative">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all border outline-none cursor-pointer appearance-none ${
                  selectedSubjectFilter !== "all"
                    ? "bg-teal-50/70 border-turquoise text-teal-dark font-black shadow-xs"
                    : "bg-blue-vlight/40 border-navy/10 text-navy hover:border-navy/20"
                }`}
              >
                <option value="all">
                  {selectedClassFilter === "all"
                    ? "📚 Toutes mes matières"
                    : "📚 Toutes les matières de la classe"}
                </option>
                {selectedClassFilter === "all"
                  ? distinctSubjectNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  : availableSubjectsInSelectedClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 3. Recherche textuelle */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-navy/60 uppercase mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-navy/40" />
              <span>3. Recherche Instantanée</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Titre, polycopié, auteur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-3 bg-blue-vlight/40 border border-navy/10 rounded-2xl text-xs font-medium text-navy placeholder:text-navy/40 outline-none focus:border-turquoise focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ligne 2 : Pilules de format & Compteur */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-navy/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedTypeFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedTypeFilter === "all"
                  ? "bg-navy text-white shadow-xs"
                  : "bg-blue-vlight/50 text-navy/60 hover:bg-navy/5"
              }`}
            >
              Tous les formats ({materials.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter("document")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedTypeFilter === "document"
                  ? "bg-orange text-white shadow-xs"
                  : "bg-blue-vlight/50 text-navy/60 hover:bg-navy/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Documents PDF ({materials.filter((m) => m.material_type === "document").length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter("video")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedTypeFilter === "video"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-blue-vlight/50 text-navy/60 hover:bg-navy/5"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Vidéos ({materials.filter((m) => m.material_type === "video").length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter("link")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedTypeFilter === "link"
                  ? "bg-turquoise text-white shadow-xs"
                  : "bg-blue-vlight/50 text-navy/60 hover:bg-navy/5"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Liens web ({materials.filter((m) => m.material_type === "link").length})
            </button>
          </div>

          <div className="text-xs font-bold text-navy/60 shrink-0 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-turquoise"></span>
            <span>
              <strong>{filteredMaterials.length}</strong> support(s) affiché(s)
            </span>
          </div>
        </div>
      </div>

      {/* Grille des Supports de Cours */}
      {assignedSubjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-navy">Aucune matière disponible</h3>
          <p className="text-xs text-navy/60 max-w-md mx-auto">
            Créez d&apos;abord des classes et des matières dans l&apos;administration pour pouvoir publier des supports de cours.
          </p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 text-turquoise flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">
            {hasActiveFilters
              ? `Aucun support trouvé pour ces critères de recherche`
              : "Aucun support de cours pour le moment"}
          </h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            {hasActiveFilters
              ? `Aucun document ne correspond à la classe ${
                  currentFilteredClassObj ? `« ${currentFilteredClassObj.name} »` : ""
                } ${
                  currentFilteredSubjectObj ? `et la matière « ${currentFilteredSubjectObj.name} »` : ""
                }.`
              : "Partagez vos premiers polycopiés, fiches de révision ou vidéos explicatives avec vos élèves."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="bg-navy text-white font-bold text-xs px-5 py-2.5 rounded-2xl hover:bg-navy/90 cursor-pointer transition-all"
              >
                Afficher tous les supports ({materials.length})
              </button>
            )}
            <button
              onClick={() => {
                if (distinctClasses.length > 0) {
                  handleModalClassChange(distinctClasses[0].id);
                }
                setCreateModalOpen(true);
              }}
              className="bg-turquoise text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-md cursor-pointer hover:bg-turquoise/90 transition-all"
            >
              + Publier un support
            </button>
          </div>
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
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                        {mat.subject?.name || "Matière"}
                      </span>
                      <span className="text-[11px] font-bold text-navy/60 bg-navy/5 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-navy/40" />
                        <span>{mat.class_name}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteMaterial(mat.id)}
                      className="text-navy/30 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer la ressource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

                  <div className="space-y-1.5 text-xs text-navy/50">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-navy/40" />
                      <span>
                        Publié le{" "}
                        {createdAtObj.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {mat.author && (
                      <div className="text-[11px] text-navy/40">
                        Par {mat.author.first_name} {mat.author.last_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton d'action direct */}
                <div className="pt-3 border-t border-navy/5">
                  {mat.material_type === "document" && mat.file_url && (
                    <AttachmentActionCard
                      url={mat.file_url}
                      fileName={mat.title}
                      label={`${mat.subject?.name || "Support"} • ${mat.class_name}`}
                      onView={openDocumentViewer}
                    />
                  )}

                  {mat.material_type === "video" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openDocumentViewer(mat.external_url || mat.file_url || "", mat.title, `${mat.subject?.name} • ${mat.class_name}`)}
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
                      <span>Accéder au Lien Web</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE : Publier un support de cours (Sélection Classe -> Matière) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Médiathèque Pédagogique
                </span>
                <h3 className="text-xl font-black text-navy">Publier un Support de Cours</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              {/* Étape 1 : Choisir la Classe */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-navy/70" />
                  <span>1. Classe ciblée</span>
                </label>
                <select
                  value={selectedModalClassId}
                  onChange={(e) => handleModalClassChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {distinctClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Étape 2 : Choisir la Matière de cette Classe */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-turquoise" />
                  <span>2. Matière</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  {availableSubjectsForModal.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de ressource */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Type de Support
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaterialType("document")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      materialType === "document"
                        ? "bg-orange/10 border-orange text-orange shadow-xs"
                        : "bg-blue-vlight/40 border-navy/5 text-navy/60 hover:border-navy/20"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Document PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialType("video")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      materialType === "video"
                        ? "bg-purple-500/10 border-purple-500 text-purple-700 shadow-xs"
                        : "bg-blue-vlight/40 border-navy/5 text-navy/60 hover:border-navy/20"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Vidéo / Tuto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialType("link")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      materialType === "link"
                        ? "bg-teal-50 border-turquoise text-teal-dark shadow-xs"
                        : "bg-blue-vlight/40 border-navy/5 text-navy/60 hover:border-navy/20"
                    }`}
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Lien Web</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Titre du Support
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polycopié de cours : Les équations du second degré"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Description / Consignes de révision
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: À lire attentivement avant le prochain cours en direct..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none resize-none"
                />
              </div>

              {/* Fichier (PDF ou Vidéo ou Photo) */}
              {(materialType === "document" || materialType === "video") && (
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Fichier du cours ou Photo (.pdf, .docx, photo)
                  </label>

                  {uploadFile ? (
                    <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-teal-dark shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-navy truncate">{uploadFile.name}</div>
                          <div className="text-[10px] text-navy/50">{(uploadFile.size / 1024).toFixed(1)} Ko</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="text-navy/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Changer de fichier"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className="border-2 border-dashed border-navy/15 hover:border-turquoise bg-blue-vlight/40 hover:bg-blue-vlight/80 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all">
                        <UploadCloud className="w-4 h-4 text-turquoise" />
                        <span className="text-xs font-bold text-navy">Choisir un fichier</span>
                        <span className="text-[10px] text-navy/40">PDF, Word, MP4</span>
                        <input
                          type="file"
                          accept={materialType === "document" ? ".pdf,.docx,.doc,.ppt,.pptx,.png,.jpg" : "video/*,.pdf"}
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="border-2 border-dashed border-orange/30 hover:border-orange bg-orange/5 hover:bg-orange/10 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all text-orange"
                      >
                        <Camera className="w-4 h-4 text-orange" />
                        <span className="text-xs font-bold">Prendre en photo 📸</span>
                        <span className="text-[10px] text-orange/70">Fiche de cours</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Lien URL (si Lien Web ou Vidéo externe) */}
              {(materialType === "link" || materialType === "video") && (
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Lien Externe (YouTube, Drive, Site web...)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || uploading || !title.trim()}
                  className="bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-turquoise/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {creating || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <span>Publier le support ➔</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CAMERA SCANNER */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => setUploadFile(file)}
        title="Prendre en photo une fiche de cours"
      />

      {/* 📄 Visionneuse Universelle de Documents */}
      <UniversalDocumentViewerModal
        document={activeDocumentViewer}
        onClose={() => setActiveDocumentViewer(null)}
      />
    </div>
  );
}
