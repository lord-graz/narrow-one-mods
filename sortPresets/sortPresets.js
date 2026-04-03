// ==UserScript==
// @name         Sort Presets
// @namespace    http://tampermonkey.net/
// @version      2026-03-18
// @description  Adds the missing feature of sorting presets.
// @author       Lord Graz
// @match        https://narrow.one/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=narrow.one
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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


    const presetItemSelector = ".shop-skin-selection-item:has( button.corner-delete-button[aria-label='Delete preset'])"

    let startX = 0, startY = 0
        , offsetL = 0, offsetT = 0
        , searchX = 0, searchY = 0
        , draggedIndex = -1, dummyIndex = -1;
    const dummyEl = document.createElement("div")
    dummyEl.id = "dummy-preset-item"
    dummyEl.classList.add("shop-skin-selection-item")
    /** @type {HTMLDivElement} */
    let draggedEl = null
    document.addEventListener("mousedown", e => {
        if (e.button !== 0) return; // left mouse button
        if (!(e.target.matches && e.target.matches(".shop-skin-selection-image")
            && e.target.parentElement.matches(presetItemSelector)))
            return;
        startX = e.clientX
        startY = e.clientY
        draggedEl = e.target.parentElement

        // needs to be in this order (get bb of child, set pos: fxd;, get bb of oParent),
        // cause of how position: fixed; works
        const bb = draggedEl.getBoundingClientRect()
        const marginLeft = parseInt(getComputedStyle(draggedEl).marginLeft)
        draggedEl.style._position = draggedEl.style.position
        draggedEl.style.position = "fixed"
        draggedEl.classList.add("dragged")
        const oParentBB = draggedEl.offsetParent.getBoundingClientRect()
        offsetL = bb.left - oParentBB.left
        offsetT = bb.top - oParentBB.top

        draggedEl.style._left = draggedEl.style.left
        draggedEl.style.left = `${offsetL}px`
        draggedEl.style._top = draggedEl.style.top
        draggedEl.style.top = `${offsetT}px`

        draggedIndex = [...draggedEl.parentElement.children].indexOf(draggedEl)

        updateDummyElPos(draggedEl, draggedIndex)
    })
    document.addEventListener("mousemove", e => {
        if (!draggedEl) return;
        const oParentBB = draggedEl.offsetParent.getBoundingClientRect()
            , parentBB = draggedEl.parentElement.getBoundingClientRect()
            , draggedBB = draggedEl.getBoundingClientRect()
            , minL = parentBB.left - oParentBB.left/*  - draggedBB.width */
            , minT = parentBB.top - oParentBB.top/*  - draggedBB.height */
            , maxW = parentBB.width - draggedBB.width + minL/*  + (draggedBB.width * 2) */
            , maxH = parentBB.height - draggedBB.height + minT/*  + (draggedBB.height * 2) */
        searchX = e.clientX - startX + offsetL
        searchY = e.clientY - startY + offsetT
        draggedEl.style.left = `${clamp(searchX, minL, maxW)}px`
        draggedEl.style.top = `${clamp(searchY, minT, maxH)}px`
        let closestDist = null, closestEl = null, closestIdx = null
        dummyEl.remove()
        const presetItems = document.getElementById("gameWrapper")
            .querySelectorAll(`${presetItemSelector}:not(.dragged, #dummy-preset-item), ${presetItemSelector} ~ button.shop-skin-selection-list-add-button`)
        presetItems.forEach((e, idx) => {
            const bb = e.getBoundingClientRect()
                , left = (searchX/*  + (draggedBB.width / 2) */) - (bb.left - parentBB.left)/*  - (draggedEl.offsetWidth / -1) */
                , top = (searchY + (draggedBB.height / 2)) - (bb.top - parentBB.top + (bb.height / 2))/*  - (draggedEl.offsetHeight / -1) */
            // pythagorean theorem (excluding sqrt, cause we don't need that for comparison)
            const distSq = (left * left) + (top * top)
            if (!closestDist || distSq < closestDist) {
                closestDist = distSq
                closestEl = e
                closestIdx = idx
                if (closestIdx > draggedIndex) { closestIdx += 1 }
            }
        })
        closestIdx = [...draggedEl.parentElement.children].indexOf(closestEl)
        updateDummyElPos(closestEl, closestIdx)

        //presetItems[presetItems.indexOf(closestEl) - 1]?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest", container: "nearest" })
        const overScrollSpeed = .1
        draggedEl.parentElement.scrollBy({
            top: (searchY - clamp(searchY, 0, maxH)) * overScrollSpeed,
            left: (searchX - clamp(searchX, 0, maxW)) * overScrollSpeed,
            behavior: "smooth"
        })
        closestEl.matches(`${presetItemSelector} ~ button.shop-skin-selection-list-add-button`) && closestEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest", container: "nearest" })
    })
    document.addEventListener("mouseup", () => {
        releaseDraggedEl(true)
    })
    document.addEventListener("keyup", e => {
        if (e.key == "Escape") {
            e.preventDefault()
            e.stopImmediatePropagation()
            e.stopPropagation()
            releaseDraggedEl(false);
        }
    })
    function updateDummyElPos(node, idx) {
        //if (!node || !node.children) return;
        dummyEl.remove()
        draggedEl.parentElement.insertBefore(dummyEl, node)
        dummyIndex = idx
        // dummyEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest", container: "nearest" })
    }
    const indexedDb = new indexedDbManager()
    function releaseDraggedEl(newPos = true) {
        if (!draggedEl) return;

        draggedEl.classList.remove("dragged")
        draggedEl.style.position = draggedEl.style._position || ""
        draggedEl.style.left = draggedEl.style._left || ""
        draggedEl.style.top = draggedEl.style._top || ""
        if (newPos === true) {
            const parent = draggedEl.parentElement
            parent.insertBefore(draggedEl, dummyEl);
            const oldDraggedIdx = draggedIndex
            const newDraggedIdx = [...draggedEl.parentElement.querySelectorAll(presetItemSelector)].indexOf(draggedEl);
            updatePresets(oldDraggedIdx, newDraggedIdx)
        }
        draggedEl = null;
        dummyEl.remove();
    }



    let contextMenuId = 0
    document.addEventListener("contextmenu", async (e) => {
        if (!e.target?.parentElement?.matches(presetItemSelector)) return;
        e.preventDefault()
        closePresetMenus()

        const idx = [...e.target.parentElement.parentElement.querySelectorAll(presetItemSelector)].indexOf(e.target.parentElement)

        contextMenuId++
        const privateContextMenuId = contextMenuId

        const presetName = (await indexedDb.get("skinPresets"))[idx]?.name || `Preset ${idx + 1}`

        // cause of async "slowness"
        if (privateContextMenuId < contextMenuId) return;

        const div = document.createElement("div")
        div.innerHTML = `
        <span>Enter new index (0-based) for ${presetName}:</span>
        <input type="number" class="wrinkledPaper" style="--wrinkled-paper-seed: ${Math.floor(Math.random() * 100000)}"/>
        <button class="dialog-button blueNight wrinkledPaper" style="--wrinkled-paper-seed: ${Math.floor(Math.random() * 100000)}">
            <span>set</span>
        </button>
        <br />
        <span class="preset-sort-error hidden"></span>
        `
        div.classList.add("wrinkledPaper", "preset-sort-menu")

        div.style.left = `${e.clientX}px`
        div.style.top = `${e.clientY}px`

        div.addEventListener("click", e => { e.stopPropagation() })

        document.documentElement.appendChild(div)

        const input = div.querySelector("input")
        input.addEventListener("change", inputInput)
        function inputInput() {
            hideError()
            const val = parseInt(input.value)
            if (isNaN(val)) {
                displayError("Input is not a number. Please try again.");
                return;
            }
            (async () => {
                const presets = await indexedDb.get("skinPresets")
                if (val > presets.length - 1) {
                    displayError("Number too high! (skill ishues)")
                    return;
                } else if (val < 0) {
                    displayError("Number too low! (skill ishues)")
                    return;
                } else {
                    updatePresets(idx, val)
                    closePresetMenus()
                    const dialog = e.target.closest(".dialog")
                    dialog.querySelector(".icon-button.header-button.header-back-button[aria-label='Back']")?.click()
                    setTimeout(() => {
                        dialog.querySelectorAll("button.dialog-button").forEach(e => {
                            if (e.children[0].textContent.match(/presets/i)) e.click()
                        })
                    }, 10);
                }
            })()
        }

        div.querySelector("button").addEventListener("click", inputInput)

        function displayError(error = "") {
            const errorEl = div.querySelector(".preset-sort-error")
            errorEl.textContent = error || "Input not valid. Please try again."
            errorEl.classList.remove("hidden")
        }
        function hideError() {
            div.querySelector(".preset-sort-error").classList.add("hidden")
        }
    })
    document.addEventListener("click", closePresetMenus)
    function closePresetMenus() {
        document.querySelectorAll(".preset-sort-menu").forEach(e => e.remove())
    }

    async function updatePresets(oldIdx, newIdx) {
        if (oldIdx === newIdx) return;
        await indexedDb.getSet("skinPresets", e => {
            // remove dragged preset from array
            const removedItem = e.splice(oldIdx, 1)[0]
            // and add it back in the new location
            e.splice(newIdx, 0, removedItem)
            return e;
        })
    }

    const sheet = new CSSStyleSheet;
    sheet.replaceSync(`
        .shop-skin-selection-list {
            /* just in case for draggedEl.offsetLeft */
            position: relative;
            overflow-y: hidden;
        }

        .dragged {
            position: fixed;
            z-index: 999;
            margin: 0;
            filter: var(--default-drop-shadow);
        }

        #dummy-preset-item {
            box-sizing: border-box;
            border: 4px dashed red;
            position: relative;
        }

        .preset-sort-menu {
            filter: var(--default-drop-shadow);
            position: fixed;
            padding: .8em;
        }

        .preset-sort-error {
            color: red;
            font-weight: bold;
        }
        .preset-sort-error.hidden {
            display: none
        }

        :is(input[type="number"].wrinkledPaper) {
            --wrinkled-paper-border-size: 3;
            --wrinkled-paper-border-size-bottom: 6;
            --wrinkled-paper-border-color: var(--default-wrinkled-paper-border-color);
            --wrinkled-paper-tear-count-min: 0;
            outline: none;
            border: none;
            font-size: inherit;
            padding: .5em;
        }
    `)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

    function clamp(val, min, max) {
        return Math.max(min, Math.min(val, max))
    }
})();
