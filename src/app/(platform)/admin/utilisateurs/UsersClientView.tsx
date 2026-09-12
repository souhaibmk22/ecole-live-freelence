"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  ShieldAlert,
  GraduationCap,
  Trash2,
  Copy,
  Check,
  X,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Eye,
  UserCheck,
  BookOpen,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  Award,
  Video,
  Phone,
  Edit2,
  Save,
} from "lucide-react";
import { Profile, Role, ROLE_LABEL } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  createUserAccount,
  deleteUserAccount,
  resetUserPassword,
  fetchUserProfileDetailsAction,
  createParentAccountWithStudentsAction,
  fetchAllStudentsWithClassesAction,
  updateParentLinkedStudentsAction,
  updateUserProfileAdminAction,
} from "./actions";
import ReplayPlayer from "@/components/platform/ReplayPlayer";

interface UsersClientViewProps {
  initialProfiles: Profile[];
  callerRole: Role;
  currentUserId: string;
  isServiceRoleKeyMissing: boolean;
  allClasses?: { id: string; name: string; cycle?: string; level?: string }[];
}

export default function UsersClientView({
  initialProfiles,
  callerRole,
  currentUserId,
  isServiceRoleKeyMissing,
  allClasses = [],
}: UsersClientViewProps) {
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const debouncedSearch = useDebounce(searchTerm, 250);

  // Modale de création
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "etudiant",
  });

  // État pour association d'élèves à un parent
  const [availableStudents, setAvailableStudents] = useState<
    { id: string; first_name: string | null; last_name: string | null; email?: string; phone?: string; class_name: string }[]
  >(() =>
    initialProfiles
      .filter((p) => p.role === "etudiant")
      .map((s) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone || "",
        class_name: "Élève",
      }))
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Charger les élèves avec leurs classes
  const loadStudentsForParent = () => {
    setLoadingStudents(true);
    fetchAllStudentsWithClassesAction().then((res) => {
      if (res.success && res.students && res.students.length > 0) {
        setAvailableStudents(res.students);
      } else {
        const localStudents = profiles
          .filter((p) => p.role === "etudiant")
          .map((s) => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            email: s.email,
            phone: s.phone || "",
            class_name: "Élève",
          }));
        if (localStudents.length > 0) {
          setAvailableStudents(localStudents);
        }
      }
      setLoadingStudents(false);
    });
  };

  // Précharger les élèves dès le montage de la page
  useEffect(() => {
    loadStudentsForParent();
  }, []);

  // Modale de confirmation avec mot de passe temporaire
  const [createdUserResult, setCreatedUserResult] = useState<{
    email: string;
    role: Role;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Modale de réinitialisation de mot de passe
  const [resettingUser, setResettingUser] = useState<Profile | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Modale de suppression
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fiche Individuelle de Détails, Modification & Présences
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userDetailsData, setUserDetailsData] = useState<any | null>(null);
  const [selectedReplayUrl, setSelectedReplayUrl] = useState<string | null>(null);
  const [selectedReplayTitle, setSelectedReplayTitle] = useState<string>("");

  // Mode Édition du Profil
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    studentIds: string[];
    classId: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    studentIds: [],
    classId: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const handleViewUserDetails = async (profile: Profile) => {
    setViewingUser(profile);
    setIsEditingUser(false);
    setEditError(null);
    setEditSuccess(null);
    setLoadingDetails(true);
    setUserDetailsData(null);

    setEditFormData({
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      studentIds: [],
      classId: "",
    });

    const res = await fetchUserProfileDetailsAction(profile.id);
    if (res.success && res.data) {
      setUserDetailsData(res.data);
      if (res.data.profile) {
        setEditFormData({
          firstName: res.data.profile.first_name || profile.first_name || "",
          lastName: res.data.profile.last_name || profile.last_name || "",
          email: res.data.profile.email || profile.email || "",
          phone: res.data.profile.phone || profile.phone || "",
          studentIds: res.data.parentData?.linkedStudents
            ? res.data.parentData.linkedStudents.map((s: any) => s.id)
            : [],
          classId: res.data.etudiantData?.enrolledClass?.id || "",
        });
      }
    }
    setLoadingDetails(false);
  };

  // Filtrage des utilisateurs avec recherche debouncée
  const filteredProfiles = profiles.filter((p) => {
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    const email = (p.email || "").toLowerCase();
    const phone = (p.phone || "").toLowerCase();
    const q = debouncedSearch.trim().toLowerCase();

    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      email.includes(q) ||
      phone.includes(q);

    const matchesRole =
      selectedRoleFilter === "all"
        ? true
        : selectedRoleFilter === "admins"
        ? p.role === "admin" || p.role === "super_admin"
        : p.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination intelligente
  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Réinitialiser la page sur changement de filtre ou recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedRoleFilter]);

  // Compteurs
  const countSuperAdmins = profiles.filter((p) => p.role === "super_admin").length;
  const countAdmins = profiles.filter((p) => p.role === "admin").length;
  const countProfs = profiles.filter((p) => p.role === "prof").length;
  const countStudents = profiles.filter((p) => p.role === "etudiant").length;
  const countParents = profiles.filter((p) => p.role === "parent").length;

  const openCreateModal = (presetRole?: Role) => {
    const roleToUse =
      presetRole ||
      (selectedRoleFilter === "parent"
        ? "parent"
        : selectedRoleFilter === "prof"
        ? "prof"
        : "etudiant");
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: roleToUse,
    });
    setSelectedStudentIds([]);
    setCreateError(null);
    setCreateModalOpen(true);
    if (roleToUse === "parent") {
      loadStudentsForParent();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    let res;
    if (formData.role === "parent") {
      res = await createParentAccountWithStudentsAction({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        studentIds: selectedStudentIds,
      });

      if (!res.success) {
        setCreateError(res.error || "Une erreur est survenue lors de la création du compte parent.");
        setCreating(false);
        return;
      }

      if (res.user) {
        setCreatedUserResult({
          email: res.user.email,
          role: res.user.role,
          tempPassword: res.user.tempPassword,
        });

        setProfiles([
          {
            id: res.user.id,
            email: res.user.email,
            phone: formData.phone,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: "parent",
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...profiles,
        ]);

        setCreateModalOpen(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          role: "etudiant",
        });
        setSelectedStudentIds([]);
        setCreating(false);
        return;
      }
    } else {
      res = await createUserAccount({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      });

      if (!res.success) {
        setCreateError(res.error || "Une erreur est survenue.");
        setCreating(false);
        return;
      }

      if (res.data) {
        setCreatedUserResult({
          email: res.data.email,
          role: res.data.role,
          tempPassword: res.data.tempPassword,
        });

        // Mettre à jour l'état local
        setProfiles([
          {
            id: res.data.id,
            email: res.data.email,
            phone: formData.phone,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...profiles,
        ]);

        setCreateModalOpen(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          role: "etudiant",
        });
      }
    }

    setCreating(false);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingUser) return;
    setEditSaving(true);
    setEditError(null);

    const res = await updateUserProfileAdminAction({
      userId: viewingUser.id,
      firstName: editFormData.firstName,
      lastName: editFormData.lastName,
      email: editFormData.email,
      phone: editFormData.phone,
      classId: viewingUser.role === "etudiant" ? editFormData.classId : undefined,
      studentIds: viewingUser.role === "parent" ? editFormData.studentIds : undefined,
    });

    if (!res.success) {
      setEditError(res.error || "Erreur lors de la mise à jour des coordonnées.");
      setEditSaving(false);
      return;
    }

    // Mettre à jour l'état local des profils
    const updatedProfile: Profile = {
      ...viewingUser,
      first_name: editFormData.firstName,
      last_name: editFormData.lastName,
      email: editFormData.email,
      phone: editFormData.phone,
    };

    setProfiles((prev) =>
      prev.map((p) => (p.id === viewingUser.id ? updatedProfile : p))
    );

    setViewingUser(updatedProfile);

    // Rafraîchir les données de la fiche
    const detailsRes = await fetchUserProfileDetailsAction(viewingUser.id);
    if (detailsRes.success && detailsRes.data) {
      setUserDetailsData(detailsRes.data);
    }

    setIsEditingUser(false);
    setEditSaving(false);
    setEditSuccess("Coordonnées et profil mis à jour avec succès !");
    setTimeout(() => setEditSuccess(null), 4000);
  };

  const handleConfirmReset = async () => {
    if (!resettingUser) return;
    setResetLoading(true);

    const res = await resetUserPassword(resettingUser.id);
    if (res.success && res.tempPassword) {
      setResetResult(res.tempPassword);
    } else {
      alert(`Erreur: ${res.error || "Impossible de réinitialiser le mot de passe."}`);
      setResettingUser(null);
    }
    setResetLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);

    const res = await deleteUserAccount(deletingUser.id);
    if (res.success) {
      setProfiles(profiles.filter((p) => p.id !== deletingUser.id));
      setDeletingUser(null);
    } else {
      alert(`Erreur: ${res.error || "Impossible de supprimer l'utilisateur."}`);
    }
    setDeleteLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-orange/15 text-orange border-orange/30";
      case "prof":
        return "bg-turquoise/15 text-teal-dark border-turquoise/30";
      case "parent":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "etudiant":
      default:
        return "bg-sky-100 text-sky-800 border-sky-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Alerte si Service Role Key manquante */}
      {isServiceRoleKeyMissing && (
        <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-navy">Configuration de Sécurité Requise</h4>
            <p className="text-xs text-navy/70 leading-relaxed">
              Pour créer des comptes et réinitialiser les mots de passe de manière autonome, la variable{" "}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-navy">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              doit être renseignée dans votre fichier local{" "}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-navy">
                .env.local
              </code>
              .
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange/10 text-orange text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            Gestion des Utilisateurs
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Comptes &amp; Effectifs Scolaires
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Créez des comptes pour les professeurs, élèves et parents et consultez leurs fiches individuelles.
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-orange hover:bg-orange/90 text-white font-bold text-sm shadow-lg shadow-orange/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-5 h-5" />
          Créer un utilisateur
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-navy/5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button
              onClick={() => setSelectedRoleFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === "all"
                  ? "bg-navy text-white shadow-sm"
                  : "bg-blue-vlight text-navy/70 hover:bg-navy/5"
              }`}
            >
              Tous ({profiles.length})
            </button>
            <button
              onClick={() => setSelectedRoleFilter("prof")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === "prof"
                  ? "bg-teal-dark text-white shadow-sm"
                  : "bg-blue-vlight text-navy/70 hover:bg-navy/5"
              }`}
            >
              Professeurs ({countProfs})
            </button>
            <button
              onClick={() => setSelectedRoleFilter("etudiant")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === "etudiant"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-blue-vlight text-navy/70 hover:bg-navy/5"
              }`}
            >
              Étudiants ({countStudents})
            </button>
            <button
              onClick={() => setSelectedRoleFilter("parent")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === "parent"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-blue-vlight text-navy/70 hover:bg-navy/5"
              }`}
            >
              Parents ({countParents})
            </button>
            {callerRole === "super_admin" && (
              <button
                onClick={() => setSelectedRoleFilter("admins")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRoleFilter === "admins"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-blue-vlight text-navy/70 hover:bg-navy/5"
                }`}
              >
                Admins ({countSuperAdmins + countAdmins})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy placeholder:text-navy/40 focus:border-turquoise focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-navy/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-vlight/60 border-b border-navy/5 text-[11px] font-black uppercase tracking-wider text-navy/50">
                <th className="py-4 px-6">Utilisateur</th>
                <th className="py-4 px-6">Rôle</th>
                <th className="py-4 px-6">Date de création</th>
                <th className="py-4 px-6 text-right">Actions &amp; Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5 text-sm font-medium text-navy">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-navy/40 text-sm">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                paginatedProfiles.map((p) => {
                  const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Sans nom";
                  const initials =
                    p.first_name && p.last_name
                      ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase()
                      : fullName.slice(0, 2).toUpperCase();

                  const isSelf = p.id === currentUserId;

                  return (
                    <tr key={p.id} className="hover:bg-blue-vlight/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-turquoise to-teal-dark text-white font-black flex items-center justify-center text-xs shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-navy flex items-center gap-2">
                              {fullName}
                              {isSelf && (
                                <span className="bg-navy/5 text-navy/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-navy/50">{p.email || "Email masqué"}</div>
                            {p.phone && (
                              <div className="text-[11px] text-teal-dark font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-orange shrink-0" />
                                <span>{p.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getRoleBadgeStyle(
                            p.role
                          )}`}
                        >
                          {ROLE_LABEL[p.role]}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-navy/50">
                        {new Date(p.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* BOUTON VOIR LE PROFIL & LES PRÉSENCES */}
                          <button
                            onClick={() => handleViewUserDetails(p)}
                            title="Consulter le dossier, les classes et les présences"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-turquoise/10 hover:bg-turquoise/20 text-teal-dark font-bold text-xs transition-colors cursor-pointer border border-turquoise/20"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-dark" />
                            <span className="hidden sm:inline">Dossier &amp; Présences</span>
                          </button>

                          <button
                            onClick={() => {
                              setResettingUser(p);
                              setResetResult(null);
                            }}
                            title="Réinitialiser le mot de passe"
                            className="p-2 rounded-xl text-navy/60 hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(p)}
                              title="Supprimer l'utilisateur"
                              className="p-2 rounded-xl text-navy/60 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barre de pagination */}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProfiles.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="utilisateurs"
        />
      </div>

      {/* MODALE 1 : Création d'Utilisateur */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy">Créer un Utilisateur</h3>
                  <p className="text-xs text-navy/60">Génération automatique du mot de passe</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Jean"
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: Dupont"
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean.dupont@monecoleenlive.fr"
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-navy/50" />
                    Téléphone (Optionnel)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: +33 6 12 34 56 78"
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Rôle de l&apos;utilisateur
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as Role;
                    setFormData({ ...formData, role: newRole });
                    if (newRole === "parent") loadStudentsForParent();
                  }}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  <option value="etudiant">Élève / Étudiant</option>
                  <option value="prof">Enseignant / Professeur</option>
                  <option value="parent">Parent d&apos;élève (Suivi multi-enfants)</option>
                  {callerRole === "super_admin" && (
                    <>
                      <option value="admin">Administrateur (Scolarité)</option>
                      <option value="super_admin">Super Administrateur</option>
                    </>
                  )}
                </select>
              </div>

              {/* Sélection multi-élèves pour compte Parent */}
              {formData.role === "parent" && (
                <div className="space-y-2 bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-2xl animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Associer les enfants (Élèves)
                    </label>
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {selectedStudentIds.length} enfant(s) sélectionné(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-950/70">
                    Cochez les élèves dont ce parent pourra suivre la scolarité, les présences et les notes :
                  </p>

                  {/* Recherche d'élève */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-navy/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrer un élève par nom ou classe..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs text-navy focus:outline-none"
                    />
                  </div>

                  {/* Liste des élèves avec cases à cocher */}
                  <div className="max-h-44 overflow-y-auto divide-y divide-emerald-100 bg-white rounded-xl border border-emerald-200/80 p-1">
                    {loadingStudents ? (
                      <div className="p-4 text-center text-xs text-navy/40 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Chargement des élèves...</span>
                      </div>
                    ) : availableStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-navy/50 space-y-2">
                        <p>Aucun élève trouvé.</p>
                        <button
                          type="button"
                          onClick={() => loadStudentsForParent()}
                          className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Recharger la liste des élèves
                        </button>
                      </div>
                    ) : (
                      availableStudents
                        .filter((s) =>
                          `${s.first_name || ""} ${s.last_name || ""} ${s.class_name || ""}`
                            .toLowerCase()
                            .includes(studentSearchTerm.toLowerCase())
                        )
                        .map((s) => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? "bg-emerald-50" : "hover:bg-navy/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                                    } else {
                                      setSelectedStudentIds([...selectedStudentIds, s.id]);
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-bold text-navy truncate">
                                  {s.first_name} {s.last_name}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-teal-dark bg-teal-50 px-2 py-0.5 rounded-full shrink-0">
                                {s.class_name}
                              </span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Création en cours..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2 : Mot de passe temporaire généré */}
      {createdUserResult && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6 text-center">
            <div className="w-14 h-14 rounded-3xl bg-teal-50 text-turquoise flex items-center justify-center mx-auto shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-navy">Compte créé avec succès !</h3>
              <p className="text-xs text-navy/60 mt-1">
                Transmettez ces identifiants à l&apos;utilisateur pour sa première connexion.
              </p>
            </div>

            <div className="p-4 bg-blue-vlight/60 rounded-2xl border border-navy/10 text-left space-y-2">
              <div className="text-xs text-navy/60">
                <span className="font-bold">Email :</span> {createdUserResult.email}
              </div>
              <div className="text-xs text-navy/60">
                <span className="font-bold">Mot de passe temporaire :</span>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-navy/10">
                <span className="font-mono font-black text-sm text-navy">
                  {createdUserResult.tempPassword}
                </span>
                <button
                  onClick={() => copyToClipboard(createdUserResult.tempPassword)}
                  className="p-1.5 rounded-lg hover:bg-navy/5 text-navy/60 hover:text-turquoise transition-colors cursor-pointer"
                  title="Copier le mot de passe"
                >
                  {copied ? <Check className="w-4 h-4 text-teal-dark" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {createdUserResult.role === "parent" && (
              <button
                onClick={() => {
                  const message = `Bonjour, voici vos identifiants pour accéder à l'Espace Parent Mon École en Live :\n\n• Connexion : https://monecoleenligne.vercel.app/login\n• Email : ${createdUserResult.email}\n• Mot de passe : ${createdUserResult.tempPassword}\n\nVous pourrez y suivre l'assiduité, les notes et les devoirs de votre enfant.`;
                  copyToClipboard(message);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? "Message copié !" : "📋 Copier le SMS / Email d'accès pour le parent"}</span>
              </button>
            )}

            <button
              onClick={() => setCreatedUserResult(null)}
              className="w-full bg-navy text-white font-bold text-xs py-3.5 rounded-xl hover:bg-navy/90 transition-colors cursor-pointer"
            >
              J&apos;ai transmis le mot de passe
            </button>
          </div>
        </div>
      )}

      {/* MODALE 3 : Réinitialisation de Mot de Passe */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange flex items-center justify-center">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy">Réinitialiser le mot de passe</h3>
                  <p className="text-xs text-navy/60">
                    {resettingUser.first_name} {resettingUser.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50 border border-turquoise/30 rounded-2xl text-xs text-teal-dark space-y-2">
                  <div className="font-bold">Nouveau mot de passe généré :</div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-turquoise/20">
                    <span className="font-mono font-black text-sm text-navy">{resetResult}</span>
                    <button
                      onClick={() => copyToClipboard(resetResult)}
                      className="p-1.5 rounded-lg hover:bg-navy/5 text-navy/60 hover:text-turquoise cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-teal-dark" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setResettingUser(null)}
                  className="w-full bg-navy text-white font-bold text-xs py-3 rounded-xl"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-navy/70 leading-relaxed">
                  Êtes-vous sûr de vouloir générer un nouveau mot de passe temporaire pour ce compte ? L&apos;ancien mot de passe deviendra immédiatement invalide.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setResettingUser(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmReset}
                    disabled={resetLoading}
                    className="bg-orange text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:bg-orange/90"
                  >
                    {resetLoading ? "Génération..." : "Générer le mot de passe"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE 4 : Confirmation de Suppression */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-black text-navy">Supprimer l&apos;utilisateur ?</h3>
              <p className="text-xs text-navy/60 mt-1">
                Êtes-vous sûr de vouloir supprimer le compte de{" "}
                <span className="font-bold text-navy">
                  {deletingUser.first_name} {deletingUser.last_name}
                </span>{" "}
                ({deletingUser.email || "compte"}) ? Cette action est irréversible.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-5 py-3 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 5 : DOSSIER INDIVIDUEL COMPLET & HISTORIQUE DES PRÉSENCES */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-navy/5 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header de la Fiche */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy/5 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-turquoise to-teal-dark text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  {viewingUser.first_name?.[0]}
                  {viewingUser.last_name?.[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-navy">
                      {viewingUser.first_name} {viewingUser.last_name}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        viewingUser.role
                      )}`}
                    >
                      {ROLE_LABEL[viewingUser.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-navy/60 font-medium flex-wrap mt-0.5">
                    <span>{viewingUser.email || userDetailsData?.profile?.email || "Email masqué"}</span>
                    {(viewingUser.phone || userDetailsData?.profile?.phone) && (
                      <span className="inline-flex items-center gap-1 text-teal-dark font-bold">
                        <Phone className="w-3 h-3 text-orange" />
                        {viewingUser.phone || userDetailsData?.profile?.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingUser) {
                      loadStudentsForParent();
                    }
                    setIsEditingUser(!isEditingUser);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isEditingUser
                      ? "bg-navy/10 text-navy hover:bg-navy/20"
                      : "bg-orange/10 text-orange hover:bg-orange/20 border border-orange/20"
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditingUser ? "Fermer l'édition" : "Modifier / Coordonnées"}</span>
                </button>

                <button
                  onClick={() => {
                    setViewingUser(null);
                    setIsEditingUser(false);
                  }}
                  className="text-navy/40 hover:text-navy p-2 rounded-xl hover:bg-navy/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Feedback de succès / erreur d'édition */}
            {editSuccess && (
              <div className="p-3 bg-teal-50 border border-turquoise/30 rounded-2xl text-xs font-bold text-teal-dark flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-turquoise shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* FORMULAIRE D'ÉDITION DU PROFIL ET DU NUMÉRO DE TÉLÉPHONE */}
            {isEditingUser && (
              <form onSubmit={handleSaveUserEdit} className="p-5 bg-orange/5 border border-orange/20 rounded-3xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-orange-dark flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier les Coordonnées &amp; Informations du Compte
                  </h4>
                  <span className="text-[10px] text-navy/50 font-bold">Mise à jour directe</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-navy/10 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-turquoise"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1">Nom</label>
                    <input
                      type="text"
                      required
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-navy/10 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-turquoise"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1">Adresse Email</label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-navy/10 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-turquoise"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-orange" />
                      Numéro de Téléphone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="Ex: +33 6 12 34 56 78"
                      className="w-full px-3.5 py-2.5 bg-white border border-navy/10 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-turquoise"
                    />
                  </div>
                </div>

                {/* Si Étudiant : Modifier / Assigner la classe */}
                {viewingUser.role === "etudiant" && (
                  <div className="space-y-1.5 bg-blue-vlight/40 p-3.5 rounded-2xl border border-navy/10">
                    <label className="text-xs font-bold text-navy uppercase flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-teal-dark" />
                      Classe assignée à l&apos;élève
                    </label>
                    <select
                      value={editFormData.classId}
                      onChange={(e) => setEditFormData({ ...editFormData, classId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-navy/10 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-turquoise cursor-pointer"
                    >
                      <option value="">-- Aucune classe (Non assigné) --</option>
                      {allClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.cycle ? `(${c.cycle})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-navy/50">
                      L&apos;élève sera automatiquement inscrit aux cours, directs et devoirs de cette classe.
                    </p>
                  </div>
                )}

                {/* Si Parent : Éditer les élèves associés */}
                {viewingUser.role === "parent" && (
                  <div className="space-y-2 bg-white/80 p-3.5 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Enfants (Élèves) rattachés à ce parent
                      </label>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {editFormData.studentIds.length} sélectionné(s)
                      </span>
                    </div>

                    <div className="max-h-36 overflow-y-auto divide-y divide-emerald-50 bg-white rounded-xl border border-emerald-100 p-1">
                      {loadingStudents ? (
                        <div className="p-3 text-center text-xs text-navy/40 flex items-center justify-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>Chargement...</span>
                        </div>
                      ) : availableStudents.length === 0 ? (
                        <div className="p-3 text-center text-xs text-navy/40">Aucun élève trouvé.</div>
                      ) : (
                        availableStudents.map((s) => {
                          const isSelected = editFormData.studentIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? "bg-emerald-50" : "hover:bg-navy/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setEditFormData({
                                        ...editFormData,
                                        studentIds: editFormData.studentIds.filter((id) => id !== s.id),
                                      });
                                    } else {
                                      setEditFormData({
                                        ...editFormData,
                                        studentIds: [...editFormData.studentIds, s.id],
                                      });
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-bold text-navy truncate">
                                  {s.first_name} {s.last_name}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-teal-dark bg-teal-50 px-1.5 py-0.5 rounded-full">
                                {s.class_name}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingUser(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-orange/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {editSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Enregistrer les modifications</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {loadingDetails ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-turquoise animate-spin mx-auto" />
                <p className="text-xs font-bold text-navy/60">
                  Chargement des présences et du dossier scolaire...
                </p>
              </div>
            ) : !userDetailsData ? (
              <div className="py-12 text-center text-xs text-navy/40">
                Impossible de charger les données détaillées.
              </div>
            ) : (
              <div className="space-y-6">
                {/* SI ÉTUDIANT */}
                {viewingUser.role === "etudiant" && userDetailsData.etudiantData && (
                  <div className="space-y-6">
                    {/* Classe de l'élève */}
                    <div className="bg-blue-vlight/60 p-4 rounded-2xl border border-navy/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-teal-dark" />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-navy/50">
                            Classe assignée
                          </div>
                          <div className="text-sm font-bold text-navy">
                            {userDetailsData.etudiantData.enrolledClass
                              ? userDetailsData.etudiantData.enrolledClass.name
                              : "Non encore inscrit dans une classe"}
                          </div>
                        </div>
                      </div>

                      {userDetailsData.etudiantData.enrolledClass && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-dark px-3 py-1 rounded-full border border-turquoise/20">
                          {userDetailsData.etudiantData.enrolledClass.cycle}
                        </span>
                      )}
                    </div>

                    {/* Statistiques d'Assiduité */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-navy/40 block mb-1">
                          Total Cours Délivrés
                        </span>
                        <div className="text-2xl font-black text-navy">
                          {userDetailsData.etudiantData.stats.totalDeliveredSessions}
                        </div>
                        <span className="text-[10px] text-navy/50">Séances enregistrées</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-teal-dark block mb-1">
                          Cours Suivis (Présent)
                        </span>
                        <div className="text-2xl font-black text-turquoise">
                          {userDetailsData.etudiantData.stats.attendedSessions}
                        </div>
                        <span className="text-[10px] text-navy/50">
                          {userDetailsData.etudiantData.stats.absentSessions} absence(s)
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-orange block mb-1">
                          Taux d&apos;Assiduité
                        </span>
                        <div className="text-2xl font-black text-orange">
                          {userDetailsData.etudiantData.stats.presenceRate}%
                        </div>
                        <span className="text-[10px] text-navy/50">Taux de présence effectif</span>
                      </div>
                    </div>

                    {/* Historique Détaillé des Séances et Présences */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-teal-dark" />
                          Feuille d&apos;Émargement Individuelle
                        </h4>
                        <span className="text-[11px] text-navy/50 font-bold">
                          {userDetailsData.etudiantData.sessionsHistory.length} séance(s)
                        </span>
                      </div>

                      <div className="border border-navy/10 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        {userDetailsData.etudiantData.sessionsHistory.length === 0 ? (
                          <div className="p-8 text-center text-xs text-navy/40">
                            Aucune séance pour le moment.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-blue-vlight/60 border-b border-navy/5 text-[10px] font-black uppercase text-navy/50 sticky top-0">
                              <tr>
                                <th className="py-2.5 px-4">Séance &amp; Matière</th>
                                <th className="py-2.5 px-4">Date</th>
                                <th className="py-2.5 px-4">Statut Élève</th>
                                <th className="py-2.5 px-4 text-right">Replay</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/5">
                              {userDetailsData.etudiantData.sessionsHistory.map((sess: any) => {
                                const date = new Date(sess.startTime);
                                const isPresent = sess.present;
                                const isEnded = sess.sessionStatus === "ended";

                                return (
                                  <tr key={sess.sessionId} className="hover:bg-blue-vlight/30">
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-navy">{sess.title}</div>
                                      <div className="text-[10px] text-navy/50">
                                        {sess.subjectName} • {sess.teacherName}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-navy/60 font-medium">
                                      {date.toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                      })}{" "}
                                      à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="py-3 px-4">
                                      {isPresent ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-teal-dark bg-teal-50 border border-turquoise/20 px-2 py-0.5 rounded-full text-[10px]">
                                          <CheckCircle2 className="w-3 h-3 text-turquoise" /> Présent
                                        </span>
                                      ) : isEnded ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[10px]">
                                          <XCircle className="w-3 h-3 text-red-500" /> Absent
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                                          ⏳ Programmé
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {sess.replayUrl ? (
                                        <button
                                          onClick={() => {
                                            setSelectedReplayUrl(sess.replayUrl);
                                            setSelectedReplayTitle(`${sess.subjectName} • ${sess.title}`);
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange/10 hover:bg-orange/20 text-orange font-bold text-[10px] transition-colors cursor-pointer"
                                        >
                                          <Play className="w-3 h-3 fill-orange" /> Replay
                                        </button>
                                      ) : (
                                        <span className="text-navy/30 text-[10px]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Section Devoirs & Relevé de Notes */}
                    <div className="space-y-3 pt-2 border-t border-navy/5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-orange" />
                          Devoirs &amp; Relevé de Notes
                        </h4>
                        {userDetailsData.etudiantData.stats.overallAverage !== null && userDetailsData.etudiantData.stats.overallAverage !== undefined ? (
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
                            Moyenne : {userDetailsData.etudiantData.stats.overallAverage} / 20
                          </span>
                        ) : (
                          <span className="text-[11px] text-navy/40 font-bold">Aucune note enregistrée</span>
                        )}
                      </div>

                      <div className="border border-navy/10 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                        {!userDetailsData.etudiantData.gradesList || userDetailsData.etudiantData.gradesList.length === 0 ? (
                          <div className="p-6 text-center text-xs text-navy/40">
                            Aucun devoir rendu ou noté pour le moment.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-blue-vlight/60 border-b border-navy/5 text-[10px] font-black uppercase text-navy/50 sticky top-0">
                              <tr>
                                <th className="py-2.5 px-4">Devoir &amp; Matière</th>
                                <th className="py-2.5 px-4">Date de Remise</th>
                                <th className="py-2.5 px-4">Note / Barème</th>
                                <th className="py-2.5 px-4 text-right">Appréciation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/5">
                              {userDetailsData.etudiantData.gradesList.map((g: any) => (
                                <tr key={g.id} className="hover:bg-blue-vlight/30">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-navy">{g.assignmentTitle}</div>
                                    <div className="text-[10px] text-navy/50">
                                      {g.subjectName} • {g.teacherName}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-navy/60 font-medium">
                                    {new Date(g.submittedAt).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </td>
                                  <td className="py-3 px-4">
                                    {g.grade !== null && g.grade !== undefined ? (
                                      <span className="inline-flex items-center gap-1 font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-xl text-xs">
                                        <Award className="w-3.5 h-3.5" />
                                        {g.grade} / {g.maxPoints}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full">
                                        En attente de correction
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right text-navy/70 italic text-[11px]">
                                    {g.feedback ? `« ${g.feedback} »` : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SI PROFESSEUR */}
                {viewingUser.role === "prof" && userDetailsData.profData && (
                  <div className="space-y-6">
                    {/* Matières Assignées */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-navy/50 block">
                        Matières &amp; Classes Enseignées ({userDetailsData.profData.assignedSubjects.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {userDetailsData.profData.assignedSubjects.length === 0 ? (
                          <div className="text-xs text-navy/40">Aucune matière assignée pour le moment.</div>
                        ) : (
                          userDetailsData.profData.assignedSubjects.map((sub: any) => (
                            <div
                              key={sub.id}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 border border-turquoise/20 text-xs font-bold text-teal-dark flex items-center gap-1.5"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-turquoise" />
                              <span>{sub.name}</span>
                              <span className="text-[10px] text-navy/50 font-normal">({sub.className})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Statistiques Enseignement */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-navy/40 block mb-1">
                          Séances de Cours
                        </span>
                        <div className="text-2xl font-black text-navy">
                          {userDetailsData.profData.stats.totalSessionsCreated}
                        </div>
                        <span className="text-[10px] text-navy/50">
                          {userDetailsData.profData.stats.totalDeliveredSessions} dispensée(s)
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-orange block mb-1">
                          Replays Vidéos Publiés
                        </span>
                        <div className="text-2xl font-black text-orange">
                          {userDetailsData.profData.stats.totalReplaysCount}
                        </div>
                        <span className="text-[10px] text-navy/50">Vidéos pour les élèves</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-teal-dark block mb-1">
                          Taux Moyen Présence Élèves
                        </span>
                        <div className="text-2xl font-black text-turquoise">
                          {userDetailsData.profData.stats.averageAttendanceRate}%
                        </div>
                        <span className="text-[10px] text-navy/50">Moyenne d&apos;assiduité</span>
                      </div>
                    </div>

                    {/* Historique des Cours Animés */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-orange" />
                          Historique des Cours Dispensés
                        </h4>
                        <span className="text-[11px] text-navy/50 font-bold">
                          {userDetailsData.profData.sessionsHistory.length} cours
                        </span>
                      </div>

                      <div className="border border-navy/10 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        {userDetailsData.profData.sessionsHistory.length === 0 ? (
                          <div className="p-8 text-center text-xs text-navy/40">
                            Aucun cours planifié pour le moment.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-blue-vlight/60 border-b border-navy/5 text-[10px] font-black uppercase text-navy/50 sticky top-0">
                              <tr>
                                <th className="py-2.5 px-4">Titre &amp; Matière</th>
                                <th className="py-2.5 px-4">Date</th>
                                <th className="py-2.5 px-4">Assiduité Élèves</th>
                                <th className="py-2.5 px-4 text-right">Replay</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/5">
                              {userDetailsData.profData.sessionsHistory.map((sess: any) => {
                                const date = new Date(sess.startTime);

                                return (
                                  <tr key={sess.sessionId} className="hover:bg-blue-vlight/30">
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-navy">{sess.title}</div>
                                      <div className="text-[10px] text-navy/50">
                                        {sess.subjectName} • {sess.className}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-navy/60 font-medium">
                                      {date.toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                      })}{" "}
                                      à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                          sess.rate >= 80
                                            ? "bg-teal-50 text-teal-dark"
                                            : sess.rate >= 50
                                            ? "bg-orange/10 text-orange"
                                            : "bg-red-50 text-red-600"
                                        }`}
                                      >
                                        {sess.presentCount} / {sess.totalStudentsCount} ({sess.rate}%)
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {sess.replayUrl ? (
                                        <button
                                          onClick={() => {
                                            setSelectedReplayUrl(sess.replayUrl);
                                            setSelectedReplayTitle(`${sess.subjectName} • ${sess.title}`);
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange/10 hover:bg-orange/20 text-orange font-bold text-[10px] transition-colors cursor-pointer"
                                        >
                                          <Play className="w-3 h-3 fill-orange" /> Replay
                                        </button>
                                      ) : (
                                        <span className="text-navy/30 text-[10px]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SI PARENT */}
                {viewingUser.role === "parent" && userDetailsData.parentData && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-700" />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            Compte Responsable Légal
                          </div>
                          <div className="text-sm font-bold text-navy">
                            {userDetailsData.parentData.linkedStudents?.length || 0} enfant(s) rattaché(s)
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Parent d&apos;élève
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Liste des Enfants Rattachés
                      </h4>

                      {(!userDetailsData.parentData.linkedStudents || userDetailsData.parentData.linkedStudents.length === 0) ? (
                        <div className="p-8 text-center text-xs text-navy/40 bg-blue-vlight/30 rounded-2xl">
                          Aucun élève n&apos;est actuellement rattaché à ce compte parent.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {userDetailsData.parentData.linkedStudents.map((child: any) => (
                            <div
                              key={child.id}
                              className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-2xs flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
                                {child.first_name?.[0]?.toUpperCase() || "E"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-navy truncate">
                                  {child.first_name} {child.last_name}
                                </div>
                                <div className="text-[10px] text-teal-dark font-bold truncate">
                                  Classe : {child.class_name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SI ADMINISTRATEUR OU SUPER ADMIN */}
                {(viewingUser.role === "admin" || viewingUser.role === "super_admin") && (
                  <div className="space-y-6">
                    <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-purple-700" />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                            Niveau d&apos;Accès Système
                          </div>
                          <div className="text-sm font-bold text-navy">
                            {viewingUser.role === "super_admin"
                              ? "Super Administrateur — Accès Intégral & Sécurité Totale"
                              : "Administrateur Scolarité — Gestion Pédagogique"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {ROLE_LABEL[viewingUser.role]}
                      </span>
                    </div>

                    {/* Activités Administratives / Logs récents */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-purple-600" />
                          Journal des Actions Récentes de l&apos;Administrateur
                        </h4>
                        <span className="text-[11px] text-navy/50 font-bold">
                          {userDetailsData.adminData?.logs?.length || 0} action(s)
                        </span>
                      </div>

                      <div className="border border-navy/10 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        {!userDetailsData.adminData?.logs || userDetailsData.adminData.logs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-navy/40">
                            Aucune action enregistrée pour le moment.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-blue-vlight/60 border-b border-navy/5 text-[10px] font-black uppercase text-navy/50 sticky top-0">
                              <tr>
                                <th className="py-2.5 px-4">Action</th>
                                <th className="py-2.5 px-4">Détails</th>
                                <th className="py-2.5 px-4 text-right">Date &amp; Heure</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/5">
                              {userDetailsData.adminData.logs.map((log: any) => {
                                const date = new Date(log.created_at);
                                return (
                                  <tr key={log.id} className="hover:bg-blue-vlight/30">
                                    <td className="py-3 px-4 font-bold text-navy">
                                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-navy/70 text-[11px]">
                                      {JSON.stringify(log.details || {})}
                                    </td>
                                    <td className="py-3 px-4 text-right text-navy/50 text-[10px] font-mono">
                                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à{" "}
                                      {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setViewingUser(null)}
              className="w-full bg-navy hover:bg-navy/90 text-white font-bold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer"
            >
              Fermer le dossier
            </button>
          </div>
        </div>
      )}

      {/* VISIONNEUSE REPLAY DANS LA FICHE */}
      {selectedReplayUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Replay Vidéo de Cours
                </span>
                <h3 className="text-lg font-black text-navy">{selectedReplayTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedReplayUrl(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-video">
              <ReplayPlayer src={selectedReplayUrl} title={selectedReplayTitle} />
            </div>

            <button
              onClick={() => setSelectedReplayUrl(null)}
              className="w-full bg-navy text-white text-xs font-bold py-3 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Fermer la vidéo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
