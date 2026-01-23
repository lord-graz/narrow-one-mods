// ==UserScript==
// @name         Show Item Name in tooltip
// @namespace    http://tampermonkey.net/
// @version      2025-06-19
// @description  shows the item name of shop items in the stats tooltip (when you hover over them) (doesn't work with looks items, since they don't have stats, thus no tooltip)
// @author       Lord Graz
// @match        https://narrow.one/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=narrow.one
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement("style")
    document.querySelector("html").appendChild(style)

    const config = {childList: true, subtree: true}

    const targetNode = document.querySelector("div#gameWrapper")

    const callback = mutationsList => {
        for (const mutation of mutationsList) {
            document.querySelectorAll("button.shopItem").forEach(e => {
                e.addEventListener("mouseover", () => {
                    const name = e.getAttribute("aria-label").split(", ")[1]
                    style.innerHTML = `.stat-class-tooltip::after{content: "${name}"; padding: 20px 0 0 30px; margin-top: 20px}`
                })
                e.addEventListener("mouseout", () => {
                    style.innerHTML = ""
                })
            })
        }
    }
    const observer = new MutationObserver(callback)
    observer.observe(targetNode, config)
})();