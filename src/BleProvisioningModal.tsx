import React, { useState, useEffect, useRef } from 'react';
import {
  Bluetooth, QrCode, Wifi, CheckCircle2, AlertTriangle, X,
  Camera, RefreshCw, Key, ShieldCheck, Printer, Radio, Eye, EyeOff
} from 'lucide-react';
import { createQrSvg } from './qrCodeHelper';

// GKB Provisioning GATT UUIDs
const GKB_BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const GKB_BLE_CHAR_RX_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // App Writes to ESP32
const GKB_BLE_CHAR_TX_UUID = 'beb5483f-36e1-4688-b7f5-ea07361b26a9'; // ESP32 Notifies App

interface BleProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceProvisioned: (deviceKey: string, deviceName: string) => void;
}

export default function BleProvisioningModal({ isOpen, onClose, onDeviceProvisioned }: BleProvisioningModalProps) {
  // Modal Step State: 'ble_connect' -> 'qr_verify' -> 'wifi_config' -> 'complete'
  const [step, setStep] = useState<'ble_connect' | 'qr_verify' | 'wifi_config' | 'complete'>('ble_connect');

  // Bluetooth State
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [rxChar, setRxChar] = useState<any>(null);
  const [isConnectingBle, setIsConnectingBle] = useState(false);
  const [bleError, setBleError] = useState('');
  const [bleLogs, setBleLogs] = useState<string[]>([]);

  // QR / Key Verification State
  const [deviceKeyInput, setDeviceKeyInput] = useState('GKBSEC-00106');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Wi-Fi Credentials State
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSendingWifi, setIsSendingWifi] = useState(false);
  const [wifiError, setWifiError] = useState('');

  // Factory Label Mode
  const [showFactoryLabel, setShowFactoryLabel] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setBleLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      if (bleDevice && bleDevice.gatt?.connected) {
        bleDevice.gatt.disconnect();
      }
      setBleDevice(null);
      setRxChar(null);
      setStep('ble_connect');
      setBleError('');
      setVerifyError('');
      setWifiError('');
      setIsCameraActive(false);
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleScanAndConnectBle = async () => {
    setBleError('');
    setIsConnectingBle(true);
    addLog('Scanning for nearby GKB ESP32 devices via Bluetooth Low Energy...');

    const nav = navigator as any;
    if (!nav.bluetooth) {
      setBleError('Web Bluetooth is supported in Google Chrome, Microsoft Edge, and Opera (Desktop & Android). On iOS, please use Bluefy or manual USB mode.');
      setIsConnectingBle(false);
      return;
    }

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: 'GKB-PROV' }],
        optionalServices: [GKB_BLE_SERVICE_UUID]
      });

      addLog(`Found BLE Node: ${device.name || 'GKB Device'}. Connecting GATT server...`);
      const server = await device.gatt.connect();
      addLog('GATT Server connected! Discovering GKB Provisioning Service...');

      const service = await server.getPrimaryService(GKB_BLE_SERVICE_UUID);
      const rx = await service.getCharacteristic(GKB_BLE_CHAR_RX_UUID);
      const tx = await service.getCharacteristic(GKB_BLE_CHAR_TX_UUID);

      setBleDevice(device);
      setRxChar(rx);

      await tx.startNotifications();
      tx.addEventListener('characteristicvaluechanged', (event: any) => {
        const textDecoder = new TextDecoder();
        const response = textDecoder.decode(event.target.value);
        addLog(`<< [ESP32-TX]: ${response}`);
        handleEsp32Response(response);
      });

      addLog('Bluetooth channel established! Ready for QR verification.');
      setStep('qr_verify');
    } catch (err: any) {
      console.error('BLE connection error:', err);
      if (err.name !== 'NotFoundError') {
        setBleError(err.message || 'Failed to connect via Bluetooth.');
        addLog(`BLE Error: ${err.message}`);
      }
    } finally {
      setIsConnectingBle(false);
    }
  };

  const handleEsp32Response = (response: string) => {
    const trimmed = response.trim();

    if (trimmed.includes('AUTH_SUCCESS') || trimmed.includes('DEVICE_UNLOCKED')) {
      setIsVerifyingKey(false);
      setVerifyError('');
      addLog('✅ Hardware token verified by ESP32! Unlocking Wi-Fi Setup form.');
      setStep('wifi_config');
    } else if (trimmed.includes('AUTH_FAILED') || trimmed.includes('INVALID_KEY')) {
      setIsVerifyingKey(false);
      setVerifyError('Authentication failed: The scanned key does not match this ESP32 board token. Check the label on the casing.');
      addLog('❌ Token mismatch: ESP32 rejected key.');
    } else if (trimmed.includes('CONFIG_SAVED') || trimmed.includes('REBOOTING')) {
      setIsSendingWifi(false);
      addLog('🎉 Wi-Fi configuration saved into ESP32 NVS flash! Device is rebooting...');
      setStep('complete');
      setTimeout(() => {
        onDeviceProvisioned(deviceKeyInput, `GKB Smart Device (${deviceKeyInput})`);
      }, 1800);
    } else if (trimmed.includes('CONFIG_ERROR')) {
      setIsSendingWifi(false);
      setWifiError('ESP32 reported an error parsing the Wi-Fi credentials.');
    }
  };

  const sendKeyVerification = async (keyToSend: string) => {
    if (!rxChar) {
      setVerifyError('Bluetooth characteristic not active. Please reconnect.');
      return;
    }
    const cleanKey = keyToSend.trim().toUpperCase();
    if (!cleanKey) {
      setVerifyError('Please enter or scan a valid device token.');
      return;
    }

    setIsVerifyingKey(true);
    setVerifyError('');
    addLog(`>> [APP-RX]: Sending VERIFY:${cleanKey}`);

    try {
      const textEncoder = new TextEncoder();
      await rxChar.writeValue(textEncoder.encode(`VERIFY:${cleanKey}`));
    } catch (err: any) {
      console.error('Failed to send verification key:', err);
      setIsVerifyingKey(false);
      setVerifyError(`Bluetooth write failed: ${err.message}`);
    }
  };

  const startCameraScanner = async () => {
    setIsCameraActive(true);
    setVerifyError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const nav = window as any;
      if (nav.BarcodeDetector) {
        const barcodeDetector = new nav.BarcodeDetector({ formats: ['qr_code'] });
        const scanInterval = setInterval(async () => {
          if (!streamRef.current || !videoRef.current) {
            clearInterval(scanInterval);
            return;
          }
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const scannedRaw = barcodes[0].rawValue.trim();
              if (scannedRaw) {
                clearInterval(scanInterval);
                stopCamera();
                setDeviceKeyInput(scannedRaw);
                addLog(`📷 QR Code Scanned from Camera: ${scannedRaw}`);
                sendKeyVerification(scannedRaw);
              }
            }
          } catch {
            // ignore
          }
        }, 400);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCameraActive(false);
      setVerifyError('Could not open camera. You can type the device token printed under the QR code.');
    }
  };

  const handleSaveWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) {
      setWifiError('Please enter your Wi-Fi Network Name (SSID).');
      return;
    }
    if (!rxChar) {
      setWifiError('Bluetooth disconnected. Please reconnect.');
      return;
    }

    setIsSendingWifi(true);
    setWifiError('');
    addLog(`>> [APP-RX]: Sending SET_WIFI payload for SSID "${wifiSsid.trim()}"`);

    try {
      const payload = JSON.stringify({
        ssid: wifiSsid.trim(),
        pass: wifiPass
      });
      const textEncoder = new TextEncoder();
      await rxChar.writeValue(textEncoder.encode(`SET_WIFI:${payload}`));
    } catch (err: any) {
      console.error('Failed to send Wi-Fi credentials:', err);
      setIsSendingWifi(false);
      setWifiError(`Bluetooth transmission failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-black shadow-lg shadow-cyan-500/20">
              <Bluetooth className="h-6 w-6 text-black" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">GKB Hardware Engineering</span>
              <h3 className="text-xl sm:text-2xl font-black text-white">BLE & QR Device Provisioning</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition-all ${
            step === 'ble_connect'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
          }`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-[11px]">1</span>
            <span>BLE Connect</span>
          </div>
          <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition-all ${
            step === 'qr_verify'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
          }`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-[11px]">2</span>
            <span>QR Verify</span>
          </div>
          <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition-all ${
            step === 'wifi_config' || step === 'complete'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
          }`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-[11px]">3</span>
            <span>Wi-Fi Setup</span>
          </div>
        </div>

        {step === 'ble_connect' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5 space-y-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-400 animate-pulse" /> Step 1: Discover ESP32 over Bluetooth
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ensure your GKB Smart Device is powered on. It is broadcasting its BLE beacon (<strong className="text-cyan-300 font-mono">GKB-PROV-00106</strong>). Click below to pair directly from your browser.
              </p>
            </div>

            {bleError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{bleError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleScanAndConnectBle}
              disabled={isConnectingBle}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-4 text-sm font-black uppercase tracking-wider text-black shadow-lg shadow-cyan-500/25 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isConnectingBle ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Connecting to ESP32 GATT…
                </>
              ) : (
                <>
                  <Bluetooth className="h-5 w-5" />
                  Scan & Connect Nearby ESP32
                </>
              )}
            </button>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowFactoryLabel(!showFactoryLabel)}
                className="text-xs text-slate-400 hover:text-cyan-300 underline inline-flex items-center gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                {showFactoryLabel ? 'Hide Manufacturing QR Generator' : 'Manufacturing: Generate & Print Physical Casing QR Label'}
              </button>
            </div>
          </div>
        )}

        {step === 'qr_verify' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> BLE Connected to: {bleDevice?.name || 'ESP32 Node'}
              </span>
              <h4 className="text-base font-bold text-white">Step 2: Verify Device Casing QR Code</h4>
              <p className="text-xs text-slate-300">
                Scan the QR code sticker on the casing, or verify the printed token below to unlock the ESP32 provisioning portal.
              </p>
            </div>

            {isCameraActive ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-cyan-400 bg-black shadow-inner">
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-44 w-44 rounded-2xl border-2 border-cyan-400 border-dashed animate-pulse" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Close Camera Scanner
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startCameraScanner}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition-all"
              >
                <Camera className="h-4 w-4 text-cyan-400" />
                Open Phone / Laptop Camera Scanner
              </button>
            )}

            <form onSubmit={e => { e.preventDefault(); sendKeyVerification(deviceKeyInput); }} className="space-y-3 pt-2">
              <label className="block text-xs text-slate-300">
                Security Token on Device Label:
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={deviceKeyInput}
                    onChange={e => setDeviceKeyInput(e.target.value)}
                    placeholder="e.g. GKBSEC-00106"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none uppercase"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingKey}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-cyan-400 transition-all disabled:opacity-50"
                  >
                    {isVerifyingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Verify Key
                  </button>
                </div>
              </label>
            </form>

            {verifyError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}
          </div>
        )}

        {step === 'wifi_config' && (
          <form onSubmit={handleSaveWifi} className="space-y-5 animate-fadeIn">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Hardware Authenticated Successfully
              </span>
              <h4 className="text-base font-bold text-white">Step 3: Connect to Local Wi-Fi</h4>
              <p className="text-xs text-slate-300">
                Enter your local 2.4GHz Wi-Fi credentials. The ESP32 will store them into non-volatile flash and connect to the GKB Cloud Gateway.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs text-slate-300">
                Wi-Fi Network Name (SSID)
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={e => setWifiSsid(e.target.value)}
                    placeholder="e.g. MyHome_WiFi_2.4G"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <Wifi className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </label>

              <label className="block text-xs text-slate-300">
                Wi-Fi Password
                <div className="relative mt-1">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={wifiPass}
                    onChange={e => setWifiPass(e.target.value)}
                    placeholder="Enter network security key"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-11 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {wifiError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{wifiError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingWifi}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/25 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isSendingWifi ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Writing to ESP32 Flash Memory…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Save Credentials & Connect ESP32
                </>
              )}
            </button>
          </form>
        )}

        {step === 'complete' && (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.4)] animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-2xl font-black text-white">Hardware Provisioned Successfully!</h4>
            <p className="max-w-md mx-auto text-xs text-slate-300">
              The ESP32 received your Wi-Fi credentials, stored them in non-volatile flash, and restarted to connect to the cloud. Redirecting to your live dashboard…
            </p>
          </div>
        )}

        {showFactoryLabel && (
          <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Phase 1 Factory Tool</span>
                <h4 className="text-sm font-bold text-white">Print Device Casing QR Sticker Label</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-500/30"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Label
                </button>
              </div>
            </div>

            <div className="mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-slate-300 bg-white p-5 text-black shadow-2xl max-w-xs text-center gkb-sticker-print">
              <div className="flex items-center gap-2 mb-2">
                <img src="/gkb-company-logo.png" alt="GKB" className="h-6 w-6 rounded object-cover" />
                <span className="text-xs font-black tracking-wider text-slate-900">GKB TECHNOLOGIES</span>
              </div>
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
                Smart IoT Hardware Node
              </p>

              <div
                className="p-2 border border-slate-200 rounded-xl bg-white shadow-sm"
                dangerouslySetInnerHTML={{ __html: createQrSvg(deviceKeyInput, 150) }}
              />

              <div className="mt-2.5 font-mono text-xs font-black tracking-widest bg-slate-100 px-3 py-1 rounded-md border border-slate-300 text-slate-900">
                {deviceKeyInput}
              </div>
              <p className="mt-1 text-[8px] font-bold uppercase text-slate-500">
                Scan with GKB Web App over BLE to Provision
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
            <span>BLE Communication Console</span>
            <span>GKB-BLE-v2.0</span>
          </div>
          <div className="max-h-24 overflow-y-auto font-mono text-[11px] text-cyan-300 space-y-0.5">
            {bleLogs.length === 0 ? (
              <span className="text-slate-600">Console idle. Ready for Bluetooth pairing.</span>
            ) : (
              bleLogs.map((log, idx) => (
                <div key={idx} className="truncate">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
