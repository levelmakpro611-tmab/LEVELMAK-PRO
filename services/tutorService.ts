import { supabase } from './supabase';
import { Teacher, TeacherRating } from '../types';

/**
 * Service pour la gestion du Hub des Enseignants (Tuteurs et Bénévoles)
 */

// ======================================================
// 1. Inscription & Profil
// ======================================================

/**
 * Soumet une candidature pour devenir enseignant
 */
export const applyAsTeacher = async (
  userId: string,
  teacherData: Omit<Teacher, 'id' | 'status' | 'ratingAvg' | 'ratingCount' | 'createdAt' | 'isAvailable'>,
  proofFiles: File[],
  avatarFile?: File
): Promise<{ data: Teacher | null; error: any }> => {
  try {
    // 1. Créer l'entrée dans la table 'teachers'
    const newTeacher: any = {
      user_id: userId,
      name: `${teacherData.firstName} ${teacherData.lastName}`,
      first_name: teacherData.firstName,
      last_name: teacherData.lastName,
      bio: teacherData.bio,
      whatsapp_number: teacherData.whatsappNumber,
      city: teacherData.city,
      neighborhood: teacherData.neighborhood,
      subjects: teacherData.subjects,
      schools: teacherData.schools,
      type: teacherData.type,
      status: 'pending',
      is_available: false,
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString()
    };

    // Upload Avatar if present
    if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('teacher-documents')
            .upload(filePath, avatarFile);

        if (!uploadError) {
            const { data: publicUrl } = supabase.storage.from('teacher-documents').getPublicUrl(filePath);
            newTeacher.avatar_url = publicUrl.publicUrl;
        }
    }

    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert(newTeacher)
      .select()
      .single();

    if (error) {
        if (error.code === '42P01') {
            console.error('CRITICAL: Table "teachers" does not exist in Supabase schema.');
        }
        throw error;
    }

    // 2. Upload des preuves dans Supabase Storage
    if (proofFiles.length > 0) {
      for (const file of proofFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${teacher.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('teacher-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading proof:', uploadError);
          continue;
        }

        // Enregistrer le lien dans une table 'teacher_proofs' (optionnel, ou juste garder le chemin)
        const { data: publicUrl } = supabase.storage.from('teacher-documents').getPublicUrl(filePath);
        
        const { error: proofError } = await supabase.from('teacher_proofs').insert({
          teacher_id: teacher.id,
          file_url: publicUrl.publicUrl,
          file_path: filePath
        });

        if (proofError && proofError.code === '42P01') {
            console.warn('Warning: teacher_proofs table missing. Evidence link not saved to DB.');
        }
      }
    }

    return { data: mapToTeacher(teacher), error: null };
  } catch (error) {
    console.error('applyAsTeacher error:', error);
    return { data: null, error };
  }
};

/**
 * Récupère le profil enseignant d'un utilisateur
 */
export const getMyTeacherProfile = async (userId: string): Promise<Teacher | null> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) return null;
  return mapToTeacher(data);
};

// ======================================================
// 2. Marketplace & Recherche
// ======================================================

/**
 * Récupère les professeurs disponibles avec filtres
 */
export const getTeachers = async (filters: {
  subject?: string;
  city?: string;
  type?: 'professional' | 'benevolent';
}): Promise<Teacher[]> => {
  let query = supabase
    .from('teachers')
    .select('*')
    .eq('status', 'verified')
    .eq('is_available', true);

  if (filters.subject) {
    query = query.contains('subjects', [filters.subject]);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  // Tri par note moyenne décroissante
  query = query.order('rating_avg', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('getTeachers error:', error);
    return [];
  }

  return data.map(mapToTeacher);
};

// ======================================================
// 3. Status & Disponibilité
// ======================================================

/**
 * Met à jour la disponibilité d'un professeur
 */
export const updateAvailability = async (teacherId: string, isAvailable: boolean): Promise<void> => {
  const { error } = await supabase
    .from('teachers')
    .update({ is_available: isAvailable })
    .eq('id', teacherId);
  
  if (error) throw error;
};

// ======================================================
// 4. Modération (Admin)
// ======================================================

/**
 * Récupère les candidatures en attente
 */
export const getPendingApplications = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('getPendingApplications error:', error);
    return [];
  }
  return data || [];
};

