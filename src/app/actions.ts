'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function addClinic(formData: FormData) {
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const address = formData.get('address') as string

  try {
    // --- STEP 1: ONE-TIME GEOCODING ---
    // We only call this ONCE per submission.
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

    // Grab the first result (most accurate)
    const lat = parseFloat(geoData[0].lat)
    const lon = parseFloat(geoData[0].lon)

    // --- STEP 2: PERMANENT STORAGE ---
    // We save the Lat/Lon so we never have to geocode this address again.
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