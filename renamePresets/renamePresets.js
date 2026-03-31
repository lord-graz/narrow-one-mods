// ==UserScript==
// @name         Preset Names
// @namespace    http://tampermonkey.net/
// @version      2026-03-30
// @description  Allows modification of preset names.
// @author       Lord Graz
// @match        https://narrow.one/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=narrow.one
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    // jesper's code
    class indexedDbManager {
        constructor(t = "keyValuesDb", { objectStoreNames: e = ["keyValues"] } = {}) {
            this.dbName = t,
                this.objectStoreNames = e;
            const i = indexedDB.open(this.dbName);
            i.onupgradeneeded = () => {
                for (const t of this.objectStoreNames)
                    i.result.createObjectStore(t)
            },
                this._dbPromise = this._promisifyRequest(i),
                this._initDb()
        }
        async _initDb() {
            const t = await this._dbPromise;
            t.onversionchange = e => {
                null == e.newVersion && t.close()
            }
        }
        async closeConnection() {
            (await this._dbPromise).close()
        }
        async _promisifyRequest(t) {
            return "done" == t.readyState ? t.result : await new Promise(((e, i) => {
                t.onsuccess = () => {
                    e(t.result)
                },
                    t.onerror = i
            }
            ))
        }
        async deleteDb() {
            await this.closeConnection(),
                await this._promisifyRequest(indexedDB.deleteDatabase(this.dbName))
        }
        async get(t, e = this.objectStoreNames[0]) {
            const i = (await this._dbPromise).transaction(e, "readonly").objectStore(e).get(t);
            return await this._promisifyRequest(i)
        }
        set(t, e, i = this.objectStoreNames[0]) {
            return this.getSet(t, (() => e), i)
        }
        async getSet(t, e, i = this.objectStoreNames[0], s = !1) {
            const n = (await this._dbPromise).transaction(i, "readwrite").objectStore(i)
                , o = n.openCursor(t)
                , a = await this._promisifyRequest(o);
            if (a)
                if (s) {
                    const t = a.delete();
                    await this._promisifyRequest(t)
                } else {
                    const t = e(a.value)
                        , i = a.update(t);
                    await this._promisifyRequest(i)
                }
            else {
                const i = n.put(e(void 0), t);
                await this._promisifyRequest(i)
            }
        }
        async delete(t, e = this.objectStoreNames[0]) {
            await this.getSet(t, (() => { }), e, !0)
        }
    }

    const presets = []

    const indexedDb = new indexedDbManager;
    (async () => {
        let needsUpdate = false;
        const _presets = await indexedDb.get("skinPresets")
        _presets.forEach((e, idx) => {
            if (!e.name) {
                e.name = `Preset ${idx + 1}`;
                needsUpdate = true;
            }
            presets[idx] = e
        })

        needsUpdate && indexedDb.set("skinPresets", presets)
    })()

    let currentPreset = 0
    const presetThingObserver = new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
            mutation.addedNodes.forEach(e => {
                if (typeof e.querySelectorAll === 'function') {
                    e.querySelectorAll(".dialog-select-input option").forEach(node => {
                        replacePresetText(node)
                    })
                    e.querySelectorAll(".paged-view-page-header .paged-view-page-header-title").forEach(node => {
                        replacePresetText(node, true)
                    })
                }
            })
            async function replacePresetText(node, isHeader = false) {
                if (node.textContent.match(/^Preset \d+$/)) {
                    // prevent "slow" functions calls from all using the same currentPreset variable
                    const localCurrentPreset = parseInt(node.textContent.split(" ")[1])
                    currentPreset = localCurrentPreset
                    node.textContent = ((await indexedDb.get("skinPresets"))[localCurrentPreset - 1].name) || (await addPresetName(localCurrentPreset - 1))

                    if (isHeader) {
                        node.classList.add("preset-header")
                        node.setAttribute("contenteditable", true)
                        node.spellcheck = false
                        // prevent red lines from spellcheck
                        node.focus()
                        node.blur()
                        node.addEventListener("blur", e => {
                            node.textContent = node.textContent == ""
                                ? `Preset ${localCurrentPreset}`
                                : node.textContent
                            indexedDb.getSet("skinPresets", e => { e[localCurrentPreset - 1].name = node.textContent; return e })
                        })
                    }
                }
            }
            mutation.addedNodes.forEach(node => {
                if (node.nodeType != Node.ELEMENT_NODE) return;
                if (!node.matches('div:has( [aria-label="Delete preset"])')) return;

                modifyButtons(node)
                // just in case, because new elements get created by the game
                // when adding/removing presets, idk why
                setTimeout(modifyButtons, 1, node)

                function modifyButtons(node) {
                    if (node.matches(".shop-skin-selection-item")) {
                        const idx = [...node.parentElement.children].indexOf(node)
                        modifyButton(node.querySelector(".shop-skin-selection-edit-button"), idx)
                    }
                    node.querySelectorAll(".shop-skin-selection-item").forEach((e, idx) => {
                        modifyButton(e.querySelector(".shop-skin-selection-edit-button"), idx)
                    })
                }
                async function modifyButton(button, idx) {
                    if (button?._modified) return;
                    button.textContent = (await indexedDb.get("skinPresets"))[idx].name || (await addPresetName(idx));
                    button._modified = true
                }
            })
        })
    })

    let isObservingPresets = false;
    const gameWrapperObserver = new MutationObserver(() => {
        const getDialog = (() => document.querySelector(".dialog:has( .shop-class-selection-container):has( .ownedCoinsContainer.allow-select)"))
        const dialog = getDialog()
        if (dialog && !dialog._isObserved) {
            presetThingObserver.observe(dialog, { subtree: true, childList: true })
            isObservingPresets = true;
            dialog._isObserved = true;
        } else if (!dialog) {
            setTimeout(() => {
                if (getDialog()) return;
                presetThingObserver.disconnect()
                isObservingPresets = false;
            }, 500);
        }
    })
    gameWrapperObserver.observe(document.querySelector("#gameWrapper"), { childList: true })

    window.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            const el = document.activeElement
            if (el.matches(".preset-header")) {
                el.textContent = el.textContent.replaceAll("\n", "")
                el.blur()
            }
        }
    })

    const sheet = new CSSStyleSheet;
    sheet.replaceSync(`

        .preset-header {
            position: relative;
            border-radius: 15px;
            margin: -0.1em 0;
            padding: 0px 15px;
            
            display: flex;
            flex-direction: row;
            align-items: center;
        }
            
        .preset-header:hover:not(:focus) {
            filter: brightness(0.9);
            cursor: pointer;
        }
                
        .preset-header:focus {
            margin: 5px 0;
            padding: 10px 15px;
            outline: 5px solid var(--blue-highlight-color);
        }

        .preset-header::after {
            content: "";
            background-image: url("static/img/edit.svg");
            filter: var(--icon-filter);

            width: 1.5em;
            height: 1.5em;
            display: inline-block;

            background-repeat: no-repeat;
            background-size: cover;
        }

        .preset-header:focus::after {
            visibility: hidden;
            width: 0px;
            height: 0px;
        }

    `)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

    async function addPresetName(idx) {
        const newName = `Preset ${idx + 1}`
        indexedDb.getSet("skinPresets", e => {
            e[idx].name = newName;
            return e;
        })
        return newName
    }
})();
