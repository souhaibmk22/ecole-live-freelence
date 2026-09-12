"use client";

import { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  UserCheck,
  UserPlus,
  AlertCircle,
  X,
  Pencil,
  Sparkle,
  Loader2,
} from "lucide-react";
import {
  ClassItem,
  SubjectItem,
  EnrollmentItem,
  Profile,
  ALL_19_SUBJECTS,
  MANDATORY_SUBJECTS,
  OPTIONAL_SUBJECTS,
} from "@/lib/types";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  createSubjectAction,
  deleteSubjectAction,
  populateMissing19SubjectsAction,
  assignTeacherAction,
  enrollStudentAction,
  unenrollStudentAction,
} from "./actions";

interface ClassesClientViewProps {
  initialClasses: ClassItem[];
  initialSubjects: SubjectItem[];
  initialEnrollments: EnrollmentItem[];
  availableTeachers: Profile[];
  availableStudents: Profile[];
}

export default function ClassesClientView({
  initialClasses,
  initialSubjects,
  initialEnrollments,
  availableTeachers,
  availableStudents,
}: ClassesClientViewProps) {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>(initialEnrollments);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes.length > 0 ? classes[0].id : ""
  );
  const [activeTab, setActiveTab] = useState<"subjects" | "students">("subjects");

  // Modale création classe
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("Cycle Découverte — Groupe A");
  const [newClassLevel, setNewClassLevel] = useState("10-11 ans");
  const [newClassCycle, setNewClassCycle] = useState("Cycle Découverte");
  const [populate19, setPopulate19] = useState(true);

  // Modale modification classe
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassLevel, setEditClassLevel] = useState("");
  const [editClassCycle, setEditClassCycle] = useState("");
  const [savingEditClass, setSavingEditClass] = useState(false);

  // Modale création matière
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [selectedSubjectPreset, setSelectedSubjectPreset] = useState<string>("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectMandatory, setNewSubjectMandatory] = useState(true);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [populatingMissing, setPopulatingMissing] = useState(false);

  // Inscription d'élève
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Indicateur d'affectation d'enseignant en direct
  const [assigningSubjectId, setAssigningSubjectId] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classSubjects = subjects.filter((s) => s.class_id === selectedClassId);
  const classEnrollments = enrollments.filter((e) => e.class_id === selectedClassId);

  // Noms des matières déjà existantes dans la classe sélectionnée
  const existingSubjectNames = new Set(
    classSubjects.map((s) => s.name.toLowerCase().trim())
  );

  // Identifier la classe actuelle de chaque élève dans l'école pour garantir l'unicité (1 élève = 1 classe max)
  const studentClassMap: Record<string, { classId: string; className: string }> = {};
  enrollments.forEach((e) => {
    const cls = classes.find((c) => c.id === e.class_id);
    if (cls) {
      studentClassMap[e.student_id] = { classId: cls.id, className: cls.name };
    }
  });

  // Élèves non encore inscrits dans cette classe spécifique
  const enrolledStudentIds = new Set(classEnrollments.map((e) => e.student_id));
  const candidates = availableStudents.filter((s) => !enrolledStudentIds.has(s.id));
  const unassignedStudents = candidates.filter((s) => !studentClassMap[s.id]);
  const assignedOtherStudents = candidates.filter((s) => !!studentClassMap[s.id]);

  // 1. Créer une classe
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClass(true);

    const res = await createClassAction({
      name: newClassName,
      level: newClassLevel,
      cycle: newClassCycle,
      populate19Subjects: populate19,
    });

    if (res.success && res.data) {
      const createdClass: ClassItem = {
        id: res.data.id,
        name: res.data.name,
        level: res.data.level,
        cycle: res.data.cycle,
        created_at: res.data.created_at,
        subjects_count: populate19 ? 19 : 0,
        students_count: 0,
      };

      setClasses([...classes, createdClass]);
      setSelectedClassId(createdClass.id);
      setCreateModalOpen(false);
      window.location.reload();
    } else {
      alert(res.error || "Erreur lors de la création.");
    }
    setCreatingClass(false);
  };

  // 2. Modifier une classe
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setSavingEditClass(true);

    const res = await updateClassAction({
      classId: editingClass.id,
      name: editClassName,
      level: editClassLevel,
      cycle: editClassCycle,
    });

    if (res.success && res.data) {
      setClasses(
        classes.map((c) =>
          c.id === editingClass.id
            ? {
                ...c,
                name: res.data.name,
                level: res.data.level,
                cycle: res.data.cycle,
              }
            : c
        )
      );
      setEditingClass(null);
    } else {
      alert(res.error || "Erreur lors de la modification de la classe.");
    }
    setSavingEditClass(false);
  };

  // 3. Supprimer une classe
  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette classe et ses matières ?")) return;

    const res = await deleteClassAction(classId);
    if (res.success) {
      const nextClasses = classes.filter((c) => c.id !== classId);
      setClasses(nextClasses);
      if (selectedClassId === classId) {
        setSelectedClassId(nextClasses.length > 0 ? nextClasses[0].id : "");
      }
    }
  };

  // 4. Ouvrir la modale d'ajout de matière avec première matière suggérée
  const handleOpenSubjectModal = () => {
    // Trouver la 1ère matière des 19 qui n'est pas encore dans la classe
    const firstAvailable = ALL_19_SUBJECTS.find(
      (name) => !existingSubjectNames.has(name.toLowerCase().trim())
    );

    if (firstAvailable) {
      setSelectedSubjectPreset(firstAvailable);
      setNewSubjectName(firstAvailable);
      setNewSubjectMandatory(MANDATORY_SUBJECTS.includes(firstAvailable));
    } else {
      setSelectedSubjectPreset("CUSTOM");
      setNewSubjectName("");
      setNewSubjectMandatory(false);
    }

    setSubjectModalOpen(true);
  };

  // Changement de matière dans la liste déroulante
  const handleSelectSubjectPreset = (value: string) => {
    setSelectedSubjectPreset(value);
    if (value === "CUSTOM") {
      setNewSubjectName("");
      setNewSubjectMandatory(false);
    } else {
      setNewSubjectName(value);
      setNewSubjectMandatory(MANDATORY_SUBJECTS.includes(value));
    }
  };

  // 5. Ajouter une matière
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setCreatingSubject(true);

    const res = await createSubjectAction({
      classId: selectedClassId,
      name: newSubjectName.trim(),
      isMandatory: newSubjectMandatory,
    });

    if (res.success && res.data) {
      setSubjects([...subjects, res.data]);
      setSubjectModalOpen(false);
      setNewSubjectName("");
    } else {
      alert(res.error || "Erreur lors de l'ajout de la matière.");
    }
    setCreatingSubject(false);
  };

  // 6. Pré-remplir les 19 matières officielles en 1 clic
  const handlePopulateMissing19 = async () => {
    if (!selectedClassId) return;
    setPopulatingMissing(true);

    const res = await populateMissing19SubjectsAction(selectedClassId);
    if (res.success && res.data) {
      setSubjects([...subjects, ...res.data]);
    } else {
      alert(res.error || "Erreur lors du pré-remplissage des matières.");
    }
    setPopulatingMissing(false);
  };

  // 7. Supprimer / Retirer une matière de la classe
  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer la matière « ${subjectName} » de cette classe ?`)) return;

    const res = await deleteSubjectAction(subjectId);
    if (res.success) {
      setSubjects(subjects.filter((s) => s.id !== subjectId));
    } else {
      alert(res.error || "Erreur lors du retrait de la matière.");
    }
  };

  // 8. Affecter un enseignant avec indicateur visuel de chargement
  const handleAssignTeacher = async (subjectId: string, teacherId: string) => {
    setAssigningSubjectId(subjectId);
    try {
      const res = await assignTeacherAction({ subjectId, teacherId });
      if (res.success) {
        setSubjects((prev) =>
          prev.map((s) => (s.id === subjectId ? { ...s, teacher_id: teacherId || undefined } : s))
        );
      } else {
        alert(res.error || "Erreur lors de l'affectation de l'enseignant.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningSubjectId(null);
    }
  };

  // 9. Inscrire ou transférer un élève (Garantit 1 seule classe par élève)
  const handleEnrollStudent = async () => {
    if (!selectedStudentToEnroll) return;
    const studentProfile = availableStudents.find((s) => s.id === selectedStudentToEnroll);
    const studentName = studentProfile
      ? `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim() || studentProfile.email
      : "Cet élève";

    const otherClassInfo = studentClassMap[selectedStudentToEnroll];
    let forceTransfer = false;

    if (otherClassInfo && otherClassInfo.classId !== selectedClassId) {
      const confirmTransfer = confirm(
        `ℹ️ INFORMATION SCOLARITÉ :\n\n${studentName} est actuellement inscrit(e) dans la classe :\n« ${otherClassInfo.className} ».\n\nUn élève ne peut appartenir qu'à UNE SEULE classe à la fois.\n\nSouhaitez-vous transférer ${studentName} vers « ${selectedClass?.name} » ?`
      );
      if (!confirmTransfer) {
        return;
      }
      forceTransfer = true;
    }

    setEnrolling(true);

    const res = await enrollStudentAction({
      classId: selectedClassId,
      studentId: selectedStudentToEnroll,
      forceTransfer,
    });

    if (res.success) {
      const newEnrollment: EnrollmentItem = {
        id: `temp-${Date.now()}`,
        class_id: selectedClassId,
        student_id: selectedStudentToEnroll,
        created_at: new Date().toISOString(),
        student: studentProfile,
      };

      // Si transféré, retirer de l'ancienne classe et inscrire dans la nouvelle
      const cleanEnrollments = enrollments.filter((e) => e.student_id !== selectedStudentToEnroll);
      setEnrollments([...cleanEnrollments, newEnrollment]);
      setSelectedStudentToEnroll("");
    } else {
      alert(res.error || "Erreur d'inscription.");
    }
    setEnrolling(false);
  };

  // 10. Désinscrire un élève
  const handleUnenrollStudent = async (studentId: string) => {
    if (!confirm("Retirer cet élève de la classe ?")) return;

    const res = await unenrollStudentAction({
      classId: selectedClassId,
      studentId,
    });

    if (res.success) {
      setEnrollments(
        enrollments.filter((e) => !(e.class_id === selectedClassId && e.student_id === studentId))
      );
    }
  };

  const mandatorySubjects = classSubjects.filter((s) => s.is_mandatory);
  const optionalSubjects = classSubjects.filter((s) => !s.is_mandatory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-turquoise/10 text-teal-dark text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Organisation Pédagogique
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight">
            Classes &amp; 19 Matières
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Configurez les groupes du Cycle Découverte, affectez les enseignants et inscrivez les élèves (10 max par groupe).
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-orange hover:bg-orange/90 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-orange/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Créer une classe
        </button>
      </div>

      {/* Main Grid: Left Classes List, Right Class Detail */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-navy/5 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-turquoise/10 text-turquoise flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy">Aucune classe pour le moment</h3>
          <p className="text-sm text-navy/60 max-w-md mx-auto">
            Commencez par créer votre première classe de Cycle Découverte (10-11 ans) avec les 19 matières pré-remplies en 1 clic.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-orange text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md"
          >
            Créer la première classe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Classes selector (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy/50 px-2">
              Classes Actives ({classes.length})
            </h3>

            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              const curEnrollments = enrollments.filter((e) => e.class_id === cls.id).length;
              const curSubjects = subjects.filter((s) => s.class_id === cls.id).length;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-white border-orange shadow-lg shadow-orange/10"
                      : "bg-white/80 border-navy/5 hover:border-turquoise/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-navy text-base">{cls.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-teal-dark bg-teal-50 px-2.5 py-0.5 rounded-full">
                          {cls.level}
                        </span>
                        <span className="text-[11px] text-navy/40">{cls.cycle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Bouton Modifier la classe */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClass(cls);
                          setEditClassName(cls.name);
                          setEditClassLevel(cls.level);
                          setEditClassCycle(cls.cycle);
                        }}
                        title="Modifier le nom et les infos de la classe"
                        className="text-navy/30 hover:text-turquoise p-1.5 rounded-lg transition-colors hover:bg-turquoise/10 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Bouton Supprimer la classe */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls.id);
                        }}
                        title="Supprimer la classe"
                        className="text-navy/30 hover:text-red-500 p-1.5 rounded-lg transition-colors hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-navy/5 flex items-center justify-between text-xs text-navy/60">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Users className="w-3.5 h-3.5 text-turquoise" />
                      {curEnrollments} / 10 élèves
                    </span>
                    <span className="font-semibold text-navy/40">{curSubjects} matières</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Class Details (8 cols) */}
          {selectedClass && (
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-navy/5 shadow-sm space-y-6">
              {/* Class Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-navy/5 gap-4">
                <div>
                  <div className="text-xs font-bold text-orange uppercase tracking-wider">
                    {selectedClass.cycle} • {selectedClass.level}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-2xl font-black text-navy">{selectedClass.name}</h2>
                    <button
                      onClick={() => {
                        setEditingClass(selectedClass);
                        setEditClassName(selectedClass.name);
                        setEditClassLevel(selectedClass.level);
                        setEditClassCycle(selectedClass.cycle);
                      }}
                      title="Modifier cette classe"
                      className="p-1.5 rounded-xl text-navy/40 hover:text-turquoise hover:bg-turquoise/10 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-blue-vlight p-1.5 rounded-2xl">
                  <button
                    onClick={() => setActiveTab("subjects")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "subjects"
                        ? "bg-white text-navy shadow-sm"
                        : "text-navy/60 hover:text-navy"
                    }`}
                  >
                    📚 Matières ({classSubjects.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("students")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "students"
                        ? "bg-white text-navy shadow-sm"
                        : "text-navy/60 hover:text-navy"
                    }`}
                  >
                    👥 Élèves ({classEnrollments.length}/10)
                  </button>
                </div>
              </div>

              {/* TAB 1: MATIÈRES & AFFECTATION DES PROFESSEURS */}
              {activeTab === "subjects" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-navy">Programme des Cours</h3>
                      <p className="text-xs text-navy/50">
                        {classSubjects.length} matière(s) configurée(s) pour ce groupe.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Bouton rapide si la classe a moins de 19 matières */}
                      {classSubjects.length < 19 && (
                        <button
                          onClick={handlePopulateMissing19}
                          disabled={populatingMissing}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange/10 hover:bg-orange/20 text-orange text-xs font-bold transition-all cursor-pointer border border-orange/20 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {populatingMissing ? "Ajout..." : "⚡ Compléter avec les 19 Matières"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={handleOpenSubjectModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-vlight hover:bg-turquoise/10 text-xs font-bold text-navy hover:text-teal-dark transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter une matière
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Socle Commun Obligatoire */}
                  {mandatorySubjects.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange">
                        <span className="w-2 h-2 rounded-full bg-orange" />
                        Socle Commun Obligatoire ({mandatorySubjects.length})
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mandatorySubjects.map((sub) => {
                          return (
                            <div
                              key={sub.id}
                              className="bg-blue-vlight/40 border border-navy/5 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-navy text-xs truncate">{sub.name}</div>
                                <span className="text-[10px] font-black uppercase text-orange tracking-wider">
                                  Obligatoire
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {assigningSubjectId === sub.id ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-turquoise/10 border border-turquoise/20 rounded-xl text-teal-dark text-xs font-bold">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-turquoise" />
                                    <span>Enregistrement...</span>
                                  </div>
                                ) : (
                                  <select
                                    value={sub.teacher_id || ""}
                                    onChange={(e) => handleAssignTeacher(sub.id, e.target.value)}
                                    className="text-xs font-medium text-navy bg-white border border-navy/10 rounded-xl px-2.5 py-1.5 outline-none focus:border-turquoise cursor-pointer max-w-[140px] truncate transition-all shadow-2xs hover:border-navy/30"
                                  >
                                    <option value="">Non assigné</option>
                                    {availableTeachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.first_name} {t.last_name}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                  className="text-navy/30 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Retirer cette matière de la classe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Matières Optionnelles & Spécialités */}
                  {optionalSubjects.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-navy/5">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-dark">
                        <span className="w-2 h-2 rounded-full bg-turquoise" />
                        Matières Optionnelles &amp; Spécialités ({optionalSubjects.length})
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {optionalSubjects.map((sub) => {
                          return (
                            <div
                              key={sub.id}
                              className="bg-blue-vlight/40 border border-navy/5 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-navy text-xs truncate">{sub.name}</div>
                                <span className="text-[10px] font-black uppercase text-teal-dark tracking-wider">
                                  Optionnelle
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {assigningSubjectId === sub.id ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-turquoise/10 border border-turquoise/20 rounded-xl text-teal-dark text-xs font-bold">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-turquoise" />
                                    <span>Enregistrement...</span>
                                  </div>
                                ) : (
                                  <select
                                    value={sub.teacher_id || ""}
                                    onChange={(e) => handleAssignTeacher(sub.id, e.target.value)}
                                    className="text-xs font-medium text-navy bg-white border border-navy/10 rounded-xl px-2.5 py-1.5 outline-none focus:border-turquoise cursor-pointer max-w-[140px] truncate transition-all shadow-2xs hover:border-navy/30"
                                  >
                                    <option value="">Non assigné</option>
                                    {availableTeachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.first_name} {t.last_name}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                                  className="text-navy/30 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Retirer cette matière de la classe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {classSubjects.length === 0 && (
                    <div className="p-8 text-center bg-blue-vlight/30 rounded-2xl border border-navy/5 text-xs text-navy/50 space-y-2">
                      <p>Aucune matière n&apos;est encore configurée pour cette classe.</p>
                      <button
                        onClick={handlePopulateMissing19}
                        className="text-orange font-bold hover:underline cursor-pointer"
                      >
                        ⚡ Pré-remplir les 19 matières officielles en 1 clic
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INSCRIPTION DES ÉLÈVES (MAX 10) */}
              {activeTab === "students" && (
                <div className="space-y-6">
                  {/* Enroll Form */}
                  <div className="bg-blue-vlight/60 p-5 rounded-3xl border border-navy/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-navy">Inscrire un élève</h3>
                      <p className="text-xs text-navy/50">
                        {classEnrollments.length} élève(s) inscrit(s) sur 10 places max.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={selectedStudentToEnroll}
                        onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                        disabled={classEnrollments.length >= 10 || candidates.length === 0}
                        className="bg-white border border-navy/10 rounded-xl px-3 py-2 text-xs font-medium text-navy focus:border-turquoise outline-none w-full sm:w-72 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">
                          {candidates.length === 0
                            ? "Tous les élèves sont déjà dans cette classe"
                            : "Sélectionner un élève à inscrire..."}
                        </option>

                        {unassignedStudents.length > 0 && (
                          <optgroup label="🟢 Élèves disponibles (Sans classe)">
                            {unassignedStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.first_name} {s.last_name} ({s.email || "élève"})
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {assignedOtherStudents.length > 0 && (
                          <optgroup label="🔄 Élèves déjà inscrits ailleurs (Transfert de classe)">
                            {assignedOtherStudents.map((s) => {
                              const currentClass = studentClassMap[s.id]?.className || "Autre classe";
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.first_name} {s.last_name} — (Inscrit dans {currentClass} ➔ Transférer)
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>

                      <button
                        onClick={handleEnrollStudent}
                        disabled={
                          !selectedStudentToEnroll ||
                          classEnrollments.length >= 10 ||
                          enrolling
                        }
                        className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {enrolling
                          ? "En cours..."
                          : studentClassMap[selectedStudentToEnroll]
                          ? "Transférer"
                          : "Inscrire"}
                      </button>
                    </div>
                  </div>

                  {/* List of Enrolled Students */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy/50 px-1">
                      Élèves inscrits dans le groupe ({classEnrollments.length}/10)
                    </h4>

                    {classEnrollments.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-navy/5 text-xs text-navy/40">
                        Aucun élève inscrit dans cette classe pour le moment.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {classEnrollments.map((enr) => {
                          const student = enr.student;
                          const name = student
                            ? `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email
                            : "Élève";
                          const initials =
                            student?.first_name && student?.last_name
                              ? `${student.first_name[0]}${student.last_name[0]}`.toUpperCase()
                              : "EL";

                          return (
                            <div
                              key={enr.student_id}
                              className="bg-white p-3.5 rounded-2xl border border-navy/5 shadow-sm flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-vlight text-navy font-bold flex items-center justify-center text-xs">
                                  {initials}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-navy">{name}</div>
                                  <div className="text-[10px] text-navy/50">
                                    {student?.email || "Inscrit"}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleUnenrollStudent(enr.student_id)}
                                title="Retirer de la classe"
                                className="text-navy/30 hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODALE : Créer une classe */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Organisation Pédagogique
                </span>
                <h3 className="text-xl font-black text-navy">Créer une Nouvelle Classe</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Nom de la Classe / Groupe
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: Cycle Découverte — Groupe A"
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Cycle
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassCycle}
                    onChange={(e) => setNewClassCycle(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Niveau / Âge
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Case 19 matières automatiques */}
              <div className="bg-teal-50 border border-turquoise/30 rounded-2xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="pop19"
                  checked={populate19}
                  onChange={(e) => setPopulate19(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-turquoise focus:ring-turquoise accent-turquoise cursor-pointer"
                />
                <label htmlFor="pop19" className="text-xs text-navy cursor-pointer">
                  <span className="font-bold text-teal-dark block">
                    Pré-remplir les 19 Matières Officielles en 1 clic
                  </span>
                  <span className="text-[11px] text-navy/60 mt-0.5 block">
                    8 matières du Socle Commun (Français, Maths, etc.) + 11 spécialités optionnelles.
                  </span>
                </label>
              </div>

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
                  disabled={creatingClass}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creatingClass ? "Création..." : "Créer la classe ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : Modifier une classe */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-turquoise">
                  Configuration de la Classe
                </span>
                <h3 className="text-xl font-black text-navy">Modifier la Classe</h3>
              </div>
              <button
                onClick={() => setEditingClass(null)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer hover:bg-navy/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Nom de la Classe / Groupe
                </label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  placeholder="Ex: Cycle Découverte — Groupe A"
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Cycle
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassCycle}
                    onChange={(e) => setEditClassCycle(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Niveau / Âge
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassLevel}
                    onChange={(e) => setEditClassLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-sm font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEditClass}
                  className="bg-turquoise hover:bg-turquoise/90 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-turquoise/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEditClass ? "Enregistrement..." : "Enregistrer les modifications ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : Ajouter une matière avec proposition des 19 matières officielles */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange">
                  Programme Scolaire
                </span>
                <h3 className="text-xl font-black text-navy">Ajouter une Matière</h3>
              </div>
              <button
                onClick={() => setSubjectModalOpen(false)}
                className="text-navy/40 hover:text-navy p-2 rounded-xl cursor-pointer hover:bg-navy/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              {/* Choix parmi les 19 Matières Officielles de l'école */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                  Sélectionner parmi les 19 Matières du Programme
                </label>
                <select
                  value={selectedSubjectPreset}
                  onChange={(e) => handleSelectSubjectPreset(e.target.value)}
                  className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-bold text-navy focus:border-turquoise focus:bg-white outline-none cursor-pointer"
                >
                  <optgroup label="📚 Socle Commun Obligatoire (8)">
                    {MANDATORY_SUBJECTS.map((name) => {
                      const alreadyInClass = existingSubjectNames.has(name.toLowerCase().trim());
                      return (
                        <option key={name} value={name} disabled={alreadyInClass}>
                          {name} {alreadyInClass ? "(Déjà ajoutée)" : "— Obligatoire"}
                        </option>
                      );
                    })}
                  </optgroup>

                  <optgroup label="🎨 Matières Optionnelles & Spécialités (11)">
                    {OPTIONAL_SUBJECTS.map((name) => {
                      const alreadyInClass = existingSubjectNames.has(name.toLowerCase().trim());
                      return (
                        <option key={name} value={name} disabled={alreadyInClass}>
                          {name} {alreadyInClass ? "(Déjà ajoutée)" : "— Optionnelle"}
                        </option>
                      );
                    })}
                  </optgroup>

                  <optgroup label="✨ Personnalisée">
                    <option value="CUSTOM">✏️ Autre matière sur-mesure...</option>
                  </optgroup>
                </select>
              </div>

              {/* Champ personnalisé si "CUSTOM" est choisi */}
              {selectedSubjectPreset === "CUSTOM" && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">
                    Nom de la Matière Personnalisée
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Robotique, Espagnol, Échecs..."
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-vlight/60 border border-navy/10 rounded-xl text-xs font-medium text-navy focus:border-turquoise focus:bg-white outline-none"
                  />
                </div>
              )}

              {/* Case obligatoire / optionnelle */}
              <div className="bg-blue-vlight/40 border border-navy/5 rounded-2xl p-3.5 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isMand"
                  checked={newSubjectMandatory}
                  onChange={(e) => setNewSubjectMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-orange focus:ring-orange accent-orange cursor-pointer"
                />
                <label htmlFor="isMand" className="text-xs font-bold text-navy cursor-pointer">
                  Matière obligatoire (Socle Commun)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-navy/5">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-navy/60 hover:bg-navy/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingSubject || !newSubjectName.trim()}
                  className="bg-orange hover:bg-orange/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-orange/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creatingSubject ? "Ajout..." : "Ajouter la matière ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
