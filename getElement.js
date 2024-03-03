"use strict";

export default function el(type, attributes) {
    const element = document.createElement(type);
    Object.keys(attributes).forEach(attribute => {
        switch (attribute) {
            case "textContent":
                element.textContent = attributes[attribute];
                break;
            case "innerHtml":
                element.innerHtml = attributes[attribute];
            default:
                element.setAttribute(attribute, attributes[attribute]);
        }
    });
    return element;
}
