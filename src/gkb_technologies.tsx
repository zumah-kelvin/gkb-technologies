import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { relayControlEnabled, relayPairingEnabled, relaySupabase, relaySupabaseConfigError } from './supabase';
import OrdersPortal from './OrdersPortal';
import {
  Cpu, Shield, Smartphone, Wrench, Phone, Mail, Globe, Camera,
  User, Lock, LogOut, PlusCircle, CheckCircle, AlertTriangle, Unlink,
  Send, Server, Terminal, Activity, Layers, ArrowRight, CheckSquare, Square,
  Sun, Moon, Zap, Wifi, Radio, Gauge, BatteryCharging, Lightbulb, Pencil, Save, X
} from 'lucide-react';

type ServiceType = 'student-projects' | 'retail-gadgets';
type StudentProject = 'fuel-tank-monitor' | 'water-tank-monitor' | 'prepaid-energy-meter' | 'alcohol-breathalyzer' | 'fan-regulator' | 'light-control' | 'relay-test';

type UserType = {
  id: string;
  role: 'admin' | 'client';
  email: string;
};

type Device = {
  id: number;
  name: string;
  key: string;
  status: string;
  lastAlert: string;
  project?: StudentProject;
  legacyKeys?: string[];
  relayChannels?: 4 | 6 | 8;
};

function isStoredDevice(value: unknown): value is Device {
  if (typeof value !== 'object' || value === null) return false;
  const device = value as Record<string, unknown>;
  const projectValues: StudentProject[] = [
    'fuel-tank-monitor',
    'water-tank-monitor',
    'prepaid-energy-meter',
    'alcohol-breathalyzer',
    'fan-regulator',
    'light-control',
    'relay-test'
  ];
  return typeof device.id === 'number' &&
    typeof device.name === 'string' &&
    typeof device.key === 'string' &&
    typeof device.status === 'string' &&
    typeof device.lastAlert === 'string' &&
    (device.project === undefined || projectValues.includes(device.project as StudentProject)) &&
    (device.legacyKeys === undefined || (Array.isArray(device.legacyKeys) && device.legacyKeys.every(key => typeof key === 'string'))) &&
    (device.relayChannels === undefined || device.relayChannels === 4 || device.relayChannels === 6 || device.relayChannels === 8);
}

const defaultDevices: Device[] = [
  { id: 1, name: 'Smart Home Security System v1', key: 'GKB-SEC-9988', status: 'Online', lastAlert: 'Intrusion detected at Living Room (14:22 PM)' },
  { id: 2, name: 'Smart Water Tank Monitor', key: 'GKB-SWP-0001', legacyKeys: ['GKB-WTR-4412'], status: 'Online', lastAlert: 'Water level stable at 68%', project: 'water-tank-monitor' },
  { id: 3, name: 'Industrial Fuel Tank Monitor', key: 'GKB-IUFT-0001', status: 'Online', lastAlert: 'Fuel level stable at 72%', project: 'fuel-tank-monitor' },
  { id: 4, name: 'GKB Smart Prepaid Energy Meter', key: 'GKB-SPEM-0001', status: 'Online', lastAlert: 'Meter secure · balance GHS 24.50', project: 'prepaid-energy-meter' },
  { id: 5, name: 'Smart Alcohol Breathalyzer System', key: 'GKB-SAB-0001', status: 'Online', lastAlert: 'Alcohol level clear · demo', project: 'alcohol-breathalyzer' },
  { id: 6, name: 'Smart Fan Regulator', key: 'GKB-FAN-0001', legacyKeys: ['GKB-SFLC-0001'], status: 'Online', lastAlert: 'Fan off · all speed relays open · demo', project: 'fan-regulator' },
  { id: 7, name: 'Smart Light Control System v1 · 4-channel', key: 'GKB-LIGHT-0001V1', legacyKeys: ['GKB-LIGHTV1-0001', 'GKB-LIGHT-0001'], status: 'Online', lastAlert: 'All 4 lights off · demo', project: 'light-control', relayChannels: 4 },
  { id: 8, name: 'Smart Light Control System v2 · 6-channel', key: 'GKB-LIGHT-0001V2', legacyKeys: ['GKB-LIGHTV2-0001'], status: 'Online', lastAlert: 'All 6 lights off · demo', project: 'light-control', relayChannels: 6 },
  { id: 9, name: 'Smart Light Control System v3 · 8-channel', key: 'GKB-LIGHT-0001V3', legacyKeys: ['GKB-LIGHTV3-0001'], status: 'Online', lastAlert: 'All 8 lights off · demo', project: 'light-control', relayChannels: 8 },
  { id: 10, name: 'Relay Test', key: 'GKB-RELAY-0001', status: 'Online', lastAlert: 'Relay off · car stationary · demo', project: 'relay-test' }
];

type Complaint = {
  id: string;
  clientId: string;
  clientEmail: string;
  text: string;
  solved: boolean;
  date: string;
};

function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
    const code = 'code' in error && typeof error.code === 'string' ? ` (${error.code})` : '';
    return [error.message + code, details, hint].filter(Boolean).join(' ');
  }
  return 'Unknown Supabase error. Check the browser console and Supabase logs.';
}

async function formatSupabaseFunctionError(error: unknown): Promise<string> {
  if (typeof error === 'object' && error !== null && 'context' in error && error.context instanceof Response) {
    try {
      const responseBody: unknown = await error.context.clone().json();
      if (typeof responseBody === 'object' && responseBody !== null && 'error' in responseBody && typeof responseBody.error === 'string') {
        return responseBody.error;
      }
    } catch {
      return formatSupabaseError(error);
    }
  }
  return formatSupabaseError(error);
}

