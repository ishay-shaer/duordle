// Decide on exception elimination strategy and implement it.
// Probably the best is storing all words from data_5_letters.json in localStorage and removing 2 words at each game init

"use strict";

export default async function getRandomRelatedWords(wordLength=5, exceptions=null) {
    const dataFilePath = `./data_${wordLength}_letters.json`;
    if (!exceptions) exceptions = [];
    const response = await fetch(dataFilePath);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data = await response.text();
    const dataObject = JSON.parse(data);
    let primaryWords = Object.keys(dataObject);
    // Eliminating exceptions from primaryWords array
    exceptions.forEach(exception => {
        if (primaryWords.includes(exception)) {
            exceptionIndex = primaryWords.indexOf(exception);
            primaryWords = [...primaryWords.slice(0, exceptionIndex), ...primaryWords.slice(exceptionIndex + 1)];
        }
    });
    const randomWord = getRandomElFromArray(primaryWords);
    const relatedWord = getRandomElFromArray(dataObject[randomWord]);
    return [randomWord, relatedWord];
}

function getRandomElFromArray(arr) {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}
