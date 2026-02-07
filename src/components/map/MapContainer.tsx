"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createClient } from '@supabase/supabase-js';
import { sendGAEvent } from '@next/third-parties/google';
import { 
  Search, ChevronLeft, Plus, LogOut, X, Check, SlidersHorizontal, Scissors, 
  Home, Building, Info, GraduationCap, RefreshCcw, Sun, Moon, AlertTriangle, 
  Loader2, Clock, Map as MapIcon, List, Globe, Calendar, ShieldAlert, Linkedin, Stethoscope, HeartHandshake, ExternalLink, MessageSquare, Send, Bed, DollarSign, HelpCircle,
  CheckCircle, AlertCircle, ArrowRight, Sparkles, Star
} from 'lucide-react';
import AuthModal from '../auth/AuthModal';
// Import the Server Actions
import { submitReviewAction, submitClinicUpdateAction } from '@/app/actions'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VET_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const OWNERSHIP_TYPES = ['Private Practice', 'Corporate', 'University', 'Government', 'Non-Profit']; 
const SPECIALTIES = ['General Practice', 'Emergency/Urgent Care', 'Specialty Referral', 'Shelter Medicine', 'Laboratory/Research', 'Exotics', 'Large Animal','Pathology'];
// Updated ANIMAL_TYPES to include Shelter
const ANIMAL_TYPES = ['Small Animal', 'Equine', 'Mixed', 'Farm', 'Exotics', 'Wildlife', 'Shelter Medicine'];

const PROFANITY_LIST = ['badword1', 'badword2', 'shit', 'fuck', 'fucking','fucked', 'bitch', 'crap', 'piss', 'dick', 'cock', 'pussy', 'ass', 'asshole', 'fag', 'bastard', 'slut', 'douche'];

const RUBRIC: Record<string, { label: string, low: string, high: string }> = {
  mentorship: { label: "Mentorship", low: "Minimal guidance", high: "Active teaching" },
  hands_on: { label: "Hands-on", low: "Shadowing only", high: "Primary roles" },
  culture: { label: "Culture", low: "Negative Experience", high: "Positive Experience" },
  volume: { label: "Caseload", low: "Slow/repetitive", high: "High volume" }
};

const getAvg = (reviews: any[], field: string = 'overall_rating') => {
  if (!reviews || reviews.length === 0) return "N/A";
  const sum = reviews.reduce((acc, r) => acc + (r[field] || 0), 0);
  return (sum / reviews.length).toFixed(1);
};

const ensureProtocol = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim().replace(/\$0$/, '');
    return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
};

const containsProfanity = (text: string) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i'); 
        return regex.test(lowerText);
    });
};