/**
 * Valide ou rejette un professeur
 */
export const moderateTeacher = async (teacherId: string, status: 'verified' | 'rejected'): Promise<void> => {
  const { error } = await supabase
    .from('teachers')
    .update({ status })
    .eq('id', teacherId);
  
  if (error) throw error;
};

// ======================================================
// 5. Notations
// ======================================================

/**
 * Soumet une note pour un professeur
 */
export const submitRating = async (teacherId: string, studentId: string, studentName: string, score: number, comment: string): Promise<void> => {
  try {
    // 1. Enregistrer la note
    const { error: ratingError } = await supabase.from('teacher_ratings').insert({
      teacher_id: teacherId,
      student_id: studentId,
      student_name: studentName,
      score,
      comment,
      timestamp: new Date().toISOString()
    });

    if (ratingError) throw ratingError;

    // 2. Recalculer la moyenne (on pourrait aussi le faire via un trigger SQL pour plus de précision)
    const { data: ratings } = await supabase
      .from('teacher_ratings')
      .select('score')
      .eq('teacher_id', teacherId);
    
    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;
      await supabase
        .from('teachers')
        .update({ 
          rating_avg: avg,
          rating_count: ratings.length 
        })
        .eq('id', teacherId);
    }
  } catch (err) {
    console.error('submitRating error:', err);
    throw err;
  }
};

// ======================================================
// 6. Consultations & Stats Dashboard
// ======================================================

/**
 * Enregistre une consultation (clic WhatsApp)
 */
export const logConsultation = async (teacherId: string, studentId: string, studentName: string): Promise<void> => {
    const { error } = await supabase.from('consultations').insert({
        teacher_id: teacherId,
        student_id: studentId,
        student_name: studentName,
        timestamp: new Date().toISOString()
    });
    if (error) console.error('Error logging consultation:', error);
};

/**
 * Récupère les statistiques pour le dashboard enseignant
 */
export const getTeacherDashboardData = async (teacherId: string): Promise<{
    consultations: any[];
    ratings: TeacherRating[];
    stats: {
        totalConsultations: number;
        avgRating: number;
    }
}> => {
    // 1. Consultations
    const { data: consultations } = await supabase
        .from('consultations')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('timestamp', { ascending: false });

    // 2. Ratings
    const { data: ratings } = await supabase
        .from('teacher_ratings')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('timestamp', { ascending: false });

    // 3. Teacher profile for direct stats
    const { data: teacher } = await supabase
        .from('teachers')
        .select('rating_avg, rating_count')
        .eq('id', teacherId)
        .single();

    return {
        consultations: consultations || [],
        ratings: ratings || [],
        stats: {
            totalConsultations: consultations?.length || 0,
            avgRating: teacher?.rating_avg || 0
        }
    };
};

// ======================================================
// 7. Helpers
// ======================================================

/**
 * Transforme les données de la DB en objet Teacher (camelCase)
 */
const mapToTeacher = (dbData: any): Teacher => {
  return {
    id: dbData.id,
    userId: dbData.user_id,
    name: dbData.name,
    firstName: dbData.first_name,
    lastName: dbData.last_name,
    bio: dbData.bio,
    whatsappNumber: dbData.whatsapp_number,
    city: dbData.city,
    neighborhood: dbData.neighborhood,
    subjects: dbData.subjects || [],
    schools: dbData.schools || [],
    type: dbData.type,
    status: dbData.status,
    isAvailable: dbData.is_available,
    avatar: dbData.avatar_url,
    avatarUrl: dbData.avatar_url,
    ratingAvg: dbData.rating_avg || 0,
    ratingCount: dbData.rating_count || 0,
    createdAt: dbData.created_at
  };
};
