export type Role = 'super_admin' | 'admin' | 'prof' | 'etudiant' | 'parent';

export const ROLE_HOME: Record<Role, string> = {
  super_admin: '/super-admin',
  admin: '/admin',
  prof: '/prof',
  etudiant: '/etudiant',
  parent: '/parent',
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  prof: 'Professeur',
  etudiant: 'Étudiant',
  parent: "Parent d'élève",
};

export interface ParentStudentRelation {
  id: string;
  parent_id: string;
  student_id: string;
  relationship_type?: string;
  created_at: string;
  student?: Profile;
  student_class?: string;
}

export interface ParentChildInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  class_id?: string;
  class_name?: string;
  attendance_rate?: number;
  pending_assignments_count?: number;
  recent_grade_avg?: number;
}

export interface Profile {
  id: string;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_resource: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
  actor?: Profile;
}

export interface ClassItem {
  id: string;
  name: string;
  level: string;
  cycle: string;
  created_at: string;
  subjects_count?: number;
  students_count?: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  class_id: string;
  is_mandatory: boolean;
  created_at: string;
  teacher?: Profile | null;
  teacher_id?: string;
  teacher_name?: string;
  class_name?: string;
}

export interface EnrollmentItem {
  id: string;
  student_id: string;
  class_id: string;
  created_at: string;
  student?: Profile | null;
}

export interface LiveSession {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_name: string;
  status: 'scheduled' | 'live' | 'ended';
  replay_url?: string | null;
  created_at: string;
  subject?: SubjectItem | null;
  teacher?: Profile | null;
  class_name?: string;
  attendance?: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  present: boolean;
  marked_at: string;
  student?: Profile | null;
}

// Les 19 matières officielles de l'école
export const MANDATORY_SUBJECTS = [
  "Français",
  "Mathématiques",
  "Anglais",
  "Développement personnel",
  "Histoire",
  "Géographie",
  "Droit",
  "Informatique",
];

export const OPTIONAL_SUBJECTS = [
  "Physique",
  "Biologie",
  "Chimie",
  "Langues étrangères",
  "Arts du spectacle",
  "Arts musicaux",
  "Agriculture",
  "Entrepreneuriat",
  "Sports",
  "Arts plastiques",
  "Arts graphiques",
];

export const ALL_19_SUBJECTS = [...MANDATORY_SUBJECTS, ...OPTIONAL_SUBJECTS];

export interface Assignment {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string;
  attachment_url: string | null;
  attachment_name: string | null;
  max_points: number;
  created_at: string;
  solution_url?: string | null;
  solution_name?: string | null;
  solution_text?: string | null;
  solution_published?: boolean;
  subject?: SubjectItem | null;
  teacher?: Profile | null;
  submissions?: Submission[];
  submissions_count?: number;
  graded_count?: number;
  class_name?: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  student_comment?: string | null;
  submitted_at: string;
  grade?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  status: 'submitted' | 'graded' | 'late';
  student?: Profile | null;
  assignment?: Assignment | null;
}

export type MaterialType = 'document' | 'video' | 'link';

export interface CourseMaterial {
  id: string;
  subject_id: string;
  author_id: string | null;
  title: string;
  description: string | null;
  material_type: MaterialType;
  file_url: string | null;
  file_name: string | null;
  file_size?: number | null;
  external_url: string | null;
  created_at: string;
  subject?: SubjectItem | null;
  author?: Profile | null;
  class_name?: string;
}

export type NotificationType =
  | 'assignment'
  | 'grade'
  | 'solution'
  | 'material'
  | 'live'
  | 'message'
  | 'announcement'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export type ConversationType = 'announcement' | 'subject_channel' | 'teachers_team' | 'direct';
export type ChannelScope = 'general' | 'parent_announcements' | 'teachers_team' | 'subject_channel' | 'direct';

export interface ChatConversation {
  id: string;
  type: ConversationType;
  title: string | null;
  class_id?: string | null;
  subject_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  class?: ClassItem | null;
  subject?: SubjectItem | null;
  last_message?: ChatMessage | null;
  unread_count?: number;
  participants?: Profile[];
  channel_scope?: ChannelScope;
  is_readonly_for_members?: boolean;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'seen';

export interface ChatMessageReaction {
  emoji: string;
  count: number;
  user_ids: string[];
  has_reacted?: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
  sender?: Profile | null;
  is_seen?: boolean;
  status?: MessageDeliveryStatus;
  reactions?: ChatMessageReaction[];
}

export type MeetingTargetAudience =
  | 'all_parents'
  | 'class_parents'
  | 'all_teachers'
  | 'class_teachers'
  | 'direction_only'
  | 'custom';

export interface AdminMeeting {
  id: string;
  title: string;
  description?: string | null;
  created_by: string;
  target_audience: MeetingTargetAudience;
  class_id?: string | null;
  room_name: string;
  start_time: string;
  end_time?: string | null;
  status: 'scheduled' | 'live' | 'ended';
  replay_url?: string | null;
  created_at: string;
  creator?: Profile | null;
  class?: ClassItem | null;
  participants?: Profile[];
  is_user_invited?: boolean;
}