const RangeSlider = ({ value, max, onChange, isDarkMode }: { value: number, max: number, onChange: (val: number) => void, isDarkMode: boolean }) => {
  const percentage = max > 1 ? ((value - 1) / (max - 1)) * 100 : 0;
  const activeColor = isDarkMode ? '#64d2b1' : '#059669'; 
  return (
    <div className="relative w-full h-6 flex items-center group">
      <div className={`absolute w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
         <div className="h-full transition-all duration-75" style={{ width: `${percentage}%`, background: activeColor }} />
      </div>
      <input type="range" min="1" max={max} step="0.5" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="absolute w-full h-full opacity-0 cursor-pointer z-20" />
      <div className="absolute h-4 w-4 bg-white rounded-full shadow-md pointer-events-none transition-all duration-75 z-10" style={{ left: `calc(${percentage}% - 8px)` }} />
    </div>
  );
};

// --- COMPONENT: SKELETON LOADER ---
const SkeletonCard = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`w-full p-5 rounded-3xl border flex justify-between items-start animate-pulse ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-black/5'}`}>
    <div className="space-y-2 w-[70%]">
      <div className={`h-4 w-3/4 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
      <div className={`h-3 w-1/2 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
      <div className="flex gap-1 mt-2">
        <div className={`h-4 w-12 rounded-md ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
        <div className={`h-4 w-16 rounded-md ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}></div>
      </div>
    </div>
    <div className={`h-6 w-12 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
  </div>
);

// --- COMPONENT: TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose, isDarkMode }: { message: string, type: 'success' | 'error', onClose: () => void, isDarkMode: boolean }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' 
    ? (isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white')
    : (isDarkMode ? 'bg-red-500 text-white' : 'bg-red-600 text-white');

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-300 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${bgColor}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="text-xs font-bold uppercase tracking-wide">{message}</span>
    </div>
  );
};

export default function MapContainer() {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  // FIX: Track theme in a ref to prevent stale closures in Map event listeners
  const isDarkModeRef = useRef(isDarkMode);
  useEffect(() => { isDarkModeRef.current = isDarkMode; }, [isDarkMode]);

  const [userId, setUserId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAddingClinic, setIsAddingClinic] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(true); 
  const [showWelcome, setShowWelcome] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // Patch Refs for sticky logic and movement tracking
  const isPopupPinnedRef = useRef(false);
  const isProgrammaticMovementRef = useRef(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('General');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  // Clinic Update State
  const [isUpdatingClinic, setIsUpdatingClinic] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const [isManualMode, setIsManualMode] = useState(false);

  const [tooltipState, setTooltipState] = useState<{ x: number, y: number, info: any, visible: boolean } | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [animalFocusFilter, setAnimalFocusFilter] = useState('All');
  const [countryInput, setCountryInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [stipendOnly, setStipendOnly] = useState(false);
  const [surgeryOnly, setSurgeryOnly] = useState(false);
  const [internsOnly, setInternsOnly] = useState(false);
  const [housingOnly, setHousingOnly] = useState(false); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClinic, setNewClinic] = useState({
    name: '', address: '', city: '', state: '', postal_code: '', country: '',
    ownership_type: 'Private Practice', website: '',
    specialties: [] as string[], animal_types: [] as string[], open_to_years: [] as string[],
    latitude: 0, longitude: 0,
    provides_housing: false, provides_stipend: false, allows_surgery: false, hosts_intern_residents: false
  });

  const [isReviewing, setIsReviewing] = useState(false);
  
  const [ratings, setRatings] = useState({ 
    overall_rating: 5, mentorship: 5, hands_on: 5, culture: 5, volume: 5, 
    days_per_week: 5, hours_per_day: 9, 
    duration_weeks: 2, 
    externship_year: new Date().getFullYear().toString(), 
    service_externed: '' 
  });
  const [comment, setComment] = useState('');

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const filteredClinicsRef = useRef<any[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const detailsContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => { 
    setMounted(true); 
    sendGAEvent('event', 'theme_session_start', { theme: isDarkMode ? 'dark' : 'light' });
  }, []);

  // HTML Bridge for Tooltip buttons to call React functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
        (window as any).selectClinicFromMap = (clinicId: string) => {
            const clinic = clinics.find(c => String(c.id) === String(clinicId));
            if (clinic) flyToClinic(clinic);
        };
    }
  }, [clinics]);

  // NEW: Handle Supabase Auth Redirect Errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      // Check if the URL contains the specific otp_expired error
      if (hash.includes('error_code=otp_expired')) {
        // 1. Show a helpful message to the user
        showToast("Email link expired (often caused by email security scanners). Please log in to request a new one.", "error");
        
        // 2. Clean the URL so the Supabase client doesn't get stuck in an error state
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user?.id ?? null));

    const dismissedThisSession = sessionStorage.getItem('rm_landing_dismissed');
    if (!userId && !dismissedThisSession) {
      setTimeout(() => setShowWelcome(true), 200);
    } else {
      setShowWelcome(false);
    }

    return () => subscription.unsubscribe();
  }, [mounted, userId]);

  useEffect(() => {
    if (detailsContainerRef.current) {
        detailsContainerRef.current.scrollTop = 0;
    }
  }, [isReviewing, selectedClinic]);

  const closeWelcome = () => {
    setShowWelcome(false);
    sessionStorage.setItem('rm_landing_dismissed', 'true');
  };

const loadData = useCallback(async () => {
    if (clinics.length > 0) return; 
    setLoadingClinics(true);
    
    const { data } = await supabase
      .from('clinics')
      .select('*, reviews(*)')
      .eq('is_approved', true);

    if (data) {
        const sorted = data.map(c => ({
            ...c,
            reviews: c.reviews
                ?.filter((r: any) => r.is_approved === true) 
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }))
        // ADD THIS LINE BELOW:
        .sort((a: any, b: any) => a.name.localeCompare(b.name)); 

        setClinics(sorted);
    }
    setLoadingClinics(false);
  }, [clinics.length]);

  useEffect(() => {
    if (!mounted) return;
    loadData();
  }, [mounted, loadData]);

  useEffect(() => {
    if (searchQuery.length < 3) return;
    const delay = setTimeout(() => { sendGAEvent('event', 'search', { search_term: searchQuery }); }, 2000);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const filteredClinics = useMemo(() => {
    const res = clinics.filter(c => {
      if (!c.latitude || !c.longitude) return false;

      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLoc = (countryFilter === 'All' || c.country === countryFilter) && (stateFilter === 'All' || c.state === stateFilter) && (cityFilter === 'All' || c.city === cityFilter);
      
      const matchesAnimal = animalFocusFilter === 'All' || 
                            c.animal_types?.includes(animalFocusFilter) || 
                            (animalFocusFilter === 'Shelter' && c.specialties?.includes('Shelter Medicine'));
      
      const matchesLogistics = (!stipendOnly || c.provides_stipend) && 
                               (!surgeryOnly || c.allows_surgery) && 
                               (!internsOnly || c.hosts_intern_residents) &&
                               (!housingOnly || c.provides_housing); 
                               
      return matchesSearch && matchesLoc && matchesAnimal && matchesLogistics;
    });
    filteredClinicsRef.current = res;
    return res;
  }, [clinics, searchQuery, countryFilter, stateFilter, cityFilter, animalFocusFilter, stipendOnly, surgeryOnly, internsOnly, housingOnly]);

  const addLayers = useCallback((m: maplibregl.Map, data: any[]) => {
    if (m.getSource('clinics')) return;
    m.addSource('clinics', { type: 'geojson', data: { type: 'FeatureCollection', features: data.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] }, properties: { fullData: JSON.stringify(c) } })) } });
    m.addLayer({ 
        id: 'p', 
        type: 'circle', 
        source: 'clinics', 
        paint: { 
            'circle-radius': ['step', ['get', 'count'], 10, 2, 14], 
            'circle-color': ['step', ['get', 'count'], isDarkModeRef.current ? '#64d2b1' : '#059669', 2, '#fbbf24'], 
            'circle-stroke-width': 2, 
            'circle-stroke-color': isDarkModeRef.current ? '#ffffff' : '#1a1a1a' 
        }
    });
  }, []);

  const flyToClinic = (clinic: any) => {
    if (!map.current) return;
    isProgrammaticMovementRef.current = true; // Mark movement as automated
    const isMobile = window.innerWidth < 768;
    const bottomPadding = isMobile ? window.innerHeight * 0.55 : 0;
    map.current.flyTo({ 
        center: [clinic.longitude, clinic.latitude], zoom: 14, speed: 0.9, curve: 1.2, essential: true,
        padding: { bottom: bottomPadding, top: 0, left: 0, right: 0 } 
    });
    setSelectedClinic(clinic);
    setShowMobileMap(false); 
  };

  useEffect(() => {
    if (!mounted || !mapContainer.current) return;
    if (map.current) {
      map.current.setStyle(isDarkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/bright');
      
      const onStyleData = () => {
        if (map.current) {
            addLayers(map.current, filteredClinicsRef.current);
            setIsMapReady(prev => !prev);
            setTimeout(() => setIsMapReady(true), 50);
        }
      };

      map.current.once('styledata', onStyleData);
      return;
    }

    const m = new maplibregl.Map({ container: mapContainer.current, style: isDarkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/bright', center: [-98.5795, 39.8283], zoom: 3, attributionControl: false });
    
    m.on('load', () => { 
        addLayers(m, filteredClinicsRef.current); 
        setIsMapReady(true); 
    });
    
    // BUILD POPUP HTML
    const getPopupHTML = (features: any[]) => {
        const rawData = features[0].properties?.allClinics;
        const clinicsAtLoc = rawData 
          ? JSON.parse(rawData) 
          : (features[0].properties?.fullData 
              ? [JSON.parse(features[0].properties.fullData)] 
              : []);
  
        if (clinicsAtLoc.length === 0) return "";
        
        // FIX: Use Ref to get current theme colors so text isn't white in light mode
        const themeIsDark = isDarkModeRef.current;
        const textColor = themeIsDark ? '#ffffff' : '#0f172a';
        const subColor = themeIsDark ? 'rgba(255,255,255,0.6)' : '#475569';
        const borderColor = themeIsDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
        
        if (clinicsAtLoc.length > 1) {
          return `
            <div style="font-family: sans-serif; padding: 4px; color: ${textColor};">
              <div style="margin-bottom: 8px;">
                <strong style="color: #059669; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${clinicsAtLoc.length} Externships here
                </strong>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
              ${clinicsAtLoc.slice(0, 5).map((c: any) => `
                <button 
                  onclick="window.selectClinicFromMap('${c.id}')"
                  style="text-align: left; background: none; border: none; padding: 6px 0; border-bottom: 1px solid ${borderColor}; cursor: pointer; display: block; width: 100%; transition: opacity 0.2s;"
                >
                  <div style="font-size: 12px; font-weight: 800; color: ${textColor}; line-height: 1.2;">${c.name}</div>
                  <div style="font-size: 10px; color: ${subColor}; margin-top: 2px;">${c.animal_types?.[0] || 'General'}</div>
                </button>
              `).join('')}
              </div>
              ${clinicsAtLoc.length > 5 ? `<div style="font-size: 9px; opacity: 0.4; margin-top: 6px; text-align: center;">+ ${clinicsAtLoc.length - 5} others</div>` : ''}
            </div>
          `;
        } else {
          const data = clinicsAtLoc[0];
          const avg = getAvg(data.reviews);
          return `
            <div style="font-family: sans-serif; padding: 2px; color: ${textColor};">
              <strong style="font-size: 13px; display: block; margin-bottom: 2px; color: ${textColor};">${data.name}</strong>
              <div style="font-size: 10px; font-weight: 700; color: ${subColor};">${data.city}, ${data.state}</div>
              <div style="margin-top: 8px; display: flex; gap: 4px;">
                <span style="background: #10b981; color: white; font-size: 10px; padding: 3px 8px; border-radius: 6px; font-weight: 900;">★ ${avg}</span>
              </div>
            </div>
          `;
        }
    };

    m.on('mouseenter', 'p', (e: any) => {
      if (isPopupPinnedRef.current) return;
      m.getCanvas().style.cursor = 'pointer';
      const coordinates = (e.features[0].geometry as any).coordinates.slice();
      
      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 15, className: 'custom-map-popup' })
        .setLngLat(coordinates)
        .setHTML(getPopupHTML(e.features))
        .addTo(m);
    });

    m.on('mouseleave', 'p', () => { 
        m.getCanvas().style.cursor = ''; 
        if (!isPopupPinnedRef.current && popupRef.current) {
            popupRef.current.remove();
        }
    });

    const forceClearPopup = () => {
        isPopupPinnedRef.current = false;
        if (popupRef.current) popupRef.current.remove();
    };

    // Only force clear if user is the one moving the map
    m.on('dragstart', () => { if (!isProgrammaticMovementRef.current) forceClearPopup(); });
    m.on('zoomstart', () => { if (!isProgrammaticMovementRef.current) forceClearPopup(); });
    m.on('moveend', () => { isProgrammaticMovementRef.current = false; });

    m.on('click', (e: any) => {
      if (!m.getLayer('p')) return;
      const features = m.queryRenderedFeatures(e.point, { layers: ['p'] });
      
      if (features.length > 0) {
        isPopupPinnedRef.current = true;
        const coordinates = (features[0].geometry as any).coordinates.slice();
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 15, className: 'custom-map-popup' })
            .setLngLat(coordinates)
            .setHTML(getPopupHTML(features))
            .addTo(m);

        const props = features[0].properties;
        const clinicsAtLoc = JSON.parse(props.allClinics || '[]');
        flyToClinic(clinicsAtLoc.length > 1 ? clinicsAtLoc[0] : JSON.parse(props.fullData));
      } else {
        forceClearPopup();
      }
    });

    map.current = m;
  }, [mounted, isDarkMode, addLayers]);

useEffect(() => {
  if (!isMapReady || !map.current) return;
  
  const s = map.current.getSource('clinics') as maplibregl.GeoJSONSource;
  if (!s) return;

  const grouped = filteredClinics.reduce((acc: any, c) => {
    const key = `${c.latitude},${c.longitude}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const features = Object.values(grouped).map((group: any) => ({
    type: 'Feature' as const,
    geometry: { 
      type: 'Point' as const, 
      coordinates: [group[0].longitude, group[0].latitude] 
    },
    properties: { 
      allClinics: JSON.stringify(group),
      count: group.length,
      fullData: JSON.stringify(group[0]) 
    }
  }));

  try {
    s.setData({ type: 'FeatureCollection', features });
  } catch (err) {
    console.warn("Map not ready for sync. Retrying...");
  }
}, [isMapReady, filteredClinics]);

  const countrySuggestions = useMemo(() => [...new Set(clinics.map(c => c.country).filter(Boolean))].filter(c => c.toLowerCase().includes(countryInput.toLowerCase())), [clinics, countryInput]);
  const stateSuggestions = useMemo(() => { const base = clinics.filter(c => countryFilter === 'All' || c.country === countryFilter); return [...new Set(base.map(c => c.state).filter(Boolean))].filter(s => s.toLowerCase().includes(stateInput.toLowerCase())); }, [clinics, countryFilter, stateInput]);
  const citySuggestions = useMemo(() => { const base = clinics.filter(c => (countryFilter === 'All' || c.country === countryFilter) && (stateFilter === 'All' || c.state === stateFilter)); return [...new Set(base.map(c => c.city).filter(Boolean))].filter(ct => ct.toLowerCase().includes(cityInput.toLowerCase())); }, [clinics, countryFilter, stateFilter, cityInput]);

  useEffect(() => {
    const fetchS = async () => {
      if (addressQuery.length < 4) { setAddressSuggestions([]); return; }
      try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&addressdetails=1&limit=5`);
          if (res.ok) {
             const data = await res.json();
             setAddressSuggestions(data);
             setShowAddressSuggestions(true);
          }
      } catch (err) { console.error("Search failed safely:", err); }
    };
    const d = setTimeout(fetchS, 1000);
    return () => clearTimeout(d);
  }, [addressQuery]);

  const selectAddress = (s: any) => {
    const a = s.address;
    let likelyName = s.name || s.display_name.split(',')[0];
    setNewClinic({ ...newClinic, name: likelyName, address: `${a.house_number || ''} ${a.road || ''}`.trim(), city: a.city || a.town || a.village || '', state: a.state || '', postal_code: a.postcode || '', country: a.country || '', latitude: parseFloat(s.lat), longitude: parseFloat(s.lon) });
    setAddressSuggestions([]); setAddressQuery(s.display_name); setShowAddressSuggestions(false);
  };

  const enableManualMode = () => {
      setIsManualMode(true);
      if (newClinic.latitude === 0 && map.current) {
          const { lng, lat } = map.current.getCenter();
          setNewClinic(prev => ({ ...prev, latitude: lat, longitude: lng }));
      }
  };

  const submitClinic = async () => {
  if (!userId) { setIsAuthOpen(true); return; }
  if (!newClinic.name || !newClinic.address || !newClinic.city || !newClinic.country) { 
      showToast("Please fill in all required location details.", 'error'); 
      return; 
  }

  // --- NEW: DUPLICATE CHECK LOGIC ---
  const isDuplicate = clinics.some(existing => 
    existing.name.toLowerCase().trim() === newClinic.name.toLowerCase().trim() &&
    existing.city.toLowerCase().trim() === newClinic.city.toLowerCase().trim()
  );

  if (isDuplicate) {
    showToast("This clinic is already listed!", 'error');
    setIsSubmitting(false);
    return;
  }
  // --- END DUPLICATE CHECK ---
    setIsSubmitting(true);

    let finalLat = newClinic.latitude;
    let finalLng = newClinic.longitude;

    if (isManualMode || !finalLat || !finalLng) {
        try {
            const query = `${newClinic.address}, ${newClinic.city}, ${newClinic.state || ''}, ${newClinic.country}`;
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    finalLat = parseFloat(data[0].lat);
                    finalLng = parseFloat(data[0].lon);
                } else {
                    console.warn("Could not geocode address automatically.");
                }
            }
        } catch (err) {
            console.error("Geocoding failed:", err);
        }
    }

    if (!finalLat || !finalLng) {
        setIsSubmitting(false);
        showToast("Address not found. Please check details.", 'error');
        return;
    }

    if (containsProfanity(newClinic.name)) { 
        setIsSubmitting(false);
        showToast("Please keep the name professional.", 'error'); 
        return; 
    }

    try {
      const { error } = await supabase.from('clinics').insert({ 
        name: newClinic.name, address: newClinic.address, city: newClinic.city, state: newClinic.state, postal_code: newClinic.postal_code, country: newClinic.country, 
        latitude: finalLat, longitude: finalLng, category: newClinic.ownership_type, website: newClinic.website, 
        specialties: newClinic.specialties, animal_types: newClinic.animal_types, open_to_years: newClinic.open_to_years,
        submitted_by: userId, is_approved: false, provides_housing: newClinic.provides_housing, provides_stipend: newClinic.provides_stipend, allows_surgery: newClinic.allows_surgery, hosts_intern_residents: newClinic.hosts_intern_residents
      });
      if (error) { console.error(error); showToast(`Error: ${error.message}`, 'error'); } 
      else { 
          setIsAddingClinic(false); setIsManualMode(false); 
          setNewClinic({ name: '', address: '', city: '', state: '', postal_code: '', country: '', ownership_type: 'Private Practice', website: '', specialties: [], animal_types: [], open_to_years: [], latitude: 0, longitude: 0, provides_housing: false, provides_stipend: false, allows_surgery: false, hosts_intern_residents: false }); 
          setAddressQuery(''); 
          showToast("Clinic submitted for verification!", 'success');
      }
    } catch (err) { showToast("An unexpected error occurred.", 'error'); } finally { setIsSubmitting(false); }
  };

const submitReview = async () => {
    if (!userId) return setIsAuthOpen(true);
    if (!ratings.service_externed) { showToast("Please specify the service you externed with.", 'error'); return; }
    if (!comment || comment.length < 10) { showToast("Comment must be at least 10 characters.", 'error'); return; }
    if (!comment || comment.length > 1400) { showToast("Comment is too long. Please be more concise.", 'error'); return; }
    
    const reviewData = {
      clinic_id: selectedClinic.id,
      user_id: userId,
      overall_rating: Math.round(ratings.overall_rating),
      mentorship: Math.round(ratings.mentorship),
      hands_on: Math.round(ratings.hands_on),
      culture: Math.round(ratings.culture),
      volume: Math.round(ratings.volume),
      duration_weeks: Math.round(ratings.duration_weeks),
      service_externed: ratings.service_externed,
      externship_year: parseInt(ratings.externship_year) || new Date().getFullYear(),
      comment,
    };

    const result = await submitReviewAction(reviewData);

    if (result.success) {
        setIsReviewing(false);
        setComment('');
        showToast(result.message, 'success');
        loadData();
    } else {
        showToast("Error: " + result.message, 'error');
    }
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    if (containsProfanity(feedbackMessage)) { showToast("Please keep it professional.", 'error'); return; }
    setIsSendingFeedback(true);
    const { error } = await supabase.from('site_feedback').insert({ message: feedbackMessage, category: feedbackCategory, user_id: userId || null });
    if (error) { showToast("Failed to send feedback.", 'error'); } 
    else { 
        setFeedbackMessage(''); setIsFeedbackOpen(false); 
        showToast("Feedback sent! Thank you.", 'success'); 
    }
    setIsSendingFeedback(false);
  };

  const submitClinicUpdate = async () => {
    if (!userId) return setIsAuthOpen(true);
    if (!updateMessage.trim()) { showToast("Please describe what needs to be updated.", 'error'); return; }
    
    setIsSubmittingUpdate(true);
    const result = await submitClinicUpdateAction(selectedClinic.id, userId, updateMessage);
    
    if (result.success) {
      setIsUpdatingClinic(false);
      setUpdateMessage('');
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    setIsSubmittingUpdate(false);
  };

  const toggleTheme = () => { 
    setIsDarkMode(!isDarkMode);
    sendGAEvent('event', 'theme_toggle', { theme: !isDarkMode ? 'dark' : 'light' });
  };
  
  const inputStyle = `w-full h-[42px] px-3 rounded-xl text-base md:text-sm outline-none border transition-colors min-w-0 ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/50' : 'bg-black/5 border-black/10 text-slate-900 focus:border-emerald-600/50 placeholder:text-slate-500'}`;
  const btnHover = "cursor-pointer hover:scale-105 active:scale-95 transition-transform";
  const labelStyle = `text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-white/50' : 'text-gray-600'}`;

  const handleTooltip = (e: React.MouseEvent, info: any) => {
    e.stopPropagation(); e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    const tooltipWidth = 192; 
    const screenWidth = window.innerWidth;
    if (x + tooltipWidth > screenWidth) { x = screenWidth - tooltipWidth - 20; }
    if (x < 10) x = 10; 
    setTooltipState({ x, y: rect.top, info, visible: true });
  };

  const hideTooltip = () => { if (tooltipState) { setTooltipState({ ...tooltipState, visible: false }); setTimeout(() => setTooltipState(null), 200); } };

  const getSidebarClass = () => {
      const base = `absolute z-20 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] pb-[env(safe-area-inset-bottom)]`;
      const desktop = "md:inset-auto md:right-6 md:top-6 md:bottom-6 md:w-125 md:h-auto md:rounded-4xl md:translate-y-0";
      
      let mobile = "";
      if (selectedClinic) { mobile = "inset-x-0 bottom-0 top-[45dvh] rounded-t-3xl pointer-events-auto"; }
      else if (showMobileMap) { mobile = "inset-0 top-[env(safe-area-inset-top)] rounded-none pointer-events-auto"; }
      else { mobile = "inset-x-0 bottom-0 top-[120dvh] pointer-events-none"; }
      
      return `${base} ${desktop} ${mobile}`;
  };

  const stopPropagation = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
  };

  const LoginWarning = () => (
    !userId ? (
        <div className={`p-6 mt-4 text-center rounded-2xl border border-dashed ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}`}>
            <div className={`text-[11px] uppercase font-black tracking-widest flex items-center justify-center gap-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                <ShieldAlert size={14} /> Must be a Vet Student to Join
            </div>
            <p className="text-[10px] mt-2 opacity-60 max-w-50 mx-auto">Sign in to add reviews, submit clinics, and vote.</p>
        </div>
    ) : null
  );

// 1. Define the dynamic colors as CSS variables
  const popupThemeStyles = {
    '--popup-bg': isDarkMode ? '#1a1a1a' : '#ffffff',
    '--popup-text': isDarkMode ? '#ffffff' : '#0f172a',
    '--popup-border': isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    '--popup-tip': isDarkMode ? '#1a1a1a' : '#ffffff',
  } as React.CSSProperties;

  return (
    <div 
      className={`relative w-full h-dvh min-h-screen font-sans antialiased overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-charcoal text-white' : 'bg-slate-50 text-slate-900'}`} 
      onClick={hideTooltip}
      // 2. Inject the variables here
      style={popupThemeStyles} 
    >
      <style jsx global>{`
        .custom-map-popup .maplibregl-popup-content { 
            border-radius: 16px !important; 
            padding: 10px !important; 
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important; 
            background: var(--popup-bg) !important;
            color: var(--popup-text) !important;
            border: 1px solid var(--popup-border) !important;
            min-width: 200px;
        }
        .custom-map-popup .maplibregl-popup-tip { border-top-color: var(--popup-tip) !important; }
        .scroll-container { -webkit-overflow-scrolling: touch; }
      `}</style>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} isDarkMode={isDarkMode} />}

      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} isDarkMode={isDarkMode} />
      
      {showWelcome && (
        <div className="fixed inset-0 z-500 overflow-y-auto bg-black flex flex-col items-center animate-in fade-in duration-700">
           <div className={`absolute inset-0 opacity-20 pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(circle_at_50%_50%,#059669_0%,transparent_50%)]' : 'bg-[radial-gradient(circle_at_50%_50%,#10b981_0%,transparent_50%)]'}`} />
           <div className="relative w-full max-w-4xl px-6 py-20 flex flex-col items-center text-center">
              <div className={`mb-8 p-4 rounded-3xl ${isDarkMode ? 'bg-vet-mint/10 text-vet-mint' : 'bg-emerald-600/10 text-emerald-600 animate-bounce'}`}>
                <Stethoscope size={48} />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 animate-in slide-in-from-bottom-4 duration-500">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">The Clinical Experience Directory</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-6 leading-[0.9]">
                Rate My <br/>
                <span className={isDarkMode ? 'text-vet-mint' : 'text-emerald-500'}>Externship</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed mb-12">
                The community-driven platform for <span className="text-white font-bold">Veterinary Students</span> to discover, rate, and share honest experiences about clinical externships.
              </p>
              <div className="grid md:grid-cols-3 gap-6 w-full mb-16">
                 <div className="p-8 rounded-4xl border border-white/10 bg-white/5 backdrop-blur-sm text-left group hover:bg-white/10 transition-all">
                    <MapIcon className="text-vet-mint mb-4" size={24}/>
                    <h3 className="text-white font-black uppercase italic text-sm mb-2">Find Clinics</h3>
                    <p className="text-xs text-white/50 leading-relaxed">Search hundreds of locations by animal focus, stipend availability, and provided housing.</p>
                 </div>
                 <div className="p-8 rounded-4xl border border-white/10 bg-white/5 backdrop-blur-sm text-left group hover:bg-white/10 transition-all">
                    <Star className="text-vet-mint mb-4" size={24}/>
                    <h3 className="text-white font-black uppercase italic text-sm mb-2">Read Reviews</h3>
                    <p className="text-xs text-white/50 leading-relaxed">Get the real story on mentorship, hands-on surgical time, and hospital culture from peers.</p>
                 </div>
                 <div className="p-8 rounded-4xl border border-white/10 bg-white/5 backdrop-blur-sm text-left group hover:bg-white/10 transition-all">
                    <GraduationCap className="text-vet-mint mb-4" size={24}/>
                    <h3 className="text-white font-black uppercase italic text-sm mb-2">Pay it Forward</h3>
                    <p className="text-xs text-white/50 leading-relaxed">Add your own experiences to help fellow DVM students make better educational choices.</p>
                 </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
                  <button onClick={closeWelcome} className={`group relative flex items-center justify-center gap-4 px-12 py-6 rounded-full font-black uppercase tracking-widest text-sm transition-all hover:scale-105 active:scale-95 shadow-2xl ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'}`}>
                    Enter Platform
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => { closeWelcome(); setIsAuthOpen(true); }} className="flex items-center justify-center gap-4 px-12 py-6 rounded-full font-black uppercase tracking-widest text-sm transition-all border border-white/20 text-white hover:bg-white/10">
                    Sign In / Join
                  </button>
              </div>
              <p className="mt-8 text-[10px] font-bold text-white/30 uppercase tracking-widest">Built by Vet Students, for Vet Students</p>
           </div>
        </div>
      )}
      
      {isAboutOpen && (<div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"><div className={`relative w-full max-w-lg p-8 rounded-4xl border shadow-2xl ${isDarkMode ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'}`}><button onClick={() => setIsAboutOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'}`}><X size={20} /></button><h2 className={`text-xl font-black uppercase italic mb-4 ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>Why I Built This</h2><p className="text-sm leading-relaxed mb-6 opacity-80">As a veterinary student, I realized how difficult it was to find annecdotal information about externship locations. We rely so much on word-of-mouth, that advice from previous students often gets lost to time.<br/><br/>I built <strong>RateMyExternship</strong> to give the community a place to share honest experiences about mentorship, housing, and culture at externship locations, so we can all make better decisions for our education.</p><h3 className="text-sm font-bold uppercase mb-2 opacity-50">How to use</h3><ul className="space-y-3 text-sm opacity-80 mb-8"><li className="flex gap-3"><MapIcon size={16} className="shrink-0 text-vet-mint"/> <span><strong>Browse the Map:</strong> Explore clinics visually or switch to the list view to filter by stipend, housing, and more.</span></li><li className="flex gap-3"><Plus size={16} className="shrink-0 text-vet-mint"/> <span><strong>Add Locations:</strong> If your externship isn't listed, add it! It helps the community grow.</span></li><li className="flex gap-3"><Stethoscope size={16} className="shrink-0 text-vet-mint"/> <span><strong>Leave Reviews:</strong> Anonymous, honest feedback helps future students know what to expect.</span></li></ul><button onClick={() => setIsAboutOpen(false)} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-vet-mint text-charcoal shadow-vet-mint/20 shadow-lg' : 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-lg'}`}>Got it!</button></div></div>)}

      {isFeedbackOpen && (<div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"><div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDarkMode ? 'bg-[#0f0f0f] border-white/10' : 'bg-white border-black/10'}`}><button onClick={() => setIsFeedbackOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'}`}><X size={20} /></button><h3 className={`text-lg font-black uppercase italic mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Send Feedback</h3><p className={`text-xs mb-4 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Found a bug? Have a suggestion? Let me know!</p><div className="flex gap-2 mb-4">{['General', 'Bug', 'Feature'].map(cat => (<button key={cat} onClick={() => setFeedbackCategory(cat)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${feedbackCategory === cat ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50')}`}>{cat}</button>))}</div><textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Type your message here..." className={`w-full p-4 rounded-xl text-sm h-32 outline-none border mb-4 resize-none ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/50 text-white' : 'bg-black/5 border-black/10 text-slate-900 focus:border-emerald-600/50'}`} /><button onClick={submitFeedback} disabled={isSendingFeedback || !feedbackMessage.trim()} className={`w-full py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-vet-mint text-charcoal hover:bg-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}>{isSendingFeedback ? <Loader2 className="animate-spin" size={14}/> : <><Send size={14}/> Send Feedback</>}</button></div></div>)}
      
      {isUpdatingClinic && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDarkMode ? 'bg-[#0f0f0f] border-white/10' : 'bg-white border-black/10'}`}>
                <button onClick={() => setIsUpdatingClinic(false)} className={`absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'}`}><X size={20} /></button>
                <h3 className={`text-lg font-black uppercase italic mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Suggest an Update</h3>
                <p className={`text-xs mb-4 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Is the info for <span className="font-bold">{selectedClinic?.name}</span> out of date? Let us know what changed.</p>
                <textarea value={updateMessage} onChange={(e) => setUpdateMessage(e.target.value)} placeholder="e.g. They no longer provide housing..." className={`w-full p-4 rounded-xl text-sm h-32 outline-none border mb-4 resize-none ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/50 text-white' : 'bg-black/5 border-black/10 text-slate-900 focus:border-emerald-600/50'}`} />
                <button onClick={submitClinicUpdate} disabled={isSubmittingUpdate || !updateMessage.trim()} className={`w-full py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-vet-mint text-charcoal hover:bg-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}>
                    {isSubmittingUpdate ? <Loader2 className="animate-spin" size={14}/> : <><Send size={14}/> Submit Update Request</>}
                </button>
            </div>
        </div>
      )}

      {tooltipState && (<div className={`fixed w-48 p-3 rounded-xl border backdrop-blur-md z-100 shadow-2xl transition-opacity duration-200 pointer-events-none ${tooltipState.visible ? 'opacity-100' : 'opacity-0'} ${isDarkMode ? 'bg-black/90 border-white/20' : 'bg-white/90 border-black/10'}`} style={{ top: tooltipState.y - 80, left: tooltipState.x }}><p className="text-[9px] mb-1 opacity-70">1: {tooltipState.info.low}</p><p className="text-[9px] font-bold">5: {tooltipState.info.high}</p></div>)}
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 md:hidden flex gap-2 pb-[env(safe-area-inset-bottom)]">{!selectedClinic && (<button onClick={() => setShowMobileMap(!showMobileMap)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-10 ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'} ${btnHover}`}>{showMobileMap ? <><MapIcon size={18} /> Show Map</> : <><List size={18} /> Show List</>}</button>)}</div>
      
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex flex-col items-start gap-2"><div className={`p-4 rounded-3xl backdrop-blur-xl border shadow-2xl flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black'}`}><div className="flex items-center gap-3"><p className="text-[11px] font-bold tracking-tight">© {new Date().getFullYear()} RateMyExternship</p><a href="https://www.linkedin.com/in/jyot-patel-5792921b3/" target="_blank" rel="noreferrer" className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10 text-black'}`}><Linkedin size={14}/></a><button onClick={() => setIsFeedbackOpen(true)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10 text-black'}`} title="Send Feedback"><MessageSquare size={14} /></button></div></div></div>
      
      <aside className={getSidebarClass()} onTouchMove={stopPropagation}>
        <div className={`h-full w-full relative overflow-hidden rounded-t-3xl md:rounded-4xl border-l md:border shadow-2xl backdrop-blur-xl flex flex-col transition-all ${isDarkMode ? 'bg-black/90 md:bg-black/85 border-white/20' : 'bg-white/95 border-black/10'}`}>
          <div className={`border-b flex items-center justify-between gap-2 px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <div className="flex items-center gap-2 min-w-0"><img src="/logo.png" alt="Logo" className="h-6 md:h-8 w-auto object-contain" /><h2 className={`text-xs md:text-lg font-black italic uppercase tracking-tighter truncate pr-1 ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>RateMyExternship</h2></div>
            <div className="flex items-center gap-2 shrink-0"><button onClick={() => setIsAboutOpen(true)} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} title="About"><HelpCircle size={18} /></button><button onClick={toggleTheme} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button><button onClick={() => setIsAddingClinic(true)} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'}`}><Plus size={18} /></button>{userId ? (<button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}><LogOut size={18}/></button>) : (<button onClick={() => setIsAuthOpen(true)} className={`px-3 md:px-4 py-2 border rounded-full text-[10px] font-black uppercase ${btnHover} ${isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint hover:bg-vet-mint/20' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600 hover:bg-emerald-600/20'}`}>Login</button>)}</div>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className={`absolute inset-0 z-30 p-6 overflow-y-auto bg-inherit transition-transform duration-300 ${isAddingClinic ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex justify-between items-center mb-6"><h3 className={`text-lg font-black italic uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Add Location</h3><button onClick={() => setIsAddingClinic(false)} className={btnHover}><X size={20}/></button></div>
                <div className="space-y-4 pb-20">
                    <div className="relative">
                        <label className={labelStyle}>Step 1: Search Address</label>
                        <div className="flex gap-2 mb-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"/>
                                <input placeholder="Search by name or address..." className={`pl-9 pr-10 ${inputStyle}`} value={addressQuery} onChange={e => { setAddressQuery(e.target.value); setShowAddressSuggestions(true); }} />
                                {addressQuery && (
                                    <button onClick={() => setAddressQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-black/40'}`}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {!isManualMode && (<button onClick={() => { setIsManualMode(true); if (newClinic.latitude === 0 && map.current) { const { lng, lat } = map.current.getCenter(); setNewClinic(prev => ({ ...prev, latitude: lat, longitude: lng })); } }} className={`text-[10px] font-bold uppercase underline tracking-wider w-full text-center hover:opacity-80 transition-opacity ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Can't find address? Enter details manually</button>)}
                        {showAddressSuggestions && addressSuggestions.length > 0 && (<div className={`absolute top-full left-0 w-full mt-2 border rounded-xl z-50 overflow-hidden shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{addressSuggestions.map((s, i) => (<button key={i} type="button" onClick={() => selectAddress(s)} className={`w-full text-left p-3 border-b text-xs last:border-0 transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-vet-mint/20 border-white/5' : 'hover:bg-emerald-600/10 border-black/5'}`}><span className={`font-bold block text-[11px] mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.name || s.display_name.split(',')[0]}</span><span className="opacity-50 text-[10px] block truncate">{s.display_name}</span></button>))}</div>)}
                    </div>
                    {(newClinic.latitude !== 0 || isManualMode) && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-vet-mint/5 border-vet-mint/20' : 'bg-emerald-600/5 border-emerald-600/20'}`}><p className="text-[10px] font-bold uppercase opacity-50 flex items-center gap-1"><Check size={12}/> {isManualMode ? "Manual Entry Mode Active" : "Location Locked"}</p>{!isManualMode && (<p className="text-[10px] font-mono opacity-70 mt-1">{newClinic.latitude.toFixed(6)}, {newClinic.longitude.toFixed(6)}</p>)}</div>
                            <div><label className={labelStyle}>Clinic Name</label><input value={newClinic.name} onChange={e => setNewClinic({...newClinic, name: e.target.value})} className={inputStyle} /></div>
                            <div><label className={labelStyle}>Website (Optional)</label><input placeholder="https://..." value={newClinic.website} onChange={e => setNewClinic({...newClinic, website: e.target.value})} className={inputStyle} /></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Address</label><input value={newClinic.address} onChange={e => setNewClinic({...newClinic, address: e.target.value})} className={inputStyle} /></div><div><label className={labelStyle}>City</label><input value={newClinic.city} onChange={e => setNewClinic({...newClinic, city: e.target.value})} className={inputStyle} /></div></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>State</label><input value={newClinic.state} onChange={e => setNewClinic({...newClinic, state: e.target.value})} className={inputStyle} /></div><div><label className={labelStyle}>Zip/Postal</label><input value={newClinic.postal_code} onChange={e => setNewClinic({...newClinic, postal_code: e.target.value})} className={inputStyle} /></div></div>
                            <div><label className={labelStyle}>Country</label><input value={newClinic.country} onChange={e => setNewClinic({...newClinic, country: e.target.value})} className={inputStyle} /></div>
                            <div><label className={labelStyle}>Ownership Type</label><div className="flex flex-wrap gap-2">{OWNERSHIP_TYPES.map(t => (<button key={t} onClick={() => setNewClinic({...newClinic, ownership_type: t})} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${newClinic.ownership_type === t ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-transparent border-white/20 text-white/50' : 'bg-transparent border-black/20 text-black/50')}`}>{t}</button>))}</div></div>
                            <div><label className={labelStyle}>Specialty</label><div className="flex flex-wrap gap-2">{SPECIALTIES.map(s => {const isActive = newClinic.specialties.includes(s);return (<button key={s} onClick={() => setNewClinic(prev => ({...prev, specialties: isActive ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s]}))} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${isActive ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-transparent border-white/20 text-white/50' : 'bg-transparent border-black/20 text-black/50')}`}>{s}</button>)})}</div></div>
                            <div><label className={labelStyle}>Primary Focus</label><div className="flex flex-wrap gap-2">{ANIMAL_TYPES.map(t => {const isActive = newClinic.animal_types.includes(t);return (<button key={t} onClick={() => setNewClinic(prev => ({...prev, animal_types: isActive ? prev.animal_types.filter(x => x !== t) : [...prev.animal_types, t]}))} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${isActive ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-transparent border-white/20 text-white/50' : 'bg-transparent border-black/20 text-black/50')}`}>{t}</button>);})}</div></div>
                            <div><label className={labelStyle}>Student Years Accepted</label><div className="flex flex-wrap gap-2">{VET_YEARS.map(yr => {const isSelected = newClinic.open_to_years.includes(yr);return (<button key={yr} onClick={() => setNewClinic(prev => ({...prev, open_to_years: isSelected ? prev.open_to_years.filter(y => y !== yr) : [...prev.open_to_years, yr]}))} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${isSelected ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-transparent border-white/20 text-white/50' : 'bg-transparent border-black/20 text-black/50')}`}>{yr}</button>);})}</div></div>
                            <div className="grid gap-3"><button type="button" onClick={() => setNewClinic({...newClinic, provides_housing: !newClinic.provides_housing})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${newClinic.provides_housing ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Housing Provided? {newClinic.provides_housing ? <Check size={16}/> : <Bed size={16}/>}</button><button type="button" onClick={() => setNewClinic({...newClinic, provides_stipend: !newClinic.provides_stipend})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${newClinic.provides_stipend ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Stipend Provided? {newClinic.provides_stipend ? <Check size={16}/> : <DollarSign size={16}/>}</button><button type="button" onClick={() => setNewClinic({...newClinic, allows_surgery: !newClinic.allows_surgery})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${newClinic.allows_surgery ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Hands-on Surgery? {newClinic.allows_surgery ? <Check size={16}/> : <Scissors size={16}/>}</button><button type="button" onClick={() => setNewClinic({...newClinic, hosts_intern_residents: !newClinic.hosts_intern_residents})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${newClinic.hosts_intern_residents ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Hosts Interns/Residents? {newClinic.hosts_intern_residents ? <Check size={16}/> : <Building size={16}/>}</button></div>
                            <button onClick={submitClinic} disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg mt-4 flex justify-center items-center gap-2 ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{isSubmitting ? <Loader2 className="animate-spin" size={14} /> : 'Confirm & Submit'}</button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`absolute inset-0 flex flex-col bg-inherit transition-all duration-500 ease-in-out ${selectedClinic || isAddingClinic ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100 pointer-events-auto'}`} style={{touchAction: 'pan-y'}}>
                <div className={`p-6 border-b space-y-6 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                      <input placeholder="Search hospital name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 pr-10 py-3 border rounded-xl text-base md:text-[13px] outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/30' : 'bg-black/5 border-black/10 focus:border-emerald-600/30 text-slate-900 placeholder:text-slate-500'}`} />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-black/40'}`}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-xl border transition-all ${btnHover} ${showFilters ? (isDarkMode ? 'bg-vet-mint border-vet-mint text-charcoal' : 'bg-emerald-600 border-emerald-600 text-white') : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-black/5 border-black/10 text-black/40')}`}><SlidersHorizontal size={18} /></button>
                  </div>
                  {showFilters && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="relative"><input placeholder="Country" className={inputStyle} value={countryInput} onChange={e => { setCountryInput(e.target.value); setShowCountrySuggestions(true); }} onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)} />{showCountrySuggestions && countrySuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{countrySuggestions.map(c => (<button key={c} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setCountryFilter(c); setCountryInput(c); }}>{c}</button>))}</div>}</div>
                            <div className="relative"><input placeholder="State" className={inputStyle} value={stateInput} onChange={e => { setStateInput(e.target.value); setShowStateSuggestions(true); }} onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)} />{showStateSuggestions && stateSuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{stateSuggestions.map(s => (<button key={s} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setStateFilter(s); setStateInput(s); }}>{s}</button>))}</div>}</div>
                            <div className="relative"><input placeholder="City" className={inputStyle} value={cityInput} onChange={e => { setCityInput(e.target.value); setShowCitySuggestions(true); }} onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)} />{showCitySuggestions && citySuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{citySuggestions.map(c => (<button key={c} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setCityFilter(c); setCityInput(c); }}>{c}</button>))}</div>}</div>
                        </div>
                        <div>
                            <p className={labelStyle}>Animal Focus</p>
                            <div className="flex flex-wrap gap-2"><button onClick={() => setAnimalFocusFilter('All')} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer hover:bg-white/10 active:scale-95 ${animalFocusFilter === 'All' ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : 'border-white/10 opacity-50'}`}>All</button>{ANIMAL_TYPES.map(t => (<button key={t} onClick={() => setAnimalFocusFilter(t)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer hover:bg-white/10 active:scale-95 ${animalFocusFilter === t ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : 'border-white/10 opacity-50'}`}>{t}</button>))}</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {['Stipend', 'Surgery', 'Interns', 'Housing'].map((f) => {
                                const active = (f === 'Stipend' && stipendOnly) || (f === 'Surgery' && surgeryOnly) || (f === 'Interns' && internsOnly) || (f === 'Housing' && housingOnly);
                                return (
                                    <button 
                                        key={f} 
                                        onClick={() => {
                                            if (f === 'Stipend') setStipendOnly(!stipendOnly);
                                            else if (f === 'Surgery') setSurgeryOnly(!surgeryOnly);
                                            else if (f === 'Interns') setInternsOnly(!internsOnly);
                                            else if (f === 'Housing') setHousingOnly(!housingOnly);
                                        }} 
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${active ? (isDarkMode ? 'bg-vet-mint border-vet-mint text-charcoal' : 'bg-emerald-600 border-emerald-600 text-white') : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-black/5 border-black/10 text-black/40')}`}
                                    >
                                        {f}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => { setSearchQuery(''); setCountryFilter('All'); setStateFilter('All'); setCityFilter('All'); setCountryInput(''); setStateInput(''); setCityInput(''); setStipendOnly(false); setSurgeryOnly(false); setInternsOnly(false); setHousingOnly(false); setAnimalFocusFilter('All'); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"><RefreshCcw size={12}/> Reset All Filters</button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide scroll-container pb-48" style={{ touchAction: "pan-y" }}>
                  {loadingClinics ? (
                    <>
                      <SkeletonCard isDarkMode={isDarkMode} />
                      <SkeletonCard isDarkMode={isDarkMode} />
                      <SkeletonCard isDarkMode={isDarkMode} />
                      <SkeletonCard isDarkMode={isDarkMode} />
                      <SkeletonCard isDarkMode={isDarkMode} />
                    </>
                  ) : (
                    filteredClinics.map(clinic => (
                      <button key={clinic.id} onClick={() => { flyToClinic(clinic); }} className={`w-full text-left p-5 rounded-3xl border border-transparent transition-all flex justify-between items-start group cursor-pointer hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md ${isDarkMode ? 'hover:bg-white/5 hover:border-white/10' : 'hover:bg-black/5 hover:border-black/10'}`}>
                          <div className="max-w-[70%]"><h3 className={`font-bold text-[14px] truncate transition-colors ${isDarkMode ? 'group-hover:text-vet-mint text-white' : 'group-hover:text-emerald-600 text-slate-900'}`}>{clinic.name}</h3><p className="text-[10px] font-bold opacity-30 uppercase">{clinic.city}, {clinic.country}</p><div className="flex flex-wrap gap-1 mt-2">{clinic.animal_types?.slice(0, 3).map((t: string) => (<span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-tight opacity-70 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>{t}</span>))}</div></div><div className={`px-2 py-1 rounded-lg text-[11px] font-black tracking-tighter border ${isDarkMode ? 'bg-vet-mint/10 text-vet-mint border-vet-mint/20' : 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20'}`}>★ {getAvg(clinic.reviews)}</div>
                      </button>
                    ))
                  )}
                  <LoginWarning />
                </div>
            </div>

            <div className={`absolute inset-0 flex flex-col bg-inherit transition-all duration-500 ease-in-out ${selectedClinic && !isAddingClinic ? 'opacity-100 scale-100 z-10 pointer-events-auto' : 'opacity-0 pointer-events-none scale-95'}`} style={{touchAction: 'pan-y'}}>
                {selectedClinic && (
                    <>
                        <div className={`p-4 flex items-center gap-3 border-b ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-black/10 bg-white/20'} py-4 h-auto`}>
                            <button onClick={() => { setSelectedClinic(null); setIsReviewing(false); setShowMobileMap(true); }} className={`p-2 rounded-full transition-colors ${btnHover} ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><ChevronLeft size={20} /></button>
                            <h3 className={`font-bold truncate text-[14px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isReviewing ? 'Rate Experience' : selectedClinic.name}</h3>
                        </div>
                        <div ref={detailsContainerRef} className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6 scroll-container pb-48" style={{ touchAction: "pan-y" }}>
                            {!isReviewing ? (
                                <div className="space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-300">
                                    <div className={`flex items-center justify-between p-5 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'}`}><div><p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'opacity-30' : 'text-gray-500'}`}>Score</p><div className="flex items-baseline gap-1 mt-1"><span className={`text-4xl font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{getAvg(selectedClinic.reviews)}</span><span className={`text-sm font-bold ${isDarkMode ? 'opacity-20' : 'text-gray-400'}`}>/ 5.0</span></div></div><div className="text-right"><p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'opacity-30' : 'text-gray-500'}`}>Focus</p><p className={`text-[10px] font-black leading-tight ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{selectedClinic.animal_types?.length > 0 ? selectedClinic.animal_types?.join(', ') : 'General'}</p></div></div>
                                    
                                    <div className="space-y-2">
                                        {selectedClinic.website && (
                                            <a href={ensureProtocol(selectedClinic.website)} target="_blank" rel="noopener noreferrer" className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest border transition-all ${btnHover} ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20 text-white' : 'bg-white border-black/10 text-slate-900 hover:bg-gray-50 shadow-sm'}`}><Globe size={14}/> Official Website</a>
                                        )}
                                        <button onClick={() => !userId ? setIsAuthOpen(true) : setIsUpdatingClinic(true)} className={`w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <AlertCircle size={12} /> Out of date? Suggest an update
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">{Object.entries(RUBRIC).map(([key, info], idx) => (<div key={key} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'}`}><div className="flex justify-between items-start mb-1"><p className={`text-[10px] uppercase font-bold tracking-widest ${isDarkMode ? 'opacity-30' : 'text-gray-500'}`}>{info.label}</p><button className="opacity-30 hover:opacity-100 transition-opacity p-1 cursor-help" onMouseEnter={(e) => handleTooltip(e, info)} onMouseLeave={hideTooltip} onClick={(e) => handleTooltip(e, info)}><Info size={12} /></button></div><p className={`text-2xl font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{getAvg(selectedClinic.reviews, key)}</p></div>))}</div>
                                    <div className={`p-5 rounded-3xl border space-y-3 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
                                      <p className={`text-[10px] font-bold uppercase flex items-center gap-2 ${isDarkMode ? 'opacity-30' : 'text-gray-500'}`}>
                                        <GraduationCap size={14}/> Open to Student Years
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedClinic.open_to_years?.length > 0 ? (
                                          VET_YEARS.map((yr) => {
                                            const isOk = selectedClinic.open_to_years?.includes(yr);
                                            return (
                                              <span key={yr} className={`px-3 py-1 text-[9px] rounded uppercase font-bold border transition-all ${isOk ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-black/5 border-black/5 text-black/20')}`}>
                                                {yr}
                                              </span>
                                            );
                                          })
                                        ) : (<span className="text-[9px] opacity-40 italic">No specific years listed</span>)}
                                      </div>
                                    </div>
                                    <div className="space-y-2"><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.provides_stipend ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Stipend Provided</span>{selectedClinic.provides_stipend ? <Check size={16}/> : <Home size={16} />}</div><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.provides_housing ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Housing Provided</span>{selectedClinic.provides_housing ? <Check size={16}/> : <Bed size={16} />}</div><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.allows_surgery ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Hands-on Surgery</span>{selectedClinic.allows_surgery ? <Check size={16}/> : <Scissors size={16} />}</div><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.hosts_intern_residents ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Hosts Interns/Residents</span>{selectedClinic.hosts_intern_residents ? <Check size={16}/> : <Building size={16} />}</div></div>
                                    <div className="mt-4 pt-4 border-t border-dashed border-opacity-20 border-gray-500"><h4 className="text-[10px] font-bold uppercase opacity-50 mb-4">Recent Reviews</h4>{selectedClinic.reviews && selectedClinic.reviews.length > 0 ? (selectedClinic.reviews.map((r: any, i: number) => (<div key={i} className={`p-5 rounded-2xl mb-3 border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><span className={`text-lg font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{r.overall_rating}★</span>{r.duration_weeks && <span className={`text-[9px] px-2 py-1 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'}`}><Clock size={8}/> {r.duration_weeks} wks</span>}{r.externship_year && <span className={`text-[9px] px-2 py-1 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'}`}><Calendar size={8}/> {r.externship_year}</span>}</div></div>{r.service_externed && (<div className="mb-2"><span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${isDarkMode ? 'bg-vet-mint/10 text-vet-mint' : 'bg-emerald-600/10 text-emerald-600'}`}>{r.service_externed}</span></div>)}<p className={`text-xs leading-relaxed italic ${isDarkMode ? 'opacity-80' : 'text-gray-700'}`}>"{r.comment}"</p></div>))) : (<div className="text-center p-8 opacity-40 text-xs italic">No reviews yet. Be the first!</div>)}</div>
                                    <button onClick={() => !userId ? setIsAuthOpen(true) : setIsReviewing(true)} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal shadow-vet-mint/20' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}>Add Review</button>
                                    <LoginWarning />
                                </div>
                            ) : (
                                <div className="space-y-6 pb-20 animate-in slide-in-from-right duration-300">
                                   <div className={`p-5 border rounded-3xl text-center ${isDarkMode ? 'bg-vet-mint/5 border-vet-mint/20' : 'bg-emerald-600/5 border-emerald-600/20'}`}><label className={`text-[11px] font-black uppercase block mb-2 tracking-widest ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>Overall experience</label><RangeSlider value={ratings.overall_rating} max={5} onChange={(val) => setRatings({...ratings, overall_rating: val})} isDarkMode={isDarkMode} /><div className={`text-3xl font-black mt-2 ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{ratings.overall_rating} ★</div></div>
                                   <div className={`p-5 border rounded-3xl ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className="flex justify-between items-center mb-2"><label className="text-[11px] font-bold uppercase opacity-60">Duration of Externship</label><span className={`text-[12px] font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{ratings.duration_weeks} Weeks</span></div><RangeSlider value={ratings.duration_weeks} max={4} onChange={(val) => setRatings({...ratings, duration_weeks: val})} isDarkMode={isDarkMode} /><div className="flex justify-between text-[9px] opacity-30 mt-2"><span>1 Week</span><span>4 Weeks+</span></div></div>
                                   <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Year of Externship</label><input type="text" inputMode="numeric" maxLength={4} placeholder="YYYY" value={ratings.externship_year} onChange={(e) => setRatings({...ratings, externship_year: e.target.value.replace(/\D/g,'')})} className={inputStyle} /></div>
                                   <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Which service did you extern with?</label><div className="relative"><Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} /><input type="text" placeholder="e.g. Neurology, Oncology, General..." value={ratings.service_externed} onChange={(e) => setRatings({...ratings, service_externed: e.target.value})} className={`pl-9 ${inputStyle}`} /></div></div>
                                   {Object.entries(RUBRIC).map(([key, info]) => (<div key={key} className={`p-5 rounded-3xl border space-y-4 relative ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className="flex justify-between items-center"><div className="flex items-center gap-2"><label className="text-[11px] font-bold uppercase opacity-60">{info.label}</label><span className={`text-[11px] font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{(ratings as any)[key]} / 5</span></div><button className="opacity-30 hover:opacity-100 transition-opacity p-1 cursor-help" onMouseEnter={(e) => handleTooltip(e, info)} onMouseLeave={hideTooltip} onClick={(e) => handleTooltip(e, info)}><Info size={14} /></button></div><RangeSlider value={(ratings as any)[key]} max={5} onChange={(val) => setRatings({...ratings, [key]: val})} isDarkMode={isDarkMode} /></div>))}
                                   <textarea placeholder="Tell us more about your experience..." value={comment} onChange={e => setComment(e.target.value)} className={`w-full p-4 rounded-2xl text-[13px] h-32 outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/30' : 'bg-black/5 border-black/10 focus:border-emerald-600/30 text-slate-900 placeholder:text-slate-500'}`} />
                                   <button onClick={submitReview} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'}`}>Submit Review</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

          </div>
        </div>
      </aside>

      {/* FOOTER INFO (Desktop only) */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex flex-col items-start gap-2">
          <div className={`p-4 rounded-3xl backdrop-blur-xl border shadow-2xl flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black'}`}>
              <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold tracking-tight">© {new Date().getFullYear()} RateMyExternship</p>
                  <a href="https://www.linkedin.com/in/jyotpatel28" target="_blank" rel="noreferrer" className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10 text-black'}`}><Linkedin size={14}/></a>
                  <button onClick={() => setIsFeedbackOpen(true)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10 text-black'}`} title="Send Feedback"><MessageSquare size={14} /></button>
              </div>
          </div>
      </div>

    </div>
  );
}