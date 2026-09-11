const MODULE_ID = "ownership-online-filter";
const FLAG_HIDE = "hideOffline";
const FLAG_SIZE = "windowSize";
const FLAG_SHOW_TO = "showTo";

const HINT_DOCUMENT_EN =
  "Configure access to this specific Document, allowing each User to be assigned a different level of visibility.";
const HINT_FOLDER_EN =
  "Configure access for all Documents within this Folder. Changes will be applied to all contained Documents, excluding the contents of sub-folders.";

const SHOWABLE_TYPES = new Set([
  "Actor",
  "JournalEntry",
  "JournalEntryPage",
  "Item",
  "Scene",
  "RollTable",
  "Cards",
  "Macro",
  "Playlist",
  "Adventure"
]);

function t(key) {
  return game.i18n.localize(key);
}

function debounce(fn, wait) {
  if (foundry.utils?.debounce) return foundry.utils.debounce(fn, wait);
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function rootOf(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  return typeof jQuery !== "undefined" && html instanceof jQuery ? html[0] : null;
}

function parseUserId(name) {
  if (!name) return null;
  const cleaned = String(name)
    .replace(/^ownership(\.|\[)?/i, "")
    .replace(/\]$/, "")
    .trim();
  if (!cleaned || cleaned === "default") return null;
  return cleaned;
}

function findUserRows(root) {
  const form = root.querySelector("form") ?? root;
  const groups = [...form.querySelectorAll(".form-group")];
  const rows = [];

  for (const group of groups) {
    if (group.closest(".oof-toolbar, .oof-show, .oof-connected, footer, .sheet-footer, .form-footer")) continue;
    const select = group.querySelector("select");
    if (!select) continue;

    const rawName = select.getAttribute("name") || "";
    if (/default/i.test(rawName) && !parseUserId(rawName)) {
      group.classList.add("oof-default-row");
      continue;
    }

    const label = group.querySelector("label");
    const labelText = (label?.textContent || "").trim();
    if (/^all players$/i.test(labelText) || labelText === game.i18n.localize("OWNERSHIP.AllPlayers")) {
      group.classList.add("oof-default-row");
      continue;
    }

    let user = parseUserId(rawName) ? game.users.get(parseUserId(rawName)) : null;
    if (!user && labelText) {
      user = game.users.find((u) => u.name === labelText) ?? null;
    }
    if (!user) continue;

    rows.push({ group, select, label, user });
  }

  return rows;
}

function decorateRow({ group, label, user }) {
  group.classList.add("oof-row");
  group.dataset.oofUserId = user.id;
  group.dataset.oofName = user.name.toLowerCase();
  group.dataset.oofOnline = user.active ? "1" : "0";
  group.dataset.oofGm = user.isGM ? "1" : "0";

  if (!label) return;

  const existing = label.querySelector(".oof-user-label");
  if (existing) {
    const pip = existing.querySelector(".oof-pip");
    const status = existing.querySelector(".oof-status");
    const name = existing.querySelector(".oof-name");
    if (pip) {
      pip.className = `oof-pip ${user.active ? "online" : "offline"}`;
      pip.title = user.active ? t("OOF.Online") : t("OOF.Offline");
    }
    if (status) status.textContent = user.active ? t("OOF.Online") : t("OOF.Offline");
    if (name) {
      name.textContent = user.name;
      name.title = user.name;
    }
    return;
  }

  const wrap = document.createElement("span");
  wrap.className = "oof-user-label";

  const pip = document.createElement("span");
  pip.className = `oof-pip ${user.active ? "online" : "offline"}`;
  pip.title = user.active ? t("OOF.Online") : t("OOF.Offline");

  const name = document.createElement("span");
  name.className = "oof-name";
  name.textContent = user.name;
  name.title = user.name;

  const status = document.createElement("span");
  status.className = "oof-status";
  status.textContent = user.active ? t("OOF.Online") : t("OOF.Offline");

  wrap.append(pip, name, status);
  label.textContent = "";
  label.append(wrap);
}

function applyFilters(root, rows) {
  const hideOffline = root.querySelector(".oof-hide-offline")?.checked ?? true;
  const query = (root.querySelector(".oof-search")?.value || "").trim().toLowerCase();

  for (const { group, user } of rows) {
    const online = !!user.active;
    const matchesQuery = !query || user.name.toLowerCase().includes(query);
    const hiddenByOffline = hideOffline && !online && !user.isGM;
    const hide = hiddenByOffline || !matchesQuery;
    group.classList.toggle("oof-hidden", hide);
    group.toggleAttribute("hidden", hide);
  }

  updateCount(root, rows);
}

function updateCount(root, rows) {
  const toolbar = root.querySelector(".oof-toolbar");
  if (!toolbar) return;
  let el = toolbar.querySelector(".oof-count");
  if (!el) {
    el = document.createElement("span");
    el.className = "oof-count";
    toolbar.append(el);
  }
  const online = rows.filter((row) => row.user.active && !row.user.isGM).length;
  el.textContent = game.i18n.format("OOF.OnlineCount", { online, total: rows.length });
}

function sortRows(root, rows) {
  const form = root.querySelector("form") ?? root;
  const defaultRow = form.querySelector(".oof-default-row");
  const online = rows
    .filter((r) => r.user.active)
    .sort((a, b) => a.user.name.localeCompare(b.user.name, game.i18n.lang));
  const offline = rows
    .filter((r) => !r.user.active)
    .sort((a, b) => a.user.name.localeCompare(b.user.name, game.i18n.lang));

  let prev = defaultRow ?? null;
  for (const { group } of [...online, ...offline]) {
    if (prev) prev.after(group);
    else form.prepend(group);
    prev = group;
  }
}

function ownershipLevelOptions() {
  const levels = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  return [
    ["", t("OOF.NoChange")],
    [String(levels.NONE), game.i18n.localize("OWNERSHIP.NONE")],
    [String(levels.LIMITED), game.i18n.localize("OWNERSHIP.LIMITED")],
    [String(levels.OBSERVER), game.i18n.localize("OWNERSHIP.OBSERVER")],
    [String(levels.OWNER), game.i18n.localize("OWNERSHIP.OWNER")]
  ];
}

function applyConnectedLevel(rows, value) {
  if (value === "") return;
  const level = Number(value);
  let count = 0;
  for (const { select, user } of rows) {
    if (!user.active || user.isGM) continue;
    select.value = String(level);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    count += 1;
  }
  ui.notifications.info(game.i18n.format("OOF.AppliedConnected", { count }));
}

function injectToolbar(root, rows) {
  if (root.querySelector(".oof-toolbar")) return;

  const form = root.querySelector("form") ?? root;
  const toolbar = document.createElement("div");
  toolbar.className = "oof-toolbar";

  const search = document.createElement("input");
  search.type = "search";
  search.className = "oof-search";
  search.placeholder = t("OOF.SearchPlaceholder");
  search.addEventListener("input", () => applyFilters(root, rows));

  const hideLabel = document.createElement("label");
  hideLabel.className = "oof-toggle";
  const hide = document.createElement("input");
  hide.type = "checkbox";
  hide.className = "oof-hide-offline";
  hide.checked = game.settings.get(MODULE_ID, FLAG_HIDE);
  hide.addEventListener("change", () => {
    game.settings.set(MODULE_ID, FLAG_HIDE, hide.checked);
    applyFilters(root, rows);
  });
  hideLabel.append(hide, document.createTextNode(t("OOF.HideOffline")));

  const connected = document.createElement("div");
  connected.className = "oof-connected";
  const connectedLabel = document.createElement("label");
  connectedLabel.textContent = t("OOF.ConnectedPlayers");
  const connectedSelect = document.createElement("select");
  for (const [value, label] of ownershipLevelOptions()) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    connectedSelect.append(opt);
  }
  connectedSelect.addEventListener("change", (ev) => {
    applyConnectedLevel(rows, ev.currentTarget.value);
    ev.currentTarget.value = "";
  });
  connected.append(connectedLabel, connectedSelect);

  toolbar.append(search, hideLabel, connected);

  const hint = form.querySelector("p.notes, .notes, header, .window-content > p");
  const firstGroup = form.querySelector(".form-group, .oof-default-row");
  if (firstGroup) firstGroup.before(toolbar);
  else if (hint) hint.after(toolbar);
  else form.prepend(toolbar);
}

