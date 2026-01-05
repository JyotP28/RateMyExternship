"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createClient } from '@supabase/supabase-js';
import { sendGAEvent } from '@next/third-parties/google';
import { 
  Search, ChevronLeft, Plus, LogOut, X, Check, SlidersHorizontal, Scissors, 
  Home, Building, Info, GraduationCap, RefreshCcw, Sun, Moon, AlertTriangle, 
  Loader2, Clock, Map as MapIcon, List, Globe, Calendar, ShieldAlert, Linkedin
} from 'lucide-react';
import AuthModal from '../auth/AuthModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VET_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const OWNERSHIP_TYPES = ['Private Practice', 'Corporate', 'University', 'Government', 'Non-Profit']; 
const SPECIALTIES = ['General Practice', 'Emergency/Urgent Care', 'Specialty Referral', 'Shelter Medicine', 'Laboratory/Research', 'Exotics', 'Large Animal'];
const ANIMAL_TYPES = ['Small Animal', 'Equine', 'Mixed', 'Farm', 'Exotics'];
const EXTERNSHIP_YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const RUBRIC: Record<string, { label: string, low: string, high: string }> = {
  mentorship: { label: "Mentorship", low: "1: Minimal guidance", high: "5: Active teaching" },
  hands_on: { label: "Hands-on", low: "1: Shadowing only", high: "5: Primary roles" },
  culture: { label: "Culture", low: "1: Toxic environment", high: "5: Student-focused" },
  volume: { label: "Caseload", low: "1: Slow/repetitive", high: "5: High volume" }
};

const getAvg = (reviews: any[], field: string = 'overall_rating') => {
  if (!reviews || reviews.length === 0) return "N/A";
  const sum = reviews.reduce((acc, r) => acc + (r[field] || 0), 0);
  return (sum / reviews.length).toFixed(1);
};

