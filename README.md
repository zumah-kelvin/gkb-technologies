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
2. Run [`supabase/relay_status_setup.sql`](./supabase/relay_status_setup.sql) in the Supabase SQL Editor. It replaces all existing policies on this dedicated table, allows the ESP32 to read only the `relay_01` state, and restricts dashboard updates to its assigned Supabase Auth user.
3. Sign up or sign in through the linked Relay Test dashboard. In the SQL Editor, assign that Auth user to the relay by running the commented `owner_id` update in the script with the same email address.
4. Only after the SQL setup and owner assignment are complete, set `VITE_RELAY_CONTROL_ENABLED=true` in Netlify and redeploy. Without this explicit flag, the physical relay switch stays disabled.
5. Use the linked device's **Service Portal** dashboard. It reads the database state every three seconds; changing the switch updates `relay_status.state`, which the ESP32 polls.

The database value is the requested relay state, not hardware confirmation. The current ESP32 sketch does not acknowledge the actual output or report a heartbeat, so the dashboard cannot verify that the relay moved or that the device is online. The relay control remains unavailable until the Supabase row and policies are correctly configured. Never commit Wi-Fi passwords or device secrets; the Wi-Fi password previously shared in chat should be changed and updated on the ESP32 locally.

## Deployment

The production site is hosted on Netlify and linked to this GitHub repository. Updates pushed to the configured deployment branch are published through Netlify's build and deploy pipeline.
