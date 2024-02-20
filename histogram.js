"use strict";

const gapWidthRatio = .1;
const percentDigits = 0;
const defaultBarColor = "#00f";
const highlightedColor = "#b3e";

export default function createHistogram(divEl, dataObject, xLabel="x", highlightedBar) {
    const keys = Object.keys(dataObject).sort((a, b) => a - b);
    const values = Object.values(dataObject);
    const chartContainer = document.createElement("div");
    chartContainer.id = "chart-container";
    const maxValue = Math.max(...values);
    const sumValues = values.reduce((total, value) => total + value, 0);
    
    const stringData = {};
    keys.forEach(key => {
        const numericValue = dataObject[key];
        const percentValue = (numericValue / sumValues * 100).toFixed(percentDigits);
        stringData[key] = `${numericValue}<br>(${percentValue}%)`;
    });

    let chartContent = "";
    
    for (const key of keys) {
        const height = (dataObject[key] / maxValue * .75 * divEl.style.height.replace("px", "")) + "px";
        const barColor = key == highlightedBar ? highlightedColor : defaultBarColor;
        chartContent += `<span>
                             <div class="datum">${stringData[key]}</div>
                             <div class="bar" id="${key}-bar" style="height: ${height};
                                                                     background: ${barColor};">
                             </div>
                             <div class="num-guesses">${key}</div>
                         </span>`;
    }
    
    chartContainer.innerHTML = chartContent;
    chartContainer.style.display = "grid";
    chartContainer.style.gridTemplateColumns = `repeat(${keys.length}, auto)`;
    const gapWidth = ((100 / (keys.length - 1)) * gapWidthRatio) + "%";
    chartContainer.style.columnGap = gapWidth;
    chartContainer.style.alignItems = "end";
    divEl.appendChild(chartContainer);
    divEl.innerHTML += `<div id='x-label'>${xLabel}</div>`;
}
