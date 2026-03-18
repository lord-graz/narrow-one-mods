// ==UserScript==
// @name         Rename Presets
// @namespace    http://tampermonkey.net/
// @version      2026-03-14
// @description  Allows modification of preset names.
// @author       Lord Graz
// @match        https://narrow.one/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=narrow.one
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    console.log("running renamePresets.js")
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
            function replacePresetText(node, isHeader = false) {
                if (node.textContent.match(/^Preset \d+$/)) {
                    currentPreset = parseInt(node.textContent.slice(7))
                    node.textContent = presets[currentPreset - 1].name

                    if (isHeader) {
                        node.classList.add("preset-header")
                        node.setAttribute("contenteditable", true)
                        node.spellcheck = false
                        // prevent red lines from spellcheck
                        node.focus()
                        node.blur()
                        node.addEventListener("blur", e => {
                            node.textContent = node.textContent == ""
                                ? `Preset ${currentPreset}`
                                : node.textContent
                            presets[currentPreset - 1].name = node.textContent
                            indexedDb.set("skinPresets", presets)
                        })
                    }
                }
            }
            mutation.addedNodes.forEach(node => {
                if (node.nodeType != Node.ELEMENT_NODE) return;
                if (!node.matches('div:has( [aria-label="Delete preset"])')) return;
                node.querySelectorAll(".shop-skin-selection-item").forEach((e, idx) => {
                    e.querySelector(".shop-skin-selection-edit-button").textContent = presets[idx].name
                })
            })
        })
    })

    const gameWrapperObserver = new MutationObserver(() => {
        const dialog = document.querySelector(".dialog:has( .shop-class-selection-container):has( .ownedCoinsContainer.allow-select)")
        if (dialog) {
            presetThingObserver.observe(dialog, { subtree: true, childList: true })
        } else {
            presetThingObserver.disconnect()
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
            margin: 5px 0;
            padding: 10px 15px;
            border-radius: 15px;
        }
        
        .preset-header:hover:not(:focus) {
            filter: brightness(0.9);
            cursor: pointer;
        }

        .preset-header:focus {
            outline: 5px solid var(--blue-highlight-color);
        }

        .preset-header::after {
            content: "";
            background-image: url("static/img/edit.svg");
            filter: var(--icon-filter);
            width: 40px;
            height: 40px;

            position: absolute;
            left: calc(100% - 15px);
            top: -20%;
        }

        .preset-header:focus::after {
            visibility: hidden;
        }

    `)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
})();
