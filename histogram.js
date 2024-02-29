"use strict";

const GAP_WIDTH_RATIO = .1;
const PERCENT_DIGITS = 0;

export default function createHistogram(dataObject, xLabel="x", highlightedBar=null, keys=null) {
    const divEl = document.createElement("div");
    divEl.className = "chart-box";
    if (!keys) keys = Object.keys(dataObject).sort((a, b) => a - b);
    const values = Object.values(dataObject);
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container";
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
        const height = (dataObject[key] / maxValue * 75) + "%";
        const highlightIfShould = key === highlightedBar ? "highlighted-column" : "";
        chartContent += `<span class="data-column ${highlightIfShould}" id="data-column-${key}">
                             <div class="num-guesses">${key}</div>                             
                             <div class="bar" id="key-${key}-bar" style="height: ${height};"></div>
                             <div class="datum">${stringData[key]}</div>                             
                         </span>`;
    }
    
    

    chartContainer.innerHTML = chartContent;
    const gapWidth = ((100 / (keys.length - 1)) * GAP_WIDTH_RATIO) + "%";
    chartContainer.style.columnGap = gapWidth;
    divEl.appendChild(chartContainer);

    // if (highlightedBar != null)
    //     document.querySelector(`#data-column-${highlightedBar}`).classList.add("highlighted-column");

    // const gapWidth = ((100 / (keys.length - 1)) * GAP_WIDTH_RATIO) + "%";
    // chartContainer.style.columnGap = gapWidth;
    
    divEl.innerHTML += `<div id='x-label'>${xLabel}</div>`;
    return divEl;
}
