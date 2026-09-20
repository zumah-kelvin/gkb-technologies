import React, { useState, useEffect } from 'react';
import { 
  Cpu, Terminal, Shield, Zap, Phone, MessageSquare, Mail, 
  Camera, Award, CheckCircle2, ShoppingBag, BookOpen, 
  ArrowRight, Users, Sparkles, Send, Globe, Compass, Laptop, 
  Smartphone, Tv, Gamepad2, Wrench, Cpu as CircuitIcon
} from 'lucide-react';

export default function GKBTechnologiesApp() {
  const [activeTab, setActiveTab] = useState('about');
  const [glitchText, setGlitchText] = useState('GKB TECHNOLOGIES');
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '', service: 'project' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('all');

  const portfolioItems = [
    {
      id: 'project-1',
      type: 'image',
      title: 'Smart Irrigation Dashboard',
      description: 'Agriculture technology prototype built for remote field monitoring.',
      category: 'Agriculture Tech',
      src: '/gallery/smart-irrigation.svg'
    },
    {
      id: 'project-2',
      type: 'image',
      title: 'Embedded Control System',
      description: 'An IoT automation unit designed for efficient device management.',
      category: 'Embedded Systems',
      src: '/gallery/embedded-control.svg'
    },
    {
      id: 'project-3',
      type: 'video',
      title: 'Prototype Demo Reel',
      description: 'A short product walkthrough showing system functionality in action.',
      category: 'Product Demo',
      src: 'https://www.w3schools.com/html/mov_bbb.mp4'
    }
  ];

  // Cyberpunk glitch effect / glowing pulse on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlitchText('GKB TECHNOLOGIES');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactForm({ name: '', email: '', message: '', service: 'project' });
    }, 4500);
  };

  const projectDomains = [
    { id: 'all', name: 'All Domains' },
    { id: 'electrical', name: 'Electrical Engineering' },
    { id: 'it', name: 'IT & Software' },
    { id: 'agri', name: 'Agriculture Tech' },
    { id: 'pharm', name: 'Pharmacy Prototyping' },
    { id: 'embed', name: 'Embedded Systems' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#030712_1px,transparent_1px),linear-gradient(to_bottom,#030712_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* Glowing Ambient Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

      <header className="relative z-20 border-b border-cyan-500/30 bg-slate-950/85 backdrop-blur-md sticky top-0 shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('about')}>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-80 animate-pulse"></div>
              <div className="relative bg-slate-900 border border-cyan-500/60 p-2.5 rounded-lg flex items-center justify-center text-cyan-400">
                <Cpu className="w-7 h-7 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                {glitchText}
              </span>
              <p className="text-[9px] sm:text-[10px] tracking-widest text-purple-400 font-mono uppercase">God Knows Best • Built Beyond Limits</p>
            </div>
          </div>

          <nav className="flex space-x-2 sm:space-x-3">
            <button 
              onClick={() => setActiveTab('about')}
              className={`px-4 sm:px-6 py-2.5 rounded-lg font-mono text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 border ${
                activeTab === 'about'
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                About Us
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('contact')}
              className={`px-4 sm:px-6 py-2.5 rounded-lg font-mono text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 border ${
                activeTab === 'contact'
                  ? 'bg-purple-500/15 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-purple-400 hover:border-purple-500/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Contact Us
              </span>
            </button>
          </nav>
        </div>
      </header>

      {}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        
        {/* ================= ABOUT US TAB ================= */}
        {activeTab === 'about' && (
          <div className="space-y-16">
            
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> INNOVATE • BUILD • SUCCEED
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                  GKB TECHNOLOGIES
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-mono italic">
                "Built Beyond Limits" — Building Future Innovators
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <div className="px-5 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-mono text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> CEO: Zumah Kelvin
                </div>
                <div className="px-5 py-2.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-purple-300 font-mono text-sm shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" /> God Knows Best
                </div>
              </div>
            </div>

            {/* Overview & Dual Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              
              {/* Student Projects Card */}
              <div className="relative group rounded-2xl p-1 bg-gradient-to-b from-cyan-500/60 via-slate-800 to-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.15)] transition-all duration-300 hover:shadow-[0_0_45px_rgba(6,182,212,0.3)]">
                <div className="h-full bg-slate-950/95 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-4 font-mono tracking-wide">Student Project Solutions</h3>
                    <p className="text-slate-300 leading-relaxed mb-6 text-sm sm:text-base">
                      Empowering students and researchers with cutting-edge academic and commercial prototypes. From mini projects to complex final-year builds, we guide you from concept to execution.
                    </p>
                    
                    {/* Domain filter tags */}
                    <div className="space-y-3 mb-6">
                      <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Specialized Domains:</div>
                      <div className="flex flex-wrap gap-2">
                        {['Electrical Engineering', 'IT & Software', 'Agriculture', 'Pharmacy', 'Embedded Systems', 'IoT Prototyping'].map((domain) => (
                          <span key={domain} className="px-3 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Includes Code & Documentation</span>
                    <span className="text-cyan-400 font-bold">100% Original</span>
                  </div>
                </div>
              </div>

              {/* Gadget Retail Card */}
              <div className="relative group rounded-2xl p-1 bg-gradient-to-b from-purple-500/60 via-slate-800 to-slate-950 shadow-[0_0_35px_rgba(168,85,247,0.15)] transition-all duration-300 hover:shadow-[0_0_45px_rgba(168,85,247,0.3)]">
                <div className="h-full bg-slate-950/95 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-purple-300 mb-4 font-mono tracking-wide">Retail Gadget Distribution</h3>
                    <p className="text-slate-300 leading-relaxed mb-6 text-sm sm:text-base">
                      Equipping tech enthusiasts, professionals, and students with top-tier hardware and electronics at unbeatable market rates. Guaranteed authenticity and durability.
                    </p>

                    {/* Gadgets inventory items */}
                    <div className="space-y-3 mb-6">
                      <div className="text-xs font-mono text-purple-400 uppercase tracking-widest">Inventory Highlights:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-mono">
                          <Smartphone className="w-3.5 h-3.5 text-purple-400" /> Smartphones
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-mono">
                          <Laptop className="w-3.5 h-3.5 text-purple-400" /> Laptops
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-mono">
                          <Tv className="w-3.5 h-3.5 text-purple-400" /> Smart TVs
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-mono">
                          <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> Consoles
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-mono">
                          <Wrench className="w-3.5 h-3.5 text-purple-400" /> Accessories
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Original Brand Warranty</span>
                    <span className="text-purple-400 font-bold">Best Market Rates</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Why Work With Us Section */}
            <div className="relative rounded-3xl bg-slate-900/70 border border-cyan-500/40 p-8 sm:p-12 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="absolute -top-3 left-8 px-4 py-1 bg-slate-900 border border-cyan-500/60 text-cyan-400 font-mono text-xs uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Why Partner With GKB Technologies
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {[
                  { title: "Expert Guidance", desc: "Professional mentoring and technical support from seasoned industry engineers.", icon: Users },
                  { title: "High-Quality Output", desc: "Detailed, robust, and rigorously tested project builds and hardware deliverables.", icon: Award },
                  { title: "On-Time Delivery", desc: "Strict adherence to academic and project deadlines without compromise.", icon: Zap },
                  { title: "Student-Friendly Pricing", desc: "Cost-effective packages designed to fit student and startup budgets.", icon: Shield },
                  { title: "Customized Support", desc: "Tailored solutions built specifically to match your unique specifications.", icon: Terminal },
                  { title: "Plagiarism-Free", desc: "100% original content, custom code, and authentic project documentation.", icon: CheckCircle2 }
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div key={idx} className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-xl transition-all duration-300 group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-200 mb-2 font-mono">{item.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Portfolio Gallery */}
            <div className="relative rounded-3xl bg-slate-900/70 border border-cyan-500/40 p-8 sm:p-12 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="absolute -top-3 left-8 px-4 py-1 bg-slate-900 border border-cyan-500/60 text-cyan-400 font-mono text-xs uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Portfolio Showcase
              </div>

              <div className="flex flex-col gap-4 pt-6">
                <div>
                  <h3 className="text-2xl font-bold font-mono text-white mb-2">Works We’ve Delivered</h3>
                  <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
                    Add your project images or videos into the public gallery folder, and they will appear here automatically for visitors.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
                {portfolioItems.map((item) => (
                  <div key={item.id} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_0_20px_rgba(15,23,42,0.6)] transition-all duration-300 hover:border-cyan-500/50 hover:-translate-y-1">
                    <div className="relative h-56 overflow-hidden bg-slate-900">
                      {item.type === 'video' ? (
                        <video
                          src={item.src}
                          controls
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img src={item.src} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-3">
                        <span className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h4 className="text-lg font-bold text-slate-100 font-mono mb-2">{item.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action Banner */}
            <div className="text-center py-10 bg-gradient-to-r from-cyan-950/50 via-purple-950/50 to-slate-950/50 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-4">Ready to Build Your Next Breakthrough?</h3>
              <p className="text-slate-300 max-w-2xl mx-auto mb-6 text-sm sm:text-base">
                Whether you need a stellar final-year project or a high-performance laptop, GKB Technologies is your ultimate partner.
              </p>
              <button 
                onClick={() => setActiveTab('contact')}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-slate-950 font-mono font-bold hover:brightness-125 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-2 mx-auto cursor-pointer"
              >
                <span>Connect With Us Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ================= CONTACT US TAB ================= */}
        {activeTab === 'contact' && (
          <div className="space-y-12 max-w-5xl mx-auto">
            
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-400 text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Compass className="w-3.5 h-3.5" /> SECURE COMMUNICATION CHANNEL
              </div>
              <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                ESTABLISH CONTACT
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                Reach out to GKB Technologies for project inquiries, gadget purchases, or technical consultations. God Knows Best.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Contact Info Cards */}
              <div className="lg:col-span-1 space-y-4">
                
                {/* Telephone */}
                <div className="bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-500/60 p-5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.08)]">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Direct Lines</div>
                      <a href="tel:+233552117787" className="text-slate-200 font-mono text-sm hover:text-cyan-300 block">+233 55 211 7787</a>
                      <a href="tel:+256905290" className="text-slate-200 font-mono text-sm hover:text-cyan-300 block">+256 90 5290</a>
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 p-5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">WhatsApp Instant</div>
                      <a href="https://wa.me/233536820868" target="_blank" rel="noreferrer" className="text-slate-200 font-mono text-sm hover:text-emerald-300 block">+233 53 682 0868</a>
                      <span className="text-[11px] text-slate-400">Available 24/7 for chats</span>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-slate-900/90 border border-purple-500/30 hover:border-purple-500/60 p-5 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.08)]">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-purple-400 uppercase tracking-wider">Email Address</div>
                      <a href="mailto:gkbtechnologies1@gmail.com" className="text-slate-200 font-mono text-xs sm:text-sm hover:text-purple-300 block break-all">gkbtechnologies1@gmail.com</a>
                    </div>
                  </div>
                </div>

                {/* Social Media Handles */}
                <div className="bg-slate-900/90 border border-pink-500/30 hover:border-pink-500/60 p-5 rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.08)]">
                  <div className="text-xs font-mono text-pink-400 uppercase tracking-wider mb-3">Cyber Networks / Socials</div>
                  <div className="space-y-2.5 font-mono text-sm">
                    <div className="flex items-center justify-between text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-pink-400" /> Instagram
                      </span>
                      <span className="text-pink-300 text-xs">@gkb_technologies</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" /> TikTok
                      </span>
                      <span className="text-cyan-300 text-xs">@gkbtech</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Inquiry Form */}
              <div className="lg:col-span-2 bg-slate-900/80 border border-purple-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                  <span className="px-3.5 py-1 bg-purple-600 text-slate-950 font-mono text-xs font-bold rounded-md shadow-[0_0_10px_rgba(168,85,247,0.5)]">SECURE FORM</span>
                </div>

                <h3 className="text-xl font-bold font-mono text-purple-300 mb-6 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" /> Send a Direct Transmission
                </h3>

                {formSubmitted ? (
                  <div className="bg-emerald-950/50 border border-emerald-500/60 rounded-xl p-8 text-center space-y-4 my-10 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-mono text-emerald-300 font-bold">Transmission Successful!</h4>
                    <p className="text-slate-300 text-sm max-w-md mx-auto">
                      Thank you for contacting GKB Technologies. CEO Zumah Kelvin and our engineering team will get back to you shortly. God Knows Best.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">Your Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Kwame Mensah"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          required
                          placeholder="name@example.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">Service Required</label>
                      <select 
                        value={contactForm.service}
                        onChange={(e) => setContactForm({ ...contactForm, service: e.target.value })}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                      >
                        <option value="project">Student Project Solution (Final Year / Mini Project)</option>
                        <option value="gadget">Retail Gadgets (Phones, Laptops, Consoles)</option>
                        <option value="consult">Technical Consultation</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">Message / Specifications</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Describe your project requirements or gadget order details..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none shadow-inner"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-slate-950 font-mono font-bold tracking-wider uppercase hover:brightness-125 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Transmit Message</span>
                    </button>
                  </form>
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      <footer className="relative z-20 mt-20 border-t border-slate-900 bg-slate-950 py-8 text-center text-xs font-mono text-slate-500 shadow-[0_-4px_20px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-cyan-400 font-bold">GKB TECHNOLOGIES</span> (God Knows Best) • CEO: Zumah Kelvin
          </div>
          <div className="text-purple-400">
            Innovate. Build. Succeed. • Built Beyond Limits © 2026
          </div>
        </div>
      </footer>

    </div>
  );
}