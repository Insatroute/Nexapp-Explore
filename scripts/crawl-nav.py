"""
Extract the console's REAL navigation from the rendered app.

Why not read the source: in Vue source a tab and a dropdown filter are the same
`{ key, label }` shape, so scraping cannot tell them apart. Four separate
extraction bugs came from that. What renders as a tab IS a tab, so this reads the
DOM instead and is self-validating.

READ-ONLY. It signs in, expands menus, and opens tabs. It never clicks a control
that creates, edits, deletes, reboots, rotates or pushes anything — this proxies
to the live platform.
"""
import json
import os
import re
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
# Credentials come from the environment. They are NEVER committed: this file is
# published, and a working console login in it is a live credential in git history
# that no later commit can remove.
#
#   export KB_USER=... KB_PASSWORD=...
USER = os.environ.get("KB_USER", "")
PASSWORD = os.environ.get("KB_PASSWORD", "")
OUT = "/tmp/claude-1000/-home-badalsingh-IOT-RMS-2026/892681a3-34d2-4450-9fcc-9614edc4edd9/scratchpad/nav-manifest.json"

# Anything matching these is never clicked, at any depth.
FORBIDDEN = re.compile(
    r"delete|remove|reboot|restart|reset|rotate|push|deploy|upgrade|revoke|"
    r"approve|reject|save|apply|submit|create|add|new|edit|stop|start|disable|"
    r"enable|unlock|test|send|import|upload|restore|backup|wipe|factory",
    re.I,
)


def safe(text: str) -> bool:
    return not FORBIDDEN.search(text or "")


def login(pg) -> bool:
    if not USER or not PASSWORD:
        print(
            "KB_USER / KB_PASSWORD are not set.\n"
            "  export KB_USER=<console user> KB_PASSWORD=<password>\n"
            "The crawler signs in to read the rendered navigation.",
            file=sys.stderr,
        )
        return False
    pg.goto(f"{BASE}/login", wait_until="domcontentloaded")
    pg.wait_for_timeout(2000)
    if "/login" not in pg.url:
        return True
    boxes = pg.locator("input:visible")
    if boxes.count() < 2:
        return False
    boxes.nth(0).fill(USER)
    boxes.nth(1).fill(PASSWORD)
    pg.keyboard.press("Enter")
    for _ in range(30):
        pg.wait_for_timeout(500)
        if "/login" not in pg.url:
            return True
    return False


def sidebar(pg):
    """Top-level menu items and their children, as rendered."""
    pg.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    pg.wait_for_timeout(2500)

    # expand every collapsed group so children are in the DOM
    for _ in range(4):
        subs = pg.locator("aside .ant-menu-submenu-title, nav .ant-menu-submenu-title")
        for i in range(subs.count()):
            try:
                el = subs.nth(i)
                if el.is_visible():
                    par = el.locator("xpath=..")
                    cls = par.get_attribute("class") or ""
                    if "ant-menu-submenu-open" not in cls:
                        el.click(timeout=1500)
                        pg.wait_for_timeout(150)
            except Exception:
                pass

    pg.wait_for_timeout(600)
    return pg.evaluate(
        """() => {
      const root = document.querySelector('aside ul.ant-menu, nav ul.ant-menu, aside .ant-menu');
      if (!root) return [];
      const out = [];
      for (const li of root.children) {
        const cls = li.className || '';
        if (cls.includes('ant-menu-submenu')) {
          const title = li.querySelector('.ant-menu-submenu-title');
          const label = title ? title.innerText.trim().split('\\n')[0] : '';
          // The menu navigates programmatically, so there is no <a href>. Ant puts
          // the item's key in data-menu-id (suffixed onto a generated prefix), and
          // that key is the route name the console pushes — the exact join back to
          // the route table.
          const keyOf = el => el.getAttribute('data-menu-id') || null;
          const kids = [...li.querySelectorAll('.ant-menu-item')].map(k =>
            ({ label: k.innerText.trim().split('\\n')[0], key: keyOf(k) }));
          out.push({ label, key: keyOf(title || li), children: kids });
        } else if (cls.includes('ant-menu-item')) {
          const keyOf2 = el => el.getAttribute('data-menu-id') || null;
          out.push({ label: li.innerText.trim().split('\\n')[0],
                     key: keyOf2(li), children: [] });
        }
      }
      return out.filter(x => x.label);
    }"""
    )


