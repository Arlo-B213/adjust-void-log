# Adjust & Void Log

Pechanga Food Court log for manager adjusts, voids, comps, discounts and refunds. Managers take or upload a photo of the receipt, the form fills itself in, and they tap **Log entry**. The receipt photo is saved with the entry, and any entry can be edited later. The Excel report is built for upper management, with a summary page and one log tab per month.

## What's in this repo

| File | What it does |
|---|---|
| `index.html` | The app itself |
| `config.js` | Your Firebase settings, passcodes and photo reader URL |
| `firestore.rules` | Database security rules to paste into Firebase |
| `cloudflare/worker.js` | The photo reader, which runs on Cloudflare's free Workers plan and keeps your Claude API key private |

Everything runs on free tiers except the photo reading, which is billed per receipt by Anthropic.

## Setup (about 20 minutes, one time)

### 1. Firebase database

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Create a project**. Name it something like `adjust-void-log`. Google Analytics isn't needed.
2. In the left menu, go to **Build > Firestore Database** and click **Create database**. Pick a US location and start in **production mode**.
3. Open the **Rules** tab and add the rules from `firestore.rules`, then click **Publish**.
   - **If this Firebase project already runs another app** (this one shares the `soft-skills-f6ae0` project), do **not** replace the existing rules. Copy only the `match /adjustments`, `match /photos` and `match /roster` blocks and paste them inside the existing `match /databases/{database}/documents { ... }` section, next to the rules that are already there.
4. Go to **Project settings** (gear icon) **> General**. Under **Your apps**, click the **</>** web icon, register an app (no hosting needed), and copy the `firebaseConfig` values into the `firebase` section of `config.js`.

### 2. GitHub Pages

1. Commit your updated `config.js`.
2. In this repo, go to **Settings > Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, folder **/ (root)**, then **Save**.
3. After a minute, the site is live at `https://arlo-b213.github.io/adjust-void-log/`.

### 3. Passcodes

1. Open the site. Because no passcodes are set yet, it shows the **First-time setup** screen.
2. Choose a manager passcode and an admin passcode (6+ digits each) and click **Create**.
3. Copy the two lines it shows into `config.js` and commit. Only scrambled versions (hashes) go in the repo, never the passcodes themselves.
4. Reload the site and sign in with the admin passcode.

### 4. Load the roster

As admin, open **Team roster** and click **Import from Excel**. Choose `Cashiers_name_and_badges.xlsx` (names in one column, badges in the next). Use **Add** and **Remove** from then on.

### 5. Photo reader (Cloudflare Worker, free)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) (**API Keys > Create Key**; it starts with `sk-ant-api`) and add a little credit under **Billing**.
2. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
3. Go to **Compute (Workers) > Workers & Pages > Create > Create Worker** (start from "Hello World"), name it `adjust-void-reader`, and click **Deploy**.
4. Click **Edit code**, delete the sample, paste in all of `cloudflare/worker.js`, and click **Deploy**.
5. Go back to the worker, open **Settings > Variables and Secrets**, and add three, each with type **Secret**:
   - `ANTHROPIC_API_KEY`: your key
   - `MANAGER_PASSCODE`: the manager passcode
   - `ADMIN_PASSCODE`: the admin passcode
   Click **Deploy** (or **Save**) after adding them.
6. Open the worker's URL (`https://adjust-void-reader.<your-name>.workers.dev`). It should show `{"ok":true,...,"apiKeySet":true,"passcodesSet":true}`.
7. Put that URL in `photoReaderUrl` in `config.js` and commit.

Cloudflare's free plan allows 100,000 requests a day, far more than the log needs.

## Other restaurants

The app can hold separate logs for other restaurants. Each one has its own entries, team roster, Excel reports and manager passcode. The admin passcode opens all of them, with a switcher at the top.

To add one:
1. Open the site with `#setup` at the end of the address, fill in only **Other restaurant manager passcode**, and click **Create**.
2. In `config.js`, add an entry to `extraLogs` with an `id` (short, no spaces), the restaurant `name`, `outlets` (leave `[]` for one location) and the `managerPasscodeHash` from step 1.
3. In the Cloudflare worker, add a Secret named for the restaurant ending in `_PASSCODE` (for example `UMI_PASSCODE`) with that same passcode, and deploy.
4. Sign in as admin, switch to the restaurant, and load its roster with **Import from Excel** when ready.

Existing food court entries stay in the Food Court log. No Firestore rule changes are needed.

## Everyday use

- **Managers** open the site on their phone, enter the manager passcode once (the phone remembers it), and tap **Take photo**.
- **Admin** sees the roster, can delete entries, and gets full cashier names and badge numbers in the Excel report. Managers' reports show only the name printed on the receipt.
- Use the month dropdown at the top, then **Download Excel report**.

## Good to know

- **Passcodes:** the passcode screen keeps casual visitors out. The log entries themselves are in a database whose address is in `config.js`, so a technical person with the repo link could read them. That's why the repo should stay **private** if your GitHub plan allows Pages on private repos; otherwise keep the link to your team.
- **Roster privacy:** the roster is stored under an address calculated from the admin passcode, and the rules block listing it. Without the admin passcode it can't be found.
- **Changing the admin passcode** moves the roster to a new address. Before changing it, download a report or keep your roster spreadsheet, then re-import after the change. Update the passcodes in the Cloudflare worker's Variables and Secrets too.
- **Photos** are compressed (usually under 150 KB) and stored in Firestore next to the entry. Firebase's free plan holds roughly 1 GB, enough for several thousand receipts.
- **Editing:** tap **Edit** on any log row. The form switches to edit mode; change fields or snap a new photo, then tap **Save changes**. Edited entries show an "Edited" date.
- **Model:** the photo reader uses `claude-haiku-5-5` (a fraction of a cent per receipt). If it misreads handwriting, change `MODEL` at the top of the worker code to `claude-sonnet-5-5` and click **Deploy** in the Cloudflare editor.
