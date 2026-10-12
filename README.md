# GKB Technologies

GKB Technologies is a React and Vite web portal for student engineering projects, retail gadgets, and interactive previews of GKB IoT device dashboards.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Create and preview a production build with:

```sh
npm run build
npm run preview
```

Run the configured lint checks with `npm run lint`.

## Device portal

Sign in to the portal and open **My Devices**:

- Choose **Test device** to preview a device dashboard without linking it.
- Enter a key below under **Link a purchased device** to add a device to the current browser profile.
- Open a linked device from **Linked devices** to view its Service Portal dashboard.

### Demo device keys

| Device | Special key | Dashboard |
| --- | --- | --- |
| Smart Home Security System v1 | `GKB-SEC-9988` | Generic device preview |
| Smart Water Tank Monitor | `GKB-SWP-0001` | Smart Water Tank System |
| Industrial Fuel Tank Monitor | `GKB-IUFT-0001` | Underground Fuel Tank Monitor |
| GKB Smart Prepaid Energy Meter | `GKB-SPEM-0001` | Prepaid Energy Meter |

The legacy Smart Water Tank key `GKB-WTR-4412` is also accepted.

## Energy meter demo

The Smart Prepaid Energy Meter dashboard includes sample electrical measurements, prepaid balance and RFID recharge examples, tamper/security states, alerts, and simulated relay control. The bulb and relay controls are near the top of the dashboard. The demo bulb follows the relay: ON displays 60 W and 0.26 A; OFF displays 0 W and 0.00 A.

All device keys and dashboard behavior are for demonstration. Device linking is stored in the browser profile; readings, controls, alerts, and device states are simulated and do not connect to or control physical hardware.

## Deployment

The production site is hosted on Netlify and linked to this GitHub repository. Updates pushed to the configured deployment branch are published through Netlify's build and deploy pipeline.
