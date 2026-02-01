'use server'

import { createClient } from '@supabase/supabase-js'

// 1. Standard Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 2. Admin Client (Bypasses RLS to set is_approved)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- IMPROVED HEURISTIC CHECK ---
function runHeuristicCheck(text: string): { safe: boolean; reason?: string } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 0);

  // 1. Length Check
  if (text.length < 12) return { safe: false, reason: 'Too short' };

  // 2. Profanity Filter
  const PROFANITY_LIST = ['shit', 'fuck', 'fucking', 'bitch', 'asshole', 'dick', 'pussy']; 
  if (PROFANITY_LIST.some(word => lower.includes(word))) {
    return { safe: false, reason: 'Profanity detected' };
  }

  // 3. Gibberish Check A: Keyboard Mashing (Long words)
  if (words.some(word => word.length > 20)) {
    return { safe: false, reason: 'Keyboard mash (long word)' };
  }

  // 4. Gibberish Check B: Consonant Clusters
  // English rarely has 5+ consonants in a row.
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(lower)) {
    return { safe: false, reason: 'Keyboard mash (consonant cluster)' };
  }

  // 5. Gibberish Check C: The "Dictionary" Test (MOST EFFECTIVE)
  // If a comment is decent length but contains ZERO common English words, it's trash.
  const commonWords = ['the', 'and', 'was', 'very', 'had', 'for', 'with', 'this', 'that', 'not', 'but', 'they', 'clinic', 'great', 'place', 'extern', 'student', 'vet', 'doctor'];
  const hasCommonWord = words.some(word => commonWords.includes(word));
  
  if (text.length > 20 && !hasCommonWord) {
    return { safe: false, reason: 'Non-sensical content' };
  }

  return { safe: true };
}

// --- UPDATED ACTION ---
export async function submitReviewAction(reviewData: any) {
  const { 
    comment, 
    overall_rating, 
    mentorship, 
    hands_on, 
    culture, 
    volume, 
    duration_weeks, 
    externship_year,
    ...rest 
  } = reviewData;

  try {
    // 1. OpenAI Moderation (Safety Check)
    const modResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: comment }),
    });
    const modData = await modResponse.json();
    const isFlaggedByAI = modData.results?.[0]?.flagged || false;

    // 2. Run our new Heuristics
    const heuristic = runHeuristicCheck(comment);
    
    // 3. Final Decision
    // It is ONLY approved if it is safe AND looks like a real sentence
    const isApproved = !isFlaggedByAI && heuristic.safe;
    const moderationNote = isFlaggedByAI 
        ? 'Flagged by OpenAI Safety' 
        : (heuristic.reason || 'Auto-Approved');

    // 4. Insert into DB
    const { error } = await supabaseAdmin
      .from('reviews')
      .insert({
        ...rest,
        comment,
        overall_rating: Math.round(overall_rating),
        mentorship: Math.round(mentorship),
        hands_on: Math.round(hands_on),
        culture: Math.round(culture),
        volume: Math.round(volume),
        duration_weeks: Math.round(duration_weeks),
        externship_year: parseInt(externship_year) || new Date().getFullYear(),
        is_approved: isApproved, 
        moderation_note: moderationNote 
      });

    if (error) throw error;

    return { 
      success: true, 
      message: isApproved 
        ? "Review published!" 
        : "Review submitted. It will appear after manual verification." 
    };

  } catch (err: any) {
    console.error("Submission Error:", err);
    return { success: false, message: "Error submitting review." };
  }
}
export async function submitClinicUpdateAction(clinicId: string, userId: string, message: string) {
  try {
    const { error } = await supabaseAdmin
      .from('clinic_updates')
      .insert({
        clinic_id: clinicId,
        user_id: userId,
        suggested_changes: message,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true, message: "Request sent! A moderator will verify these changes." };
  } catch (err: any) {
    console.error("Update Request Error:", err);
    return { success: false, message: "Failed to send request." };
  }
}