function RelayTestDashboard({ mode }: { mode: 'test' | 'service' }) {
  const [relayOn, setRelayOn] = useState(false);
  const [relaySession, setRelaySession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(mode === 'service');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageIsError, setAuthMessageIsError] = useState(false);
  const [relayBusy, setRelayBusy] = useState(false);
  const [relayError, setRelayError] = useState('');
  const [relayMessage, setRelayMessage] = useState('');
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [relayPaired, setRelayPaired] = useState(false);

  useEffect(() => {
    if (mode !== 'service') return;
    if (!relaySupabase) {
      setConnectionState('error');
      setRelayError(relaySupabaseConfigError);
      setSessionLoading(false);
      return;
    }

    let disposed = false;
    const { data: { subscription } } = relaySupabase.auth.onAuthStateChange((_event, session) => {
      if (!disposed) {
        setRelaySession(session);
        setSessionLoading(false);
        setAuthMessage('');
      }
    });

    void relaySupabase.auth.getSession().then(({ data, error }) => {
      if (disposed) return;
      if (error) {
        setAuthMessage(error.message);
        setAuthMessageIsError(true);
      }
      setRelaySession(data.session);
      setSessionLoading(false);
    });

    const readRelayState = async () => {
      try {
        const { data, error } = await relaySupabase
          .from('relay_status')
          .select('state, updated_at, paired_at')
          .eq('device_id', 'relay_01')
          .maybeSingle();
        if (disposed) return;
        if (error) {
          setConnectionState('error');
          setRelayError(`Could not read relay_01 from Supabase: ${error.message}`);
          return;
        }
        if (!data) {
          setConnectionState('error');
          setRelayError('No relay_01 row was returned. Check the database row and its read policy.');
          return;
        }
        if (data.state !== 'ON' && data.state !== 'OFF') {
          setConnectionState('error');
          setRelayError(`Unexpected relay state returned by Supabase: ${String(data.state)}.`);
          return;
        }
        setRelayOn(data.state === 'ON');
        setRelayPaired(Boolean(data.paired_at));
        setLastSyncedAt(new Date());
        setConnectionState('connected');
        setRelayError('');
      } catch (error) {
        if (!disposed) {
          setConnectionState('error');
          setRelayError(error instanceof Error ? error.message : 'Unexpected error while reading relay state.');
        }
      }
    };

    void readRelayState();
    const pollId = window.setInterval(() => void readRelayState(), 3000);
    return () => {
      disposed = true;
      subscription.unsubscribe();
      window.clearInterval(pollId);
    };
  }, [mode]);

  const handleSupabaseAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');
    setAuthMessageIsError(false);
    if (!relaySupabase) {
      setAuthMessage(relaySupabaseConfigError);
      setAuthMessageIsError(true);
      setAuthBusy(false);
      return;
    }
    try {
      if (creatingAccount) {
        const { data, error } = await relaySupabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        setAuthMessage(data.session
          ? 'Supabase account created and signed in.'
          : 'Account created. Confirm your email if requested, then sign in.');
        setAuthPassword('');
      } else {
        const { error } = await relaySupabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        setAuthMessage('Signed in to Supabase. Relay control is available only if this account owns relay_01.');
        setAuthPassword('');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Supabase authentication failed.');
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSupabaseSignOut = async () => {
    if (!relaySupabase) return;
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const { error } = await relaySupabase.auth.signOut();
      if (error) throw error;
      setAuthMessage('Signed out of Supabase.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not sign out of Supabase.');
      setAuthMessageIsError(true);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRelayToggle = async () => {
    if (mode === 'test') {
      setRelayOn(current => !current);
      return;
    }
    if (!relayControlEnabled || !relaySupabase || !relaySession || !relayPaired || relayBusy) return;

    const nextState = relayOn ? 'OFF' : 'ON';
    setRelayBusy(true);
    setRelayError('');
    setRelayMessage('');
    try {
      const { error } = await relaySupabase
        .from('relay_status')
        .update({ state: nextState, updated_at: new Date().toISOString() })
        .eq('device_id', 'relay_01');
      if (error) throw error;

      const { data, error: verificationError } = await relaySupabase
        .from('relay_status')
        .select('state, updated_at')
        .eq('device_id', 'relay_01')
        .maybeSingle();
      if (verificationError) throw new Error(`Command was submitted, but its state could not be verified: ${verificationError.message}`);
      if (!data) {
        throw new Error('No relay_01 row is visible to this account after the command. Check its owner assignment and RLS policies.');
      }
      if (data.state !== nextState) {
        setRelayOn(data.state === 'ON');
        throw new Error(`Supabase still reports ${data.state}; the requested ${nextState} command was not confirmed.`);
      }
      setRelayOn(data.state === 'ON');
      setLastSyncedAt(new Date());
      setRelayMessage(`Database state confirmed as ${data.state}. The ESP32 polls every 3 seconds; its current firmware does not acknowledge the physical output.`);
    } catch (error) {
      setRelayError(`Could not send the relay command to Supabase: ${formatSupabaseError(error)}`);
    } finally {
      setRelayBusy(false);
    }
  };

  return (
    <section aria-labelledby="relay-test-title" className="mx-auto max-w-4xl space-y-5">
      <style>{`
        @keyframes gkb-relay-wheel-spin {
          to { transform: rotate(360deg); }
        }
        .relay-car-wheel {
          transform-box: fill-box;
          transform-origin: center;
        }
        .relay-car-wheel.is-running {
          animation: gkb-relay-wheel-spin 0.45s linear infinite;
        }
      `}</style>
      <header className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          {mode === 'test' ? 'Private device test preview · simulated' : 'Service portal · Supabase relay_01'}
        </p>
        <h2 id="relay-test-title" className="mt-2 text-xl font-bold text-white sm:text-2xl">Relay Test</h2>
        <p className="mt-1 text-sm text-slate-400">
          {mode === 'test'
            ? 'Toggle the simulated relay to start or stop the animated car wheels.'
            : 'The switch writes relay_01 to Supabase; the ESP32 polls the same row for its relay state.'}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <section aria-label="Animated car relay output" className={`flex min-h-64 flex-col items-center justify-center rounded-2xl border p-6 transition-colors ${relayOn ? 'border-emerald-400/30 bg-emerald-400/[0.04]' : 'border-slate-800 bg-slate-900/70'}`}>
          <svg role="img" aria-label={relayOn ? 'Car with spinning tires' : 'Stationary car with stopped tires'} viewBox="0 0 440 220" className="w-full max-w-lg">
            <line x1="35" y1="183" x2="405" y2="183" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
            <path d="M96 145 L123 102 Q133 86 157 83 L259 83 Q279 85 295 105 L328 123 L356 132 Q369 138 371 153 L371 169 L83 169 L83 154 Q84 147 96 145Z" fill={relayOn ? '#0891b2' : '#475569'} stroke={relayOn ? '#67e8f9' : '#94a3b8'} strokeWidth="5" strokeLinejoin="round" />
            <path d="M143 101 Q150 93 163 93 L201 93 L201 121 L128 121Z" fill="#bae6fd" opacity="0.9" />
            <path d="M213 93 L255 93 Q267 95 277 108 L286 121 L213 121Z" fill="#bae6fd" opacity="0.9" />
            <rect x="91" y="145" width="20" height="10" rx="5" fill="#fde68a" />
            <rect x="342" y="145" width="17" height="10" rx="5" fill="#fca5a5" />
            {[145, 315].map(x => (
              <g key={x} transform={`translate(${x} 166)`}>
                <g className={`relay-car-wheel${relayOn ? ' is-running' : ''}`}>
                  <circle r="28" fill="#0f172a" stroke="#cbd5e1" strokeWidth="5" />
                  <circle r="9" fill="#94a3b8" />
                  <path d="M0 -19 L0 -10 M19 0 L10 0 M0 19 L0 10 M-19 0 L-10 0" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                </g>
              </g>
            ))}
          </svg>
          <p className={`mt-2 text-sm font-semibold ${relayOn ? 'text-emerald-300' : 'text-slate-400'}`}>
            {relayOn ? 'Relay ON · tires spinning' : 'Relay OFF · car stationary'}
          </p>
        </section>

        <section aria-label="Relay switch control" className="flex min-w-56 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${mode === 'test' ? 'bg-slate-500' : connectionState === 'connected' ? 'bg-emerald-400' : connectionState === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {mode === 'test' ? 'Simulated relay' : connectionState === 'connected' ? 'Supabase connected' : connectionState === 'error' ? 'Supabase error' : 'Connecting to Supabase'}
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Relay output · relay_01</p>
          <button
            type="button"
            role="switch"
            aria-label="Relay switch"
            aria-checked={relayOn}
            onClick={() => void handleRelayToggle()}
            disabled={mode === 'service' && (!relayControlEnabled || !relaySupabase || !relaySession || !relayPaired || relayBusy || connectionState !== 'connected')}
            className={`relative h-10 w-[4.5rem] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${relayOn ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow transition-transform ${relayOn ? 'translate-x-8' : 'translate-x-0'}`} />
          </button>
          <p className={`text-lg font-bold ${relayOn ? 'text-emerald-300' : 'text-slate-300'}`}>{relayOn ? 'ON' : 'OFF'}</p>
          {mode === 'test' ? (
            <p className="text-center text-xs leading-relaxed text-slate-500">Demo only · this switch does not control a physical relay or car.</p>
          ) : (
            <>
              {lastSyncedAt && <p className="text-center text-xs text-slate-500">Last database sync: {lastSyncedAt.toLocaleTimeString()}</p>}
              {relayError && <p role="alert" className="max-w-64 text-center text-xs leading-relaxed text-red-300">{relayError}</p>}
              {relayMessage && <p role="status" className="max-w-64 text-center text-xs leading-relaxed text-emerald-200">{relayMessage}</p>}
              {!relayControlEnabled && <p role="status" className="max-w-64 text-center text-xs leading-relaxed text-amber-200">Relay control is disabled. Apply the secure Supabase SQL setup first, then set VITE_RELAY_CONTROL_ENABLED=true in Netlify.</p>}
              {relayControlEnabled && relaySupabase && relaySession && connectionState === 'connected' && !relayPaired && <p role="status" className="max-w-64 text-center text-xs leading-relaxed text-amber-200">This ESP32 has not been paired yet. Use the unique hardware key in My Devices before enabling relay commands.</p>}
              <p className="max-w-64 text-center text-xs leading-relaxed text-amber-200">
                The animation follows the database state; this firmware does not confirm the physical relay output.
              </p>
            </>
          )}
        </section>
      </div>

      {mode === 'service' && (
        <section aria-label="Supabase relay account" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          {relaySession ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Supabase signed in</p>
                <p className="mt-1 text-xs text-slate-400">{relaySession.user.email}</p>
                {authMessage && <p role={authMessageIsError ? 'alert' : 'status'} className={`mt-2 text-xs ${authMessageIsError ? 'text-red-300' : 'text-emerald-200'}`}>{authMessage}</p>}
              </div>
              <button type="button" onClick={() => void handleSupabaseSignOut()} disabled={authBusy} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 disabled:opacity-50">
                {authBusy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white">{creatingAccount ? 'Create a Supabase account' : 'Sign in to control this relay'}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                This is Supabase authentication, separate from the demo portal login. Only the account assigned to relay_01 in the database can change its state.
              </p>
              {authMessage && <p role={authMessageIsError ? 'alert' : 'status'} className={`mt-3 rounded-lg px-3 py-2 text-xs ${authMessageIsError ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-200'}`}>{authMessage}</p>}
              <form onSubmit={handleSupabaseAuth} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="sr-only" htmlFor="relay-auth-email">Supabase email</label>
                <input
                  id="relay-auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={authEmail}
                  onChange={event => setAuthEmail(event.target.value)}
                  placeholder="Supabase account email"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <label className="sr-only" htmlFor="relay-auth-password">Supabase password</label>
                <input
                  id="relay-auth-password"
                  type="password"
                  autoComplete={creatingAccount ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                  value={authPassword}
                  onChange={event => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <button type="submit" disabled={authBusy || sessionLoading || !relaySupabase} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
                  {authBusy ? 'Working…' : creatingAccount ? 'Create account' : sessionLoading ? 'Loading…' : 'Sign in'}
                </button>
              </form>
              <button type="button" onClick={() => { setCreatingAccount(current => !current); setAuthMessage(''); setAuthMessageIsError(false); }} className="mt-3 text-xs text-cyan-300 hover:text-cyan-200">
                {creatingAccount ? 'Already registered? Sign in' : 'Need a Supabase account? Create one'}
              </button>
            </>
          )}
        </section>
      )}
    </section>
  );
}

function FuelTankMonitorDashboard({ mode }: { mode: 'test' | 'service' }) {
  return (
    <section aria-labelledby="fuel-monitor-title" className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {mode === 'test' ? 'Device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated values
            </span>
          </div>
          <h2 id="fuel-monitor-title" className="text-xl font-bold text-white sm:text-2xl">
            Underground Fuel Tank Monitor
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Industrial tank overview <span className="px-1 text-slate-600">/</span> Station 01
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Preview only</p>
            <p className="text-[11px] text-slate-400">Hardware telemetry is not connected</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Fuel level</p>
            <span className="text-xs text-emerald-300">+2.4% this week</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-white">72</span>
            <span className="text-sm text-slate-400">%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Fuel level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={72}
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"
          >
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-emerald-500 to-lime-300"></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Approx. 7,200 L of 10,000 L</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Sensor distance</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-white">34.8</span>
            <span className="text-sm text-slate-400">cm</span>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Ultrasonic sensor · steady reading
          </p>
        </article>

        <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Fuel condition</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </span>
            <div>
              <p className="text-lg font-bold text-emerald-300">OK</p>
              <p className="text-[11px] text-slate-400">Above low-level threshold</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium">
            <span className="text-emerald-300">● OK &gt;35%</span>
            <span className="text-amber-300">● Low 20–35%</span>
            <span className="text-red-300">● Critical ≤20%</span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Last update</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
              <Server className="h-5 w-5 text-cyan-300" />
            </span>
            <div>
              <p className="text-lg font-bold text-white">12 sec ago</p>
              <p className="text-[11px] text-slate-400">Cloud sync · connected</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Freshness window: 60 seconds</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Fuel history</h3>
              <p className="mt-1 text-xs text-slate-400">Sensor distance over the last 24 hours</p>
            </div>
            <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-300">
              Last 24 hours
            </span>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">34.8</span>
              <span className="text-xs text-slate-400">cm · current distance</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:p-4">
              <svg
                role="img"
                aria-label="Line chart of sensor distance readings decreasing from 40 to 34.8 centimeters over 24 hours"
                viewBox="0 0 640 200"
                className="h-44 w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="fuel-chart-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[30, 70, 110, 150].map(y => (
                  <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#334155" strokeDasharray="4 6" />
                ))}
                <path
                  d="M0 63 L91 51 L182 67 L273 78 L364 102 L455 94 L546 121 L640 132 L640 175 L0 175 Z"
                  fill="url(#fuel-chart-fill)"
                />
                <path
                  d="M0 63 L91 51 L182 67 L273 78 L364 102 L455 94 L546 121 L640 132"
                  fill="none"
                  stroke="#34d399"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx="640" cy="132" r="5" fill="#34d399" stroke="#0f172a" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="flex justify-between px-1 text-[10px] text-slate-500">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Tank visualization</h3>
            <p className="mt-1 text-xs text-slate-400">Underground storage · 10,000 L capacity</p>
          </div>
          <div className="mt-5 flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.08),_transparent_70%)] p-4">
            <svg role="img" aria-label="Underground fuel tank at 72 percent capacity" viewBox="0 0 360 180" className="h-40 w-full max-w-sm">
              <defs>
                <clipPath id="tank-clip">
                  <rect x="40" y="39" width="280" height="102" rx="51" />
                </clipPath>
                <linearGradient id="tank-fuel" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <line x1="22" x2="338" y1="147" y2="147" stroke="#475569" strokeDasharray="5 5" />
              <rect x="40" y="39" width="280" height="102" rx="51" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
              <g clipPath="url(#tank-clip)">
                <rect x="40" y="67" width="280" height="78" fill="url(#tank-fuel)" />
                <path d="M40 68 Q65 62 90 68 T140 68 T190 68 T240 68 T290 68 T340 68" fill="none" stroke="#a7f3d0" strokeOpacity="0.8" strokeWidth="2" />
              </g>
              <rect x="174" y="15" width="12" height="25" rx="4" fill="#64748b" />
              <path d="M180 4 V26" stroke="#22d3ee" strokeDasharray="3 3" strokeWidth="2" />
              <circle cx="180" cy="29" r="4" fill="#22d3ee" />
              <text x="180" y="104" fill="#f8fafc" fontSize="24" fontWeight="700" textAnchor="middle">72%</text>
              <text x="180" y="124" fill="#d1fae5" fontSize="10" textAnchor="middle">7,200 L</text>
              <text x="180" y="169" fill="#94a3b8" fontSize="10" textAnchor="middle">ULTRASONIC LEVEL SENSOR</text>
            </svg>
          </div>
          <div className="mt-4 flex justify-between text-xs">
            <span className="text-slate-400">Capacity used</span>
            <span className="font-semibold text-emerald-300">7,200 / 10,000 L</span>
          </div>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-lime-500/20 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">LCD replica</h3>
              <p className="mt-1 text-xs text-slate-400">Physical 20 × 4 character display</p>
            </div>
            <Smartphone className="h-4 w-4 text-lime-300" />
          </div>
          <div className="mt-4 rounded-lg border-4 border-slate-700 bg-[#162519] p-3 shadow-inner">
            <div className="grid grid-cols-[1fr_auto] gap-x-2 font-mono text-[11px] leading-6 tracking-wide text-lime-300 sm:text-xs">
              <span>TANK MONITOR</span><span>01</span>
              <span>FUEL LEVEL</span><span>72%</span>
              <span>DISTANCE</span><span>34.8cm</span>
              <span>STATUS</span><span>FUEL OK</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Preview of the connected 20 × 4 LCD output</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div>
            <h3 className="font-semibold text-white">Alarm panel</h3>
            <p className="mt-1 text-xs text-slate-400">Thresholds and connection warnings</p>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-300"><AlertTriangle className="h-4 w-4 text-red-400" />Critical fuel · ≤20%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Clear</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-300"><AlertTriangle className="h-4 w-4 text-amber-400" />Low fuel · ≤35%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Armed</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-300"><Activity className="h-4 w-4 text-emerald-400" />Connection warning</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Clear</span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div>
            <h3 className="font-semibold text-white">Device diagnostics</h3>
            <p className="mt-1 text-xs text-slate-400">Sensor and cloud health</p>
          </div>
          <dl className="mt-4 divide-y divide-slate-800">
            <div className="flex items-center justify-between py-2.5 text-xs">
              <dt className="text-slate-400">Ultrasonic sensor</dt><dd className="font-medium text-emerald-300">34.8 cm · stable</dd>
            </div>
            <div className="flex items-center justify-between py-2.5 text-xs">
              <dt className="text-slate-400">Cloud connection</dt><dd className="font-medium text-emerald-300">Connected</dd>
            </div>
            <div className="flex items-center justify-between py-2.5 text-xs">
              <dt className="text-slate-400">Last update</dt><dd className="font-medium text-slate-200">12 sec ago</dd>
            </div>
            <div className="flex items-center justify-between py-2.5 text-xs">
              <dt className="text-slate-400">Controller</dt><dd className="font-medium text-slate-200">ESP32 · healthy</dd>
            </div>
          </dl>
        </article>
      </div>

      <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-300">{mode === 'test' ? 'Test preview:' : 'Service portal preview:'}</span> all readings are simulated sample data. Live hardware monitoring and controls require a connected device service.
      </p>
    </section>
  );
}

function WaterTankMonitorDashboard({ mode }: { mode: 'test' | 'service' }) {
  const [waterLevel, setWaterLevel] = useState(68);
  const [controlMode, setControlMode] = useState<'automatic' | 'manual'>('automatic');
  const [manualPumpOn, setManualPumpOn] = useState(false);
  const automaticPumpOn = controlMode === 'automatic' && waterLevel <= 30;
  const pumpOn = controlMode === 'automatic' ? automaticPumpOn : manualPumpOn;
  const tankStatus = waterLevel <= 5 ? 'Empty' : waterLevel >= 95 ? 'Full' : pumpOn ? 'Filling' : waterLevel <= 30 ? 'Low' : 'Normal';
  const statusColor = tankStatus === 'Empty' || tankStatus === 'Low'
    ? 'text-amber-300'
    : tankStatus === 'Full'
      ? 'text-emerald-300'
      : tankStatus === 'Filling'
        ? 'text-cyan-300'
        : 'text-slate-200';
  const alerts = [
    { label: 'Low water level', detail: waterLevel <= 30 ? 'Water is below the 30% threshold.' : 'Level is above the low-water threshold.', active: waterLevel <= 30 },
    { label: 'Full tank', detail: waterLevel >= 95 ? 'Tank capacity limit reached.' : 'Tank has available capacity.', active: waterLevel >= 95 },
    { label: 'Sensor fault', detail: 'Level sensor diagnostics normal.', active: false },
    { label: 'Pump activity', detail: pumpOn ? 'Pump is running.' : 'Pump is currently off.', active: pumpOn },
    { label: 'GSM connection', detail: 'GSM internet link is available (simulated).', active: false }
  ];

  const handleModeChange = (nextMode: 'automatic' | 'manual') => {
    setControlMode(nextMode);
    if (nextMode === 'automatic') {
      setManualPumpOn(false);
    }
  };

  const handlePumpToggle = () => {
    if (controlMode !== 'manual') return;
    const nextPumpOn = !manualPumpOn;
    setManualPumpOn(nextPumpOn);
    if (nextPumpOn) {
      setWaterLevel(level => Math.min(level + 4, 100));
    }
  };

  return (
    <section aria-labelledby="water-monitor-title" className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'test' ? 'Device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated values
            </span>
          </div>
          <h2 id="water-monitor-title" className="text-xl font-bold text-white sm:text-2xl">Smart Water Tank System</h2>
          <p className="mt-1 text-sm text-slate-400">Remote water-level monitoring and pump control preview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />Device online · demo
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs font-semibold text-cyan-300">
            <Server className="h-3.5 w-3.5" />System healthy · demo
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Current water level</p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-white">{waterLevel}<span className="ml-1 text-xl text-slate-400">%</span></p>
              <p className="mt-1 text-sm text-slate-400">{Math.round(waterLevel * 50)} L of 5,000 L</p>
            </div>
            <span className={`rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold ${statusColor}`}>
              {tankStatus}
            </span>
          </div>
          <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(140px,0.65fr)_1fr]">
            <div className="mx-auto w-full max-w-[200px]">
              <svg role="img" aria-label={`Water tank ${waterLevel} percent full`} viewBox="0 0 180 240" className="h-56 w-full">
                <defs>
                  <linearGradient id="water-tank-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <clipPath id="water-tank-clip">
                    <rect x="30" y="28" width="120" height="184" rx="22" />
                  </clipPath>
                </defs>
                <rect x="30" y="28" width="120" height="184" rx="22" fill="#0f172a" stroke="#475569" strokeWidth="4" />
                <g clipPath="url(#water-tank-clip)">
                  <rect x="30" y={212 - waterLevel * 1.84} width="120" height={waterLevel * 1.84} fill="url(#water-tank-fill)" />
                  <path d={`M30 ${212 - waterLevel * 1.84} Q60 ${202 - waterLevel * 1.84} 90 ${212 - waterLevel * 1.84} T150 ${212 - waterLevel * 1.84}`} fill="none" stroke="#a5f3fc" strokeWidth="3" opacity="0.8" />
                </g>
                {[0, 25, 50, 75, 100].map(mark => (
                  <g key={mark}>
                    <line x1="151" x2="161" y1={212 - mark * 1.84} y2={212 - mark * 1.84} stroke="#94a3b8" strokeWidth="2" />
                    <text x="166" y={216 - mark * 1.84} fill="#94a3b8" fontSize="10">{mark}</text>
                  </g>
                ))}
                <text x="90" y="128" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">{waterLevel}%</text>
              </svg>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Measured water level</p>
                <p className="mt-2 text-lg font-semibold text-white">{Math.round(waterLevel * 1.8)} cm <span className="text-xs font-normal text-slate-400">of 180 cm</span></p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tank status</p>
                <p className={`mt-2 text-lg font-semibold ${statusColor}`}>{tankStatus}</p>
              </div>
              <div
                role="progressbar"
                aria-label="Water tank level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={waterLevel}
                className="h-2 overflow-hidden rounded-full bg-slate-800"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all" style={{ width: `${waterLevel}%` }} />
              </div>
              {mode === 'test' && (
                <label className="mt-5 block">
                  <span className="flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>Simulate sensor level</span>
                    <span className="font-mono text-cyan-300">{waterLevel}%</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={waterLevel}
                    aria-label="Simulate sensor water level"
                    onChange={event => setWaterLevel(Number(event.target.value))}
                    className="mt-2 w-full accent-cyan-400"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">Preview Empty, Low, Filling, and Full thresholds with sample values.</span>
                </label>
              )}
            </div>
          </div>
        </article>

        <article className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Pump controls</h3>
            <p className="mt-1 text-xs text-slate-400">Controls update this preview only.</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Operating mode</p>
            <div role="group" aria-label="Pump operating mode" className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {(['automatic', 'manual'] as const).map(modeOption => (
                <button
                  key={modeOption}
                  type="button"
                  aria-pressed={controlMode === modeOption}
                  onClick={() => handleModeChange(modeOption)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${controlMode === modeOption ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  {modeOption}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pump status</p>
              <p className={`mt-1 font-bold ${pumpOn ? 'text-emerald-300' : 'text-slate-300'}`}>{pumpOn ? 'ON · Filling' : 'OFF'}</p>
            </div>
            <button
              type="button"
              aria-pressed={pumpOn}
              disabled={controlMode === 'automatic'}
              onClick={handlePumpToggle}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${pumpOn ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}
            >
              {pumpOn ? 'Turn pump off' : 'Turn pump on'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            {controlMode === 'automatic' ? 'Automatic mode manages the pump at the configured level thresholds. Switch to Manual to test the pump control.' : 'Manual mode lets you simulate switching the pump. Turning it on adds a sample level increase.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="text-xs text-slate-400">GSM internet</p>
              <p className="mt-1 text-sm font-semibold text-cyan-300">Connected · demo</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-slate-400">System health</p>
              <p className="mt-1 text-sm font-semibold text-emerald-300">Healthy · demo</p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Water-level history</h3>
              <p className="mt-1 text-xs text-slate-400">Sample readings over the last 12 hours</p>
            </div>
            <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-300">12 hours</span>
          </div>
          <svg role="img" aria-label="Sample water level history chart" viewBox="0 0 600 190" className="mt-5 h-44 w-full" preserveAspectRatio="none">
            {[30, 70, 110, 150].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#334155" strokeDasharray="4 6" />)}
            <path d="M0 120 L75 112 L150 116 L225 92 L300 98 L375 77 L450 81 L525 58 L600 65 L600 170 L0 170 Z" fill="#06b6d4" fillOpacity="0.13" />
            <path d="M0 120 L75 112 L150 116 L225 92 L300 98 L375 77 L450 81 L525 58 L600 65" fill="none" stroke="#22d3ee" strokeWidth="3" />
            <text x="4" y="185" fill="#94a3b8" fontSize="11">12h ago</text>
            <text x="275" y="185" fill="#94a3b8" fontSize="11">6h ago</text>
            <text x="565" y="185" fill="#94a3b8" fontSize="11">Now</text>
          </svg>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Alerts & system events</h3>
              <p className="mt-1 text-xs text-slate-400">Current conditions and recent event categories</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </div>
          <ul className="space-y-2">
            {alerts.map(alert => (
              <li key={alert.label} className={`flex items-start gap-3 rounded-xl border p-3 ${alert.active ? 'border-amber-500/25 bg-amber-500/5' : 'border-slate-800 bg-slate-950/60'}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.active ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-200">{alert.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{alert.detail}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase ${alert.active ? 'text-amber-300' : 'text-emerald-300'}`}>{alert.active ? 'Active' : 'Clear'}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {mode === 'test' ? 'Test preview:' : 'Service portal preview:'} all readings, alerts, connection states, and pump actions are simulated. They do not represent or control a physical tank; live monitoring requires a connected hardware service.
      </p>
    </section>
  );
}

type BreathalyzerAlert = {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

function AlcoholBreathalyzerDashboard({ mode }: { mode: 'test' | 'service' }) {
  const [bac, setBac] = useState(0);
  const [history, setHistory] = useState([0.01, 0, 0.02, 0.01, 0, 0]);
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [alerts, setAlerts] = useState<BreathalyzerAlert[]>([
    { id: 'initial-clear', title: 'System ready', detail: 'Alcohol level clear · sample feed', severity: 'info' },
    { id: 'initial-network', title: 'Device online', detail: 'Wi-Fi and MQTT connected · demo', severity: 'info' }
  ]);
  const risk = bac >= 0.08 ? 'high' : bac > 0 ? 'caution' : 'safe';
  const status = risk === 'high' ? 'High alcohol detected' : risk === 'caution' ? 'Caution · alcohol detected' : 'Clear · no alcohol detected';
  const statusColor = risk === 'high' ? '#f87171' : risk === 'caution' ? '#fbbf24' : '#34d399';
  const bacPercent = Math.min(100, (bac / 0.2) * 100);

  const recordAlert = (title: string, detail: string, severity: BreathalyzerAlert['severity'] = 'info') => {
    setAlerts(current => [{ id: `${Date.now()}-${Math.random()}`, title, detail, severity }, ...current].slice(0, 6));
  };

  const updateReading = (value: number) => {
    setBac(value);
    setHistory(current => [...current.slice(-9), value]);
    const nextRisk = value >= 0.08 ? 'high' : value > 0 ? 'caution' : 'safe';
    const nextStatus = nextRisk === 'high'
      ? 'High alcohol detected'
      : nextRisk === 'caution'
        ? 'Caution · alcohol detected'
        : 'Clear · no alcohol detected';
    recordAlert(
      nextRisk === 'high' ? 'High alcohol warning' : nextRisk === 'caution' ? 'Alcohol level warning' : 'Reading clear',
      `${value.toFixed(2)}% BAC · ${nextStatus}.`,
      nextRisk === 'high' ? 'critical' : nextRisk === 'caution' ? 'warning' : 'info'
    );
  };

  const toggleConnectivity = () => {
    const next = !networkAvailable;
    setNetworkAvailable(next);
    recordAlert(
      next ? 'Connectivity restored' : 'Connectivity lost',
      next ? 'Wi-Fi and MQTT demo connections restored.' : 'Wi-Fi and MQTT demo connections unavailable.',
      next ? 'info' : 'warning'
    );
  };

  const chartPoints = history
    .map((value, index) => `${20 + index * (600 / Math.max(1, history.length - 1))},${155 - (value / 0.2) * 125}`)
    .join(' ');

  return (
    <section aria-labelledby="breathalyzer-title" className="space-y-5">
      <style>{`
        @keyframes gkb-breathalyzer-blink {
          0%, 46%, 52%, 100% { transform: scaleY(1); }
          49% { transform: scaleY(0.12); }
        }
        .breathalyzer-blink {
          transform-box: fill-box;
          transform-origin: center;
          animation: gkb-breathalyzer-blink 3.8s infinite;
        }
      `}</style>
      <header className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'test' ? 'Private device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated telemetry
            </span>
          </div>
          <h2 id="breathalyzer-title" className="text-xl font-bold text-white sm:text-2xl">Smart Alcohol Breathalyzer System</h2>
          <p className="mt-1 text-sm text-slate-400">MQ-3 alcohol level monitoring · OLED-style status · MQTT connectivity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />Device online · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${networkAvailable ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Wifi className="h-3.5 w-3.5" />Wi-Fi · {networkAvailable ? 'connected' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${networkAvailable ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Radio className="h-3.5 w-3.5" />MQTT · {networkAvailable ? 'connected' : 'disconnected'} · demo
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section aria-label="Breathalyzer status" className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">OLED status avatar</p>
          <div
            role="img"
            aria-label={risk === 'safe' ? 'Happy face, safe status' : risk === 'caution' ? 'Concerned face, caution status' : 'Alert face, high alcohol status'}
            className={`mt-4 flex h-36 w-36 items-center justify-center rounded-full border-4 shadow-lg transition-all duration-500 ${risk === 'safe' ? 'animate-pulse border-emerald-400/50 bg-emerald-400/10 shadow-emerald-500/10' : risk === 'caution' ? 'animate-pulse border-amber-400/60 bg-amber-400/10 shadow-amber-500/10' : 'animate-pulse border-red-400/70 bg-red-400/10 shadow-red-500/20'}`}
          >
            <svg aria-hidden="true" viewBox="0 0 100 100" className="h-24 w-24">
              <circle cx="50" cy="50" r="44" fill={risk === 'high' ? '#7f1d1d' : risk === 'caution' ? '#78350f' : '#064e3b'} />
              <g className="breathalyzer-blink" fill="#f8fafc">
                <ellipse cx="36" cy="41" rx="4.5" ry="6" />
                <ellipse cx="64" cy="41" rx="4.5" ry="6" />
              </g>
              <path
                d={risk === 'safe' ? 'M30 59 Q50 82 70 59' : risk === 'caution' ? 'M33 67 Q50 58 67 67' : 'M30 71 Q50 47 70 71'}
                fill="none"
                stroke="#f8fafc"
                strokeLinecap="round"
                strokeWidth="5"
              />
            </svg>
          </div>
          <p className={`mt-4 text-lg font-bold ${risk === 'high' ? 'text-red-300' : risk === 'caution' ? 'text-amber-300' : 'text-emerald-300'}`}>{status}</p>
          <p className="mt-1 text-xs text-slate-400">Animated status mirrors the simulated OLED indicator.</p>
        </section>

        <section aria-label="Blood alcohol concentration" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
            <div
              role="progressbar"
              aria-label="Blood alcohol concentration"
              aria-valuemin={0}
              aria-valuemax={0.2}
              aria-valuenow={bac}
              className="flex h-44 w-44 shrink-0 items-center justify-center rounded-full transition-all duration-500"
              style={{ background: `conic-gradient(${statusColor} ${bacPercent}%, #1e293b ${bacPercent}% 100%)` }}
            >
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-slate-950">
                <span className="text-3xl font-black text-white">{bac.toFixed(2)}%</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">BAC · demo</span>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Alcohol Level feed</p>
                  <p className={`mt-2 text-xl font-bold ${risk === 'high' ? 'text-red-300' : risk === 'caution' ? 'text-amber-300' : 'text-emerald-300'}`}>{status}</p>
                </div>
                <Activity className={`h-6 w-6 ${risk === 'high' ? 'text-red-300' : risk === 'caution' ? 'text-amber-300' : 'text-emerald-300'}`} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">Demo bands only: clear at 0.00%, caution above 0.00%, and high at 0.08% BAC. These are not legal or medical thresholds.</p>
            </div>
          </div>
          <label className="mt-6 block">
            <span className="flex justify-between text-xs font-medium text-slate-300">
              <span>Simulate Alcohol Level feed</span>
              <span>{bac.toFixed(2)}% BAC</span>
            </span>
            <input
              aria-label="Simulate alcohol level"
              className="mt-3 w-full accent-cyan-400"
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={bac}
              onChange={event => updateReading(Number(event.target.value))}
            />
            <span className="mt-1 flex justify-between text-[10px] text-slate-500"><span>0.00%</span><span>0.20% BAC · simulated</span></span>
          </label>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Alcohol level history" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Alcohol level history</h3>
              <p className="mt-1 text-xs text-slate-400">mq3-alcohol-level · recent sample readings</p>
            </div>
            <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-300">BAC (%) · demo</span>
          </div>
          <svg role="img" aria-label="Simulated alcohol level history chart" viewBox="0 0 640 180" className="mt-4 h-44 w-full overflow-visible">
            <title>Simulated BAC history</title>
            {[30, 70, 110, 150].map(y => <line key={y} x1="20" y1={y} x2="620" y2={y} stroke="#334155" strokeDasharray="4 6" />)}
            <polyline points={chartPoints} fill="none" stroke={statusColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {history.map((value, index) => {
              const x = 20 + index * (600 / Math.max(1, history.length - 1));
              const y = 155 - (value / 0.2) * 125;
              return <circle key={`${index}-${value}`} cx={x} cy={y} r="5" fill={statusColor} />;
            })}
          </svg>
          <div className="flex justify-between text-[10px] text-slate-500"><span>Earlier samples</span><span>Latest · {bac.toFixed(2)}%</span></div>
        </section>

        <section aria-label="Breathalyzer alerts" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Alerts & notifications</h3>
              <p className="mt-1 text-xs text-slate-400">mq3-alert-trigger · recent demo events</p>
            </div>
            <AlertTriangle className={risk === 'high' ? 'h-5 w-5 text-red-300' : risk === 'caution' ? 'h-5 w-5 text-amber-300' : 'h-5 w-5 text-emerald-300'} />
          </div>
          <ul className="mt-4 space-y-2">
            {alerts.map(alert => (
              <li key={alert.id} className={`flex items-start gap-3 rounded-xl border p-3 ${alert.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : alert.severity === 'warning' ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-800 bg-slate-950/50'}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-red-400' : alert.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{alert.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {mode === 'test' && (
            <button type="button" onClick={toggleConnectivity} className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10">
              {networkAvailable ? 'Simulate connectivity problem' : 'Restore demo connectivity'}
            </button>
          )}
        </section>
      </div>

      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {mode === 'test' ? 'Test dashboard:' : 'Service portal preview:'} BAC values, MQ-3 feed, alert trigger, chart, avatar, and Wi-Fi/MQTT status are simulated. This is not a medical device, does not determine fitness to drive, and is not connected to a physical sensor or MQTT broker. Do not use it to make safety decisions.
      </p>
    </section>
  );
}

type DeviceControlActivity = {
  id: string;
  event: string;
  timestamp: string;
};

function FanRegulatorDashboard({ mode, device }: { mode: 'test' | 'service'; device: Device }) {
  const [fanSpeed, setFanSpeed] = useState(0);
  const [fanName, setFanName] = useState(() => {
    try {
      return window.localStorage.getItem(`gkb-fan-name:${device.key}`)?.trim() || 'Fan';
    } catch (error) {
      console.error('Unable to load the saved fan name.', error);
      return 'Fan';
    }
  });
  const [fanNameDraft, setFanNameDraft] = useState(fanName);
  const [isEditingFanName, setIsEditingFanName] = useState(false);
  const [fanNameSaveError, setFanNameSaveError] = useState('');
  const [connectionAvailable, setConnectionAvailable] = useState(true);
  const [activity, setActivity] = useState<DeviceControlActivity[]>([
    { id: 'initial-state', event: 'Fan regulator ready · fan off · all speed relays open', timestamp: 'Just now' }
  ]);
  const speedLabel = fanSpeed === 0 ? 'Off' : `Speed ${fanSpeed}`;
  const speedDescription = ['Off', 'Low', 'Medium-low', 'Medium-high', 'High'][fanSpeed];

  const recordActivity = (event: string) => {
    setActivity(current => [
      { id: `${Date.now()}-${Math.random()}`, event, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      ...current
    ].slice(0, 8));
  };

  const changeFanSpeed = (speed: number) => {
    setFanSpeed(speed);
    recordActivity(`Fan set to ${speed === 0 ? 'OFF' : `Speed ${speed}`} · fan-speed=${speed} · relay ${speed === 0 ? 'all OFF' : `${speed} ON, others OFF`}`);
  };

  const saveFanName = () => {
    const nextName = fanNameDraft.trim() || 'Fan';
    try {
      window.localStorage.setItem(`gkb-fan-name:${device.key}`, nextName);
      setFanName(nextName);
      setFanNameDraft(nextName);
      setFanNameSaveError('');
      setIsEditingFanName(false);
      recordActivity(`Fan name set to "${nextName}"`);
    } catch (error) {
      console.error('Unable to save the fan name.', error);
      setFanNameSaveError('Could not save the fan name in this browser. Please try again.');
    }
  };

  const cancelFanNameEdit = () => {
    setFanNameDraft(fanName);
    setFanNameSaveError('');
    setIsEditingFanName(false);
  };

  const toggleConnection = () => {
    const next = !connectionAvailable;
    setConnectionAvailable(next);
    recordActivity(`ESP32 demo connection ${next ? 'restored' : 'lost'} · Adafruit IO ${next ? 'connected' : 'disconnected'}`);
  };

  return (
    <section aria-labelledby="fan-regulator-title" className="space-y-5">
      <style>{`
        @keyframes gkb-fan-rotate {
          to { transform: rotate(360deg); }
        }
        .smart-fan-rotor {
          animation-name: gkb-fan-rotate;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
      <header className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'test' ? 'Private device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated controls
            </span>
          </div>
          <h2 id="fan-regulator-title" className="text-xl font-bold text-white sm:text-2xl">Smart Fan Regulator</h2>
          <p className="mt-1 text-sm text-slate-400">ESP32 speed control · one relay assigned to each fan speed</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span className={`h-2 w-2 rounded-full ${connectionAvailable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            Device {connectionAvailable ? 'online' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${connectionAvailable ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Wifi className="h-3.5 w-3.5" />Adafruit IO · {connectionAvailable ? 'connected' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${connectionAvailable ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Server className="h-3.5 w-3.5" />Supabase · {connectionAvailable ? 'syncing' : 'disconnected'} · demo
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Fan speed control" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full border ${fanSpeed ? 'border-cyan-400/30 bg-cyan-400/5 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.12)]' : 'border-slate-700 bg-slate-950/70 text-slate-500'}`}>
              <svg
                aria-label={fanSpeed ? `Fan animation at speed ${fanSpeed}` : 'Fan stopped'}
                role="img"
                viewBox="0 0 100 100"
                className="h-24 w-24"
              >
                <g
                  className="smart-fan-rotor"
                  style={{
                    transformOrigin: '50px 50px',
                    animationDuration: fanSpeed ? `${2.4 / fanSpeed}s` : undefined,
                    animationPlayState: fanSpeed ? 'running' : 'paused'
                  }}
                >
                  {[0, 90, 180, 270].map(rotation => (
                    <path
                      key={rotation}
                      d="M50 48 C38 42 35 24 44 18 C57 10 63 35 53 48 Z"
                      fill="currentColor"
                      opacity={fanSpeed ? 0.9 : 0.45}
                      transform={`rotate(${rotation} 50 50)`}
                    />
                  ))}
                </g>
                <circle cx="50" cy="50" r="7" fill="currentColor" />
                <circle cx="50" cy="50" r="2.5" fill="#0f172a" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {isEditingFanName ? (
                  <>
                    <input
                      aria-label="Fan name"
                      className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      maxLength={40}
                      value={fanNameDraft}
                      onChange={event => setFanNameDraft(event.target.value)}
                    />
                    <button type="button" onClick={saveFanName} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25">
                      <Save className="h-3.5 w-3.5" />Save
                    </button>
                    <button type="button" onClick={cancelFanNameEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                      <X className="h-3.5 w-3.5" />Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{fanName}</p>
                    <button
                      type="button"
                      onClick={() => { setFanNameDraft(fanName); setIsEditingFanName(true); setFanNameSaveError(''); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </button>
                  </>
                )}
              </div>
              {fanNameSaveError && <p role="alert" className="mt-2 text-xs text-red-300">{fanNameSaveError}</p>}
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-400">Current fan speed</p>
              <p className={`mt-1 text-2xl font-bold ${fanSpeed ? 'text-cyan-300' : 'text-slate-300'}`}>{speedLabel}</p>
              <p className="mt-1 text-sm text-slate-400">{speedDescription} · fan-speed feed: {fanSpeed}</p>
              <p className="mt-2 text-xs text-slate-500">{fanSpeed ? 'Fan animation speed follows the selected level.' : 'Fan is stopped.'}</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Fan speed control</p>
            <div role="group" aria-label="Set fan speed" className="grid grid-cols-5 gap-2">
              {['Off', 'Speed 1', 'Speed 2', 'Speed 3', 'Speed 4'].map((label, speed) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={fanSpeed === speed}
                  onClick={() => changeFanSpeed(speed)}
                  className={`rounded-lg border px-2 py-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3 ${fanSpeed === speed ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-white'}`}
                >
                  <span className="block">{label}</span>
                  <span className="mt-1 block text-[10px] opacity-70">{speed}</span>
                </button>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="flex justify-between text-xs font-medium text-slate-300">
                <span>fan-speed feed</span>
                <span>{fanSpeed} / 4</span>
              </span>
              <input
                aria-label="Fan speed feed"
                className="mt-3 w-full accent-cyan-400"
                type="range"
                min="0"
                max="4"
                step="1"
                value={fanSpeed}
                onChange={event => changeFanSpeed(Number(event.target.value))}
              />
            </label>
          </div>
        </section>

        <section aria-label="Fan speed relay mapping" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <h3 className="font-semibold text-white">Speed relay mapping</h3>
          <p className="mt-1 text-xs text-slate-400">One relay per speed; only the selected speed relay is energized.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4].map(speed => (
              <article key={speed} className={`rounded-xl border p-3 ${fanSpeed === speed ? 'border-cyan-400/30 bg-cyan-400/[0.06]' : 'border-slate-800 bg-slate-950/60'}`}>
                <p className="text-xs text-slate-400">Relay {speed} · Speed {speed}</p>
                <p className={`mt-1 text-sm font-semibold ${fanSpeed === speed ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {fanSpeed === speed ? 'ON · selected' : 'OFF'}
                </p>
              </article>
            ))}
            <article className={`rounded-xl border p-3 ${fanSpeed === 0 ? 'border-slate-600 bg-slate-800/50' : 'border-slate-800 bg-slate-950/60'}`}>
              <p className="text-xs text-slate-400">All relays</p>
              <p className={`mt-1 text-sm font-semibold ${fanSpeed === 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                {fanSpeed === 0 ? 'OFF · fan stopped' : 'OFF · fan running'}
              </p>
            </article>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Fan activity history" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Activity & command history</h3>
              <p className="mt-1 text-xs text-slate-400">Recent fan-speed and connectivity changes</p>
            </div>
            <Activity className="h-5 w-5 text-cyan-300" />
          </div>
          <ul className="mt-4 space-y-2">
            {activity.map(item => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-sm text-slate-200">{item.event}</p>
                <time className="shrink-0 text-[10px] text-slate-500">{item.timestamp}</time>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Fan regulator connection health" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Connection & system health</h3>
            <p className="mt-1 text-xs text-slate-400">ESP32 communication and Adafruit IO · demo status</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'ESP32 device', value: connectionAvailable ? 'Online' : 'Offline' },
              { label: 'Adafruit IO', value: connectionAvailable ? 'Connected' : 'Disconnected' },
              { label: 'Supabase sync', value: connectionAvailable ? 'Syncing' : 'Disconnected' }
            ].map(item => (
              <article key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold ${connectionAvailable ? 'text-emerald-300' : 'text-amber-300'}`}>{item.value}</p>
              </article>
            ))}
          </div>
          {mode === 'test' && (
            <button
              type="button"
              onClick={toggleConnection}
              className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              {connectionAvailable ? 'Simulate connection loss' : 'Restore demo connection'}
            </button>
          )}
        </section>
      </div>

      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {mode === 'test' ? 'Test dashboard:' : 'Service portal preview:'} Fan speed, relay states, activity history, ESP32 connection, and Adafruit IO status are simulated. The dashboard does not connect to cloud services or control physical appliances.
      </p>
    </section>
  );
}

type ControlledLight = {
  channel: number;
  name: string;
  isOn: boolean;
};

function LightControlDashboard({ mode, device }: { mode: 'test' | 'service'; device: Device }) {
  const relayChannels = device.relayChannels ?? 4;
  const [lights, setLights] = useState<ControlledLight[]>(() => {
    const defaults = Array.from({ length: relayChannels }, (_, index) => ({
      channel: index + 1,
      name: `Light ${index + 1}`,
      isOn: false
    }));
    try {
      const keys = [device.key, ...(device.legacyKeys ?? [])];
      const storedNames = keys
        .map(key => window.localStorage.getItem(`gkb-light-names:${key}`))
        .find(value => value !== null);
      const names = storedNames ? JSON.parse(storedNames) as string[] : [];
      return defaults.map(light => {
        const savedName = names[light.channel - 1];
        return { ...light, name: typeof savedName === 'string' ? savedName.trim() || light.name : light.name };
      });
    } catch (error) {
      console.error('Unable to load saved light names.', error);
      return defaults;
    }
  });
  const [editingChannel, setEditingChannel] = useState<number | null>(null);
  const [lightNameDraft, setLightNameDraft] = useState('');
  const [lightNameSaveError, setLightNameSaveError] = useState('');
  const [connectionAvailable, setConnectionAvailable] = useState(true);
  const [activity, setActivity] = useState<DeviceControlActivity[]>([
    { id: 'initial-light-state', event: `Light controller ready · ${relayChannels}-channel · all lights off`, timestamp: 'Just now' }
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `gkb-light-names:${device.key}`,
        JSON.stringify(lights.map(light => light.name))
      );
    } catch (error) {
      console.error('Unable to save light names.', error);
    }
  }, [device.key, lights]);

  const recordActivity = (event: string) => {
    setActivity(current => [
      { id: `${Date.now()}-${Math.random()}`, event, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      ...current
    ].slice(0, 8));
  };

  const saveLightName = (channel: number) => {
    const nextName = lightNameDraft.trim() || `Light ${channel}`;
    const nextLights = lights.map(light => light.channel === channel ? { ...light, name: nextName } : light);
    try {
      window.localStorage.setItem(
        `gkb-light-names:${device.key}`,
        JSON.stringify(nextLights.map(light => light.name))
      );
      setLights(nextLights);
      setEditingChannel(null);
      setLightNameSaveError('');
      recordActivity(`Relay ${channel} light name set to "${nextName}"`);
    } catch (error) {
      console.error(`Unable to save the name for relay ${channel}.`, error);
      setLightNameSaveError(`Could not save the name for Relay ${channel}. Please try again.`);
    }
  };

  const cancelLightNameEdit = () => {
    setEditingChannel(null);
    setLightNameDraft('');
    setLightNameSaveError('');
  };

  const toggleRelay = (channel: number) => {
    const light = lights.find(item => item.channel === channel);
    const nextState = !light?.isOn;
    setLights(current => current.map(item => item.channel === channel ? { ...item, isOn: nextState } : item));
    recordActivity(`${light?.name.trim() || `Light ${channel}`} switched ${nextState ? 'ON' : 'OFF'} · relay${channel}=${nextState ? 1 : 0}`);
  };

  const toggleConnection = () => {
    const next = !connectionAvailable;
    setConnectionAvailable(next);
    recordActivity(`ESP32 demo connection ${next ? 'restored' : 'lost'} · Adafruit IO and Supabase ${next ? 'syncing' : 'disconnected'}`);
  };

  return (
    <section aria-labelledby="light-control-title" className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'test' ? 'Private device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated controls
            </span>
          </div>
          <h2 id="light-control-title" className="text-xl font-bold text-white sm:text-2xl">{device.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{relayChannels}-channel relay controller · one independent light output per relay</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${connectionAvailable ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <span className={`h-2 w-2 rounded-full ${connectionAvailable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            ESP32 · {connectionAvailable ? 'online' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${connectionAvailable ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Wifi className="h-3.5 w-3.5" />Adafruit IO · {connectionAvailable ? 'connected' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${connectionAvailable ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Server className="h-3.5 w-3.5" />Supabase · {connectionAvailable ? 'syncing' : 'disconnected'} · demo
          </span>
        </div>
      </header>

      <section aria-label="Light and relay configuration" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Light names & relay outputs</h3>
            <p className="mt-1 text-xs text-slate-400">This device key sets the fixed {relayChannels}-relay channel count. Rename each light for easy identification.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lights.map(light => {
            const lightOn = light.isOn;
            return (
              <article key={light.channel} aria-label={`Relay ${light.channel} light controls`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${lightOn ? 'animate-pulse bg-amber-300/15 text-amber-300 shadow-[0_0_28px_rgba(252,211,77,0.3)]' : 'bg-slate-950/70 text-slate-600'}`}>
                      <Lightbulb aria-hidden="true" className={`h-10 w-10 transition-all duration-500 ${lightOn ? 'fill-amber-200/40 drop-shadow-[0_0_10px_rgba(252,211,77,0.8)]' : ''}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Relay {light.channel}</p>
                      {editingChannel === light.channel ? (
                        <input
                          aria-label={`Name for Relay ${light.channel}`}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                          maxLength={40}
                          value={lightNameDraft}
                          onChange={event => setLightNameDraft(event.target.value)}
                        />
                      ) : (
                        <p className="mt-1 truncate font-semibold text-white">{light.name}</p>
                      )}
                      <p className={`mt-1 text-xs font-bold ${lightOn ? 'text-amber-300' : 'text-slate-400'}`}>{lightOn ? 'ON' : 'OFF'}</p>
                    </div>
                  </div>
                  {editingChannel === light.channel ? (
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => saveLightName(light.channel)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25">
                        <Save className="h-3.5 w-3.5" />Save
                      </button>
                      <button type="button" onClick={cancelLightNameEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                        <X className="h-3.5 w-3.5" />Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingChannel(light.channel); setLightNameDraft(light.name); setLightNameSaveError(''); }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />Edit
                    </button>
                  )}
                </div>

                {lightNameSaveError && editingChannel === light.channel && <p role="alert" className="mt-3 text-xs text-red-300">{lightNameSaveError}</p>}

                <div className={`mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 ${lightOn ? 'border-amber-400/25 bg-amber-400/[0.04]' : 'border-slate-800 bg-slate-950/60'}`}>
                  <div>
                    <p className="text-sm font-semibold text-white">Relay {light.channel} output</p>
                    <p className={`mt-1 text-xs ${lightOn ? 'text-amber-300' : 'text-slate-500'}`}>{lightOn ? 'ON · light output active' : 'OFF'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={`${light.name.trim() || `Light ${light.channel}`} relay`}
                    aria-checked={lightOn}
                    onClick={() => toggleRelay(light.channel)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${lightOn ? 'bg-amber-400' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${lightOn ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">light feed: {lightOn ? 1 : 0} · relay{light.channel}={lightOn ? 1 : 0}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Light control activity history" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Activity & command history</h3>
              <p className="mt-1 text-xs text-slate-400">Recent light, relay, and connectivity changes</p>
            </div>
            <Activity className="h-5 w-5 text-cyan-300" />
          </div>
          <ul className="mt-4 space-y-2">
            {activity.map(item => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-sm text-slate-200">{item.event}</p>
                <time className="shrink-0 text-[10px] text-slate-500">{item.timestamp}</time>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Light controller connection health" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <h3 className="font-semibold text-white">Connection & system health</h3>
          <p className="mt-1 text-xs text-slate-400">ESP32 communication and cloud sync · demo status</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'ESP32 device', value: connectionAvailable ? 'Online' : 'Offline' },
              { label: 'Adafruit IO', value: connectionAvailable ? 'Connected' : 'Disconnected' },
              { label: 'Supabase sync', value: connectionAvailable ? 'Syncing' : 'Disconnected' }
            ].map(item => (
              <article key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold ${connectionAvailable ? 'text-emerald-300' : 'text-amber-300'}`}>{item.value}</p>
              </article>
            ))}
          </div>
          {mode === 'test' && (
            <button
              type="button"
              onClick={toggleConnection}
              className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              {connectionAvailable ? 'Simulate connection loss' : 'Restore demo connection'}
            </button>
          )}
        </section>
      </div>

      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {mode === 'test' ? 'Test dashboard:' : 'Service portal preview:'} The device key determines the fixed relay channel count. Light names, relay states, activity history, ESP32, Adafruit IO, and Supabase are simulated. No cloud service or physical light/relay is connected.
      </p>
    </section>
  );
}

type MeterAlert = {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

function PrepaidEnergyMeterDashboard({ mode }: { mode: 'test' | 'service' }) {
  const [balance, setBalance] = useState(24.5);
  const [relayRequested, setRelayRequested] = useState(true);
  const [tamperState, setTamperState] = useState<'secure' | 'detected' | 'maintenance'>('secure');
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [alerts, setAlerts] = useState<MeterAlert[]>([
    { id: 'initial-online', title: 'Meter online', detail: 'Demo device connected · just now', severity: 'info' },
    { id: 'initial-recharge', title: 'Recharge successful', detail: 'GHS 20.00 added · balance GHS 24.50', severity: 'info' },
    { id: 'initial-tamper', title: 'Tamper protection armed', detail: 'Enclosure secure · just now', severity: 'info' }
  ]);
  const lowBalance = balance < 11;
  const safetyCutoff = balance <= 0 || tamperState !== 'secure';
  const relayActual = relayRequested && !safetyCutoff;
  const bulbPower = relayActual ? 60 : 0;
  const securityLabel = tamperState === 'detected'
    ? 'Tampering detected'
    : tamperState === 'maintenance'
      ? 'Maintenance mode'
      : 'Secure';
  const securityColor = tamperState === 'detected'
    ? 'text-red-300'
    : tamperState === 'maintenance'
      ? 'text-amber-300'
      : 'text-emerald-300';

  const recordAlert = (title: string, detail: string, severity: MeterAlert['severity'] = 'info') => {
    setAlerts(current => [{ id: `${Date.now()}-${Math.random()}`, title, detail, severity }, ...current].slice(0, 8));
  };

  const toggleRelay = () => {
    if (safetyCutoff) return;
    const next = !relayRequested;
    setRelayRequested(next);
    recordAlert('Relay switched', `Demo relay switched ${next ? 'ON' : 'OFF'}.`);
  };

  const recharge = () => {
    const updatedBalance = Number((balance + 20).toFixed(2));
    setBalance(updatedBalance);
    recordAlert('Recharge successful', `GHS 20.00 added · balance GHS ${updatedBalance.toFixed(2)}.`);
  };

  const detectTamper = () => {
    setTamperState('detected');
    setRelayRequested(false);
    recordAlert('Tamper detected', 'Enclosure opened · system locked and load disconnected.', 'critical');
  };

  const scanMaintenanceCard = () => {
    setTamperState('maintenance');
    setRelayRequested(false);
    recordAlert('Maintenance mode activated', 'Authorized maintenance RFID card accepted locally.');
  };

  const rearmProtection = () => {
    setTamperState('secure');
    recordAlert('Tamper protection re-armed', 'Enclosure monitoring restored after authorized maintenance.');
  };

  const simulateUnauthorizedCard = () => {
    recordAlert('Unauthorized RFID scan', 'Card not authorized · no credit added.', 'warning');
  };

  const simulateConnectivityIssue = () => {
    const next = !networkAvailable;
    setNetworkAvailable(next);
    recordAlert(
      next ? 'Connectivity restored' : 'Connectivity problem',
      next ? 'Wi-Fi and Adafruit IO demo connections restored.' : 'Adafruit IO connection lost · local safety remains active.',
      next ? 'info' : 'warning'
    );
  };

  return (
    <section aria-labelledby="energy-meter-title" className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'test' ? 'Private device test preview' : 'Service portal'}
            </span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              Simulated telemetry & controls
            </span>
          </div>
          <h2 id="energy-meter-title" className="text-xl font-bold text-white sm:text-2xl">GKB Smart Prepaid Energy Meter</h2>
          <p className="mt-1 text-sm text-slate-400">PZEM-004T energy monitoring · RFID prepaid control · tamper protection</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />Device online · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${networkAvailable ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Wifi className="h-3.5 w-3.5" />Wi-Fi · {networkAvailable ? 'connected' : 'offline'} · demo
          </span>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${networkAvailable ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
            <Radio className="h-3.5 w-3.5" />Adafruit IO · {networkAvailable ? 'connected' : 'disconnected'} · demo
          </span>
        </div>
      </header>

      <nav aria-label="Energy meter dashboard sections" className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {['Energy overview', 'Prepaid balance', 'Live measurements', 'Power control', 'RFID recharge history', 'Tamper & security', 'Consumption analytics', 'Alerts & notifications'].map((section, index) => (
          <a key={section} href={`#energy-section-${index}`} className="shrink-0 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300">
            {section}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        <section id="energy-section-3" aria-label="Power control" className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-white">Power control</h3>
            <p className="mt-1 text-xs text-slate-400">Relay commands are simulated and do not control a physical load.</p>
          </div>
          <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-5 text-center transition-colors sm:flex-row sm:justify-start sm:text-left ${relayActual ? 'border-amber-400/30 bg-amber-400/[0.06]' : 'border-slate-800 bg-slate-950/70'}`}>
            <span className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${relayActual ? 'bg-amber-300/15 text-amber-300 shadow-[0_0_30px_rgba(252,211,77,0.3)]' : 'bg-slate-800 text-slate-500'}`}>
              <Lightbulb aria-hidden="true" className={`h-9 w-9 transition-all ${relayActual ? 'fill-amber-200/40 drop-shadow-[0_0_10px_rgba(252,211,77,0.85)]' : ''}`} />
            </span>
            <div>
              <p className="font-semibold text-white">Demo bulb load</p>
              <p className={`mt-1 text-sm font-bold ${relayActual ? 'text-amber-300' : 'text-slate-400'}`}>
                {relayActual ? 'ON · 60 W simulated output' : 'OFF · 0 W output'}
              </p>
              <p className="mt-1 text-xs text-slate-500">The bulb follows the simulated relay state.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Relay actual status · demo</p>
              <p className={`mt-1 text-lg font-bold ${relayActual ? 'text-emerald-300' : 'text-slate-300'}`}>{relayActual ? 'ON · Load connected' : 'OFF · Load disconnected'}</p>
            </div>
            <button
              type="button"
              aria-pressed={relayActual}
              disabled={safetyCutoff}
              onClick={toggleRelay}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${relayActual ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}
            >
              {relayActual ? 'Switch power OFF' : 'Switch power ON'}
            </button>
          </div>
          {safetyCutoff && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              Safety lock: the demo load is disconnected {balance <= 0 ? 'because prepaid credit is zero.' : 'until authorized maintenance clears the tamper state.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="text-xs text-slate-400">Wi-Fi · demo</p>
              <p className={`mt-1 text-sm font-semibold ${networkAvailable ? 'text-cyan-300' : 'text-amber-300'}`}>{networkAvailable ? 'Connected' : 'Offline'}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="text-xs text-slate-400">Adafruit IO · demo</p>
              <p className={`mt-1 text-sm font-semibold ${networkAvailable ? 'text-cyan-300' : 'text-amber-300'}`}>{networkAvailable ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
          {mode === 'test' && (
            <button type="button" onClick={simulateConnectivityIssue} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10">
              {networkAvailable ? 'Simulate connectivity problem' : 'Restore demo connectivity'}
            </button>
          )}
        </section>

        <section id="energy-section-4" aria-label="RFID recharge history" className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="font-semibold text-white">RFID recharge</h3>
              <p className="mt-1 text-xs text-slate-400">Configured demo recharge value: GHS 20.00</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">Most recent recharge</p>
            <p className="mt-1 font-semibold text-white">GHS 20.00 · Authorized recharge card</p>
            <p className="mt-1 text-xs text-slate-500">Updated balance: GHS {balance.toFixed(2)} · simulated history</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={recharge} className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400">
              Simulate recharge card scan
            </button>
            <button type="button" onClick={simulateUnauthorizedCard} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/10">
              Simulate unauthorized card
            </button>
          </div>
        </section>
      </div>

      <section id="energy-section-0" aria-label="Energy overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article id="energy-section-1" className={`rounded-2xl border p-5 ${lowBalance ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-emerald-500/20 bg-emerald-500/[0.04]'}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Prepaid balance</p>
            <BatteryCharging className={`h-5 w-5 ${lowBalance ? 'text-amber-300' : 'text-emerald-300'}`} />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">GHS {balance.toFixed(2)}</p>
          <p className={`mt-2 text-xs font-semibold ${lowBalance ? 'text-amber-300' : 'text-emerald-300'}`}>
            {lowBalance ? 'Low balance · below GHS 11.00' : 'Credit available'}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Energy consumed</p>
          <p className="mt-3 text-3xl font-bold text-white">18.42 <span className="text-sm font-medium text-slate-400">kWh</span></p>
          <p className="mt-2 text-xs text-slate-500">Today · simulated PZEM reading</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Meter status</p>
          <p className={`mt-3 text-xl font-bold ${securityColor}`}>{tamperState === 'detected' ? 'Locked' : tamperState === 'maintenance' ? 'Maintenance' : 'Operational'}</p>
          <p className="mt-2 text-xs text-slate-500">System {networkAvailable ? 'healthy' : 'connectivity degraded'} · simulated</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Relay status</p>
          <p className={`mt-3 text-xl font-bold ${relayActual ? 'text-emerald-300' : 'text-slate-300'}`}>{relayActual ? 'ON' : 'OFF'}</p>
          <p className="mt-2 text-xs text-slate-500">{safetyCutoff ? 'Safety cutoff active' : 'Demo relay state'}</p>
        </article>
      </section>

      <section id="energy-section-2" aria-label="Live electrical measurements">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white">Live measurements</h3>
          <p className="mt-1 text-xs text-slate-400">PZEM-004T sample values · not live sensor data</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { name: 'Voltage', value: '230.4', unit: 'V', icon: Zap, color: 'text-amber-300' },
            { name: 'Current', value: relayActual ? '0.26' : '0.00', unit: 'A', icon: Activity, color: 'text-cyan-300' },
            { name: 'Power', value: String(bulbPower), unit: 'W', icon: Gauge, color: 'text-purple-300' },
            { name: 'Energy', value: '18.42', unit: 'kWh', icon: BatteryCharging, color: 'text-emerald-300' },
            { name: 'Frequency', value: '50.0', unit: 'Hz', icon: Activity, color: 'text-blue-300' },
            { name: 'Power factor', value: '0.96', unit: 'PF', icon: Zap, color: 'text-pink-300' }
          ].map(measurement => (
            <article key={measurement.name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{measurement.name}</p>
                <measurement.icon className={`h-4 w-4 ${measurement.color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{measurement.value} <span className="text-sm font-medium text-slate-400">{measurement.unit}</span></p>
            </article>
          ))}
        </div>
      </section>

      <section id="energy-section-5" aria-label="Tamper and security monitoring" className={`space-y-4 rounded-2xl border p-5 sm:p-6 ${tamperState === 'detected' ? 'border-red-500/50 bg-red-950/30' : 'border-slate-800 bg-slate-900/70'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className={`h-6 w-6 ${securityColor}`} />
            <div>
              <h3 className="font-semibold text-white">Tamper detection & security</h3>
              <p className={`mt-1 text-sm font-bold ${securityColor}`}>Enclosure: {securityLabel}</p>
            </div>
          </div>
          {mode === 'test' && tamperState === 'secure' && (
            <button type="button" onClick={detectTamper} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20">
              Simulate enclosure tamper
            </button>
          )}
        </div>
        {tamperState === 'detected' && (
          <div role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-red-200">Critical security alert · meter locked</p>
            <p className="mt-1 text-sm text-red-100/80">Load disconnected. Scan an authorized maintenance RFID card locally before re-arming tamper protection.</p>
          </div>
        )}
        {tamperState === 'maintenance' && (
          <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-bold text-amber-200">Authorized maintenance mode active</p>
            <p className="mt-1 text-sm text-amber-100/80">The demo remains locked until tamper protection is re-armed.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(tamperState === 'detected' || tamperState === 'maintenance') && (
            <button type="button" onClick={scanMaintenanceCard} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20">
              Simulate local maintenance RFID scan
            </button>
          )}
          {tamperState === 'maintenance' && (
            <button type="button" onClick={rearmProtection} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">
              Re-arm tamper protection
            </button>
          )}
        </div>
        {mode === 'test' && (
          <label className="block max-w-md">
            <span className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>Simulate prepaid balance</span>
              <span className="font-mono text-cyan-300">GHS {balance.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={balance}
              aria-label="Simulate prepaid balance"
              onChange={event => {
                const nextBalance = Number(event.target.value);
                setBalance(nextBalance);
                if (nextBalance === 0) {
                  setRelayRequested(false);
                  recordAlert('Prepaid credit exhausted', 'Balance reached GHS 0.00 · load automatically disconnected.', 'critical');
                } else if (nextBalance < 11) {
                  recordAlert('Low energy credit', `Balance is GHS ${nextBalance.toFixed(2)} · below GHS 11.00.`, 'warning');
                }
              }}
              className="mt-2 w-full accent-cyan-400"
            />
            <span className="mt-1 block text-[11px] text-slate-500">Use zero to demonstrate the automatic safety cutoff and GHS 11 low-balance warning.</span>
          </label>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section id="energy-section-6" aria-label="Consumption analytics" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Consumption analytics</h3>
              <p className="mt-1 text-xs text-slate-400">Sample usage, demand and prepaid balance history</p>
            </div>
            <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-300">Last 24 hours</span>
          </div>
          <svg role="img" aria-label="Simulated electricity consumption and power demand history" viewBox="0 0 640 220" className="mt-5 h-48 w-full" preserveAspectRatio="none">
            {[35, 75, 115, 155].map(y => <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#334155" strokeDasharray="4 6" />)}
            <path d="M0 155 L80 141 L160 148 L240 95 L320 119 L400 83 L480 99 L560 55 L640 72" fill="none" stroke="#22d3ee" strokeWidth="3" />
            <path d="M0 103 L80 117 L160 91 L240 126 L320 81 L400 107 L480 68 L560 93 L640 52" fill="none" stroke="#a78bfa" strokeWidth="3" />
            <path d="M0 77 L80 88 L160 71 L240 80 L320 65 L400 83 L480 69 L560 77 L640 62" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
            <path d="M0 42 L80 49 L160 57 L240 66 L320 82 L400 94 L480 108 L560 123 L640 139" fill="none" stroke="#34d399" strokeWidth="2.5" />
            <text x="4" y="205" fill="#94a3b8" fontSize="11">00:00</text>
            <text x="155" y="205" fill="#94a3b8" fontSize="11">06:00</text>
            <text x="315" y="205" fill="#94a3b8" fontSize="11">12:00</text>
            <text x="475" y="205" fill="#94a3b8" fontSize="11">18:00</text>
            <text x="600" y="205" fill="#94a3b8" fontSize="11">Now</text>
          </svg>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <span className="inline-flex items-center gap-2 text-cyan-300"><span className="h-0.5 w-4 bg-cyan-300" />Energy use (kWh)</span>
            <span className="inline-flex items-center gap-2 text-violet-300"><span className="h-0.5 w-4 bg-violet-300" />Power demand (W)</span>
            <span className="inline-flex items-center gap-2 text-amber-300"><span className="h-0.5 w-4 bg-amber-300" />Voltage (V)</span>
            <span className="inline-flex items-center gap-2 text-emerald-300"><span className="h-0.5 w-4 bg-emerald-300" />Prepaid balance (GHS)</span>
          </div>
        </section>

        <section id="energy-section-7" aria-label="Alerts and notifications" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Alerts & notifications</h3>
              <p className="mt-1 text-xs text-slate-400">Recent simulated meter events</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {alerts.map(alert => (
              <li key={alert.id} className={`rounded-xl border p-3 ${alert.severity === 'critical' ? 'border-red-500/30 bg-red-500/[0.06]' : alert.severity === 'warning' ? 'border-amber-500/25 bg-amber-500/[0.04]' : 'border-slate-800 bg-slate-950/60'}`}>
                <p className={`text-sm font-semibold ${alert.severity === 'critical' ? 'text-red-200' : alert.severity === 'warning' ? 'text-amber-200' : 'text-slate-200'}`}>{alert.title}</p>
                <p className="mt-1 text-xs text-slate-400">{alert.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {mode === 'test' ? 'Test dashboard:' : 'Service portal preview:'} all meter measurements, account credit, RFID scans, tamper events, network status, charts, and relay actions are simulated. No PZEM sensor, RFID reader, Adafruit IO service, or physical relay is connected. Production safety cutoffs must be enforced locally by the meter hardware.
      </p>
    </section>
  );
}

function GenericDeviceDashboard({ device, mode }: { device: Device; mode: 'test' | 'service' }) {
  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
          {mode === 'test' ? 'Private device test preview' : 'Service portal'}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">{device.name}</h2>
        <p className="mt-2 text-sm text-slate-400">Sample dashboard · live hardware data is not connected</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Device state', value: 'Sample · standby' },
          { label: 'Last sample', value: device.lastAlert },
          { label: 'Connection', value: 'Not connected' }
        ].map(item => (
          <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-3 font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </div>
      <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
        This dashboard is a UI preview only. Live telemetry, device commands, and controls are unavailable until a hardware API is connected.
      </p>
    </section>
  );
}

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
  const [loginMessage, setLoginMessage] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [portalAuthLoading, setPortalAuthLoading] = useState(true);
  const [portalAuthError, setPortalAuthError] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [testDevice, setTestDevice] = useState<Device | null>(null);

  // Admin / Client Dynamic App Data
  const [devices, setDevices] = useState<Device[]>(() => {
    const storedDevices = window.localStorage.getItem('gkb-devices');
    const savedDevices = storedDevices ? JSON.parse(storedDevices) as Device[] : [];
    const customDevices = savedDevices.filter(device => !defaultDevices.some(defaultDevice =>
      defaultDevice.key === device.key || defaultDevice.legacyKeys?.includes(device.key)
    ));
    return [...defaultDevices, ...customDevices];
  });

  const [linkedDevices, setLinkedDevices] = useState<Device[]>([]);
  const [inputKey, setInputKey] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [linkMessageIsError, setLinkMessageIsError] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  // Admin New Device Form
  const [newDevName, setNewDevName] = useState('');
  const [newDevKey, setNewDevKey] = useState('');

  // Complaints System
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintError, setComplaintError] = useState('');
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [newComplaintText, setNewComplaintText] = useState('');

  const activateUser = useCallback((account: UserType) => {
    setUser(account);
    setActiveTab(selectedService ? 'service-portal' : 'devices');
    setSelectedDevice(null);
    setTestDevice(null);
  }, [selectedService]);

  const applyPortalSession = useCallback(async (session: Session | null) => {
    setPortalAuthError('');
    if (!session?.user.email && !session?.user.phone) {
      setUser(null);
      setLinkedDevices([]);
      return;
    }

    const account: UserType = {
      id: session.user.id,
      role: 'client',
      email: session.user.email ?? session.user.phone ?? ''
    };
    if (!relaySupabase) {
      activateUser(account);
      return;
    }

    const { data, error } = await relaySupabase
      .from('gkb_user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (error) {
      console.error('Unable to load the signed-in portal user role.', error);
      setUser(null);
      setLinkedDevices([]);
      setPortalAuthError(`Account access could not be verified: ${error.message}`);
      return;
    }
    const role = data?.role === 'admin' ? 'admin' : 'client';
    if (!session.user.email && role !== 'admin') {
      setUser(null);
      setLinkedDevices([]);
      setPortalAuthError('Client accounts need an email address for orders and support tickets. Sign in with an email-based account.');
      return;
    }
    activateUser({ ...account, role });
  }, [activateUser]);

  useEffect(() => {
    if (!relaySupabase) {
      setPortalAuthLoading(false);
      return;
    }

    let disposed = false;
    const syncSession = async (session: Session | null) => {
      if (disposed) return;
      setPortalAuthLoading(false);
      try {
        await applyPortalSession(session);
      } catch (error) {
        if (!disposed) {
          console.error('Unable to restore the signed-in portal session.', error);
          setPortalAuthError(error instanceof Error ? error.message : 'Unable to restore the portal session.');
        }
      }
    };

    const { data: { subscription } } = relaySupabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });
    void relaySupabase.auth.getSession().then(({ data, error }) => {
      if (disposed) return;
      if (error) {
        setPortalAuthLoading(false);
        setPortalAuthError(`Could not restore your sign-in: ${error.message}`);
        return;
      }
      void syncSession(data.session);
    }).catch(error => {
      if (!disposed) {
        setPortalAuthLoading(false);
        setPortalAuthError(error instanceof Error ? error.message : 'Could not restore your sign-in.');
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [applyPortalSession]);

  useEffect(() => {
    if (!user || !relaySupabase) {
      setLinkedDevices([]);
      return;
    }

    let disposed = false;
    const loadLinkedDevices = async () => {
      const { data, error } = await relaySupabase
        .from('gkb_user_devices')
        .select('device_key, device_name, status, last_alert, project, relay_channels')
        .eq('user_id', user.id)
        .order('device_name');
      if (disposed) return;
      if (error) {
        console.error('Unable to load this account’s linked devices from Supabase.', error);
        setLinkedDevices([]);
        setLinkMessage(`Saved devices could not be loaded: ${error.message}`);
        setLinkMessageIsError(true);
        return;
      }
      let savedDeviceRows = data ?? [];
      const legacyLinksKey = `gkb-linked-devices:${user.email.trim().toLowerCase()}`;
      const legacyLinks = window.localStorage.getItem(legacyLinksKey);
      if (legacyLinks) {
        const parsed: unknown = JSON.parse(legacyLinks);
        if (!Array.isArray(parsed) || !parsed.every(isStoredDevice)) {
          throw new Error('Saved device links in this browser are invalid and could not be migrated.');
        }
        const { error: migrationError } = await relaySupabase.from('gkb_user_devices').upsert(
          parsed.map(device => ({
            user_id: user.id,
            device_key: device.key,
            device_name: device.name,
            status: device.status,
            last_alert: device.lastAlert,
            project: device.project ?? null,
            relay_channels: device.relayChannels ?? null
          })),
          { onConflict: 'user_id,device_key' }
        );
        if (migrationError) throw migrationError;
        window.localStorage.removeItem(legacyLinksKey);
        const { data: migratedRows, error: reloadError } = await relaySupabase
          .from('gkb_user_devices')
          .select('device_key, device_name, status, last_alert, project, relay_channels')
          .eq('user_id', user.id)
          .order('device_name');
        if (reloadError) throw reloadError;
        savedDeviceRows = migratedRows ?? [];
      }
      setLinkedDevices(savedDeviceRows.map(savedDevice => {
        const catalogueDevice = devices.find(device =>
          device.key.toUpperCase() === savedDevice.device_key.toUpperCase() ||
          device.legacyKeys?.some(key => key.toUpperCase() === savedDevice.device_key.toUpperCase())
        );
        return catalogueDevice ?? {
          id: 0,
          key: savedDevice.device_key,
          name: savedDevice.device_name,
          status: savedDevice.status,
          lastAlert: savedDevice.last_alert,
          ...(savedDevice.project ? { project: savedDevice.project as StudentProject } : {}),
          ...(savedDevice.relay_channels === 4 || savedDevice.relay_channels === 6 || savedDevice.relay_channels === 8
            ? { relayChannels: savedDevice.relay_channels }
            : {})
        };
      }));
    };

    void loadLinkedDevices().catch(error => {
      if (!disposed) {
        console.error('Unable to load this account’s linked devices from Supabase.', error);
        setLinkMessage(error instanceof Error ? error.message : 'Saved devices could not be loaded.');
        setLinkMessageIsError(true);
      }
    });
    return () => {
      disposed = true;
    };
  }, [user, devices]);

  useEffect(() => {
    if (!user || !relaySupabase) {
      setComplaints([]);
      setComplaintsLoading(false);
      return;
    }

    let disposed = false;
    const loadComplaints = async () => {
      setComplaintsLoading(true);
      setComplaintError('');
      let query = relaySupabase
        .from('gkb_complaints')
        .select('id, user_id, client_email, complaint, solved, created_at')
        .order('created_at', { ascending: false });
      if (user.role !== 'admin') query = query.eq('user_id', user.id);
      const { data, error } = await query;
      if (disposed) return;
      if (error) {
        console.error('Unable to load support tickets from Supabase.', error);
        setComplaintError(`Support tickets could not be loaded: ${error.message}`);
      } else {
        setComplaints((data ?? []).map(item => ({
          id: item.id,
          clientId: item.user_id,
          clientEmail: item.client_email,
          text: item.complaint,
          solved: item.solved,
          date: new Date(item.created_at).toLocaleDateString()
        })));
      }
      setComplaintsLoading(false);
    };

    void loadComplaints().catch(error => {
      if (!disposed) {
        console.error('Unable to load support tickets from Supabase.', error);
        setComplaintError(error instanceof Error ? error.message : 'Support tickets could not be loaded.');
        setComplaintsLoading(false);
      }
    });
    return () => {
      disposed = true;
    };
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem('gkb-theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    setLoginMessage('');
    if (!relaySupabase) {
      setLoginError(relaySupabaseConfigError);
      return;
    }

    setLoginBusy(true);
    try {
      if (creatingAccount) {
        const { data, error } = await relaySupabase.auth.signUp({
          email: loginEmail.trim(),
          password: loginPassword,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        if (!data.session) {
          setLoginMessage('Account created. Check your email to confirm your address, then sign in.');
          setCreatingAccount(false);
          setLoginPassword('');
          return;
        }
      } else {
        const identifier = loginEmail.trim();
        const credentials = identifier.includes('@')
          ? { email: identifier, password: loginPassword }
          : { phone: identifier, password: loginPassword };
        const { error } = await relaySupabase.auth.signInWithPassword(credentials);
        if (error) throw error;
      }
      setLoginModalOpen(false);
      clearInputs();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoginError('');
    setLoginMessage('');
    if (!relaySupabase) {
      setLoginError(relaySupabaseConfigError);
      return;
    }

    setLoginBusy(true);
    try {
      const { error } = await relaySupabase.auth.resend({
        type: 'signup',
        email: loginEmail.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setLoginMessage('Confirmation email sent again. Check your inbox and spam folder.');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not resend the confirmation email.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!relaySupabase) {
      setPortalAuthError(relaySupabaseConfigError);
      return;
    }
    try {
      const { error } = await relaySupabase.auth.signOut();
      if (error) {
        setPortalAuthError(`Could not sign out: ${error.message}`);
        return;
      }
      setActiveTab('about');
      setSelectedService(null);
      setSelectedDevice(null);
      setTestDevice(null);
    } catch (error) {
      setPortalAuthError(error instanceof Error ? `Could not sign out: ${error.message}` : 'Could not sign out.');
    }
  };

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setSelectedDevice(null);
    if (user) {
      setActiveTab('service-portal');
    } else {
      setLoginError('');
      setLoginMessage('');
      setLoginModalOpen(true);
    }
  };

  const clearInputs = () => {
    setLoginEmail('');
    setLoginPassword('');
  };

  // Device Linking action for Client
  const handleLinkDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLinkMessage('');
    setLinkMessageIsError(false);
    setLinkBusy(true);
    const pairingKey = inputKey.trim();
    const foundDemoDevice = devices.find((device: Device) =>
      device.key.toUpperCase() === pairingKey.toUpperCase() ||
      device.legacyKeys?.some(key => key.toUpperCase() === pairingKey.toUpperCase())
    );

    const saveLinkedDevice = async (device: Device, message: string) => {
      if (!user || !relaySupabase) {
        throw new Error('Sign in to a Supabase account before saving a linked device.');
      }
      const { error } = await relaySupabase.from('gkb_user_devices').upsert({
        user_id: user.id,
        device_key: device.key,
        device_name: device.name,
        status: device.status,
        last_alert: device.lastAlert,
        project: device.project ?? null,
        relay_channels: device.relayChannels ?? null
      }, { onConflict: 'user_id,device_key' });
      if (error) throw error;
      const nextLinkedDevices = linkedDevices.some(linkedDevice => linkedDevice.key === device.key)
        ? linkedDevices
        : [...linkedDevices, device];
      setLinkedDevices(nextLinkedDevices);
      setLinkMessage(message);
    };

    try {
      if (foundDemoDevice) {
        if (linkedDevices.some(device => device.key === foundDemoDevice.key)) {
          setLinkMessage('Device is already linked to your account.');
          setLinkMessageIsError(true);
        } else {
          await saveLinkedDevice(foundDemoDevice, `"${foundDemoDevice.name}" demo preview linked. Use its one-time ESP32 pairing key to pair physical hardware.`);
        }
        return;
      }

      if (!relayPairingEnabled || !relaySupabase) {
        throw new Error('Secure ESP32 pairing is not enabled yet. The administrator must deploy the pair-relay Supabase Edge Function and enable VITE_RELAY_PAIRING_ENABLED in Netlify.');
      }
      const { data: { session }, error: sessionError } = await relaySupabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('Sign in to Supabase first. Open the linked Relay Test Service Portal, sign in under “Supabase relay account,” then return here.');
      }

      const { data, error } = await relaySupabase.functions.invoke('pair-relay', {
        body: { pairingKey }
      });
      if (error) throw new Error(await formatSupabaseFunctionError(error));
      if (typeof data !== 'object' || data === null || !('device_id' in data) || data.device_id !== 'relay_01') {
        throw new Error('The pairing service returned an unexpected device response.');
      }
      const relayDevice = devices.find(device => device.project === 'relay-test');
      if (!relayDevice) {
        throw new Error('The Relay Test device is missing from this site’s device catalogue.');
      }
      await saveLinkedDevice(
        relayDevice,
        'ESP32 relay paired to your Supabase account. The one-time pairing key has been consumed; open Relay Test from Linked devices.'
      );
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : formatSupabaseError(error));
      setLinkMessageIsError(true);
    } finally {
      setInputKey('');
      setLinkBusy(false);
    }
  };

  const handleUnlinkDevice = async (device: Device) => {
    if (!user) {
      setLinkMessage('Sign in before removing a device from this account.');
      setLinkMessageIsError(true);
      return;
    }
    if (!window.confirm(`Unlink "${device.name}" from this account? This removes its dashboard link only; it does not unpair or reset the physical device.`)) {
      return;
    }

    try {
      if (!relaySupabase) throw new Error(relaySupabaseConfigError);
      const { error } = await relaySupabase
        .from('gkb_user_devices')
        .delete()
        .eq('user_id', user.id)
        .eq('device_key', device.key);
      if (error) throw error;
      const nextLinkedDevices = linkedDevices.filter(linkedDevice => linkedDevice.key !== device.key);
      setLinkedDevices(nextLinkedDevices);
      setLinkMessage(`"${device.name}" was unlinked from this account. The physical device pairing was not changed.`);
      setLinkMessageIsError(false);
    } catch (error) {
      console.error('Unable to unlink this account’s device in Supabase.', error);
      setLinkMessage(`Could not unlink "${device.name}": ${error instanceof Error ? error.message : 'Unexpected database error.'}`);
      setLinkMessageIsError(true);
    }
  };

  // Admin action: Create Device
  const handleCreateDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDevName || !newDevKey) return;
    if (devices.some(device => device.key.toUpperCase() === newDevKey.trim().toUpperCase())) {
      setLinkMessage('That special key is already assigned to a device.');
      setLinkMessageIsError(true);
      return;
    }
    const created: Device = { id: Date.now(), name: newDevName, key: newDevKey, status: 'Online', lastAlert: 'System initialized successfully.' };
    const nextDevices = [...devices, created];
    setDevices(nextDevices);
    try {
      window.localStorage.setItem('gkb-devices', JSON.stringify(nextDevices));
    } catch (error) {
      console.error('Unable to save the device catalogue to browser storage.', error);
      setLinkMessage('Device added for this session, but the catalogue could not be saved to this browser.');
      setLinkMessageIsError(true);
    }
    setNewDevName('');
    setNewDevKey('');
  };

  // Submit Complaint
  const handleSubmitComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComplaintText.trim() || !user) return;
    if (!relaySupabase) {
      setComplaintError(relaySupabaseConfigError);
      return;
    }
    setComplaintBusy(true);
    setComplaintError('');
    try {
      const { data, error } = await relaySupabase
        .from('gkb_complaints')
        .insert({
          user_id: user.id,
          client_email: user.email,
          complaint: newComplaintText.trim()
        })
        .select('id, user_id, client_email, complaint, solved, created_at')
        .single();
      if (error) throw error;
      setComplaints(current => [{
        id: data.id,
        clientId: data.user_id,
        clientEmail: data.client_email,
        text: data.complaint,
        solved: data.solved,
        date: new Date(data.created_at).toLocaleDateString()
      }, ...current]);
      setNewComplaintText('');
    } catch (error) {
      console.error('Unable to submit support ticket to Supabase.', error);
      setComplaintError(`Your ticket could not be saved: ${error instanceof Error ? error.message : 'Unexpected database error.'}`);
    } finally {
      setComplaintBusy(false);
    }
  };

  // Toggle Complaint Solved Status (Admin only)
  const toggleComplaintSolved = async (complaint: Complaint) => {
    if (!relaySupabase || user?.role !== 'admin') return;
    const nextSolved = !complaint.solved;
    setComplaintError('');
    try {
      const { error } = await relaySupabase
        .from('gkb_complaints')
        .update({ solved: nextSolved })
        .eq('id', complaint.id);
      if (error) throw error;
      setComplaints(current => current.map(item =>
        item.id === complaint.id ? { ...item, solved: nextSolved } : item
      ));
    } catch (error) {
      console.error('Unable to update support ticket in Supabase.', error);
      setComplaintError(`Ticket status could not be updated: ${error instanceof Error ? error.message : 'Unexpected database error.'}`);
    }
  };

  const navigationItems = [
    { tab: 'about', label: 'About Us', visible: true },
    {
      tab: selectedService === 'retail-gadgets' && user?.role === 'client' ? 'orders' : 'devices',
      label: selectedService === 'retail-gadgets' && user?.role === 'client'
        ? 'Track Order'
        : user?.role === 'admin' ? 'Admin Portal (Devices)' : 'My Devices',
      visible: Boolean(user)
    },
    {
      tab: 'orders',
      label: user?.role === 'admin' ? 'Review Orders' : 'My Orders',
      visible: Boolean(user) && !(selectedService === 'retail-gadgets' && user?.role === 'client')
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
    <div className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden ${isLightMode ? 'theme-light' : ''}`}>
      
      {/* Background Cyberpunk Grid & Glows */}
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none ${isLightMode ? 'hidden' : ''}`}></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="relative z-50 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          
          {/* Logo Brand */}
          <div className="flex min-w-0 items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => setActiveTab('about')}>
            <img
              src="/gkb-company-logo.png"
              alt="GKB Technologies company logo"
              className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            />
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
      <main className="relative z-10 w-full flex-1 max-w-[1536px] mx-auto px-3 sm:px-5 lg:px-6 py-8">
        {portalAuthError && (
          <p role="alert" className="mx-auto mb-6 max-w-7xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {portalAuthError}
          </p>
        )}
        {portalAuthLoading && (
          <p role="status" className="mx-auto mb-6 max-w-7xl rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
            Checking your portal sign-in…
          </p>
        )}

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

        {/* ================= MY DEVICES ================= */}
        {activeTab === 'devices' && user && (
          <div className="mx-auto max-w-7xl space-y-8 animate-fadeIn">
            <header>
              <h2 className="text-3xl font-bold text-white">My Devices</h2>
              <p className="mt-2 text-sm text-slate-400">Test a GKB system preview, link a purchased device, or open one of your linked devices.</p>
            </header>

            {user.role === 'admin' && (
              <section className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-300">
                  <Server className="h-5 w-5" />
                  Add a system to the device catalogue
                </h3>
                <form onSubmit={handleCreateDevice} className="grid gap-4 md:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Device name"
                    value={newDevName}
                    onChange={e => setNewDevName(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Special device key"
                    value={newDevKey}
                    onChange={e => setNewDevKey(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                  <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-2 text-sm font-bold text-black">
                    <PlusCircle className="h-4 w-4" />
                    Add device
                  </button>
                </form>
              </section>
            )}

            <section className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Test a device</h3>
                <p className="mt-1 text-sm text-slate-400">Open a private preview to see how each system dashboard will look. Test previews are not hardware connections.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {devices.map(device => (
                  <article key={device.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">System preview</span>
                      <h4 className="mt-2 text-lg font-bold text-white">{device.name}</h4>
                      {user.role === 'admin' && (
                        <p className="mt-1 font-mono text-xs text-slate-500">Special key: {device.key}</p>
                      )}
                      <p className="mt-2 text-sm text-slate-400">Explore a simulated dashboard before linking a purchased device.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestDevice(device);
                        setActiveTab('device-test');
                      }}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      Test device
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-purple-500/30 bg-slate-900/60 p-6">
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <Cpu className="h-5 w-5 text-purple-300" />
                Link a purchased device
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Demo keys link previews in this browser. For the physical Relay Test ESP32, enter its unique one-time pairing key; pairing requires an active Supabase sign-in and a deployed pairing service.
              </p>
              <form onSubmit={handleLinkDevice} className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  aria-label="Device special key"
                  placeholder="Demo key or ESP32 pairing key"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  disabled={linkBusy}
                  className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
                <button type="submit" disabled={linkBusy} className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60">
                  {linkBusy ? 'Verifying key…' : 'Link device'}
                </button>
              </form>
              {!relayPairingEnabled && <p className="mt-3 text-xs leading-relaxed text-amber-200">Hardware pairing is not enabled yet; demo keys still link previews. The administrator must deploy the secure pairing function before an ESP32 key can be used.</p>}
              {linkMessage && (
                <p role={linkMessageIsError ? 'alert' : 'status'} className={`mt-4 rounded-lg border px-4 py-3 text-sm ${linkMessageIsError ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                  {linkMessage}
                </p>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Linked devices</h3>
                <p className="mt-1 text-sm text-slate-400">Open a linked device or unlink it from this account. Unlinking does not reset or unpair its physical hardware.</p>
              </div>
              {linkedDevices.length === 0 ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                  No devices linked yet. Test a system above, or enter a purchased device key to link it.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {linkedDevices.map(device => (
                    <article key={device.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div>
                        <h4 className="font-bold text-white">{device.name}</h4>
                        <p className="mt-1 text-xs text-slate-400">Linked to this account · hardware pairing is managed separately</p>
                      </div>
                      <div className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDevice(device);
                            setSelectedService(device.project ? 'student-projects' : 'retail-gadgets');
                            setActiveTab('service-portal');
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500/15 px-4 py-2.5 text-sm font-bold text-purple-200 transition-colors hover:bg-purple-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                        >
                          Open in Service Portal
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnlinkDevice(device)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          aria-label={`Unlink ${device.name}`}
                        >
                          <Unlink className="h-4 w-4" />
                          Unlink
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================= PRIVATE DEVICE TEST PREVIEW ================= */}
        {activeTab === 'device-test' && user && testDevice && (
          <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn">
            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-300"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to My Devices
            </button>
            {testDevice.project === 'fuel-tank-monitor'
              ? <FuelTankMonitorDashboard mode="test" />
              : testDevice.project === 'relay-test'
                ? <RelayTestDashboard mode="test" />
              : testDevice.project === 'water-tank-monitor'
                ? <WaterTankMonitorDashboard mode="test" />
                : testDevice.project === 'alcohol-breathalyzer'
                  ? <AlcoholBreathalyzerDashboard mode="test" />
                  : testDevice.project === 'fan-regulator'
                    ? <FanRegulatorDashboard mode="test" device={testDevice} />
                    : testDevice.project === 'light-control'
                      ? <LightControlDashboard mode="test" device={testDevice} />
                : testDevice.project === 'prepaid-energy-meter'
                  ? <PrepaidEnergyMeterDashboard mode="test" />
                : <GenericDeviceDashboard device={testDevice} mode="test" />}
          </div>
        )}

        {/* ================= SERVICE PORTAL ================= */}
        {activeTab === 'service-portal' && user && selectedService && (
          <div className={`mx-auto space-y-6 animate-fadeIn ${selectedService === 'student-projects' ? 'max-w-7xl' : 'max-w-4xl'}`}>
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 sm:p-8">
              <p className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Signed in as {user.email}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {selectedDevice?.name ?? (selectedService === 'student-projects' ? 'Student Project Solutions' : 'Retail Gadget Distribution')}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                 {selectedDevice?.project === 'relay-test'
                   ? 'Relay state is synchronized through Supabase; physical relay output is not acknowledged by the current firmware.'
                   : selectedDevice
                     ? 'Device service dashboard. Sample readings are shown until live hardware telemetry is connected.'
                     : 'Select a saved device from My Devices to open its service dashboard.'}
              </p>
            </div>

            {selectedDevice ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('devices')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-300"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back to My Devices
                </button>
                {selectedDevice.project === 'fuel-tank-monitor'
                  ? <FuelTankMonitorDashboard mode="service" />
                  : selectedDevice.project === 'relay-test'
                    ? <RelayTestDashboard mode="service" />
                  : selectedDevice.project === 'water-tank-monitor'
                    ? <WaterTankMonitorDashboard mode="service" />
                    : selectedDevice.project === 'alcohol-breathalyzer'
                      ? <AlcoholBreathalyzerDashboard mode="service" />
                      : selectedDevice.project === 'fan-regulator'
                        ? <FanRegulatorDashboard mode="service" device={selectedDevice} />
                        : selectedDevice.project === 'light-control'
                          ? <LightControlDashboard mode="service" device={selectedDevice} />
                    : selectedDevice.project === 'prepaid-energy-meter'
                      ? <PrepaidEnergyMeterDashboard mode="service" />
                    : <GenericDeviceDashboard device={selectedDevice} mode="service" />}
              </div>
            ) : selectedService === 'retail-gadgets' ? (
              <section className="rounded-2xl border border-purple-500/25 bg-slate-900/50 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-white">Order and track gadgets</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Submit the item and quantity you need, choose delivery or pickup, and follow order updates from your account.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="mt-5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
                >
                  Place an order / Track my orders
                </button>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <p className="text-sm text-slate-300">No device dashboard is selected yet. Link a purchased device, then open it from your Linked devices list.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('devices')}
                  className="mt-4 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-cyan-400"
                >
                  Go to My Devices
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'orders' && user && (
          <OrdersPortal user={user} />
        )}

        {/* ================= ADMIN COMPLAINTS TAB ================= */}
        {activeTab === 'admin-complaints' && user && user?.role === 'admin' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-2xl font-bold text-white">Client Complaints Review Center</h3>
            <p className="text-xs text-slate-400">Review tickets submitted by clients, fix issues, and check them off as resolved.</p>
            
            <div className="space-y-4">
              {complaintError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {complaintError}
                </p>
              )}
              {complaintsLoading && <p role="status" className="text-sm text-slate-400">Loading saved tickets…</p>}
              {!complaintsLoading && !complaintError && complaints.length === 0 && (
                <p className="text-sm text-slate-500">No client tickets have been submitted yet.</p>
              )}
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
                    type="button"
                    onClick={() => void toggleComplaintSolved(c)}
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
                {complaintError && (
                  <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {complaintError}
                  </p>
                )}
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
                  disabled={complaintBusy}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60"
                >
                  {complaintBusy ? 'Saving ticket…' : 'Submit Ticket to Admin'}
                </button>
              </form>
            </div>

            {/* My Submitted Complaints History */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Your Submitted Tickets</h4>
              {complaintsLoading ? (
                <p role="status" className="text-xs text-slate-500">Loading your saved tickets…</p>
              ) : complaints.filter(c => c.clientId === user.id).length === 0 ? (
                <p className="text-xs text-slate-500">No complaints submitted yet.</p>
              ) : (
                complaints.filter(c => c.clientId === user.id).map(c => (
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

      <footer className="relative z-10 border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-slate-300">GKB Technologies</p>
            <p className="mt-1 text-xs">© {new Date().getFullYear()} GKB Technologies. All rights reserved.</p>
          </div>
          <nav aria-label="Footer navigation" className="flex items-center gap-5">
            <button type="button" onClick={() => setActiveTab('about')} className="transition-colors hover:text-cyan-300">
              About Us
            </button>
            <button type="button" onClick={() => setActiveTab('contact')} className="transition-colors hover:text-cyan-300">
              Contact Us
            </button>
          </nav>
        </div>
      </footer>

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
            {loginMessage && (
              <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                {loginMessage}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {creatingAccount ? 'Email Address' : 'Email or phone number'}
                </label>
                <input 
                  type={creatingAccount ? 'email' : 'text'}
                  autoComplete={creatingAccount ? 'email' : 'username'}
                  placeholder={creatingAccount ? 'you@example.com' : 'you@example.com or +233…'}
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
                  autoComplete={creatingAccount ? 'new-password' : 'current-password'}
                  minLength={6}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loginBusy}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold rounded-lg text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60"
              >
                {loginBusy ? 'Working…' : creatingAccount ? 'Create account' : 'Sign In'}
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              <button
                type="button"
                disabled={loginBusy}
                onClick={() => {
                  setCreatingAccount(value => !value);
                  setLoginError('');
                  setLoginMessage('');
                }}
                className="text-cyan-300 transition-colors hover:text-cyan-200 disabled:opacity-50"
              >
                {creatingAccount ? 'Already registered? Sign in' : 'Create a client account'}
              </button>
              {loginMessage.includes('confirm your address') && (
                <button
                  type="button"
                  disabled={loginBusy}
                  onClick={() => void handleResendConfirmation()}
                  className="text-cyan-300 transition-colors hover:text-cyan-200 disabled:opacity-50"
                >
                  Resend confirmation email
                </button>
              )}
            </div>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => {
                  setLoginModalOpen(false);
                  setLoginError('');
                  setLoginMessage('');
                }}
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