export default function MapContainer() {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showLightWarning, setShowLightWarning] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAddingClinic, setIsAddingClinic] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false); 
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null); // Mobile Tooltip Fix

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '', address: '', city: '', state: '', postal_code: '', country: '',
    ownership_type: 'Private Practice', website: '',
    specialties: [] as string[], animal_types: [] as string[], 
    latitude: 0, longitude: 0
  });

  const [isReviewing, setIsReviewing] = useState(false);
  const [ratings, setRatings] = useState({ 
    overall_rating: 5, mentorship: 5, hands_on: 5, culture: 5, volume: 5, 
    days_per_week: 5, hours_per_day: 9, allows_surgery: false, 
    hosts_intern_residents: false, provides_stipend: false, 
    open_to_years: [] as string[], duration_weeks: 2, externship_year: new Date().getFullYear()
  });
  const [comment, setComment] = useState('');
  
  // TOOLTIP STATE (Fix for sidebar clipping)
  const [tooltipState, setTooltipState] = useState<{ x: number, y: number, info: any } | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const filteredClinicsRef = useRef<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('clinics').select('*, reviews(*)').eq('is_approved', true);
    if (data) {
        const sorted = data.map(c => ({
            ...c,
            reviews: c.reviews?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }));
        setClinics(sorted);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user?.id ?? null));
    loadData();
    return () => subscription.unsubscribe();
  }, [mounted, loadData]);

  useEffect(() => {
    if (searchQuery.length < 3) return;
    const delay = setTimeout(() => { sendGAEvent('event', 'search', { search_term: searchQuery }); }, 2000);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const filteredClinics = useMemo(() => {
    const res = clinics.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLoc = (countryFilter === 'All' || c.country === countryFilter) && (stateFilter === 'All' || c.state === stateFilter) && (cityFilter === 'All' || c.city === cityFilter);
      const matchesAnimal = animalFocusFilter === 'All' || c.animal_types?.includes(animalFocusFilter);
      const matchesLogistics = (!stipendOnly || c.provides_stipend) && (!surgeryOnly || c.allows_surgery) && (!internsOnly || c.reviews?.some((r: any) => r.hosts_intern_residents));
      return matchesSearch && matchesLoc && matchesAnimal && matchesLogistics;
    });
    filteredClinicsRef.current = res;
    return res;
  }, [clinics, searchQuery, countryFilter, stateFilter, cityFilter, animalFocusFilter, stipendOnly, surgeryOnly, internsOnly]);

  // --- FIXED MAP INITIALIZATION ---
  useEffect(() => {
    if (!mounted || !mapContainer.current) return;
    if (map.current) return; // PREVENT DOUBLE INIT

    const m = new maplibregl.Map({ 
      container: mapContainer.current, 
      style: isDarkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/bright', 
      center: [-98.5795, 39.8283], 
      zoom: 3, 
      attributionControl: false 
    });

    m.on('load', () => {
      m.addSource('clinics', { 
        type: 'geojson', 
        data: { type: 'FeatureCollection', features: [] } // Init empty, data loads later
      });
      m.addLayer({ 
        id: 'p', type: 'circle', source: 'clinics', 
        paint: { 
          'circle-color': '#64d2b1', 
          'circle-radius': 10, 
          'circle-stroke-width': 2, 
          'circle-stroke-color': '#ffffff' // Initial default
        } 
      });
      
      setIsMapReady(true);
    });

    m.on('click', 'p', (e: any) => {
        if (e.features.length > 0) {
          const coordinates = e.features[0].geometry.coordinates.slice();
          m.flyTo({ center: coordinates, zoom: 14, speed: 1.5, curve: 1, essential: true });
          setSelectedClinic(JSON.parse(e.features[0].properties.fullData));
          setShowMobileMap(false); 
        }
    });
    
    m.on('mouseenter', 'p', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'p', () => { m.getCanvas().style.cursor = ''; });

    map.current = m;

    // CRITICAL CLEANUP FUNCTION
    return () => {
      m.remove();
      map.current = null;
    };
  }, [mounted]); // Only run once on mount

  // --- THEME UPDATE EFFECT ---
  useEffect(() => {
    if (!map.current || !isMapReady) return;
    const styleUrl = isDarkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/bright';
    map.current.setStyle(styleUrl);
    
    // Re-add layers after style change (MapLibre removes layers on setStyle)
    map.current.once('styledata', () => {
        if (!map.current?.getSource('clinics')) {
            map.current?.addSource('clinics', { 
                type: 'geojson', 
                data: { 
                    type: 'FeatureCollection', 
                    features: filteredClinicsRef.current.map(c => ({ 
                        type: 'Feature', 
                        geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] }, 
                        properties: { fullData: JSON.stringify(c) } 
                    })) 
                } 
            });
            map.current?.addLayer({ 
                id: 'p', type: 'circle', source: 'clinics', 
                paint: { 
                    'circle-color': '#64d2b1', 
                    'circle-radius': 10, 
                    'circle-stroke-width': 2, 
                    'circle-stroke-color': isDarkMode ? '#ffffff' : '#1a1a1a' 
                } 
            });
        }
    });
  }, [isDarkMode, isMapReady]);

  // --- DATA UPDATE EFFECT ---
  useEffect(() => {
    if (!isMapReady || !map.current) return;
    const s = map.current.getSource('clinics') as maplibregl.GeoJSONSource;
    if (s) { 
        s.setData({ 
            type: 'FeatureCollection', 
            features: filteredClinics.map(c => ({ 
                type: 'Feature', 
                geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] }, 
                properties: { fullData: JSON.stringify(c) } 
            })) 
        }); 
    }
  }, [isMapReady, filteredClinics]);

  // --- ACTIONS ---
  const countrySuggestions = useMemo(() => [...new Set(clinics.map(c => c.country).filter(Boolean))].filter(c => c.toLowerCase().includes(countryInput.toLowerCase())), [clinics, countryInput]);
  const stateSuggestions = useMemo(() => { const base = clinics.filter(c => countryFilter === 'All' || c.country === countryFilter); return [...new Set(base.map(c => c.state).filter(Boolean))].filter(s => s.toLowerCase().includes(stateInput.toLowerCase())); }, [clinics, countryFilter, stateInput]);
  const citySuggestions = useMemo(() => { const base = clinics.filter(c => (countryFilter === 'All' || c.country === countryFilter) && (stateFilter === 'All' || c.state === stateFilter)); return [...new Set(base.map(c => c.city).filter(Boolean))].filter(ct => ct.toLowerCase().includes(cityInput.toLowerCase())); }, [clinics, countryFilter, stateFilter, cityInput]);

  useEffect(() => {
    const fetchS = async () => {
      if (addressQuery.length < 4) { setAddressSuggestions([]); return; }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&addressdetails=1&limit=5`);
      setAddressSuggestions(await res.json());
      setShowAddressSuggestions(true);
    };
    const d = setTimeout(fetchS, 800);
    return () => clearTimeout(d);
  }, [addressQuery]);

  const selectAddress = (s: any) => {
    const a = s.address;
    let likelyName = s.name || s.display_name.split(',')[0];
    setNewClinic({ ...newClinic, name: likelyName, address: `${a.house_number || ''} ${a.road || ''}`.trim(), city: a.city || a.town || a.village || '', state: a.state || '', postal_code: a.postcode || '', country: a.country || '', latitude: parseFloat(s.lat), longitude: parseFloat(s.lon) });
    setAddressSuggestions([]); setAddressQuery(s.display_name); setShowAddressSuggestions(false);
  };

  const submitClinic = async () => {
    if (!userId) { setIsAuthOpen(true); return; }
    if (!newClinic.latitude || !newClinic.name) { alert("Please select a valid address first."); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('clinics').insert({ 
        name: newClinic.name, address: newClinic.address, city: newClinic.city, state: newClinic.state, postal_code: newClinic.postal_code, country: newClinic.country, 
        latitude: newClinic.latitude, longitude: newClinic.longitude, category: newClinic.ownership_type, website: newClinic.website, 
        specialties: newClinic.specialties, animal_types: newClinic.animal_types, submitted_by: userId, is_approved: false 
      });
      if (error) { console.error(error); alert(`Error: ${error.message}`); } 
      else { setIsAddingClinic(false); setNewClinic({ name: '', address: '', city: '', state: '', postal_code: '', country: '', ownership_type: 'Private Practice', website: '', specialties: [], animal_types: [], latitude: 0, longitude: 0 }); setAddressQuery(''); alert("Clinic submitted for verification!"); }
    } catch (err) { alert("An unexpected error occurred."); } finally { setIsSubmitting(false); }
  };

  const submitReview = async () => {
    if (!userId) return setIsAuthOpen(true);
    const { error } = await supabase.from('reviews').insert({ clinic_id: selectedClinic.id, user_id: userId, ...ratings, comment, is_approved: false });
    if (!error) { setIsReviewing(false); setComment(''); alert("Review submitted for moderation."); loadData(); } else { alert("Error submitting review. " + error.message); }
  };

  const toggleTheme = () => { if (isDarkMode) { setShowLightWarning(true); setTimeout(() => setShowLightWarning(false), 3000); } setIsDarkMode(!isDarkMode); };
  const inputStyle = `w-full p-3 rounded-xl text-[16px] md:text-[12px] outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/50' : 'bg-black/5 border-black/10 focus:border-emerald-600/50'}`;
  const btnHover = "cursor-pointer hover:scale-105 active:scale-95 transition-transform";

  const handleTooltip = (e: React.MouseEvent, info: any) => {
    e.stopPropagation(); e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipState(prev => prev?.info === info ? null : { x: rect.left, y: rect.top, info });
  };

  return (
    <div className={`relative w-full h-[100dvh] font-sans antialiased overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-charcoal text-white' : 'bg-slate-50 text-slate-900'}`} onClick={() => setTooltipState(null)}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* FIXED TOOLTIP OVERLAY */}
      {tooltipState && (
        <div 
            className={`fixed w-48 p-3 rounded-xl border backdrop-blur-md z-[100] shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none ${isDarkMode ? 'bg-black/90 border-white/20' : 'bg-white/90 border-black/10'}`}
            style={{ top: tooltipState.y - 80, left: tooltipState.x - 100 }}
        >
            <p className="text-[9px] mb-1 opacity-70">1: {tooltipState.info.low}</p>
            <p className="text-[9px] font-bold">5: {tooltipState.info.high}</p>
            <div className={`absolute -bottom-2 right-1/2 translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDarkMode ? 'border-t-white/20' : 'border-t-black/10'}`} />
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden flex gap-2">
         {showMobileMap && (<button onClick={() => setShowMobileMap(false)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-10 ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'} ${btnHover}`}><List size={18} /> Show List</button>)}
      </div>

      <div className="absolute bottom-4 left-4 z-20 hidden md:flex flex-col items-start gap-2">
         <div className={`p-4 rounded-3xl backdrop-blur-xl border shadow-2xl flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black'}`}>
            <div className="flex items-center gap-3">
                <p className="text-[11px] font-bold tracking-tight">© {new Date().getFullYear()} RateMyExternship</p>
                <a href="https://www.linkedin.com/in/jyotpatel28/" target="_blank" rel="noreferrer" className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10 text-black'}`}><Linkedin size={14}/></a>
            </div>
            <p className="text-[9px] opacity-60 font-medium">Created by Jyot Patel, DVM Student at WSU</p>
         </div>
      </div>

      {showLightWarning && (<div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-yellow-500 text-black px-6 py-3 rounded-full font-black uppercase text-[10px] flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"><AlertTriangle size={16} /> Light Mode? really?</div>)}

      <aside className={`absolute inset-0 md:inset-auto md:right-6 md:top-6 md:bottom-6 md:w-[400px] z-20 flex flex-col transition-transform duration-300 ease-in-out ${showMobileMap ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}`}>
        <div className={`h-full w-full relative overflow-hidden md:rounded-[2rem] border-l md:border shadow-2xl backdrop-blur-xl flex flex-col transition-all ${isDarkMode ? 'bg-black/85 border-white/20' : 'bg-white/95 border-black/10'}`}>
          
          <div className={`p-4 md:p-6 border-b flex items-center justify-between gap-2 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <h2 className={`text-lg md:text-xl font-black italic uppercase tracking-tighter truncate min-w-0 ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>RateMyExternship</h2>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowMobileMap(true)} className={`md:hidden p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}><MapIcon size={18} /></button>
              <button onClick={toggleTheme} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
              <button onClick={() => setIsAddingClinic(true)} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'}`}><Plus size={18} /></button>
              {userId ? (<button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className={`p-2 rounded-full ${btnHover} ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}><LogOut size={18}/></button>) : (<button onClick={() => setIsAuthOpen(true)} className={`px-3 md:px-4 py-2 border rounded-full text-[10px] font-black uppercase ${btnHover} ${isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint hover:bg-vet-mint/20' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600 hover:bg-emerald-600/20'}`}>Login</button>)}
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {isAddingClinic ? (
              <div className={`absolute inset-0 z-20 p-6 overflow-y-auto animate-in slide-in-from-bottom duration-300 scrollbar-hide ${isDarkMode ? 'bg-charcoal/95' : 'bg-slate-50/95'}`}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black italic uppercase">Add Location</h3><button onClick={() => setIsAddingClinic(false)} className={btnHover}><X size={20}/></button></div>
                <div className="space-y-4 pb-4 border-b border-dashed border-opacity-20 mb-4 border-gray-500">
                    <div className="relative"><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">Step 1: Search Address</label><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"/><input placeholder="Search by name or address..." className={`pl-9 ${inputStyle}`} value={addressQuery} onChange={e => { setAddressQuery(e.target.value); setShowAddressSuggestions(true); }} /></div>{showAddressSuggestions && addressSuggestions.length > 0 && (<div className={`absolute top-full left-0 w-full mt-2 border rounded-xl z-50 overflow-hidden shadow-2xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{addressSuggestions.map((s, i) => (<button key={i} type="button" onClick={() => selectAddress(s)} className={`w-full text-left p-3 border-b text-xs last:border-0 transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-vet-mint/20 border-white/5' : 'hover:bg-emerald-600/10 border-black/5'}`}><span className="font-bold block text-[11px] mb-0.5">{s.name || s.display_name.split(',')[0]}</span><span className="opacity-50 text-[10px] block truncate">{s.display_name}</span></button>))}</div>)}</div>
                </div>
                {newClinic.latitude !== 0 && (
                    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4">
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-vet-mint/5 border-vet-mint/20' : 'bg-emerald-600/5 border-emerald-600/20'}`}><p className="text-[10px] font-bold uppercase opacity-50 mb-2 flex items-center gap-1"><Check size={12}/> Coordinates Locked</p><p className="text-[10px] font-mono opacity-70">{newClinic.latitude.toFixed(6)}, {newClinic.longitude.toFixed(6)}</p></div>
                        <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">Clinic Name</label><input value={newClinic.name} onChange={e => setNewClinic({...newClinic, name: e.target.value})} className={inputStyle} /></div>
                        <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">Website (Optional)</label><input placeholder="https://..." value={newClinic.website} onChange={e => setNewClinic({...newClinic, website: e.target.value})} className={inputStyle} /></div>
                        <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">Address</label><input value={newClinic.address} onChange={e => setNewClinic({...newClinic, address: e.target.value})} className={inputStyle} /></div><div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">City</label><input value={newClinic.city} onChange={e => setNewClinic({...newClinic, city: e.target.value})} className={inputStyle} /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">State</label><input value={newClinic.state} onChange={e => setNewClinic({...newClinic, state: e.target.value})} className={inputStyle} /></div><div><label className="text-[10px] font-bold opacity-30 uppercase block mb-1">Zip/Postal</label><input value={newClinic.postal_code} onChange={e => setNewClinic({...newClinic, postal_code: e.target.value})} className={inputStyle} /></div></div>
                        <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Ownership Type</label><div className="flex flex-wrap gap-2">{OWNERSHIP_TYPES.map(t => (<button key={t} onClick={() => setNewClinic({...newClinic, ownership_type: t})} className={`px-2 py-1 rounded-md text-[10px] border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${newClinic.ownership_type === t ? (isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white') : 'border-white/10 opacity-50'}`}>{t}</button>))}</div></div>
                        <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Specialty</label><div className="flex flex-wrap gap-2">{SPECIALTIES.map(s => {const isActive = newClinic.specialties.includes(s);return (<button key={s} onClick={() => setNewClinic(prev => ({...prev, specialties: isActive ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s]}))} className={`px-2 py-1 rounded-md text-[10px] border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${isActive ? (isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white') : 'border-white/10 opacity-50'}`}>{s}</button>)})}</div></div>
                        <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Primary Focus</label><div className="flex flex-wrap gap-2">{ANIMAL_TYPES.map(t => {const isActive = newClinic.animal_types.includes(t);return (<button key={t} onClick={() => setNewClinic(prev => ({...prev, animal_types: isActive ? prev.animal_types.filter(x => x !== t) : [...prev.animal_types, t]}))} className={`px-2 py-1 rounded-md text-[10px] border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${isActive ? (isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white') : 'border-white/10 opacity-50'}`}>{t}</button>);})}</div></div>
                        <button onClick={submitClinic} disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg mt-4 flex justify-center items-center gap-2 ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{isSubmitting ? <Loader2 className="animate-spin" size={14} /> : 'Confirm & Submit'}</button>
                    </div>
                )}
              </div>
            ) : (
              <div className={`h-full flex flex-col transition-transform duration-500 ${selectedClinic ? '-translate-x-full' : 'translate-x-0'}`}>
                <div className={`p-6 border-b space-y-4 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                  <div className="flex gap-2">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} /><input placeholder="Search Externship Location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-[16px] md:text-[13px] outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/30' : 'bg-black/5 border-black/10 focus:border-emerald-600/30'}`} /></div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-xl border transition-all ${btnHover} ${showFilters ? (isDarkMode ? 'bg-vet-mint border-vet-mint text-charcoal' : 'bg-emerald-600 border-emerald-600 text-white') : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-black/5 border-black/10 text-black/40')}`}><SlidersHorizontal size={18} /></button>
                  </div>
                  {showFilters && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="relative"><input placeholder="Country..." className={inputStyle} value={countryInput} onChange={e => { setCountryInput(e.target.value); setShowCountrySuggestions(true); }} onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)} />{showCountrySuggestions && countrySuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{countrySuggestions.map(c => (<button key={c} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setCountryFilter(c); setCountryInput(c); }}>{c}</button>))}</div>}</div>
                        <div className="relative"><input placeholder="State..." className={inputStyle} value={stateInput} onChange={e => { setStateInput(e.target.value); setShowStateSuggestions(true); }} onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)} />{showStateSuggestions && stateSuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{stateSuggestions.map(s => (<button key={s} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setStateFilter(s); setStateInput(s); }}>{s}</button>))}</div>}</div>
                        <div className="relative"><input placeholder="City..." className={inputStyle} value={cityInput} onChange={e => { setCityInput(e.target.value); setShowCitySuggestions(true); }} onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)} />{showCitySuggestions && citySuggestions.length > 0 && <div className={`absolute z-50 top-full left-0 w-full mt-1 border rounded-xl overflow-hidden shadow-xl ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'}`}>{citySuggestions.map(c => (<button key={c} className={`w-full text-left p-3 text-[10px] border-b last:border-0 hover:bg-white/10 cursor-pointer ${isDarkMode ? 'text-white border-white/5' : 'text-black border-black/5'}`} onClick={() => { setCityFilter(c); setCityInput(c); }}>{c}</button>))}</div>}</div>
                      </div>
                      <div><p className="text-[10px] font-bold uppercase opacity-40 mb-2">Animal Focus</p><div className="flex flex-wrap gap-2"><button onClick={() => setAnimalFocusFilter('All')} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer hover:bg-white/10 active:scale-95 ${animalFocusFilter === 'All' ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : 'border-white/10 opacity-50'}`}>All</button>{ANIMAL_TYPES.map(t => (<button key={t} onClick={() => setAnimalFocusFilter(t)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer hover:bg-white/10 active:scale-95 ${animalFocusFilter === t ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : 'border-white/10 opacity-50'}`}>{t}</button>))}</div></div>
                      <div className="flex flex-wrap gap-1.5">{['Stipend', 'Surgery', 'Interns'].map((f) => {const active = (f === 'Stipend' && stipendOnly) || (f === 'Surgery' && surgeryOnly) || (f === 'Interns' && internsOnly);return (<button key={f} onClick={() => f === 'Stipend' ? setStipendOnly(!stipendOnly) : f === 'Surgery' ? setSurgeryOnly(!surgeryOnly) : setInternsOnly(!internsOnly)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${active ? (isDarkMode ? 'bg-vet-mint border-vet-mint text-charcoal' : 'bg-emerald-600 border-emerald-600 text-white') : (isDarkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-black/5 border-black/10 text-black/40')}`}>{f}</button>)})}</div>
                      <button onClick={() => { setSearchQuery(''); setCountryFilter('All'); setStateFilter('All'); setCityFilter('All'); setCountryInput(''); setStateInput(''); setCityInput(''); setStipendOnly(false); setSurgeryOnly(false); setInternsOnly(false); setAnimalFocusFilter('All'); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"><RefreshCcw size={12}/> Reset All Filters</button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
                  {filteredClinics.map(clinic => (
                    <button key={clinic.id} onClick={() => { if (map.current) { map.current.flyTo({ center: [clinic.longitude, clinic.latitude], zoom: 14, speed: 1.5, essential: true }); } setSelectedClinic(clinic); }} className={`w-full text-left p-5 rounded-3xl border border-transparent transition-all flex justify-between items-start group cursor-pointer hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md ${isDarkMode ? 'hover:bg-white/5 hover:border-white/10' : 'hover:bg-black/5 hover:border-black/10'}`}>
                        <div className="max-w-[70%]"><h3 className={`font-bold text-[14px] truncate transition-colors ${isDarkMode ? 'group-hover:text-vet-mint' : 'group-hover:text-emerald-600'}`}>{clinic.name}</h3><p className="text-[10px] font-bold opacity-30 uppercase">{clinic.city}, {clinic.country}</p><div className="flex flex-wrap gap-1 mt-2">{clinic.animal_types?.slice(0, 3).map((t: string) => (<span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-tight opacity-70 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>{t}</span>))}</div></div>
                        <div className={`px-2 py-1 rounded-lg text-[11px] font-black tracking-tighter border ${isDarkMode ? 'bg-vet-mint/10 text-vet-mint border-vet-mint/20' : 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20'}`}>★ {getAvg(clinic.reviews)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {selectedClinic && (
              <div className={`absolute inset-0 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden scrollbar-hide ${isDarkMode ? 'bg-charcoal/40' : 'bg-slate-100/40'}`}>
                <div className={`p-4 flex items-center gap-3 border-b ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-black/10 bg-white/20'}`}>
                    <button onClick={() => { setSelectedClinic(null); setIsReviewing(false); }} className={`p-2 rounded-full transition-colors ${btnHover} ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><ChevronLeft size={20} /></button>
                    <h3 className="font-bold truncate text-[14px]">{isReviewing ? 'Rate Experience' : selectedClinic.name}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
                  {!isReviewing ? (
                    <div className="space-y-6 pb-20">
                      <div className={`flex items-center justify-between p-5 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <div><p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Score</p><div className="flex items-baseline gap-1 mt-1"><span className={`text-4xl font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{getAvg(selectedClinic.reviews)}</span><span className="text-sm opacity-20">/ 5.0</span></div></div>
                        <div className="text-right"><p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Focus</p><p className={`text-[10px] font-black leading-tight ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{selectedClinic.animal_types?.join(', ') || 'General'}</p></div>
                      </div>
                      
                      {selectedClinic.website && (<a href={selectedClinic.website} target="_blank" rel="noopener noreferrer" className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest border transition-all ${btnHover} ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}><Globe size={14}/> Visit Website</a>)}

                      <div className="grid grid-cols-2 gap-4">{Object.entries(RUBRIC).map(([key, info], idx) => (<div key={key} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}><div className="flex justify-between items-start mb-1"><p className="text-[10px] uppercase font-bold opacity-30 tracking-widest">{info.label}</p><button className="opacity-30 hover:opacity-100 transition-opacity p-1 cursor-help" onMouseEnter={(e) => handleTooltip(e, info)} onClick={(e) => handleTooltip(e, info)}><Info size={12} /></button></div><p className={`text-2xl font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{getAvg(selectedClinic.reviews, key)}</p></div>))}</div>
                      <div className={`p-5 rounded-3xl border space-y-3 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}><p className="text-[10px] font-bold opacity-30 uppercase flex items-center gap-2"><GraduationCap size={14}/> Open to Student Years</p><div className="flex flex-wrap gap-2">{VET_YEARS.map(yr => { const isOk = selectedClinic.reviews?.some((r: any) => r.open_to_years?.includes(yr)); return (<span key={yr} className={`px-3 py-1 text-[9px] rounded uppercase font-bold border transition-all ${isOk ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-black/5 border-black/5 text-black/20')}`}>{yr}</span>) })}</div></div>
                      <div className="space-y-2"><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.provides_stipend ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Stipend Provided</span>{selectedClinic.provides_stipend ? <Check size={16}/> : <Home size={16} />}</div><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.allows_surgery ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Hands-on Surgery</span>{selectedClinic.allows_surgery ? <Check size={16}/> : <Scissors size={16} />}</div><div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedClinic.reviews?.some((r: any) => r.hosts_intern_residents) ? (isDarkMode ? 'border-vet-mint text-vet-mint bg-vet-mint/5' : 'border-emerald-600 text-emerald-600 bg-emerald-600/5') : 'opacity-20 border-gray-500'}`}><span className="text-xs font-bold uppercase">Hosts Interns/Residents</span>{selectedClinic.reviews?.some((r: any) => r.hosts_intern_residents) ? <Check size={16}/> : <Building size={16} />}</div></div>
                      <div className="mt-4 pt-4 border-t border-dashed border-opacity-20 border-gray-500"><h4 className="text-[10px] font-bold uppercase opacity-50 mb-4">Recent Reviews</h4>{selectedClinic.reviews && selectedClinic.reviews.length > 0 ? (selectedClinic.reviews.map((r: any, i: number) => (<div key={i} className={`p-5 rounded-2xl mb-3 border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><span className={`text-lg font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{r.overall_rating}★</span>{r.duration_weeks && <span className="text-[9px] px-2 py-1 rounded-full bg-white/10 flex items-center gap-1"><Clock size={8}/> {r.duration_weeks} wks</span>}{r.externship_year && <span className="text-[9px] px-2 py-1 rounded-full bg-white/10 flex items-center gap-1"><Calendar size={8}/> {r.externship_year}</span>}</div><span className="text-[9px] opacity-40">{new Date(r.created_at).toLocaleDateString()}</span></div><p className="text-xs opacity-80 leading-relaxed italic">"{r.comment}"</p></div>))) : (<div className="text-center p-8 opacity-40 text-xs italic">No reviews yet. Be the first!</div>)}</div>
                      <button onClick={() => !userId ? setIsAuthOpen(true) : setIsReviewing(true)} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal shadow-vet-mint/20' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}>Add Review</button>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-20 animate-in slide-in-from-right duration-300">
                       <div className={`p-5 border rounded-3xl text-center ${isDarkMode ? 'bg-vet-mint/5 border-vet-mint/20' : 'bg-emerald-600/5 border-emerald-600/20'}`}><label className={`text-[11px] font-black uppercase block mb-2 tracking-widest ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>Overall experience</label><input type="range" min="1" max="5" value={ratings.overall_rating} onChange={e => setRatings({...ratings, overall_rating: parseInt(e.target.value)})} className={`w-full cursor-pointer accent-current ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`} /><div className={`text-3xl font-black mt-2 ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{ratings.overall_rating} ★</div></div>
                       <div className={`p-5 border rounded-3xl ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className="flex justify-between items-center mb-2"><label className="text-[11px] font-bold uppercase opacity-60">Duration of Externship</label><span className={`text-[12px] font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{ratings.duration_weeks} Weeks</span></div><input type="range" min="1" max="12" step="1" value={ratings.duration_weeks} onChange={e => setRatings({...ratings, duration_weeks: parseInt(e.target.value)})} className={`w-full h-1.5 appearance-none rounded-lg cursor-pointer ${isDarkMode ? 'bg-white/10 accent-white' : 'bg-black/10 accent-black'}`} /><div className="flex justify-between text-[9px] opacity-30 mt-2"><span>1 Week</span><span>12 Weeks+</span></div></div>
                       <div><label className="text-[10px] font-bold opacity-30 uppercase block mb-2">Year of Externship</label><select value={ratings.externship_year} onChange={(e) => setRatings({...ratings, externship_year: parseInt(e.target.value)})} className={`w-full p-3 rounded-xl text-[12px] outline-none border cursor-pointer ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}>{EXTERNSHIP_YEARS.map(y => <option key={y} value={y} className="text-black">{y}</option>)}</select></div>
                       {Object.entries(RUBRIC).map(([key, info]) => (<div key={key} className={`p-5 rounded-3xl border space-y-4 relative ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}><div className="flex justify-between items-center"><div className="flex items-center gap-2"><label className="text-[11px] font-bold uppercase opacity-60">{info.label}</label><span className={`text-[11px] font-black ${isDarkMode ? 'text-vet-mint' : 'text-emerald-600'}`}>{(ratings as any)[key]} / 5</span></div><button className="opacity-30 hover:opacity-100 transition-opacity p-1 cursor-help" onMouseEnter={(e) => handleTooltip(e, info)} onClick={(e) => handleTooltip(e, info)}><Info size={14} /></button></div><input type="range" min="1" max="5" value={(ratings as any)[key]} onChange={e => setRatings({...ratings, [key]: parseInt(e.target.value)})} className={`w-full h-1.5 appearance-none rounded-lg cursor-pointer ${isDarkMode ? 'bg-white/10 accent-white' : 'bg-black/10 accent-black'}`} /></div>))}
                       <div className="space-y-2"><label className="text-[10px] font-bold opacity-30 uppercase block">Student Years Accepted</label><div className="flex flex-wrap gap-2">{VET_YEARS.map(yr => {const isSelected = ratings.open_to_years.includes(yr); return (<button key={yr} onClick={() => setRatings(prev => ({...prev, open_to_years: isSelected ? prev.open_to_years.filter(y => y !== yr) : [...prev.open_to_years, yr]}))} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${isSelected ? (isDarkMode ? 'bg-vet-mint text-charcoal border-vet-mint' : 'bg-emerald-600 text-white border-emerald-600') : (isDarkMode ? 'bg-transparent border-white/20 text-white/50' : 'bg-transparent border-black/20 text-black/50')}`}>{yr}</button>);})}</div></div>
                       <div className="grid gap-3"><button type="button" onClick={() => setRatings({...ratings, allows_surgery: !ratings.allows_surgery})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${ratings.allows_surgery ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Surgery allowed? {ratings.allows_surgery ? <Check size={16}/> : <Scissors size={16}/>}</button><button type="button" onClick={() => setRatings({...ratings, hosts_intern_residents: !ratings.hosts_intern_residents})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${ratings.hosts_intern_residents ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Hosts Interns? {ratings.hosts_intern_residents ? <Check size={16}/> : <Building size={16}/>}</button><button type="button" onClick={() => setRatings({...ratings, provides_stipend: !ratings.provides_stipend})} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:opacity-80 active:scale-95 ${ratings.provides_stipend ? (isDarkMode ? 'bg-vet-mint/10 border-vet-mint text-vet-mint' : 'bg-emerald-600/10 border-emerald-600 text-emerald-600') : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-black/5 border-black/10 opacity-40')}`}>Stipend provided? {ratings.provides_stipend ? <Check size={16}/> : <Home size={16}/>}</button></div>
                       <textarea placeholder="Tell us more about your experience..." value={comment} onChange={e => setComment(e.target.value)} className={`w-full p-4 rounded-2xl text-[13px] h-32 outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-vet-mint/30' : 'bg-black/5 border-black/10 focus:border-emerald-600/30'}`} />
                       <button onClick={submitReview} className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] ${btnHover} ${isDarkMode ? 'bg-vet-mint text-charcoal' : 'bg-emerald-600 text-white'}`}>Submit Review</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* SIDEBAR WARNING (ONLY WHEN NOT LOGGED IN) */}
          {!userId && (
            <div className={`p-4 border-t text-center ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <div className={`text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    <ShieldAlert size={12} /> Must be a Vet Student to Join
                </div>
            </div>
          )}

        </div>
      </aside>
    </div>
  );
}