function localizeChrome(root) {
  const title = game.i18n.localize("OWNERSHIP.Title");
  const heading = root.querySelector(".window-title, h4, header h1, .window-header h1");
  if (heading && /ownership configuration/i.test(heading.textContent || "")) {
    const extra = heading.textContent.replace(/^.*?Ownership Configuration\s*:?\s*/i, "").trim();
    heading.textContent = extra ? `${title}: ${extra}` : title;
  }

  for (const el of root.querySelectorAll("p.notes, .notes, .window-content > p, [data-application-part] p")) {
    if (el.closest(".oof-show, .oof-toolbar")) continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    if (/configure access to this specific document/i.test(text) || text === HINT_DOCUMENT_EN) {
      el.textContent = game.i18n.localize("OWNERSHIP.HintDocument");
    } else if (/configure access for all documents within this folder/i.test(text) || text.startsWith(HINT_FOLDER_EN.slice(0, 40))) {
      el.textContent = game.i18n.localize("OWNERSHIP.HintFolder");
    }
  }

  const defaultRow = root.querySelector(".oof-default-row label");
  if (defaultRow && /^all players$/i.test(defaultRow.textContent.trim())) {
    defaultRow.textContent = game.i18n.localize("OWNERSHIP.AllPlayers");
  }

  for (const label of root.querySelectorAll("label")) {
    const raw = (label.textContent || "").trim();
    if (!/^show gm users$/i.test(raw)) continue;
    const input = label.querySelector("input");
    const localized = game.i18n.localize("OWNERSHIP.ShowGM");
    if (!localized || localized === "OWNERSHIP.ShowGM") continue;
    label.textContent = "";
    if (input) label.append(input, document.createTextNode(` ${localized}`));
    else label.textContent = localized;
  }
}

