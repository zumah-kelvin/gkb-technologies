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
| Smart Alcohol Breathalyzer System | `GKB-SAB-0001` | Alcohol Breathalyzer |
| Smart Fan Regulator | `GKB-FAN-0001` | Fan Regulator |
| Smart Light Control System v1 (4-channel) | `GKB-LIGHT-0001V1` | 4-light Control |
| Smart Light Control System v2 (6-channel) | `GKB-LIGHT-0001V2` | 6-light Control |
| Smart Light Control System v3 (8-channel) | `GKB-LIGHT-0001V3` | 8-light Control |
| Relay Test | `GKB-RELAY-0001` | Relay and animated car |

The legacy Smart Water Tank key `GKB-WTR-4412` is also accepted.
The previous combined fan/light demo key `GKB-SFLC-0001` remains accepted as an alias for the Smart Fan Regulator. Older light keys `GKB-LIGHTV1-0001`, `GKB-LIGHTV2-0001`, and `GKB-LIGHTV3-0001` remain accepted; the generic light key `GKB-LIGHT-0001` remains an alias for the v1 4-channel light controller.

## Energy meter demo

The Smart Prepaid Energy Meter dashboard includes sample electrical measurements, prepaid balance and RFID recharge examples, tamper/security states, alerts, and simulated relay control. The bulb and relay controls are near the top of the dashboard. The demo bulb follows the relay: ON displays 60 W and 0.26 A; OFF displays 0 W and 0.00 A.

All device keys and dashboard behavior are for demonstration. Device linking is stored in the browser profile; readings, controls, alerts, and device states are simulated and do not connect to or control physical hardware.

## Alcohol breathalyzer demo

The breathalyzer preview provides an animated status face, sample BAC gauge, MQ-3 feed history, `mq3-alert-trigger` alerts, and simulated Wi-Fi/MQTT status. Use the range slider to simulate readings and update the chart and alerts. Its sample status bands are illustrative only, not legal or medical thresholds. This preview is not a medical device, does not determine fitness to drive, and must not be used to make safety decisions.

## Smart fan regulator demo

The Smart Fan Regulator preview provides five fan settings (Off and Speeds 1-4) with one simulated relay assigned to each speed. Selecting a speed energizes that speed's relay and switches the other speed relays off. Use **Edit** beside the fan name to rename it, then **Save** or **Cancel**; the name is saved in the browser profile. The animated fan reflects the selected speed. Feed and connection states are simulated; no physical fan or cloud service is connected.

## Smart light control demo

The light controller key fixes the relay channel count: v1 has 4 channels, v2 has 6, and v3 has 8. Each channel controls one independently switched light. Use **Edit** on a light, change its name, then **Save** or **Cancel**; saved names are kept in the browser profile for that device. Animated bulbs reflect each relay state. Relay feeds, activity history, and ESP32, Adafruit IO, and Supabase statuses are simulated; no physical lights or cloud services are connected.

## Relay test demo

Use the `GKB-RELAY-0001` test device to toggle a simulated relay. The car tires spin while the relay is on and stop when it is off. The switch and animation are a UI demo only; they do not control a physical relay or car.

## Connecting Relay Test to Supabase and ESP32

The linked `GKB-RELAY-0001` Service Portal dashboard can read the `public.relay_status` row for `device_id = relay_01`, sign in through Supabase Auth, and request an ON/OFF update. The private **Test device** preview remains simulated. The ESP32 can continue polling that row with its publishable key under a read-only anonymous policy.

Before enabling physical relay control:

1. Configure Netlify environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the Supabase publishable/legacy anon key). These browser values are public; never use the `service_role`/secret key. Leave `VITE_RELAY_CONTROL_ENABLED` unset or `false` for now.
2. Generate a unique one-time hardware key locally with `node scripts/generate-relay-pairing-key.mjs`. Put `PAIRING_KEY` in the ESP32 provisioning firmware and give the same key to the device owner over a private channel. Do not commit, publish, or paste the key into chat.
3. Run [`supabase/relay_status_setup.sql`](./supabase/relay_status_setup.sql) in the Supabase SQL Editor. It replaces the existing relay table policies, creates a separate pairing table inaccessible to browser roles, and restricts relay commands to the assigned Supabase Auth user. Anonymous ESP32/browser access can only read the relay state and paired flag; authenticated users need table-level `SELECT` to read their row. RLS still scopes browser reads/updates to the user's relay row. The browser sends updates without a `RETURNING` clause, then performs a separate read to verify the database state.
4. In the SQL Editor, run the commented insert/upsert in the script, replacing the hash placeholder with `PAIRING_KEY_SHA256`. Never store the plaintext pairing key in Supabase.
5. Deploy the Supabase Edge Function with the Supabase CLI: `supabase functions deploy pair-relay --project-ref YOUR_PROJECT_REF`. The function verifies the signed-in Supabase user, checks the pairing-key hash, and atomically consumes it while assigning relay_01. Supabase's server-side service-role secret must remain in the Edge Function environment and must never be added to Netlify or firmware.
6. Add `VITE_RELAY_PAIRING_ENABLED=true` to Netlify and redeploy. The user must first sign in to Supabase under the Relay Test Service Portal; then enter the ESP32 pairing key under **My Devices → Link a purchased device**. This pairs and links Relay Test. The legacy `GKB-RELAY-0001` key remains only a simulated preview key.
7. After the device shows as paired, set `VITE_RELAY_CONTROL_ENABLED=true` in Netlify and redeploy to enable real relay commands. The dashboard reads the database state every three seconds; changing the switch updates `relay_status.state`, which the ESP32 polls.

The database value is the requested relay state, not hardware confirmation. The current ESP32 sketch does not acknowledge the actual output or report a heartbeat, so the dashboard cannot verify that the relay moved or that the device is online. The relay control remains unavailable until the database policies and one-time device pairing are correctly configured. The one-time pairing code is a shared provisioning secret, not cryptographic proof of a specific chip; keep it private, and rotate it if exposed. After a successful pairing, the server consumes the code so it cannot be reused.

## Deployment

The production site is hosted on Netlify and linked to this GitHub repository. Updates pushed to the configured deployment branch are published through Netlify's build and deploy pipeline.
