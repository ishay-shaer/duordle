"use strict";

const DEFAULT_WORD_LENGTH = 5;

export async function getRandomRelatedWords(wordLength=DEFAULT_WORD_LENGTH, exceptions=null) {
    const wordsObject = await getWordsObject(wordLength, exceptions);
    const randomWord = getRandomElFromArray(Object.keys(wordsObject));
    const relatedWord = getRandomElFromArray(wordsObject[randomWord]);
    return [randomWord, relatedWord];
}

export async function getRandomWord(wordLength=DEFAULT_WORD_LENGTH, exceptions=null) {
    return getRandomElFromArray(Object.keys(await getWordsObject(wordLength, exceptions)));
}

async function getWordsObject(wordLength, exceptions=null) {
    const dataFilePath = `./data_${wordLength}_letters.json`;
    if (!exceptions) exceptions = [];
    const response = await fetch(dataFilePath);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data = await response.text();
    return JSON.parse(data);
}

function getRandomElFromArray(arr) {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}
