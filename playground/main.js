import {
  getOwnership,
  getUsers,
  initModule,
  LEVELS,
  renderOwnership,
  setLanguage,
  setUserActive
} from "./foundry-mock.js";
import "../scripts/module.mjs";
import "../styles/module.css";
import "./playground.css";

const LEVEL_OPTIONS = [
  { value: "-1", key: "OWNERSHIP.DEFAULT" },
  { value: String(LEVELS.NONE), key: "OWNERSHIP.NONE" },
  { value: String(LEVELS.LIMITED), key: "OWNERSHIP.LIMITED" },
  { value: String(LEVELS.OBSERVER), key: "OWNERSHIP.OBSERVER" },
  { value: String(LEVELS.OWNER), key: "OWNERSHIP.OWNER" }
];

function i18n(key) {
  return globalThis.game.i18n.localize(key);
}

function ownershipSelect(name, selected) {
  const options = LEVEL_OPTIONS.map((option) => {
    const isSelected = String(selected) === option.value ? "selected" : "";
    return `<option value="${option.value}" ${isSelected}>${i18n(option.key)}</option>`;
  }).join("");
  return `<select name="${name}">${options}</select>`;
}

function renderDialog() {
  const host = document.querySelector("#dialog-host");
  const ownership = getOwnership();
  const users = getUsers();
  const title = i18n("OWNERSHIP.Title");

  host.innerHTML = `
    <div id="ownership-config-Actor-moonblade" class="app window-app sheet ownership-config">
      <header class="window-header">
        <h4 class="window-title">${title}: Ser Aelarion</h4>
        <span class="window-doc">Actor</span>
      </header>
      <section class="window-content">
        <form autocomplete="off">
          <p class="notes">${i18n("OWNERSHIP.HintDocument")}</p>
          <label class="show-gm"><input type="checkbox" /> ${i18n("OWNERSHIP.ShowGM")}</label>
          <div class="form-group">
            <label>${i18n("OWNERSHIP.AllPlayers")}</label>
            <div class="form-fields">
              ${ownershipSelect("ownership.default", ownership.default)}
            </div>
          </div>
          ${users
            .map(
              (user) => `
            <div class="form-group">
              <label>${user.name}</label>
              <div class="form-fields">
                ${ownershipSelect(`ownership.${user.id}`, ownership[user.id])}
              </div>
            </div>`
            )
            .join("")}
          <footer class="sheet-footer">
            <button type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6m3-10H5V5h10z"/></svg>
              ${i18n("OOF.SaveChanges")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `;

  const root = host.querySelector(".ownership-config");
  const form = root.querySelector("form");

  form.addEventListener("change", (event) => {
    const select = event.target.closest("select");
    if (!select?.name || select.classList.contains("oof-show-target")) return;
    const key = select.name.replace(/^ownership\./, "");
    ownership[key] = select.value;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    globalThis.ui.notifications.info(i18n("OOF.Saved"));
  });

  renderOwnership(root);
}

function renderPresence() {
  const list = document.querySelector("#presence-list");
  list.innerHTML = getUsers()
    .map((user) => {
      const state = user.active ? i18n("OOF.Online") : i18n("OOF.Offline");
      return `
        <li>
          <button
            type="button"
            class="presence ${user.active ? "online" : "offline"}"
            data-user-id="${user.id}"
            ${user.isGM ? "disabled" : ""}
          >
            <span class="presence-pip"></span>
            <span class="presence-meta">
              <strong>${user.name}</strong>
              <em>${user.isGM ? "GM" : state}</em>
            </span>
          </button>
        </li>`;
    })
    .join("");
}

function mount() {
  initModule();
  renderDialog();
  renderPresence();

  document.querySelector("#presence-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-user-id]");
    if (!button || button.disabled) return;
    const user = getUsers().find((entry) => entry.id === button.dataset.userId);
    if (!user) return;
    setUserActive(user.id, !user.active);
    renderPresence();
  });

  document.querySelector(".lang-switch").addEventListener("change", (event) => {
    const select = event.target.closest("select");
    if (!select) return;
    setLanguage(select.value);
    renderDialog();
    renderPresence();
  });
}

mount();
