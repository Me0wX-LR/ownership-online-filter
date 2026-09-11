import en from "../lang/en.json";
import zhHant from "../lang/zh-Hant.json";
import zhHans from "../lang/zh-Hans.json";
import ja from "../lang/ja.json";
import ko from "../lang/ko.json";
import de from "../lang/de.json";
import es from "../lang/es.json";
import fr from "../lang/fr.json";
import it from "../lang/it.json";
import pl from "../lang/pl.json";
import ptBR from "../lang/pt-BR.json";
import ru from "../lang/ru.json";

const PACKS = {
  en,
  "zh-TW": zhHant,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  "zh-CN": zhHans,
  cn: zhHans,
  ja,
  ko,
  de,
  es,
  fr,
  it,
  pl,
  "pt-BR": ptBR,
  ru
};

const LEVELS = Object.freeze({
  NONE: 0,
  LIMITED: 1,
  OBSERVER: 2,
  OWNER: 3
});

const USERS = [
  { id: "gm-thorne", name: "Thorne", isGM: true, active: true },
  { id: "u-lyra", name: "Lyra Nightwind", isGM: false, active: true },
  { id: "u-kael", name: "Kael Ironfoot", isGM: false, active: true },
  { id: "u-sera", name: "Seraphine Vale", isGM: false, active: true },
  { id: "u-dorian", name: "Dorian Ash", isGM: false, active: false },
  { id: "u-mira", name: "Mira Quill", isGM: false, active: false },
  { id: "u-bram", name: "Bram Hollow", isGM: false, active: false },
  { id: "u-nyssa", name: "Nyssa Frost", isGM: false, active: false }
];

const OWNERSHIP = {
  default: String(LEVELS.NONE),
  "gm-thorne": String(LEVELS.OWNER),
  "u-lyra": String(LEVELS.OWNER),
  "u-kael": String(LEVELS.OBSERVER),
  "u-sera": "-1",
  "u-dorian": String(LEVELS.LIMITED),
  "u-mira": "-1",
  "u-bram": String(LEVELS.NONE),
  "u-nyssa": "-1"
};

const settingsStore = new Map();
const hookOn = new Map();
const hookOnce = new Map();

function addHook(map, name, fn) {
  const list = map.get(name) ?? [];
  list.push(fn);
  map.set(name, list);
}

function callHook(name, ...args) {
  const once = hookOnce.get(name) ?? [];
  hookOnce.set(name, []);
  for (const fn of once) fn(...args);
  for (const fn of hookOn.get(name) ?? []) fn(...args);
}

function localize(key) {
  const pack = PACKS[game.i18n.lang] ?? PACKS.en;
  return pack[key] ?? PACKS.en[key] ?? key;
}

function format(key, data = {}) {
  return localize(key).replace(/\{(\w+)\}/g, (_, token) => String(data[token] ?? ""));
}

function toast(message, kind = "info") {
  const host = document.querySelector("#toasts");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  host.append(el);
  window.setTimeout(() => {
    el.classList.add("leaving");
    window.setTimeout(() => el.remove(), 280);
  }, 3200);
}

function mergeObject(target, source, { inplace = true } = {}) {
  const out = inplace ? target : { ...target };
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = mergeObject(out[key] && typeof out[key] === "object" ? out[key] : {}, value, { inplace: true });
    } else {
      out[key] = value;
    }
  }
  return out;
}

class UserCollection {
  constructor(users) {
    this._users = users;
  }

  get(id) {
    return this._users.find((user) => user.id === id) ?? undefined;
  }

  find(predicate) {
    return this._users.find(predicate);
  }

  filter(predicate) {
    return this._users.filter(predicate);
  }

  [Symbol.iterator]() {
    return this._users[Symbol.iterator]();
  }
}

export const ownershipApp = {
  constructor: { name: "DocumentOwnershipConfig" },
  title: "Ownership Configuration: Ser Aelarion",
  id: "ownership-config-Actor-moonblade",
  element: null,
  position: { width: 560, height: 640 },
  document: {
    id: "actor-aelarion",
    name: "Ser Aelarion",
    documentName: "Actor",
    uuid: "Actor.actor-aelarion",
    getActiveTokens() {
      return [];
    }
  },
  async submit() {
    return true;
  },
  setPosition(position = {}) {
    this.position = { ...this.position, ...position };
    this._onPosition(this.position);
    return this.position;
  },
  _onPosition() {}
};

const foundry = {
  CONST: { DOCUMENT_OWNERSHIP_LEVELS: LEVELS },
  applications: {
    instances: new Map(),
    apps: {
      DocumentOwnershipConfig: {
        DEFAULT_OPTIONS: {
          window: { resizable: false },
          position: { width: 480 }
        }
      }
    }
  },
  utils: {
    mergeObject,
    debounce(fn, delay) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    }
  },
  documents: { collections: {} }
};

const Hooks = {
  on(name, fn) {
    addHook(hookOn, name, fn);
  },
  once(name, fn) {
    addHook(hookOnce, name, fn);
  },
  call: callHook
};

const ui = {
  windows: {},
  notifications: {
    info: (message) => toast(message, "info"),
    warn: (message) => toast(message, "warn"),
    error: (message) => toast(message, "error")
  }
};

const game = {
  i18n: {
    lang: "en",
    localize,
    format
  },
  users: new UserCollection(USERS),
  settings: {
    register(moduleId, key, config) {
      const storeKey = `${moduleId}.${key}`;
      if (!settingsStore.has(storeKey)) settingsStore.set(storeKey, config.default);
    },
    get(moduleId, key) {
      return settingsStore.get(`${moduleId}.${key}`);
    },
    set(moduleId, key, value) {
      settingsStore.set(`${moduleId}.${key}`, value);
      return Promise.resolve(value);
    }
  },
  socket: null
};

globalThis.foundry = foundry;
globalThis.Hooks = Hooks;
globalThis.ui = ui;
globalThis.game = game;
globalThis.Journal = {
  async show(doc, { users = [] } = {}) {
    const count = Array.isArray(users) ? users.length : 0;
    console.debug(`Journal.show ${doc?.name} -> ${count}`);
  }
};
globalThis.CONFIG = { JournalEntry: { collection: globalThis.Journal }, supportedLanguages: Object.fromEntries(Object.keys(PACKS).map((code) => [code, code])) };
globalThis.canvas = { scene: null };
foundry.documents.collections.Journal = globalThis.Journal;

export function getUsers() {
  return USERS;
}

export function getOwnership() {
  return OWNERSHIP;
}

export function setLanguage(lang) {
  game.i18n.lang = lang;
}

export function setUserActive(userId, active) {
  const user = USERS.find((entry) => entry.id === userId);
  if (!user || user.isGM) return;
  user.active = active;
  callHook("userConnected", user, active);
}

export function bindApp(element) {
  ownershipApp.element = element;
  ui.windows[ownershipApp.id] = ownershipApp;
  foundry.applications.instances.set(ownershipApp.id, ownershipApp);
}

export function initModule() {
  callHook("init");
}

export function renderOwnership(element) {
  bindApp(element);
  callHook("renderDocumentOwnershipConfig", ownershipApp, element);
}

export { LEVELS };
