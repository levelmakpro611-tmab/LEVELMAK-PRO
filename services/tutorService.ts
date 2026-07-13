import { supabase } from './supabase';
import { Teacher, TeacherRating } from '../types';

/**
 * Service pour la gestion du Hub des Enseignants (Tuteurs et Bénévoles)
 */

// ======================================================
// 1. Inscription & Profil
// ======================================================

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

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
    // 1. Convert avatar to Base64 Data URL if present
    let avatarUrl = '';
    if (avatarFile) {
      try {
        avatarUrl = await fileToBase64(avatarFile);
      } catch (avatarError) {
        console.error('Error converting avatar to base64, trying fallback upload:', avatarError);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        let uploadBucket = 'teacher-documents';
        let uploadResult = await supabase.storage
            .from(uploadBucket)
            .upload(filePath, avatarFile);

        if (uploadResult.error) {
            console.warn(`Avatar upload to ${uploadBucket} failed, trying fallback to 'assets'...`, uploadResult.error);
            uploadBucket = 'assets';
            uploadResult = await supabase.storage
                .from(uploadBucket)
                .upload(filePath, avatarFile);
        }

        if (!uploadResult.error) {
            const { data: publicUrl } = supabase.storage.from(uploadBucket).getPublicUrl(filePath);
            avatarUrl = publicUrl.publicUrl;
        }
      }
    }

    // 2. Convert all proofs to Base64 Data URLs
    // ✅ Use Promise.allSettled so all files convert in parallel instead of one by one
    const serializedProofs: any[] = [];
    if (proofFiles && proofFiles.length > 0) {
      const proofResults = await Promise.allSettled(
        proofFiles.map((file, i) =>
          fileToBase64(file).then(base64Proof => ({
            id: `proof_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            teacher_id: '',
            file_url: base64Proof,
            file_path: file.name
          }))
        )
      );
      proofResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          serializedProofs.push(result.value);
        } else {
          console.error('Error processing proof file:', result.reason);
        }
      });
    }

    // 3. Build bioText including serialized proofs
    const bioText = (teacherData.bio || '') + '||' + 
                    (teacherData.schools || []).filter(Boolean).join(',') + '||' + 
                    JSON.stringify(serializedProofs);

    const newTeacher: any = {
      user_id: userId,
      name: `${teacherData.firstName} ${teacherData.lastName}`,
      bio: bioText,
      whatsapp_number: teacherData.whatsappNumber,
      city: teacherData.city,
      neighborhood: teacherData.neighborhood,
      subjects: teacherData.subjects || [],
      type: teacherData.type,
      status: 'pending',
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      avatar_url: avatarUrl || null
    };

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

    // 4. Also attempt to insert to database table for backward compatibility/admin query redundancy, but ignore errors if RLS blocks it!
    // ✅ Insert all proofs in parallel instead of one by one in a loop
    if (serializedProofs.length > 0) {
      await Promise.allSettled(
        serializedProofs.map(proof =>
          supabase.from('teacher_proofs').insert({
            teacher_id: teacher.id,
            file_url: proof.file_url
          }).then(({ error }) => {
            if (error) console.warn('Redundant insert to teacher_proofs table skipped/failed:', error);
          })
        )
      );
    }

    // Set correct teacher_id on mapped objects
    const finalProofs = serializedProofs.map(p => ({ ...p, teacher_id: teacher.id }));
    const mappedTeacher = mapToTeacher(teacher);
    
    return { 
      data: {
        ...mappedTeacher,
        teacher_proofs: finalProofs
      }, 
      error: null 
    };
  } catch (error) {
    console.error('applyAsTeacher error:', error);
    return { data: null, error };
  }
};

/**
 * Récupère le profil enseignant d'un utilisateur
 */
export const getMyTeacherProfile = async (userId: string): Promise<any | null> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) return null;
  const mapped = mapToTeacher(data);

  // Fetch proofs from database table for backward compatibility
  let dbProofs: any[] = [];
  try {
    const { data: proofs } = await supabase
      .from('teacher_proofs')
      .select('*')
      .eq('teacher_id', data.id);
    if (proofs) dbProofs = proofs;
  } catch (e) {
    console.error('Error fetching db proofs:', e);
  }

  return {
    ...mapped,
    teacher_proofs: [...(mapped.teacher_proofs || []), ...dbProofs]
  };
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
  neighborhood?: string;
}): Promise<Teacher[]> => {
  let query = supabase
    .from('teachers')
    .select('*')
    .eq('status', 'verified');

  if (filters.subject) {
    query = query.contains('subjects', [filters.subject]);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }
  if (filters.neighborhood) {
    query = query.eq('neighborhood', filters.neighborhood);
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
  try {
    const { data: teachers, error: tError } = await supabase
      .from('teachers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (tError) {
      console.error('getPendingApplications error:', tError);
      return [];
    }

    if (!teachers || teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);

    // Fetch proofs for these teachers
    let proofs: any[] = [];
    try {
      const { data: proofsData, error: pError } = await supabase
        .from('teacher_proofs')
        .select('*')
        .in('teacher_id', teacherIds);

      if (pError) {
        console.error('Error fetching proofs:', pError);
      } else if (proofsData) {
        proofs = proofsData;
      }
    } catch (e) {
      console.error('Error in proofs query:', e);
    }

    // Map proofs back to teachers safely
    return teachers.map(teacher => {
      try {
        const mapped = mapToTeacher(teacher);
        const dbProofsForTeacher = proofs.filter(p => p.teacher_id === teacher.id);
        return {
          ...mapped,
          teacher_proofs: [...(mapped.teacher_proofs || []), ...dbProofsForTeacher]
        };
      } catch (e) {
        console.error('Error mapping teacher row:', teacher, e);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('getPendingApplications critical error:', error);
    return [];
  }
};

/**
 * Valide ou rejette un professeur
 */
export const moderateTeacher = async (teacherId: string, status: 'verified' | 'rejected'): Promise<void> => {
  // 1. Get user_id first
  const { data: teacher, error: fetchError } = await supabase
    .from('teachers')
    .select('user_id')
    .eq('id', teacherId)
    .single();

  if (fetchError || !teacher) throw fetchError || new Error("Teacher not found");

  const userId = teacher.user_id;

  // 2. Update status in teachers table
  const { error: updateError } = await supabase
    .from('teachers')
    .update({ status })
    .eq('id', teacherId);
  
  if (updateError) throw updateError;

  // 3. Update profiles table role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: status === 'verified' ? 'teacher' : 'student' })
    .eq('id', userId);

  if (profileError) throw profileError;
};

/**
 * Suspend un enseignant (bloque son compte au niveau profile + passe son statut en rejeté)
 */
export const suspendTeacher = async (teacherId: string): Promise<void> => {
  const { data: teacher, error: fetchError } = await supabase
    .from('teachers')
    .select('user_id')
    .eq('id', teacherId)
    .single();

  if (fetchError || !teacher) throw fetchError || new Error("Teacher not found");

  const userId = teacher.user_id;

  // 1. Passer le statut en rejeté
  await supabase
    .from('teachers')
    .update({ status: 'rejected' })
    .eq('id', teacherId);

  // 2. Suspendre le compte utilisateur
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      status: 'suspended',
      role: 'student'
    })
    .eq('id', userId);

  if (profileError) throw profileError;
};

/**
 * Supprime un enseignant de la base de données
 */
export const deleteTeacher = async (teacherId: string): Promise<void> => {
  const { data: teacher, error: fetchError } = await supabase
    .from('teachers')
    .select('user_id')
    .eq('id', teacherId)
    .single();

  if (fetchError || !teacher) throw fetchError || new Error("Teacher not found");

  const userId = teacher.user_id;

  // 1. Supprimer les justificatifs
  await supabase
    .from('teacher_proofs')
    .delete()
    .eq('teacher_id', teacherId);

  // 2. Supprimer les notes
  await supabase
    .from('teacher_ratings')
    .delete()
    .eq('teacher_id', teacherId);

  // 3. Supprimer les consultations
  await supabase
    .from('consultations')
    .delete()
    .eq('teacher_id', teacherId);

  // 4. Supprimer la fiche enseignant
  const { error: deleteError } = await supabase
    .from('teachers')
    .delete()
    .eq('id', teacherId);

  if (deleteError) throw deleteError;

  // 5. Rétablir le rôle d'étudiant
  await supabase
    .from('profiles')
    .update({ role: 'student' })
    .eq('id', userId);
};

/**
 * Récupère les enseignants par leur statut
 */
export const getTeachersByStatus = async (status: 'pending' | 'verified' | 'rejected'): Promise<any[]> => {
  try {
    const { data: teachers, error: tError } = await supabase
      .from('teachers')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (tError) {
      console.error(`getTeachersByStatus error for ${status}:`, tError);
      return [];
    }

    if (!teachers || teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);

    let proofs: any[] = [];
    try {
      const { data: proofsData } = await supabase
        .from('teacher_proofs')
        .select('*')
        .in('teacher_id', teacherIds);
      if (proofsData) proofs = proofsData;
    } catch (e) {
      console.error('Error fetching proofs:', e);
    }

    return teachers.map(teacher => {
      try {
        const mapped = mapToTeacher(teacher);
        const dbProofsForTeacher = proofs.filter(p => p.teacher_id === teacher.id);
        return {
          ...mapped,
          teacher_proofs: [...(mapped.teacher_proofs || []), ...dbProofsForTeacher]
        };
      } catch (e) {
        console.error('Error mapping teacher row:', teacher, e);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('getTeachersByStatus critical error:', error);
    return [];
  }
};

/**
 * Envoie une notification/avertissement directement au profil d'un enseignant
 */
export const sendTeacherNotification = async (userId: string, title: string, message: string): Promise<void> => {
  try {
    const { data: profile, error: getError } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', userId)
      .single();

    if (getError) throw getError;

    const currentStats = profile?.stats || {};
    const currentNotifications = currentStats.notifications || [];

    const newNotification = {
      id: `admin_notif_${Date.now()}`,
      title,
      message,
      read: false,
      timestamp: new Date().toISOString(),
      sender: 'Administration Levelmak'
    };

    const updatedStats = {
      ...currentStats,
      notifications: [newNotification, ...currentNotifications]
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stats: updatedStats })
      .eq('id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error sending teacher notification:', error);
    throw error;
  }
};

/**
 * Permet à un enseignant d'envoyer un commentaire de feedback
 */
export const submitPlatformComment = async (userId: string, userName: string, userPhone: string, content: string, category: string = 'general'): Promise<void> => {
  const { error } = await supabase.from('user_comments').insert({
    user_id: userId,
    user_name: userName,
    user_phone: userPhone,
    content: content,
    rating: 5,
    category: category,
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  if (error) throw error;
};

/**
 * Permet à un enseignant de noter l'application
 */
export const submitPlatformRating = async (userId: string, userName: string, score: number, comment: string): Promise<void> => {
  const { error } = await supabase.from('user_ratings').insert({
    user_id: userId,
    user_name: userName,
    overall: score,
    comment: comment,
    features: {
      interface: score,
      quiz: score,
      coach: score,
      flashcards: score,
      library: score,
      offline: score
    },
    timestamp: new Date().toISOString()
  });
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
    // ✅ Run all 3 independent queries in parallel instead of sequentially
    const [consultationsResult, ratingsResult, teacherResult] = await Promise.all([
        supabase.from('consultations').select('*').eq('teacher_id', teacherId).order('timestamp', { ascending: false }),
        supabase.from('teacher_ratings').select('*').eq('teacher_id', teacherId).order('timestamp', { ascending: false }),
        supabase.from('teachers').select('rating_avg, rating_count').eq('id', teacherId).single()
    ]);

    const consultations = consultationsResult.data;
    const ratings = ratingsResult.data;
    const teacher = teacherResult.data;

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
  const nameParts = dbData.name ? dbData.name.split(' ') : [];
  const firstName = dbData.first_name || nameParts[0] || '';
  const lastName = dbData.last_name || nameParts.slice(1).join(' ') || '';

  const bioParts = dbData.bio ? dbData.bio.split('||') : [];
  const bio = bioParts[0] || '';
  const schools = bioParts[1] ? bioParts[1].split(',') : (dbData.schools || []);

  let parsedProofs: any[] = [];
  if (bioParts[2]) {
    try {
      parsedProofs = JSON.parse(bioParts[2]);
    } catch (e) {
      console.error('Error parsing embedded proofs:', e);
    }
  }

  return {
    id: dbData.id,
    userId: dbData.user_id,
    name: dbData.name,
    firstName,
    lastName,
    bio,
    whatsappNumber: dbData.whatsapp_number,
    city: dbData.city,
    neighborhood: dbData.neighborhood,
    subjects: dbData.subjects || [],
    schools: schools.filter(Boolean),
    type: dbData.type,
    status: dbData.status,
    isAvailable: dbData.is_available ?? true,
    avatar: dbData.avatar_url,
    avatarUrl: dbData.avatar_url,
    ratingAvg: dbData.rating_avg || 0,
    ratingCount: dbData.rating_count || 0,
    createdAt: dbData.created_at,
    teacher_proofs: parsedProofs
  } as any;
};

export const getTotalTeachersCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching total teachers count:', error);
    return 0;
  }
};

export const updateTeacherProfile = async (
  teacherId: string,
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    city: string;
    neighborhood: string;
    bio: string;
    schools: string[];
    subjects: string[];
  }
): Promise<void> => {
  const bioText = data.bio + '||' + data.schools.filter(Boolean).join(',');
  
  // 1. Update teachers table
  const { error: teacherError } = await supabase
    .from('teachers')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      whatsapp_number: data.whatsappNumber,
      city: data.city,
      neighborhood: data.neighborhood,
      subjects: data.subjects,
      bio: bioText
    })
    .eq('id', teacherId);

  if (teacherError) throw teacherError;

  // 2. Also sync to profiles table (name, phone_number)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name: `${data.firstName} ${data.lastName}`,
      phone_number: data.whatsappNumber
    })
    .eq('id', userId);

  if (profileError) throw profileError;
};
