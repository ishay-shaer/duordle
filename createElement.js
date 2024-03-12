"use strict";

const STANDARD_EVENTS = [
    "abort",
    "afterprint",
    "animationend",
    "animationiteration",
    "animationstart",
    "beforeprint",
    "beforeunload",
    "blur",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "contextmenu",
    "copy",
    "cut",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "ended",
    "error",
    "focus",
    "focusin",
    "focusout",
    "fullscreenchange",
    "fullscreenerror",
    "hashchange",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "message",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "mousewheel",
    "offline",
    "online",
    "pagehide",
    "pageshow",
    "paste",
    "pause",
    "play",
    "playing",
    "popstate",
    "progress",
    "ratechange",
    "resize",
    "reset",
    "scroll",
    "search",
    "seeked",
    "seeking",
    "select",
    "show",
    "stalled",
    "storage",
    "submit",
    "suspend",
    "timeupdate",
    "toggle",
    "touchcancel",
    "touchend",
    "touchmove",
    "touchstart",
    "transitionend",
    "unload",
    "volumechange",
    "waiting",
    "wheel"
  ];

export function el(type, attributes) {
    if (typeof type !== "string") throw new Error("First argument must be a String");
    if (typeof attributes !== "object") throw new Error("Second argument must be an Object");
    const element = document.createElement(type);
    Object.keys(attributes).forEach(name => {
        if (STANDARD_EVENTS.includes(name)) {
            element.addEventListener(name, attributes[name]);
        } else switch (name) {
            case "textContent":
                element.textContent = attributes.textContent;
                break;
            case "innerHTML":
                element.innerHTML = attributes.innerHTML;
                break;
            case "classList":
                for (let className of attributes.classList) {
                    if (className) element.classList.add(className);
                }
                break;
            case "children":
                element.append(...attributes.children);
                break;
            case "style":
                for (let property of Object.keys(attributes.style)) {
                    element.style[property] = attributes.style[property];
                }
                break;
            default:
                element.setAttribute(name, attributes[name]);
        }
    });
    return element;
}

export function textToLowerDashed(text) {
    return text.toLowerCase().split(" ").join("-");
}

export function getSiblings(element) {
    const parent = element.parentNode;
    let siblings = Array.from(parent.children);
    siblings = siblings.filter((child) => child !== element);
    return siblings;
}  

// If children are provided, it should be an array of objects with a text attribute,
// and optionally enabled and/or children.
// Convert into a class
export function menuItem(text, enabled=true, children=null) {
    const item = el("div", {
        innerHTML: children
            ? `<span>${text}</span><span>›</span>` : `<span>${text}</span>`,
        id: `menu-item-${textToLowerDashed(text)}`,
        classList: ["menu-item", enabled ? "menu-item-enabled" : "menu-item-disabled"]
    });
    item.enabled = enabled;
    if (children) {
        const subMenu = item.appendChild(el("div", {
            class: "sub-menu",
            id: `menu-items-${textToLowerDashed(text)}`,
            children: children.map(childObj => menuItem(childObj.text, childObj.enabled, childObj.children))
        }));
        subMenu.style.display = "none";
        let grace;
        item.onmouseenter = function() {
            if (!this.enabled) return;
            clearTimeout(grace);
            subMenu.style.display = "grid";
        }
        item.onmouseleave = function() {
            grace = setTimeout(() => {
                subMenu.style.display = "none";
            }, 300);
        }
    }
    return item;
}