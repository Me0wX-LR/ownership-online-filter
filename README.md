# Ownership Online Filter

A [Foundry Virtual Tabletop](https://foundryvtt.com/) module for the **Document Ownership Configuration** dialog.

It keeps Foundry’s per-user ownership editors as the source of truth, then adds the table tools GMs actually need: who is online, hide the rest, search, bulk-set connected players, remember the window size, and **Show Players** without opening a second dialog.

Compatible with Foundry **v12–v14** (verified 14).

<img width="850" height="525" alt="image" src="https://github.com/user-attachments/assets/2ffe7d58-1561-4e58-bd28-1462e4b58601" />

## Features

- Online / offline pip and label on every user row
- Hide offline users (on by default; the GM row always stays visible)
- Search by player name
- Online users sorted to the top
- **Set Connected Players** — bulk-set None / Limited / Observer / Owner for everyone currently connected
- **Show Players** — save the ownership form, then show the document to connected, currently visible, or all players
  - Journals use Foundry’s show-to-players path
  - Actors also unhide that actor’s tokens on the current scene
  - Higher ownership is never reduced by the show step
- Core chrome is localized (`OWNERSHIP.HintDocument`, title, All Players, Show GM Users)
- The dialog is resizable; width and height are stored as a client setting and restored the next time it opens
- Language packs for English, Traditional Chinese, Simplified Chinese, Japanese

## Install

### From the Foundry setup screen

1. **Add-on Modules → Install Module**
2. Paste the latest-release manifest URL:

```
https://github.com/Me0wX-LR/ownership-online-filter/releases/latest/download/module.json
```

3. Enable **Ownership Online Filter** in the world.

To install a specific older version, use that release’s `module.json` asset instead, for example:

```
https://github.com/Me0wX-LR/ownership-online-filter/releases/download/1.1.0/module.json
```

### Manual

Copy this repository into `Data/modules/ownership-online-filter` so that `module.json` sits at the module root.

## Usage

Open **Configure Ownership** on any document.

| Control | What it does |
| --- | --- |
| Search | Filters the user list by name |
| Hide Offline Users | Hides disconnected non-GM users |
| Set Connected Players | Writes a permission onto every connected non-GM row (review, then save) |
| Show to | Who **Show Players** targets: connected, currently visible, or all players |
| Save Changes | Foundry’s normal ownership save |
| Show Players | Saves ownership, then shows the document to the chosen group |

Show Players is a table action. Fine-grained edits still use the per-user dropdowns and Save Changes.

## Development

| Path | Role |
| --- | --- |
| `scripts/module.mjs` | Foundry module (hooks into `DocumentOwnershipConfig`) |
| `styles/module.css` | Dialog, toolbar, and Show Players styles |
| `lang/` | Localization packs |
| `module.json` | Foundry manifest |
| `playground/` | Local sandbox only; not loaded by Foundry |
| `tools/pack-release.mjs` | Builds `dist/module.zip` for a GitHub Release |

Each Foundry listing row must point at **that version’s** pinned `module.json`, not at `main`. That is how 1.1.0 stays downloadable after 1.1.1.

1. Bump `"version"` in `module.json` (for example `1.1.1`).
2. Set `"download"` to `https://github.com/Me0wX-LR/ownership-online-filter/releases/download/1.1.1/module.zip`. Leave `"manifest"` as `releases/latest/download/module.json`.
3. Commit, tag `1.1.1` (no `v`), and push the commit **and** the tag.
4. Run `npm run pack` to build `dist/module.zip` and `dist/module.json`. Do not include `playground/`, `node_modules/`, or `tools/`.
5. Create a GitHub Release on that tag and attach **both** `module.json` and `module.zip`.
6. In Foundry Package Admin, **add a new version row**. Do not edit the 1.1.0 row.

| Foundry field | 1.1.0 | Later, 1.1.1 |
| --- | --- | --- |
| Version Number | `1.1.0` | `1.1.1` |
| Package Manifest URL | `https://github.com/Me0wX-LR/ownership-online-filter/releases/download/1.1.0/module.json` | `.../releases/download/1.1.1/module.json` |
| Release Notes URL | `https://github.com/Me0wX-LR/ownership-online-filter/releases/tag/1.1.0` | `.../releases/tag/1.1.1` |
| Minimum Core Version | `12` | same unless compatibility changed |
| Verified Core Version | `14` | update if you re-tested |
| Maximum Core Version | leave blank | leave blank unless a newer Foundry is known-broken |

## License

MIT. See [LICENSE](LICENSE).
