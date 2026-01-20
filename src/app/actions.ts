'use server'

import { createClient } from '@supabase/supabase-js'

// 1. Standard Client (for public actions like adding a clinic)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 2. Admin Client (for Moderation - Bypasses Row Level Security)
// ⚠️ You must add SUPABASE_SERVICE_ROLE_KEY to your .env.local file!
// You can find this in your Supabase Dashboard > Project Settings > API
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- CONFIGURATION: HEURISTICS ---
const PROFANITY_LIST = ['badword1', 'badword2', 'shit', 'fuck', 'bitch', 'ass', 'dick', 'crap', 'piss']; 

function runHeuristicCheck(text: string): { safe: boolean; reason?: string } {
  const lower = text.toLowerCase();

  // Rule A: Profanity Filter
  const hasProfanity = PROFANITY_LIST.some(word => lower.includes(word));
  if (hasProfanity) return { safe: false, reason: 'Profanity detected' };

  // Rule B: Anti-Spam (Links)
  // Blocks http, https, www, .com, .org, etc.
  if (/(http|https|www\.|[\w-]+\.(com|org|net|edu))/i.test(text)) {
    return { safe: false, reason: 'Links not allowed' };
  }

  // Rule C: Length & Gibberish
  if (text.length < 10) return { safe: false, reason: 'Too short' };
  if (/([a-z])\1{4,}/.test(lower)) return { safe: false, reason: 'Gibberish detected' }; // e.g. "looooooool"

  return { safe: true };
}

// --- ACTION 1: ADD CLINIC (Your Existing Logic) ---
export async function addClinic(formData: FormData) {
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const address = formData.get('address') as string

  try {
    // ONE-TIME GEOCODING
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      {
        headers: {
          'User-Agent': 'VetReviewMap_Community_Project' // Required by OSM policy
        }
      }
    )
    
    const geoData = await response.json()
    
    if (!geoData || geoData.length === 0) {
      return { success: false, message: "Location not found. Try adding a City/State." }
    }

    const lat = parseFloat(geoData[0].lat)
    const lon = parseFloat(geoData[0].lon)

    const { error } = await supabase.from('clinics').insert([{
      name,
      category,
      address,
      latitude: lat,
      longitude: lon,
      is_approved: false // Admin must approve before it hits the map
    }])
    
    if (error) throw new Error(error.message)

    return { success: true, message: "Clinic submitted! It will appear once approved." }
    
  } catch (err: any) {
    console.error("Geocoding/DB Error:", err)
    return { success: false, message: "Server error. Please try again later." }
  }
}

// --- ACTION 2: SUBMIT REVIEW (New Moderation Logic) ---
export async function submitReviewAction(reviewData: any) {
  const { comment, ...otherData } = reviewData;

  // 1. Run Heuristic Check
  const heuristic = runHeuristicCheck(comment);
  
  let isApproved = false;
  let moderationNote = heuristic.reason || 'Pending Manual Review';

  // 2. Logic: If it passes heuristics, we auto-approve it.
  if (heuristic.safe) {
    isApproved = true; 
    moderationNote = 'Auto-Approved (Heuristics)';
  }

  // 3. Insert into Supabase using Admin Client
  // We use supabaseAdmin so we can set the "is_approved" column which regular users shouldn't be able to touch.
  const { error } = await supabaseAdmin
    .from('reviews')
    .insert({
      ...otherData,
      comment,
      is_approved: isApproved, 
      moderation_note: moderationNote 
    });

  if (error) {
    console.error("Submission Error:", error);
    return { success: false, message: error.message };
  }

  return { 
    success: true, 
    message: isApproved ? "Review posted successfully!" : "Review submitted for moderation." 
  };
}