def device_tabs(pg):
    """Real tabs and sub-tabs on a device detail page."""
    pg.goto(f"{BASE}/devices", wait_until="domcontentloaded")
    pg.wait_for_timeout(3000)
    link = pg.locator("tbody tr a").first
    if not link.count():
        return {"error": "no device rows visible"}
    link.click()
    pg.wait_for_timeout(3500)

    tabs = []
    top = pg.locator(".ant-tabs-nav .ant-tabs-tab").all()
    labels = []
    for t in top:
        try:
            txt = t.inner_text().strip()
            if txt:
                labels.append(txt)
        except Exception:
            pass
    # de-dupe, keep order, and only the OUTERMOST tab bar
    seen = set()
    outer = []
    for l in labels:
        if l not in seen:
            seen.add(l)
            outer.append(l)

    for label in outer:
        entry = {"label": label, "subs": []}
        try:
            tab = pg.locator(".ant-tabs-tab", has_text=label).first
            if safe(label):
                tab.click(timeout=3000)
                pg.wait_for_timeout(1600)
                # sub navigation now visible BELOW the top bar
                # Read ONLY inside the ACTIVE panel. Ant keeps previously-visited
                # panels mounted but hidden, so querying the document returns every
                # tab bar ever opened — which made each tab inherit the previous
                # tab's sub-navigation and the counts climb monotonically.
                subs = pg.evaluate(
                    """() => {
                  const panel = [...document.querySelectorAll('.ant-tabs-tabpane')]
                    .find(p => p.getAttribute('aria-hidden') !== 'true'
                            && p.offsetParent !== null);
                  if (!panel) return [];
                  // Tabs and CONTROLS are different things and must not be merged.
                  // A radio group like 24h / 7d / 30d filters the view; calling it a
                  // sub-section tells the reader to look for a page that isn't there.
                  const tabs = [], controls = [];
                  for (const t of panel.querySelectorAll('.ant-tabs-tab')) {
                    const s = t.innerText.trim(); if (s) tabs.push(s);
                  }
                  for (const r of panel.querySelectorAll('.ant-radio-group label, .ant-segmented-item')) {
                    const s = r.innerText.trim(); if (s) controls.push(s);
                  }
                  return { subs: [...new Set(tabs)], controls: [...new Set(controls)] };
                }"""
                )
                entry["subs"] = subs.get("subs", [])
                entry["controls"] = subs.get("controls", [])
        except Exception as e:
            entry["error"] = str(e)[:120]
        tabs.append(entry)
    return {"url": pg.url, "tabs": tabs}


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1100})
    if not login(pg):
        print("LOGIN FAILED", pg.url)
        sys.exit(1)
    print("signed in ->", pg.url)

    menu = sidebar(pg)
    print(f"\nSIDEBAR: {len(menu)} top-level items")
    for m in menu:
        print(f"  {m['label']}" + (f"  ({len(m['children'])})" if m["children"] else ""))
        for c in m["children"]:
            print(f"      - {c['label']}")

    dev = device_tabs(pg)
    print(f"\nDEVICE DETAIL: {dev.get('url','')}")
    for t in dev.get("tabs", []):
        print(f"  {t['label']}  subs={len(t.get('subs',[]))} controls={len(t.get('controls',[]))}")
        if t.get("subs"):
            print(f"      subs    : {', '.join(t['subs'][:12])}")
        if t.get("controls"):
            print(f"      controls: {', '.join(t['controls'][:12])}")

    json.dump({"menu": menu, "deviceDetail": dev}, open(OUT, "w"), indent=1)
    print(f"\nwrote {OUT}")
    b.close()
