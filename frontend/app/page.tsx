"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Plane, Search, ArrowRight, User, Calendar, MapPin, ListTodo, ThumbsUp, Wallet, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { destinationsApi, type DestinationResult } from "@/lib/api";

// Animation Variants
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;
  const { scrollY } = useScroll();
  const router = useRouter();

  // Search bar state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DestinationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** Debounced destination search */
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await destinationsApi.search(value.trim());
        setSearchResults(res.destinations);
        setShowDropdown(res.destinations.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  /** Navigate to trip creation with selected destination */
  const handleDestinationSelect = (dest: DestinationResult) => {
    setSearchQuery(dest.name);
    setShowDropdown(false);
    const params = new URLSearchParams({ destination: dest.name });
    if (startDate) params.set("start_date", startDate);
    router.push(isLoggedIn ? `/trip/create?${params}` : `/login?redirect=/trip/create?${params}`);
  };

  /** Close dropdown on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fade out the generated mountain landscape to reveal the provided landscape underneath
  const heroBgOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  
  // Navbar glassmorphism opacity and color change based on scroll
  const navBackground = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.85)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 1)"]);
  const navColor = useTransform(scrollY, [0, 100], ["#ffffff", "#101828"]);
  const navShadow = useTransform(scrollY, [0, 100], ["none", "0 10px 40px -10px rgba(0,0,0,0.1)"]);

  return (
    <main className="min-h-screen bg-white font-sans selection:bg-[#00D1B2] selection:text-white">
      
      {/* 
        ========================================
        NAVIGATION BAR (Floating & Centered)
        ========================================
      */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 w-full pointer-events-none">
        <motion.nav 
          style={{ backgroundColor: navBackground, borderColor: navBorder, color: navColor, boxShadow: navShadow }}
          className="pointer-events-auto flex items-center justify-between px-6 py-3 md:py-4 rounded-full backdrop-blur-md border border-white/20 w-full max-w-5xl transition-colors duration-300"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Plane className="w-5 h-5 md:w-6 md:h-6 -rotate-45" strokeWidth={2.5} />
            <span className="hidden sm:inline">TripMate</span>
          </Link>

          {/* Center Links (Desktop only) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            <Link href="#features" className="hover:text-[#00D1B2] transition-colors">Features</Link>
            <Link href="#destinations" className="hover:text-[#00D1B2] transition-colors">Destinations</Link>
            <Link href="#about" className="hover:text-[#00D1B2] transition-colors">About</Link>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#101828] text-white text-sm font-bold hover:bg-black transition-all hover:scale-105 active:scale-95">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#101828] text-white text-sm font-bold hover:bg-black transition-all hover:scale-105 active:scale-95">
                Login
              </Link>
            )}
            <Link href={isLoggedIn ? "/trip/create" : "/login"} className="px-5 py-2.5 md:px-6 rounded-full bg-[#00D1B2] text-white text-sm font-bold flex items-center gap-2 hover:bg-[#00c0a3] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#00D1B2]/30">
              <span className="hidden sm:inline">Plan Trip</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.nav>
      </div>

      {/* 
        ========================================
        HERO SECTION
        ========================================
      */}
      <section className="relative w-full h-[100vh] min-h-[700px] flex flex-col justify-center items-center text-center px-4 overflow-hidden md:rounded-b-[4rem]">
        {/* Bottom layer: The provided landscape */}
        <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/assets/images/provided_landscape.png')" }} 
        />
        {/* Top layer: The generated landscape, fades out on scroll */}
        <motion.div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ 
              backgroundImage: "url('/assets/images/generated_landscape.png')",
              opacity: heroBgOpacity
            }} 
        />
        {/* Overlay gradient to ensure text legibility */}
        <div className="absolute inset-0 bg-black/40 z-0" />

        {/* Hero Content */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center mt-12"
        >
          <motion.div variants={fadeUp} className="inline-block mb-6 px-4 py-1.5 rounded-full border border-white/30 backdrop-blur-sm bg-white/10 text-white text-xs font-bold tracking-widest uppercase shadow-sm">
            Collaborative Travel Planning
          </motion.div>
          
          <motion.h1 
            variants={fadeUp}
            className="text-5xl md:text-7xl lg:text-[6rem] font-bold text-white tracking-widest leading-[1.05] mb-8"
          >
            Plan your perfect trip, <br className="hidden md:block"/> together.
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/90 max-w-2xl font-medium mb-12">
            Build itineraries, vote on destinations, and split expenses seamlessly. The ultimate tool for modern group travel.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
            <Link href={isLoggedIn ? "/trip/create" : "/login"} className="px-8 py-4 rounded-full bg-[#00D1B2] text-white text-base font-bold flex items-center gap-2 hover:bg-[#00c0a3] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#00D1B2]/30">
              Start Planning
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#destinations" className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-md text-white text-base font-bold flex items-center gap-2 hover:bg-white/20 transition-all border border-white/20 hover:scale-105 active:scale-95">
              Explore Destinations
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Glass Search Bar at the bottom of hero */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="absolute bottom-8 md:bottom-12 w-full max-w-4xl px-4 z-20"
          ref={dropdownRef}
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-2 flex flex-col md:flex-row shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] border border-white">
              <div className="flex-1 flex px-6 py-3 flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 relative">
                  <span className="text-xs font-bold text-[#475467] tracking-wider mb-1 uppercase">Location</span>
                  <div className="flex items-center gap-2 text-[#101828]">
                      <MapPin className="w-5 h-5 text-[#00D1B2] shrink-0" />
                      <input 
                          id="hero-search-input"
                          type="text" 
                          placeholder="Where to next?" 
                          className="bg-transparent border-none outline-none text-[#101828] placeholder-[#475467] w-full text-base font-bold uppercase tracking-wide"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                          autoComplete="off"
                      />
                      {isSearching && <Loader2 className="w-4 h-4 text-[#00D1B2] animate-spin shrink-0" />}
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showDropdown && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-72 overflow-y-auto"
                      >
                        {searchResults.map((dest) => (
                          <button
                            key={dest.id}
                            onClick={() => handleDestinationSelect(dest)}
                            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D1B2]/20 to-[#0891B2]/20 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4 text-[#00D1B2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#101828] text-sm">{dest.name}</p>
                              {dest.description && (
                                <p className="text-xs text-[#475467] truncate mt-0.5">{dest.description}</p>
                              )}
                            </div>
                            {dest.rating && dest.rating > 0 && (
                              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold shrink-0">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {dest.rating.toFixed(1)}
                              </div>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
              <div className="flex-1 flex px-6 py-3 flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <span className="text-xs font-bold text-[#475467] tracking-wider mb-1 uppercase">Dates</span>
                  <div className="flex items-center gap-2 text-[#101828]">
                      <Calendar className="w-5 h-5 text-[#00D1B2]" />
                      <input 
                          id="hero-date-input"
                          type="date" 
                          placeholder="Add dates" 
                          className="bg-transparent border-none outline-none text-[#101828] placeholder-[#475467] w-full text-base font-bold uppercase tracking-wide"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                      />
                  </div>
              </div>
              <div className="px-2 py-2 flex items-center justify-center">
                  <button 
                    onClick={() => {
                      if (searchQuery.trim()) {
                        const params = new URLSearchParams({ destination: searchQuery.trim() });
                        if (startDate) params.set("start_date", startDate);
                        router.push(isLoggedIn ? `/trip/create?${params}` : `/login?redirect=/trip/create?${params}`);
                      }
                    }}
                    aria-label="Search destinations" 
                    className="w-full md:w-16 h-14 rounded-[1.5rem] bg-[#101828] text-white flex items-center justify-center hover:bg-black transition-colors hover:scale-[1.02] active:scale-95 shadow-md"
                  >
                      <Search className="w-6 h-6" />
                  </button>
              </div>
          </div>
        </motion.div>
      </section>

      {/* 
        ========================================
        BENTO GRID FEATURES
        ========================================
      */}
      <section id="features" className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-16 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-bold text-[#101828] tracking-tight mb-6">
              Travel planning, simplified for everyone.
            </h2>
            <p className="text-[#475467] text-lg font-medium leading-relaxed">
              TripMate brings your group together. Build itineraries collaboratively, vote on the best spots, and track shared expenses in one place.
            </p>
          </div>
          <Link href="#about" className="text-[#00A08B] font-bold text-lg flex items-center gap-2 hover:gap-4 transition-all mx-auto md:mx-0">
            Learn more <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col justify-between h-[360px] group hover:bg-[#101828] transition-colors duration-200 shadow-md border-2 border-gray-200 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-[#F8F9FA] shadow-sm flex items-center justify-center text-[#101828] group-hover:bg-[#00D1B2] group-hover:text-white transition-colors duration-200">
              <ListTodo className="w-8 h-8" strokeWidth={1.5}/>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#101828] group-hover:text-white mb-3 transition-colors duration-200">Smart Itineraries</h3>
              <p className="text-[#475467] group-hover:text-white/80 font-medium transition-colors duration-200 text-lg">
                Drag-and-drop days, add notes, and build the perfect schedule with your friends in real-time.
              </p>
            </div>
          </div>

          {/* Card 2 (Accented) */}
          <div className="bg-[#00D1B2] rounded-[2rem] p-8 md:p-10 flex flex-col justify-between h-[360px] text-white shadow-xl shadow-[#00D1B2]/20 relative overflow-hidden group border-2 border-[#00A08B]">
            <div className="absolute -right-8 -top-8 text-white/20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
              <ThumbsUp className="w-64 h-64 -rotate-12" />
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white relative z-10">
              <ThumbsUp className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-3">Group Voting</h3>
              <p className="text-white/90 font-medium text-lg">
                Stop arguing over where to eat. Propose places and let everyone vote to reach a consensus quickly.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col justify-between h-[360px] group hover:bg-[#101828] transition-colors duration-200 shadow-md border-2 border-gray-200 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-[#F8F9FA] shadow-sm flex items-center justify-center text-[#101828] group-hover:bg-[#00D1B2] group-hover:text-white transition-colors duration-200">
              <Wallet className="w-8 h-8" strokeWidth={1.5}/>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#101828] group-hover:text-white mb-3 transition-colors duration-200">Expense Splitting</h3>
              <p className="text-[#475467] group-hover:text-white/80 font-medium transition-colors duration-200 text-lg">
                Keep track of who paid for what. Settle up at the end of the trip without the spreadsheet headache.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        ABOUT SECTION
        ========================================
      */}
      <section id="about" className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-0 bg-[#00D1B2]/10 blur-3xl rounded-full translate-y-8" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl"
          >
            <div 
              className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center"
            />
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1"
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-[#00D1B2]/10 text-[#00A08B] text-sm font-bold tracking-widest uppercase">
            Our Story
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#101828] tracking-tight mb-6 leading-tight">
            Built for the <br/><span className="text-[#00A08B]">modern traveler.</span>
          </h2>
          <p className="text-[#475467] text-lg lg:text-xl font-medium leading-relaxed mb-6">
            TripMate was born from the frustrating reality of messy group chats and endless spreadsheets. We believe travel should be about the destination, not the coordination.
          </p>
          <p className="text-[#475467] text-lg lg:text-xl font-medium leading-relaxed mb-8">
            Our mission is to empower groups to explore the unseen together, making planning as seamless and enjoyable as the journey itself.
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-[#101828]">10k+</span>
              <span className="text-sm font-bold text-[#475467] uppercase tracking-wider">Trips Planned</span>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-[#101828]">50+</span>
              <span className="text-sm font-bold text-[#475467] uppercase tracking-wider">Countries</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 
        ========================================
        ASYMMETRIC DESTINATIONS GALLERY
        ========================================
      */}
      <section id="destinations" className="py-24 bg-[#101828] text-white px-6 md:px-12 md:rounded-t-[4rem]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-8">
            <div className="max-w-xl">
              <h2 className="text-5xl font-bold tracking-tight mb-4">
                Trending Destinations
              </h2>
              <p className="text-white/60 text-lg font-medium">
                Find inspiration for your next group getaway. Explore the most popular locations booked by TripMate users.
              </p>
            </div>
            <Link href={isLoggedIn ? "/trip/create" : "/login"} className="px-8 py-4 rounded-full border border-white/20 hover:bg-white hover:text-[#101828] transition-colors font-bold flex items-center gap-2 w-max">
              Start a New Trip <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Asymmetric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[800px] md:h-[600px]">
            {/* Big Left Image */}
            <Link href="/destinations/sigiriya" className="md:col-span-8 rounded-[2rem] overflow-hidden relative group cursor-pointer h-full block">
              <div className="absolute inset-0 bg-[#1f2937] bg-[url('/assets/images/sigiriya.png')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/90 via-[#101828]/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                <div>
                  <h3 className="text-4xl font-bold mb-2">Sigiriya Rock Fortress</h3>
                  <p className="text-white/80 font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Ancient wonders & vibrant history</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-[#00D1B2] transition-[background-color] duration-500">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </Link>

            {/* Right Stack */}
            <div className="md:col-span-4 flex flex-col gap-6 h-full">
              {/* Top Right */}
              <Link href="/destinations/ella" className="flex-1 rounded-[2rem] overflow-hidden relative group cursor-pointer block">
                <div className="absolute inset-0 bg-[#1f2937] bg-[url('/assets/images/ella.png')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/90 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-2xl font-bold mb-1">Ella</h3>
                  <p className="text-[#00D1B2] font-bold text-sm">Scenic Train Rides & Nature</p>
                </div>
              </Link>
              
              {/* Bottom Right */}
              <Link href="/destinations/mirissa" className="flex-1 rounded-[2rem] overflow-hidden relative group cursor-pointer block">
                <div className="absolute inset-0 bg-[#1f2937] bg-[url('/assets/images/mirissa.png')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/90 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-2xl font-bold mb-1">Mirissa</h3>
                  <p className="text-[#00D1B2] font-bold text-sm">Whale Watching & Beaches</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#101828] text-white/60 py-12 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-white">
            <Plane className="w-8 h-8 -rotate-45" strokeWidth={2.5} />
            TripMate
          </div>
          <p className="text-sm font-medium">© 2026 TripMate. All rights reserved.</p>
          <div className="flex gap-8 text-sm font-bold text-white">
            <Link href="/privacy" className="hover:text-[#00D1B2] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#00D1B2] transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-[#00D1B2] transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
