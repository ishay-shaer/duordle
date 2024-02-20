"use strict";

const dataFilePath = "/data_5_letters.json";

export default async function getRandomRelatedWords() {
    const response = await fetch(dataFilePath);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data = await response.text();
    const dataObject = JSON.parse(data);
    const primaryWords = Object.keys(dataObject);
    const randomWord = getRandomElFromArray(primaryWords);
    const relatedWord = getRandomElFromArray(dataObject[randomWord]);
    return [randomWord, relatedWord];
}

function getRandomElFromArray(arr) {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}
