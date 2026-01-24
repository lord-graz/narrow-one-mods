// ==UserScript==
// @name         Custom Crosshair (Rotated Quad + Center Dot)
// @namespace    http://tampermonkey.net/
// @version      2026-01-24
// @description  Rotates the crosshair container and adds a center dot to it.
// @author       Lord Graz
// @match        *://narrow.one/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=narrow.one
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    /* set to false if you don't want a dot, default is true */
    const centerDot = true;

    const styles = `
.crosshair-container {
    rotate: -45deg;
}

.crosshair-container .flagReturnProgressContainer {
    rotate: 45deg;
}

${(centerDot && `
.crosshair-container::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    width: 4.5px;
    height: 4.5px;
    background: var(--line-color);
    border: 2px solid var(--outline-color);
    border-radius: 10px;
}`)
}
`
    const sheet = new CSSStyleSheet;
    sheet.replaceSync(styles);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

    console.log("%cSuccessfully injected CSS for Custom Quad Crosshair!", "font-size: 20px; color: green; font-weight: bolder;")
})();