function getDocument(app) {
  return app?.document ?? app?.object ?? app?.options?.document ?? null;
}

function canShowDocument(doc) {
  if (!doc) return true;
  const type = doc.documentName ?? doc.constructor?.documentName;
  return !type || SHOWABLE_TYPES.has(type);
}

function pickShowUsers(rows, target) {
  return rows
    .map((row) => row.user)
    .filter((user) => {
      if (!user || user.isGM) return false;
      if (target === "connected") return !!user.active;
      if (target === "visible") {
        const row = rows.find((entry) => entry.user === user);
        return Boolean(row) && !row.group.classList.contains("oof-hidden");
      }
      return true;
    });
}

async function unhideActorTokens(actor) {
  if (typeof actor.getActiveTokens !== "function") return;
  const tokens = actor.getActiveTokens(true) ?? [];
  const hidden = tokens.filter((token) => token.document?.hidden);
  if (!hidden.length) return;

  const scene = hidden[0].document?.parent ?? globalThis.canvas?.scene;
  if (typeof scene?.updateEmbeddedDocuments === "function") {
    await scene.updateEmbeddedDocuments(
      "Token",
      hidden.map((token) => ({ _id: token.document.id, hidden: false }))
    );
    return;
  }

  await Promise.all(hidden.map((token) => token.document.update?.({ hidden: false })));
}

async function revealDocument(doc, users) {
  const ids = users.map((user) => user.id ?? user).filter(Boolean);
  if (!ids.length) {
    ui.notifications.warn(t("OOF.ShowNone"));
    return false;
  }
  if (!doc) {
    ui.notifications.info(game.i18n.format("OOF.ShownTo", { count: ids.length }));
    return true;
  }

  const type = doc.documentName ?? doc.constructor?.documentName;
  if (type === "Actor") await unhideActorTokens(doc);

  const Journal =
    globalThis.Journal ??
    CONFIG?.JournalEntry?.collection ??
    foundry.documents?.collections?.Journal;

  if ((type === "JournalEntry" || type === "JournalEntryPage") && typeof Journal?.show === "function") {
    await Journal.show(doc, { force: true, users: ids });
    return true;
  }

  if (typeof doc.show === "function") {
    await doc.show({ force: true, users: ids });
    return true;
  }

  if (typeof doc.share === "function") {
    await doc.share({ force: true, users: ids });
    return true;
  }

  const ImagePopout = foundry.applications?.apps?.ImagePopout ?? globalThis.ImagePopout;
  if (type === "JournalEntryPage" && doc.type === "image" && typeof ImagePopout?.shareImage === "function") {
    await ImagePopout.shareImage(doc.src, { users: ids, title: doc.name, uuid: doc.uuid });
    return true;
  }

  return true;
}

