# Running the knowledge base

Everything runs from this folder:

```bash
cd "/home/nexapp/Shubham Workspace/Nexapp-Explore"
```

---

## Setup (once)

```bash
npm install
```

That's it. The controller source must sit beside this folder as
`../nexapp-controller-new-ui` — it already does.

---

## Read the handbook

```bash
npm run build     # rebuild the pages
npm run serve     # open http://localhost:3003/kb/
```

**Use this for reading.** It serves the finished site — fast, and exactly what
gets deployed.

---

## Edit the handbook

```bash
npm run dev       # open http://localhost:3001/kb/
```

Use this only while **changing** things — it reloads as you save, but each page
ships 9 MB of JavaScript, so it feels slow to read.

> Both URLs end in **`/kb/`**. Without it you get a 404 — that is on purpose, so
> local matches the server.

---

## After changing a description

Descriptions live in `nexapp-controller/console-descriptions.ts`.

```bash
npm run controller     # regenerate the pages
npm run build          # rebuild the site
```

Then refresh the browser. If you are on `npm run dev`, only the first command is
needed.

---

## All commands

| Command | What it does |
|---|---|
| `npm run serve` | serve the built site on **3003** — for reading |
| `npm run dev` | dev server on **3001** — for editing |
| `npm run build` | regenerate everything + check links + build |
| `npm run controller` | regenerate the controller handbook only |
| `npm run check:links` | fail if any internal link is broken |

Two more, only useful when something looks wrong:

```bash
npm run controller:nav      # the sidebar as the generator sees it
npm run controller:routes   # routes, components and permissions
```

---

## Refreshing the API reference

Only needed after the backend changes. It reads the schema from the controller's
Docker image:

```bash
# 1. Django needs InfluxDB running to start up
cd "/home/nexapp/Shubham Workspace/nexapp-controller-new-ui"
docker compose up -d influxdb

# 2. Dump the schema (your repo is mounted read-only — nothing is written to it)
cd "/home/nexapp/Shubham Workspace/Nexapp-Explore"
docker run --rm \
  --network nexapp-controller-newui_default \
  -e NXC_SRC=/code \
  -v "/home/nexapp/Shubham Workspace/nexapp-controller-new-ui:/code:ro" \
  -v "$PWD:/kb" -w /code \
  nexappcontroller:newui \
  python /kb/nexapp-controller/dump-schema.py -o /kb/controller-swagger.json

# 3. Convert and generate
npm run controller:convert
npm run controller:api
npm run build

# 4. Stop InfluxDB again if you don't need it
cd "/home/nexapp/Shubham Workspace/nexapp-controller-new-ui"
docker compose stop influxdb
```

---

## If something goes wrong

**Page not found / 404**
Add `/kb/` to the end of the URL.

**`Address already in use`**
A server is already running. `npm run serve` will tell you its PID and the
command to stop it — or use another port: `KB_PORT=4000 npm run serve`.

**`Another next dev server is already running`**
Next allows one per folder. Reuse the running one, or `kill <PID>` using the PID
it prints.

**Pages feel slow and keep loading**
You are on `npm run dev`. Use `npm run serve` instead for reading.

**`Controller source not found`**
Point at your checkout: `export NXC_SRC=/path/to/nexapp-controller-new-ui`

**Build says "skipping the SDWAN Lite console reference"**
Expected. That second handbook needs a repo that is not on this machine, so it
is skipped and everything else still builds.
