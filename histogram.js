"use strict";

const GAP_WIDTH_RATIO = .1;
const PERCENT_DIGITS = 0;

export default function createHistogram(divEl, dataObject, xLabel="x", highlightedBar=null) {
    const keys = Object.keys(dataObject).sort((a, b) => a - b);
    const values = Object.values(dataObject);
    const chartContainer = document.createElement("div");
    chartContainer.id = "chart-container";
    const maxValue = Math.max(...values);
    const sumValues = values.reduce((total, value) => total + value, 0);
    
    const stringData = {};
    keys.forEach(key => {
        const numericValue = dataObject[key];
        const percentValue = (numericValue / sumValues * 100).toFixed(PERCENT_DIGITS);
        stringData[key] = numericValue ? `${numericValue}<br>(${percentValue}%)` : "";
    });

    let chartContent = "";

    for (const key of keys) {
        const height = (dataObject[key] / maxValue * .75 * divEl.style.height.replace("px", "")) + "px";
        chartContent += `<span class="data-column" id="data-column-${key}">
                             <div class="datum">${stringData[key]}</div>
                             <div class="bar" id="key-${key}-bar" style="height: ${height};"></div>
                             <div class="num-guesses">${key}</div>
                         </span>`;
    }
    
    chartContainer.innerHTML = chartContent;
    divEl.appendChild(chartContainer);
    if (highlightedBar != null)
        document.querySelector(`#data-column-${highlightedBar}`).classList.add("highlighted-column");

    chartContainer.style.gridTemplateColumns = `repeat(${keys.length}, auto)`;
    const gapWidth = ((100 / (keys.length - 1)) * GAP_WIDTH_RATIO) + "%";
    chartContainer.style.columnGap = gapWidth;
    
    divEl.innerHTML += `<div id='x-label'>${xLabel}</div>`;
}