async function saveOwnershipForm(app, root) {
  if (typeof app.submit === "function") {
    await app.submit();
    return;
  }
  const form = root.querySelector("form");
  if (!form) return;
  if (typeof form.requestSubmit === "function") form.requestSubmit();
  else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function saveThenShow(app, root, rows) {
  const doc = getDocument(app);
  const target = root.querySelector(".oof-show-target")?.value ?? "connected";
  game.settings.set(MODULE_ID, FLAG_SHOW_TO, target);
  const selected = pickShowUsers(rows, target);

  try {
    await saveOwnershipForm(app, root);
  } catch (error) {
    console.warn(`${MODULE_ID} | ownership submit failed`, error);
  }

  const shown = await revealDocument(doc, selected);
  if (shown) ui.notifications.info(game.i18n.format("OOF.ShownTo", { count: selected.length }));
}

function injectShowPanel(root, app, rows) {
  if (root.querySelector(".oof-show")) return;
  const doc = getDocument(app);
  if (!canShowDocument(doc)) return;

  const form = root.querySelector("form") ?? root;
  const panel = document.createElement("section");
  panel.className = "oof-show";

  const heading = document.createElement("h3");
  heading.textContent = t("OOF.ShowTitle");

  const hint = document.createElement("p");
  hint.className = "notes";
  hint.textContent = t("OOF.ShowHint");

  const row = document.createElement("div");
  row.className = "oof-show-row";
  const label = document.createElement("label");
  label.textContent = t("OOF.ShowTo");
  const select = document.createElement("select");
  select.className = "oof-show-target";
  const options = [
    ["connected", t("OOF.ShowConnected")],
    ["visible", t("OOF.ShowVisible")],
    ["all", t("OOF.ShowAll")]
  ];
  const savedTarget = game.settings.get(MODULE_ID, FLAG_SHOW_TO) || "connected";
  for (const [value, text] of options) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    if (value === savedTarget) opt.selected = true;
    select.append(opt);
  }
  select.addEventListener("change", () => {
    game.settings.set(MODULE_ID, FLAG_SHOW_TO, select.value);
  });
  row.append(label, select);
  panel.append(heading, hint, row);

  const footer = form.querySelector("footer, .sheet-footer, .form-footer, [data-application-part='footer']");
  if (footer) footer.before(panel);
  else form.append(panel);

  if (root.querySelector(".oof-show-submit")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "oof-show-submit";
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7m0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>${t("OOF.ShowPlayers")}`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    saveThenShow(app, root, rows);
  });

  if (footer) footer.append(button);
  else panel.append(button);
}

function bindSizeMemory(app, root) {
  const host = root.closest(".app, .application, .window-app") ?? root;
  if (host.dataset.oofSizeBound) return;
  host.dataset.oofSizeBound = "1";

  const saved = game.settings.get(MODULE_ID, FLAG_SIZE);
  if (saved?.width) {
    if (typeof app.setPosition === "function") {
      app.setPosition({
        width: saved.width,
        ...(saved.height ? { height: saved.height } : {})
      });
    } else {
      host.style.width = `${saved.width}px`;
      if (saved.height) host.style.height = `${saved.height}px`;
    }
  }

  const persist = debounce((width, height) => {
    if (!width || width < 240) return;
    game.settings.set(MODULE_ID, FLAG_SIZE, {
      width: Math.round(width),
      height: Math.round(height || 0)
    });
  }, 300);

  const original = app._onPosition;
  if (typeof original === "function") {
    app._onPosition = function onPosition(position) {
      original.call(this, position);
      if (position?.width) persist(position.width, position.height);
    };
  }

  if (typeof ResizeObserver === "function") {
    let skip = 1;
    const observer = new ResizeObserver((entries) => {
      if (skip > 0) {
        skip -= 1;
        return;
      }
      const rect = entries[0]?.contentRect;
      if (rect?.width) persist(rect.width, rect.height);
    });
    observer.observe(host);
  }
}

function enableOwnershipResize() {
  const size = game.settings.get(MODULE_ID, FLAG_SIZE) || {};
  const width = Number(size.width) > 240 ? Number(size.width) : 560;
  const patch = {
    window: { resizable: true },
    position: { width }
  };
  const merge = foundry.utils?.mergeObject;
  const App = foundry.applications?.apps?.DocumentOwnershipConfig;
  try {
    if (App?.DEFAULT_OPTIONS && merge) merge(App.DEFAULT_OPTIONS, patch, { inplace: true });
    else if (App?.DEFAULT_OPTIONS) {
      App.DEFAULT_OPTIONS.window = { ...App.DEFAULT_OPTIONS.window, resizable: true };
      App.DEFAULT_OPTIONS.position = { ...App.DEFAULT_OPTIONS.position, width };
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | could not mark DocumentOwnershipConfig resizable`, error);
  }

  const V1 = globalThis.DocumentOwnershipConfig;
  if (V1?.defaultOptions) {
    V1.defaultOptions.resizable = true;
    V1.defaultOptions.width = width;
  }
}

