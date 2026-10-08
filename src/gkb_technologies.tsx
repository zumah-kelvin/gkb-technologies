import React, { useState, useEffect } from 'react';
import { 
  Cpu, Shield, Smartphone, Wrench, Phone, Mail, Globe, Camera,
  User, Lock, LogOut, PlusCircle, CheckCircle, AlertTriangle, 
  Send, Server, Terminal, Activity, Layers, ArrowRight, CheckSquare, Square,
  Sun, Moon, CreditCard
} from 'lucide-react';

type ServiceType = 'student-projects' | 'retail-gadgets';

type UserType = {
  role: 'admin' | 'client';
  email: string;
};

type Device = {
  id: number;
  name: string;
  key: string;
  status: string;
  lastAlert: string;
};

type Complaint = {
  id: number;
  clientEmail: string;
  text: string;
  solved: boolean;
  date: string;
};

export default function GKBSite() {
  // Navigation & Authentication States
  const [activeTab, setActiveTab] = useState('about');
  const [isLightMode, setIsLightMode] = useState(
    () => window.localStorage.getItem('gkb-theme') === 'light'
  );
  const [user, setUser] = useState<UserType | null>(null); // null, { role: 'admin', email: '...' }, or { role: 'client', email: '...' }
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [demoPaymentComplete, setDemoPaymentComplete] = useState(false);

  // Admin / Client Dynamic App Data
  const [devices, setDevices] = useState<Device[]>([
    { id: 1, name: 'Smart Home Security System v1', key: 'GKB-SEC-9988', status: 'Online', lastAlert: 'Intrusion detected at Living Room (14:22 PM)' },
    { id: 2, name: 'Smart Water Tank Monitor', key: 'GKB-WTR-4412', status: 'Standby', lastAlert: 'Water level stable at 85%' }
  ]);

  const [linkedDevices, setLinkedDevices] = useState<Device[]>([]);
  const [inputKey, setInputKey] = useState('');
  const [linkMessage, setLinkMessage] = useState('');

  // Admin New Device Form
  const [newDevName, setNewDevName] = useState('');
  const [newDevKey, setNewDevKey] = useState('');

  // Complaints System
  const [complaints, setComplaints] = useState<Complaint[]>([
    deviceComplaintSample()
  ]);
  function deviceComplaintSample(): Complaint {
    return { id: 1, clientEmail: 'student.client@gmail.com', text: 'Water tank sensor reading fluctuates when pump starts.', solved: false, date: '2026-06-01' };
  }
  const [newComplaintText, setNewComplaintText] = useState('');

  useEffect(() => {
    window.localStorage.setItem('gkb-theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  // Handle Login Logic based on user requirements
  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');

    // Check Admin credentials
    if (loginEmail.trim() === 'zumkel023@gmail.com' && loginPassword === '123456789') {
      setUser({ role: 'admin', email: loginEmail });
      setActiveTab(selectedService ? 'service-portal' : 'devices');
      setLoginModalOpen(false);
      clearInputs();
      return;
    }

    // Check Client / Google Login simulation
    if (loginEmail.includes('@') && loginPassword.length >= 6) {
      setUser({ role: 'client', email: loginEmail });
      setActiveTab(selectedService ? 'service-portal' : 'devices');
      setLoginModalOpen(false);
      clearInputs();
      return;
    }

    setLoginError('Invalid credentials. For Admin use strict email/pass. For Client use valid email & password.');
  };

  const handleGoogleMockLogin = () => {
    setUser({ role: 'client', email: 'google.client.user@gmail.com' });
    setActiveTab(selectedService ? 'service-portal' : 'devices');
    setLoginModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('about');
    setSelectedService(null);
    setDemoPaymentComplete(false);
  };

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setDemoPaymentComplete(false);
    if (user) {
      setActiveTab('service-portal');
    } else {
      setLoginError('');
      setLoginModalOpen(true);
    }
  };

  const clearInputs = () => {
    setLoginEmail('');
    setLoginPassword('');
  };

  // Device Linking action for Client
  const handleLinkDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = devices.find((d: Device) => d.key === inputKey.trim());
    if (found) {
      if (!linkedDevices.some((d: Device) => d.key === found.key)) {
        setLinkedDevices([...linkedDevices, found]);
        setLinkMessage(`Success! Device "${found.name}" linked to your portal.`);
      } else {
        setLinkMessage('Device is already linked to your account.');
      }
    } else {
      setLinkMessage('Invalid Device Special Key. Check with Admin.');
    }
    setInputKey('');
  };

  // Admin action: Create Device
  const handleCreateDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDevName || !newDevKey) return;
    const created: Device = { id: Date.now(), name: newDevName, key: newDevKey, status: 'Online', lastAlert: 'System initialized successfully.' };
    setDevices([...devices, created]);
    setNewDevName('');
    setNewDevKey('');
  };

  // Submit Complaint
  const handleSubmitComplaint = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComplaintText.trim() || !user) return;
    const item: Complaint = {
      id: Date.now(),
      clientEmail: user.email,
      text: newComplaintText,
      solved: false,
      date: new Date().toLocaleDateString()
    };
    setComplaints([item, ...complaints]);
    setNewComplaintText('');
  };

  // Toggle Complaint Solved Status (Admin only)
  const toggleComplaintSolved = (id: number) => {
    setComplaints(complaints.map(c => c.id === id ? { ...c, solved: !c.solved } : c));
  };

  const navigationItems = [
    { tab: 'about', label: 'About Us', visible: true },
    {
      tab: 'devices',
      label: user?.role === 'admin' ? 'Admin Portal (Devices)' : 'My Devices',
      visible: Boolean(user)
    },
    {
      tab: 'service-portal',
      label: 'Service Portal',
      visible: Boolean(user && selectedService)
    },
    {
      tab: 'admin-complaints',
      label: 'Admin Complaints',
      visible: user?.role === 'admin'
    },
    {
      tab: 'client-complaints',
      label: 'Submit Complaint',
      visible: user?.role === 'client'
    },
    { tab: 'contact', label: 'Contact Us', visible: true }
  ];

  const renderNavigationItems = () => navigationItems
    .filter(item => item.visible)
    .map(item => (
      <button
        key={item.tab}
        type="button"
        onClick={() => setActiveTab(item.tab)}
        aria-current={activeTab === item.tab ? 'page' : undefined}
        className={`shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
          activeTab === item.tab
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
            : 'text-slate-400 hover:text-cyan-300'
        }`}
      >
        {item.label}
      </button>
    ));

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden ${isLightMode ? 'theme-light' : ''}`}>
      
      {/* Background Cyberpunk Grid & Glows */}
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none ${isLightMode ? 'hidden' : ''}`}></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="relative z-50 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          
          {/* Logo Brand */}
          <div className="flex min-w-0 items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => setActiveTab('about')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px] shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="truncate text-sm sm:text-lg font-black tracking-wider bg-gradient-to-r from-cyan-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
                GKB TECHNOLOGIES
              </h1>
              <p className="hidden sm:block text-[10px] text-cyan-400/70 tracking-widest uppercase">God Knows Best • Built Beyond Limits</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center space-x-1">
            {renderNavigationItems()}
          </nav>

          {/* Authentication Action Button */}
          <div className="flex shrink-0 items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => setIsLightMode(!isLightMode)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-300 sm:px-3"
              aria-label={`Switch to ${isLightMode ? 'dark' : 'light'} mode`}
              aria-pressed={isLightMode}
              title={`Switch to ${isLightMode ? 'dark' : 'light'} mode`}
            >
              {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="hidden sm:inline">{isLightMode ? 'Dark mode' : 'Light mode'}</span>
            </button>
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-900 border border-purple-500/30 px-2 sm:px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                <span className="text-xs text-purple-300 font-mono truncate max-w-[72px] sm:max-w-[120px]">{user?.email}</span>
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setSelectedService(null);
                  setLoginError('');
                  setLoginModalOpen(true);
                }}
                className="relative group px-3 sm:px-4 py-2 rounded-lg font-medium text-[10px] sm:text-xs tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all"
              >
                Access Portal
              </button>
            )}
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="flex md:hidden gap-1 overflow-x-auto border-t border-slate-800/70 px-3 py-2">
          {renderNavigationItems()}
        </nav>
      </header>

      {/* Main Content Sections */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ================= ABOUT US TAB ================= */}
        {activeTab === 'about' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs tracking-wide">
                <Terminal className="w-3.5 h-3.5" />
                <span>Innovate • Build • Succeed</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                GKB <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">TECHNOLOGIES</span>
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
                "God Knows Best" — Building Future Innovators and pushing advanced tech solutions beyond limits.
              </p>
              <div className="text-sm text-purple-400 font-mono tracking-widest uppercase">
                CEO: Zumah Kelvin
              </div>
            </div>

            {/* Dual Focus Core Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button
                type="button"
                onClick={() => handleServiceSelect('student-projects')}
                aria-label="Sign in to Student Project Solutions"
                className="h-full w-full rounded-2xl p-6 sm:p-8 text-left bg-slate-900/60 border border-cyan-500/30 backdrop-blur-xl relative group hover:border-cyan-400 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.05)]"
              >
                <div className="absolute top-0 right-0 p-6 text-cyan-500/20 group-hover:text-cyan-500/40 transition-colors">
                  <Cpu className="w-12 h-12" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Student Project Solutions</span>
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Comprehensive engineering support specialized in Mini Projects, Final Year Projects, build-ups, and functional prototyping across multiple disciplines:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Electrical Engineering', 'Information Technology', 'Agriculture Tech', 'Pharmacy Systems', 'IoT & Embedded'].map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
                  Sign in for project support <ArrowRight className="h-4 w-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleServiceSelect('retail-gadgets')}
                aria-label="Sign in to Retail Gadget Distribution"
                className="h-full w-full rounded-2xl p-6 sm:p-8 text-left bg-slate-900/60 border border-purple-500/30 backdrop-blur-xl relative group hover:border-purple-400 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 transition-all shadow-[0_0_30px_rgba(168,85,247,0.05)]"
              >
                <div className="absolute top-0 right-0 p-6 text-purple-500/20 group-hover:text-purple-500/40 transition-colors">
                  <Smartphone className="w-12 h-12" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>Retail Gadget Distribution</span>
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  High-grade tech hardware distribution providing top-tier devices optimized for productivity, entertainment, and modern digital lifestyles.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Smartphones', 'Laptops', 'Accessories', 'Smart TVs', 'Gaming Consoles'].map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-300">
                  Sign in to view gadgets <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>

            {/* Why Work With Us */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/20">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Why Work With GKB Technologies?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Expert Guidance', desc: 'Direct mentorship from industry specialists under CEO Zumah Kelvin.' },
                  { title: 'High-Quality Output', desc: 'Detailed, production-ready design and thorough functional prototyping.' },
                  { title: 'On-Time Delivery', desc: 'Strict milestone tracking ensuring timely project delivery.' },
                  { title: 'Cost-Effective Pricing', desc: 'Student-friendly budgets engineered without sacrificing performance.' },
                  { title: 'Customized Support', desc: 'Tailor-made adjustments matching your specific academic or commercial scope.' },
                  { title: 'Plagiarism-Free', desc: '100% original code, documentation, and conceptual build-ups.' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all">
                    <div className="text-cyan-400 font-bold mb-1 flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN / CLIENT DEVICES PORTAL ================= */}
        {activeTab === 'devices' && user && (
          <div className="space-y-8 animate-fadeIn">
            {user?.role === 'admin' ? (
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/40">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center space-x-2">
                    <Server className="w-5 h-5" />
                    <span>Admin Panel: Create & Register New IoT Device</span>
                  </h3>
                  <form onSubmit={handleCreateDevice} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      placeholder="Device Name (e.g. Smart Security v2)" 
                      value={newDevName}
                      onChange={(e) => setNewDevName(e.target.value)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Special Device Key (e.g. GKB-SEC-7711)" 
                      value={newDevKey}
                      onChange={(e) => setNewDevKey(e.target.value)}
                      className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
                      required
                    />
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Deploy Device</span>
                    </button>
                  </form>
                </div>

                {/* All System Devices List */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <h4 className="text-lg font-bold text-white mb-4">All Active Devices in GKB Ecosystem</h4>
                  <div className="space-y-3">
                    {devices.map(d => (
                      <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-white font-bold flex items-center space-x-2">
                            <span>{d.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{d.status}</span>
                          </div>
                          <div className="text-xs font-mono text-cyan-400 mt-1">Special Key: {d.key}</div>
                          <div className="text-xs text-slate-400 mt-1">Telemetry Status: {d.lastAlert}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Client Add Device & Monitor Portal */
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/40">
                  <h3 className="text-xl font-bold text-cyan-400 mb-2 flex items-center space-x-2">
                    <Cpu className="w-5 h-5" />
                    <span>Link Your ESP32 Device</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Enter the special device key provided by GKB Technologies to sync your ESP32 hardware telemetry and intrusion alarms to your portal.
                  </p>
                  <form onSubmit={handleLinkDevice} className="flex flex-col sm:flex-row gap-4 max-w-xl">
                    <input 
                      type="text" 
                      placeholder="Enter Special Key (e.g. GKB-SEC-9988)" 
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none font-mono"
                      required
                    />
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg text-sm hover:bg-cyan-400 transition-colors"
                    >
                      Link Device
                    </button>
                  </form>
                  {linkMessage && (
                    <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                      {linkMessage}
                    </div>
                  )}
                </div>

                {/* Linked Devices & Real-Time Alerts */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-white">Your Linked Hardware Dashboards</h4>
                  {linkedDevices.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-sm">
                      No devices linked yet. Use a valid GKB special key above to connect your ESP32 system.
                    </div>
                  ) : (
                    linkedDevices.map(ld => (
                      <div key={ld.id} className="p-6 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-white font-bold text-base flex items-center space-x-2">
                              <span>{ld.name}</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            </h5>
                            <p className="text-xs font-mono text-cyan-400">Key: {ld.key}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            ESP32 Connected
                          </span>
                        </div>

                        {/* Live Threat Notification Simulated Card */}
                        <div className="p-4 rounded-xl bg-slate-950 border border-red-500/30 flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-red-300 uppercase tracking-wide">Live Telemetry Feed & Threat Status</div>
                            <div className="text-xs text-slate-300 font-mono">{ld.lastAlert}</div>
                            <div className="text-[10px] text-slate-500">Actions Taken: SMS Dispatched + Direct Emergency Call Forwarded via GSM Module.</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SERVICE PORTAL ================= */}
        {activeTab === 'service-portal' && user && selectedService && (
          <div className="mx-auto max-w-4xl space-y-6 animate-fadeIn">
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 sm:p-8">
              <p className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Signed in as {user.email}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {selectedService === 'student-projects' ? 'Student Project Solutions' : 'Retail Gadget Distribution'}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {selectedService === 'student-projects'
                  ? 'Your project service portal is ready. Contact GKB to discuss your project scope and payment details.'
                  : 'Browse your linked device dashboard and contact GKB to confirm gadget availability and pricing.'}
              </p>
            </div>

            <section className="rounded-2xl border border-purple-500/30 bg-slate-900/60 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Your linked devices</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {linkedDevices.length
                      ? `${linkedDevices.length} device${linkedDevices.length === 1 ? '' : 's'} linked to your account.`
                      : 'Link a device to view its dashboard and latest status.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('devices')}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <Cpu className="h-4 w-4" />
                  View device dashboard
                </button>
              </div>
              {linkedDevices.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {linkedDevices.map(device => (
                    <div key={device.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-semibold text-white">{device.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{device.status} · {device.lastAlert}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                Demo checkout
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Checkout is currently a demo only. No payment provider, price, or real charge is configured.
              </p>
              <button
                type="button"
                onClick={() => setDemoPaymentComplete(true)}
                className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Preview demo checkout
              </button>
              {demoPaymentComplete && (
                <p role="status" className="mt-3 text-sm text-emerald-300">
                  Demo checkout preview complete. No payment was processed or money charged.
                </p>
              )}
            </section>
          </div>
        )}

        {/* ================= ADMIN COMPLAINTS TAB ================= */}
        {activeTab === 'admin-complaints' && user && user?.role === 'admin' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-2xl font-bold text-white">Client Complaints Review Center</h3>
            <p className="text-xs text-slate-400">Review tickets submitted by clients, fix issues, and check them off as resolved.</p>
            
            <div className="space-y-4">
              {complaints.map(c => (
                <div key={c.id} className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${c.solved ? 'bg-slate-950/40 border-slate-900 opacity-70' : 'bg-slate-900 border-cyan-500/30'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-cyan-400">{c.clientEmail}</span>
                      <span className="text-[10px] text-slate-500">• {c.date}</span>
                    </div>
                    <p className="text-sm text-slate-200">{c.text}</p>
                  </div>
                  <button 
                    onClick={() => toggleComplaintSolved(c.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${c.solved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-cyan-500 hover:text-black'}`}
                  >
                    {c.solved ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                    <span>{c.solved ? 'Marked as Solved' : 'Mark as Solved'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= CLIENT SUBMIT COMPLAINT TAB ================= */}
        {activeTab === 'client-complaints' && user && user?.role === 'client' && (
          <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-cyan-400" />
                <span>Submit a Support Complaint or Project Query</span>
              </h3>
              <p className="text-xs text-slate-400">
                Your complaint goes straight to CEO Zumah Kelvin and the GKB admin panel for immediate resolution.
              </p>
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <textarea 
                  rows={4}
                  placeholder="Describe your issue or custom project inquiry here..."
                  value={newComplaintText}
                  onChange={(e) => setNewComplaintText(e.target.value)}
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-cyan-400 focus:outline-none"
                  required
                ></textarea>
                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Submit Ticket to Admin
                </button>
              </form>
            </div>

            {/* My Submitted Complaints History */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Your Submitted Tickets</h4>
              {complaints.filter(c => c.clientEmail === user?.email).length === 0 ? (
                <p className="text-xs text-slate-500">No complaints submitted yet.</p>
              ) : (
                complaints.filter(c => c.clientEmail === user?.email).map(c => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-200">{c.text}</p>
                      <span className="text-[10px] text-slate-500">{c.date}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono ${c.solved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                      {c.solved ? 'Resolved' : 'Pending Review'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= CONTACT US TAB ================= */}
        {activeTab === 'contact' && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Get in Touch With GKB Technologies</h2>
              <p className="text-sm text-slate-400">Reach out for project consultations, device purchases, or technical inquiries.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Telephone & WhatsApp */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-cyan-500/30 space-y-4">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center space-x-2">
                  <Phone className="w-5 h-5" />
                  <span>Direct Lines</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 font-mono">+233 552117787</span>
                    <span className="text-xs text-cyan-400 font-bold">Primary</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 font-mono">+233 25 690 5290</span>
                    <span className="text-xs text-cyan-400 font-bold">Secondary</span>
                  </div>
                </div>

                <div className="pt-2">
                  <a 
                    href="https://wa.me/233536820868" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                  >
                    <span>Chat on WhatsApp (+233 536820868)</span>
                  </a>
                </div>
              </div>

              {/* Email & Socials */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-500/30 space-y-4">
                <h3 className="text-lg font-bold text-purple-400 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Digital Channels</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300 font-mono text-xs">gkbtechnologies1@gmail.com</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-3">
                    <Camera className="w-4 h-4 text-pink-400" />
                    <span className="text-slate-300 font-mono text-xs">Instagram: @gkb_technologies</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-3">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 font-mono text-xs">TikTok: @gkbtech</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* LOGIN MODAL OVERLAY */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">
                {selectedService === 'student-projects'
                  ? 'Sign in for Student Project Solutions'
                  : selectedService === 'retail-gadgets'
                    ? 'Sign in for Retail Gadget Distribution'
                    : 'GKB Portal Authentication'}
              </h3>
              <p className="text-xs text-slate-400">Sign in to view your service portal, devices, and demo checkout.</p>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. zumkel023@gmail.com" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Password</label>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold rounded-lg text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-widest">Or Quick Client Access</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button 
              onClick={handleGoogleMockLogin}
              className="w-full py-2.5 bg-slate-950 border border-slate-700 hover:border-cyan-400 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Simulate Google Account Sign-In</span>
            </button>

            <div className="text-center pt-2">
              <button 
                onClick={() => setLoginModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel & Return Home
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}