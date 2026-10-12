# Adjust & Void Log

Pechanga Food Court log for manager adjusts, voids, comps, discounts and refunds. Managers take or upload a photo of the receipt, the form fills itself in, and they tap **Log entry**. Photos are only used to read the receipt and are never saved. The Excel report is built for upper management, with a summary page and one log tab per month.

## What's in this repo

| File | What it does |
|---|---|
| `index.html` | The app itself |
| `config.js` | Your Firebase settings, passcodes and photo reader URL |
| `firestore.rules` | Database security rules to paste into Firebase |
| `apps-script/Code.gs` | The photo reader, which runs in Google Apps Script and keeps your Claude API key private |

Everything runs on free tiers except the photo reading, which is billed per receipt by Anthropic.

## Setup (about 20 minutes, one time)

### 1. Firebase database

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Create a project**. Name it something like `adjust-void-log`. Google Analytics isn't needed.
2. In the left menu, go to **Build > Firestore Database** and click **Create database**. Pick a US location and start in **production mode**.
3. Open the **Rules** tab and add the rules from `firestore.rules`, then click **Publish**.
   - **If this Firebase project already runs another app** (this one shares the `soft-skills-f6ae0` project), do **not** replace the existing rules. Copy only the two `match /adjustments` and `match /roster` blocks and paste them inside the existing `match /databases/{database}/documents { ... }` section, next to the rules that are already there.
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

### 5. Photo reader (optional but recommended)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) (**API Keys > Create Key**) and add a little credit under **Billing**.
2. Go to [script.google.com](https://script.google.com), click **New project**, delete the sample code, and paste in `apps-script/Code.gs`.
3. Open **Project Settings** (gear icon) **> Script Properties** and add three properties:
   - `ANTHROPIC_API_KEY`: your key
   - `MANAGER_PASSCODE`: the manager passcode
   - `ADMIN_PASSCODE`: the admin passcode
4. Click **Deploy > New deployment**, choose **Web app**, set **Execute as: Me** and **Who has access: Anyone**, then **Deploy**. Approve the permissions prompt.
5. Copy the web app URL (it ends in `/exec`) into `photoReaderUrl` in `config.js` and commit.

Opening that URL in a browser should show `{"ok":true,...}`.

## Everyday use

- **Managers** open the site on their phone, enter the manager passcode once (the phone remembers it), and tap **Take photo**.
- **Admin** sees the roster, can delete entries, and gets full cashier names and badge numbers in the Excel report. Managers' reports show only the name printed on the receipt.
- Use the month dropdown at the top, then **Download Excel report**.

## Good to know

- **Passcodes:** the passcode screen keeps casual visitors out. The log entries themselves are in a database whose address is in `config.js`, so a technical person with the repo link could read them. That's why the repo should stay **private** if your GitHub plan allows Pages on private repos; otherwise keep the link to your team.
- **Roster privacy:** the roster is stored under an address calculated from the admin passcode, and the rules block listing it. Without the admin passcode it can't be found.
- **Changing the admin passcode** moves the roster to a new address. Before changing it, download a report or keep your roster spreadsheet, then re-import after the change. Update the Apps Script properties too.
- **Photos** are never stored. They're sent to the photo reader once to fill in the form, then discarded.
- **Model:** the photo reader uses `claude-sonnet-5-5`. To lower cost, change `MODEL` in `Code.gs` to `claude-haiku-5-5` and redeploy (**Deploy > Manage deployments > Edit > New version**).