function enhance(app, html) {
  const root = rootOf(html) ?? app?.element;
  if (!root) return;

  const isOwnership =
    app?.constructor?.name === "DocumentOwnershipConfig" ||
    root.classList?.contains("ownership-config") ||
    app?.id?.includes?.("ownership") ||
    /ownership configuration/i.test(app?.title ?? "");

  if (!isOwnership && !root.querySelector("select[name='default'], select[name='ownership.default']")) {
    const selects = root.querySelectorAll(".form-group select");
    if (!selects.length) return;
  }

  const rows = findUserRows(root);
  if (!rows.length) return;

  localizeChrome(root);
  for (const row of rows) decorateRow(row);
  injectToolbar(root, rows);
  injectShowPanel(root, app, rows);
  sortRows(root, rows);
  applyFilters(root, rows);
  bindSizeMemory(app, root);
}

function refreshOpenDialogs() {
  const apps = Object.values(ui.windows ?? {});
  const v2 = foundry.applications?.instances;
  if (v2 instanceof Map) {
    for (const app of v2.values()) apps.push(app);
  }

  for (const app of apps) {
    const title = app.title ?? "";
    if (!/ownership/i.test(title) && app.constructor?.name !== "DocumentOwnershipConfig") continue;
    const el = app.element instanceof HTMLElement ? app.element : app.element?.[0];
    if (!el) continue;
    enhance(app, el);
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, FLAG_HIDE, {
    name: "Hide Offline Users",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, FLAG_SHOW_TO, {
    name: "Show Players Target",
    scope: "client",
    config: false,
    type: String,
    default: "connected"
  });
  const objectType =
    typeof foundry.data?.fields?.ObjectField === "function"
      ? new foundry.data.fields.ObjectField({ required: false })
      : Object;
  game.settings.register(MODULE_ID, FLAG_SIZE, {
    name: "Ownership Window Size",
    scope: "client",
    config: false,
    type: objectType,
    default: { width: 560, height: 0 }
  });
  enableOwnershipResize();
});

Hooks.once("ready", () => {
  enableOwnershipResize();
});

Hooks.on("renderDocumentOwnershipConfig", enhance);
Hooks.on("renderApplication", (app, html) => {
  if (app?.constructor?.name === "DocumentOwnershipConfig") enhance(app, html);
});
Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.constructor?.name === "DocumentOwnershipConfig") enhance(app, element);
});

Hooks.on("userConnected", () => {
  refreshOpenDialogs();
});
