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

## Configure Supabase authentication

The portal uses Supabase Auth for client sign-up, sign-in, and email confirmation. To connect your Supabase project to localhost:

1. In the Supabase Dashboard, open **Project Settings → API** and copy the **Project URL** and the public **anon** or **publishable** key. Never use the `service_role` or secret key in the browser.
2. Put those values in the ignored local `.env` file:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

3. In Supabase, enable the **Email** provider under **Authentication → Sign In / Providers**. To allow an admin to sign in with a phone number, also enable the **Phone** provider and configure an SMS provider; the phone Auth account must already exist and be verified in Supabase.
4. Under **Authentication → URL Configuration**, set **Site URL** to the live site root, `https://gkb-company-ltd.netlify.app`. This is Supabase's fallback redirect, so do not leave it set to localhost for production.
5. Add these allowed redirect URLs:
   - `http://localhost:5173/**`
   - `http://127.0.0.1:5173/**`
   - `https://gkb-company-ltd.netlify.app/**`
6. Restart the local Vite server after editing `.env`. Signup and resend-confirmation requests set their redirect to the current site origin: local signups return to localhost, while signups made on the deployed site return to Netlify. Supabase accepts that redirect only when it matches the allowlist above; otherwise, it falls back to the configured Site URL.

The `.env` file is ignored by Git. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` separately in Netlify's site environment variables to enable authentication on the deployed site.

The portal has one shared sign-in/sign-up flow. New client accounts collect first name, last name, phone, location, email, and password; profile fields are saved as Supabase Auth user metadata and used to prefill order contact details. Ghana Card numbers are intentionally not collected. Email confirmation remains controlled by Supabase: when confirmation is enabled, a new user must confirm the email before signing in.

The portal restores a signed-in Supabase session after a page refresh. Admin access is determined by the account's `gkb_user_roles` database entry, not by an email comparison in client code. A signed-in admin is routed directly to **Review Orders**; other accounts use the client portal. Create the admin account with the password you choose, then promote that exact account with the SQL query at the end of `supabase/orders_setup.sql`. The example query uses `zumkel023@gmail.com`; change it to the admin account's email if needed. For a phone-only admin account, use its verified number to select its `auth.users.id` in that promotion query. Passwords are managed by Supabase Auth and must not be put in this repository or in frontend environment variables. Clients use email accounts so order and support records can be associated with their email address.

## Store orders

Clients create an account or sign in through Supabase Auth, open **Retail Gadget Distribution**, and choose **Place an order / Track my orders**. They can submit an item, quantity, contact phone, and delivery or pickup details. **My Orders** shows the latest status and refreshes as the admin updates it. Admins open **Review Orders** to review incoming orders and set each order to **Processing**, **Delivered**, or **Picked up**.

After an order is saved, clients see an MTN Mobile Money instruction page for `0552117787` (account holder `zumah kelvin🥳😍`). Catalog orders display listing price multiplied by quantity; custom products display that GKB will confirm the amount. This is a manual payment instruction only and does not initiate or verify Mobile Money payments.

To enable order syncing across client and admin devices:

1. Complete [Supabase authentication setup](#configure-supabase-authentication).
2. Run [`supabase/orders_setup.sql`](./supabase/orders_setup.sql) in the Supabase SQL Editor. This also enables account-scoped device links and support tickets.
3. Create the admin account through the portal, then run the commented promotion query at the end of the SQL file for that exact Auth account. Sign out and back in after promoting it. Other signed-in accounts are clients and can only see their own orders.
4. Clients must confirm their email before signing in when email confirmation is enabled in Supabase.

Order records use Supabase row-level security. Clients can insert and view only their own orders; only an admin account explicitly promoted in the database can review all orders or update their status. Support tickets and linked-device records are also stored in Supabase, scoped to the signed-in account, and available again after signing in from another browser. Admins can review submitted support tickets.

### Retail inventory

Run the latest [`supabase/orders_setup.sql`](./supabase/orders_setup.sql) in the Supabase SQL Editor to add the retail inventory table and public product-image bucket policies. The script is safe to rerun; rerunning applies the inventory setup without changing the existing relay tables. Sign in as an admin and open **Inventory & Service** to add laptop/PC listings with an image, brand, title, highlights, GHS price, RAM, and storage. Listings can be archived and restored; archiving hides them from clients but does not delete the listing image or affect existing orders. Customers see active listings in **Retail Gadget Distribution**.

## Device portal

Sign in to the portal and open **My Devices**:

- Choose **Test device** to preview a device dashboard without linking it.
- Enter a key below under **Link a purchased device** to save a device link to the signed-in account.
- Open a linked device from **Linked devices** to view its Service Portal dashboard.
- Choose **Unlink** beside a linked device to remove that account's saved link after confirmation. This does not unpair/reset physical hardware or release its Supabase owner assignment.

### Demo device keys

| Device | Special key | Dashboard |
| --- | --- | --- |
| Smart Home Security System v1 | `GKB-SEC-0001` | Smart Home Security System |
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

## Smart home security system demo

The Smart Home Security System (`GKB-SEC-0001`) preview features multi-zone PIR motion monitoring with real-time audio-visual intrusion alert feedback:
- **Blinking Red Background**: Triggers an intense red strobe animation across the dashboard with pulsating glow borders when motion is detected in any armed zone.
- **Buzzing Background Sound**: Synthesizes a 165Hz electronic security alarm buzzer with 10Hz LFO pulse gating via the browser's native Web Audio API. A dedicated audio control allows toggling between active buzzer and muted mode.
- **Interactive Multi-Zone Sensor Grid**: Test, trip, or clear motion across 4 individual zones (Living Room PIR, Main Entrance door reed contact, Kitchen window vibration, Patio infrared barrier).
- **Arming Modes & Sensitivity**: Toggle between Armed (Away), Armed (Stay), and Disarmed states, adjust PIR sensitivity, and enable auto-pulsing motion simulations.

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
