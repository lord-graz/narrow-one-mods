// ==UserScript==
// @name         Favorite Shop Items
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds the option to put favorite items at the top of the list, so you can find them easier.
// @author       Lord Graz
// @match        https://narrow.one/*
// @icon         https://www.narrow.one/static/img/menuUI/shopChest.svg
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const localStorageKey = "FavoriteShopItems";
    if (localStorage.getItem(localStorageKey) == null) localStorage.setItem(localStorageKey, "[]")

    const style = document.createElement('style');
    style.textContent = `

.shop-items-grid-view {
    overflow-y: visible;
}

.fav-item-menu {
    position: absolute;
    top: 90%;
    padding: 10px;
    z-index: 999999;
    --wrinkled-paper-color: var(--container-ui-bg-color);
    filter: var(--default-drop-shadow);
    --wrinkled-paper-border-size: 0;
}

.shopItem:nth-child(3n - 2) .fav-item-menu {
    left: 0;
}

.shopItem:nth-child(3n - 1) .fav-item-menu {
    left: 50%;
    transform: translateX(-50%);
}

.shopItem:nth-child(3n) .fav-item-menu {
    right: 0;
}

.shopItem.fav-item::after {
    content: "";
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 101 104'%3E%3Cpath class='fg' d='M78.92 38.154c-14.928-13.261-28.075 9.169-28.075 9.169s-12.7-21.638-27.622-8.376c-14.212 12.624-.877 25.725 5.322 32.377 6.44 6.911 21.905 13.981 21.905 13.981s15.041-7.183 21.482-14.094c6.197-6.653 21.201-20.432 6.988-33.057z' style='fill: red)'%3E%3C/path%3E%3C/svg%3E");
    position: absolute;
    left: 2px;
    top: 0;
    height: 30px;
    width: 30px;
    filter: var(--icon-filter) var(--default-drop-shadow);
}

`
    document.querySelector('html').appendChild(style)

    const config = {childList: true, subtree: true}

    const targetNode = document.querySelector("div#gameWrapper")

    const callback = mutationsList => {
        sortShopItems()
        for (const mutation of mutationsList) {
            document.querySelectorAll("button.shopItem").forEach(e => {
                if (e._hasContextMenuEvent) return;
                e.addEventListener("contextmenu", event => {
                    e._hasContextMenuEvent = true;
                    closeContextMenus();

                    event.preventDefault();
                    event.stopImmediatePropagation();
                    e.dispatchEvent(new Event("mouseout"));

                    const name = e.getAttribute("aria-label").split(", ")[1]
                        , favItems = JSON.parse(localStorage.getItem(localStorageKey))
                        , isFavorite = favItems.includes(name)

                    const menu = document.createElement("div");
                    menu.classList.add("fav-item-menu", "wrinkledPaper");
                    // menu.style.left = `${event.clientX}px`
                    // menu.style.top = `${event.clientY}px`
                    menu.addEventListener("mouseover", event => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                    })

                    const button = document.createElement("button");
                    button.classList.add("fav-item-button", "dialog-button", "blueNight", "wrinkledPaper");
                    button.textContent = isFavorite ? "remove favorite" : "add favorite";
                    button.addEventListener("click", event => {
                        event.stopPropagation();
                        closeContextMenus();

                        isFavorite ? favItems.splice(favItems.indexOf(name), 1) : favItems.unshift(name);
                        localStorage.setItem(localStorageKey, JSON.stringify(favItems));

                        sortShopItems(true);
                    })

                    menu.appendChild(button);
                    e.appendChild(menu);

                    console.log("contextmenu fired on:", e)
                })
            })
        }
    }
    const observer = new MutationObserver(callback)
    observer.observe(targetNode, config)

    window.addEventListener("click", closeContextMenus)
    function closeContextMenus() {
        targetNode.querySelectorAll(".fav-item-menu").forEach(e => {e.remove()})
    }

    function sortShopItems(force = false) {
        const page = targetNode.querySelector(".shop-items-grid-view")
        if (!page || (page._isSorted && !force)) return;

        const children = [...page.children]

        children.forEach((c, idx) => {
            if (typeof c._prevShopIndex === 'undefined') c._prevShopIndex = idx;
            page.removeChild(c)
        })

        children.sort((a, b) => {
            const favItems = JSON.parse(localStorage.getItem(localStorageKey))
                , indexA = favItems.indexOf(getNameOfShopItem(a))
                , indexB = favItems.indexOf(getNameOfShopItem(b))

            if (indexA == -1 && indexB >= 0) return 1;
            else if (indexB == -1 && indexA >= 0) return -1;
            else if (indexA >= 0 && indexB >= 0) return indexA - indexB;
            else if (indexA == -1 && indexB == -1) return a._prevShopIndex - b._prevShopIndex;
            else return "wtf?!?";
        })

        // console.log(children)

        children.forEach(c => {
            page.appendChild(c);
            if (JSON.parse(localStorage.getItem(localStorageKey)).indexOf(getNameOfShopItem(c)) >= 0)
                c.classList.add("fav-item");
            else c.classList.remove("fav-item")
        })

        page._isSorted = true;
    }

    function getNameOfShopItem(shopItem) {
        return shopItem.getAttribute("aria-label").split(", ")[1] || ""
    }
})();
