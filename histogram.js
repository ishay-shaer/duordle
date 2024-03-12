"use strict";

import { el } from "./createElement.js";
const GAP_WIDTH_RATIO = .1;
const PERCENT_DIGITS = 0;

export default function createHistogram(dataObject, xLabel="x", highlightedBar=null, keys=null) {    
    if (!keys) keys = Object.keys(dataObject).sort((a, b) => a - b);
    const values = Object.values(dataObject);    
    const maxValue = Math.max(...values);
    const sumValues = values.reduce((total, value) => total + value, 0);
    const stringData = {};
    keys.forEach(key => {
        const numericValue = dataObject[key];
        const percentValue = (numericValue / sumValues * 100).toFixed(PERCENT_DIGITS);
        stringData[key] = numericValue ? `${numericValue}<br>(${percentValue}%)` : "";
    });
    const chartContainer = el("div", {class: "chart-container"});
    for (const key of keys) {
        const height = (dataObject[key] / maxValue * 75) + "%";
        chartContainer.appendChild(el("div", {
            id: `data-column-${key}`,
            classList: ["data-column", key === highlightedBar ? "highlighted-column" : null],
            children: [
                el("div", {class: "num-guesses", textContent: key}),
                el("div", {class: "bar", id: `key-${key}-bar`, style: {height: height}}),
                el("div", {class: "datum", innerHTML: stringData[key]})
            ]
        }))
    }
    const gapWidth = ((100 / (keys.length - 1)) * GAP_WIDTH_RATIO) + "%";
    chartContainer.style.columnGap = gapWidth;
    return el("div", {
        class: "chart-box",
        children: [chartContainer, el("div", {id:"x-label", textContent: xLabel})]
    });
}
