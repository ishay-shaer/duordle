// TODO (DONE) Add magic word to guesses list if it doesn't exist.
// TODO (DONE) Unfocus (blur) elements after clicked.
// TODO (DONE) Clean console.logs.
// TODO (DONE) style color scheme select element.
// TODO (DONE) in style.css make default class for <html> element and move default properties there.
// TODO (DONE) Check if I really need Game.currentBoxes and Board.currentBox, or if I can do with const in the relevant functions
// TODO (DONE) Separate Game.deleteLastLetter into a Board method which will be invoked twice.
// TODO (DONE) Change possibleGuesses and possibleMagicWords from arrays to sets to make sure there are no duplicates.
// TODO (DONE) Store game results in localStorage: code the storeGameResult function
// TODO (DONE) If the two magic words are too similar (four or more letters are identically positioned), ignore and try again.
// TODO (DONE) Fix box CSS transitions to be cool only when the guess is correct.
// TODO (DONE) Show results from localStorage as statistics in the message box.
// TODO (DONE) Make the use of "" or '' consistent
// TODO (DONE BUT UNUSED) Download Plotly and use the file directly in the HTML head.
// TODO (DONE) Plot it
// TODO (DONE) Understand why scrollTo in displayEndGameMessage is not working - is it the focus on the button?
// TODO (DONE) Make available in 4, 5 or 6-letter words and let user choose on welcome screen.
// TODO (DONE) Make color-scheme select element work while welcome screen is showing
// TODO (DONE) Fix stats and histogram display for word lengths that have not been played yet (NaN)

// TODO Style the length slider
// TODO Add links from guesses to their respective dictionary.com page
// TODO Arrange all or most addEventListener's in one function
// TODO Add a favicon to the title
// TODO Create welcome message and display it in the message box.
// TODO Add magic word if not exist into the guesses file instead of each game into the array.
// TODO Every time a game is played, add magic words to an array in localStorage of max size 50? to avoid them in following games.
// TODO Add confetti effect when game has been won.

"use strict";

import createHistogram from "./histogram.js";
import { getRandomRelatedWords, getRandomWord } from "./getRelatedWords.js";

const originalHtml = document.documentElement.outerHTML;
// const originalMessageBoxHtml = document.querySelector("#message-box").outerHTML;
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 6;
const DEFAULT_WORD_LENGTH = 5;
const LENGTH_SLIDER_TEXT = "Word length";
const WELCOME_TEXT = `<p>
                        <strong>Duordle</strong> is like Wordle's adventurous cousin.
                        Instead of just one word, you're on the hunt for two words that are connected in meaning.
                        With each guess, you'll get hints for both words, leading you closer to cracking the code.
                        Once you've nailed both words, victory is yours!
                      </p>
                      <h2 class="examples-header">Examples:</h2>`;
let stopErrorDisplay = setTimeout(() => {}); // For timeout in the displayErrorMessage function.
const ordinalNums = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth"};

const getMaxGuesses = wordLength => wordLength > 5 ? 8 : 7;

class Game {
    constructor([word_0, word_1], possibleGuesses) {
        this.wordLength = word_0.length;
        this.maxGuesses = getMaxGuesses(this.wordLength);
        this.state = {
            hasWon: false,
            hasLost: false,
            isActive: true,
        }
        this.gameMagicWords = [word_0, word_1];
        this.possibleGuesses = possibleGuesses;
        this.boards = [new Board(0, word_0, this.wordLength, this.maxGuesses),
                       new Board(1, word_1, this.wordLength, this.maxGuesses)];
        this.charPosCol = 0;
        this.charPosRow = 0;
        this.currentGuess = "";
        this.isCurrentGuessValid = false;
        this.guesses = [];
        this.lastGuess = "";
    }

    static async createGame(wordLength) {
        const guessesFilePath = `./words_${wordLength}_letters.txt`;
        const gameMagicWords = await getRandomRelatedWords(wordLength);
        let possibleGuesses = await getWordsFromTextFile(guessesFilePath);
        possibleGuesses = [...new Set([...possibleGuesses, ...gameMagicWords])];
        return new Game(gameMagicWords, possibleGuesses);
    }

    createBoxes() {
        this.boards.forEach(board => board.createBoxes());
    }

    // refactor?
    createScreenKeyboard() {
        for (let row = 0; row < QWERTY.length; row++){
            const rowEl = document.querySelector(`#keyboard-row-${row}`);
            if (row == 2) {
                const delBtn = document.createElement("button");
                delBtn.textContent = "Del";
                delBtn.id = "del-key";
                delBtn.classList.add("key");
                delBtn.addEventListener("click", () => {
                    this.deleteLastLetter();
                    document.activeElement.blur();
                });
                delBtn.tabIndex = "-1";
                rowEl.appendChild(delBtn);
            }
            for (let letter of QWERTY[row]) {
                const charBtn = document.createElement("button");
                charBtn.textContent = letter;
                charBtn.id = `${letter}-key`
                charBtn.classList.add("key");
                charBtn.addEventListener("click", () => {
                    this.addLetter(letter);
                    document.activeElement.blur();
                });
                charBtn.tabIndex = "-1";
                rowEl.appendChild(charBtn);
            }
            if (row == 2){
                const enterBtn = document.createElement("button");
                enterBtn.textContent = "Enter";
                enterBtn.id = "enter-key";
                enterBtn.classList.add("key");
                enterBtn.addEventListener("click", () => {
                    this.enterAndMatchWord();
                    document.activeElement.blur();
                });
                enterBtn.tabIndex = "-1";
                rowEl.appendChild(enterBtn);
            }
        }
    }

    keyboardHandler(event) {        
        const pressedKey = event.key;
        if (pressedKey == "Backspace" || pressedKey == "Delete") {
            this.deleteLastLetter();
        } else if (pressedKey == "Enter" || pressedKey == "Return") {
            this.enterAndMatchWord();
        } else if (/^[a-zA-Z]$/.test(pressedKey)){
            this.addLetter(pressedKey.toUpperCase());
        }
    }

    addLetter(letter) {
        if (!this.state.isActive) return;
        this.hideErrorMessage();

        if (this.charPosRow < this.maxGuesses && this.charPosCol < this.wordLength) {
            this.boards.forEach(board => board.addLetter(letter));
            this.currentGuess += letter;
            this.charPosCol++;

            if (this.charPosCol == this.wordLength) {
                this.isCurrentGuessValid = this.isWordValid(this.currentGuess);    
                // If word has enough letters and is invalid (i.e. not in word list), display word in red.
                this.displayStyleByValidity(this.isCurrentGuessValid);
            } else if (this.charPosCol < this.wordLength) {
                // If the guess is too short, it is not valid anyway, but no need to display it as invalid.
                this.isCurrentGuessValid = false;
            }
        }
    }

    deleteLastLetter() {
        if (!this.state.isActive || this.charPosCol === 0) return;
        this.hideErrorMessage();
        
        this.charPosCol--;
        this.boards.forEach(board => board.deleteLastLetter());

        this.currentGuess = this.currentGuess.slice(0, this.charPosCol);
        this.isCurrentGuessValid = false;
        
        // If we delete last letter, the guess is going to be too short but we can display it as normal.
        this.displayStyleByValidity(true);
        
    }

    enterAndMatchWord() {
        if (!this.state.isActive) return;
        this.hideErrorMessage();

        if (!this.isCurrentGuessValid) {
            this.displayErrorMessage();
            return;
        }

        this.enterWord();
        this.matchWord();
    }

    enterWord() {
        if (!this.state.isActive) return;

        this.guesses = [...this.guesses, this.currentGuess];
        this.boards[0].guesses = [...this.boards[0].guesses, this.currentGuess];
        this.boards[1].guesses = [...this.boards[1].guesses, this.currentGuess];
        this.lastGuess = this.currentGuess;
        this.currentGuess = "";
        this.charPosRow++;
        this.charPosCol = 0;
        this.boards.forEach(board => {
            board.charPosRow++;
            board.charPosCol = 0;
        })
        this.isCurrentGuessValid = false;

    }

    isWordValid(word) {
        return this.possibleGuesses.includes(word);
    }

    displayStyleByValidity(isValid) {
        const currentRows = [document.querySelector(`#board-row-0-${this.charPosRow}`),
                            document.querySelector(`#board-row-1-${this.charPosRow}`)];
        
        if(isValid) currentRows.forEach(row => row.classList.remove("invalid-word"))
            else currentRows.forEach(row => row.classList.add("invalid-word"));
    }

    displayErrorMessage() {
        const errorBoxEl = document.querySelector("#error-box");
        if (this.currentGuess.length < this.wordLength) {
            const numOfLettersMissing = this.wordLength - this.currentGuess.length;
            const plural = numOfLettersMissing > 1 ? "s" : "";
            errorBoxEl.textContent = `${numOfLettersMissing} letter${plural} missing`;
        } else {
            errorBoxEl.textContent = "Word not found";
        }
        clearTimeout(stopErrorDisplay);
        errorBoxEl.style.visibility = "visible";
        errorBoxEl.style.opacity = "1";
        stopErrorDisplay = setTimeout(() => this.hideErrorMessage(), 2500);
    }

    hideErrorMessage() {
        const errorBoxEl = document.querySelector("#error-box");
        errorBoxEl.style.visibility = "hidden";
        errorBoxEl.style.opacity = "0";
        clearTimeout(stopErrorDisplay);
    }

    matchWord() {
        if (!this.state.isActive) return;

        let renderAllLetters = false;

        this.boards.forEach(board => {
            board.matchWord(this.lastGuess);
            board.displayStyleByMatch();
            if (board.state.hasWon) {
                board.state.isActive = false;
                this.unifyKeyboard(board.side);
                renderAllLetters = true;
            }
        });
                
        this.renderKeyboardStyle(renderAllLetters);

        if (this.boards.every(board => board.state.hasWon)) {
            this.state = {...this.state, hasWon: true, isActive: false};
            this.endGame();
        } else if (this.guesses.length === this.maxGuesses && !this.state.hasWon) {
            this.state = {...this.state, hasLost: true, isActive: false};
            this.endGame();
        }
    }

    endGame() {
        this.clearKeyboardStyle();        
        this.storeGameResult();
        this.displayEndGameMessage();
    }

    // Should only be called after the game has ended.
    storeGameResult() {
        let results = JSON.parse(localStorage.getItem("gameResults") || "{}");
        let thisLengthResults = results[`wordLength-${this.wordLength}`] || {};
        const gameResult = this.state.hasLost ? "Lost" : this.guesses.length;
        thisLengthResults = {...thisLengthResults, [gameResult]: (thisLengthResults[gameResult] || 0) + 1};
        results = {...results, [`wordLength-${this.wordLength}`]: thisLengthResults};
        localStorage.setItem("gameResults", JSON.stringify(results));
    }
    
    unifyKeyboard(boardSideToEliminate) {
        // Assign 0 if boardSideToEliminate is 1, 1 if it's 0.
        const boardSideToTakeOver = Number(!boardSideToEliminate);
        this.boards[boardSideToEliminate].keyboardUpdater = 
            this.boards[boardSideToTakeOver].keyboardUpdater;
    }

    renderKeyboardStyle(renderAll = false) {
        const leftUpdater = this.boards[0].keyboardUpdater;
        const rightUpdater = this.boards[1].keyboardUpdater;
        let lettersToRender;

        if (renderAll) {
            lettersToRender = this.guesses.join("").split("");
        } else {
            lettersToRender = this.lastGuess.split("");
        }

        lettersToRender.forEach(letter => {
            const letterKeyEl = document.querySelector(`#${letter}-key`);
            const newKeyBackground = `linear-gradient(to right,
                var(--${leftUpdater[letter]}-key) 0%,
                var(--${leftUpdater[letter]}-key) 50%,
                var(--${rightUpdater[letter]}-key) 50%,
                var(--${rightUpdater[letter]}-key) 100%)`;
            letterKeyEl.style.background = newKeyBackground;
        })
    }

    clearKeyboardStyle() {
        const lettersToRender = QWERTY.join("").split("");
        lettersToRender.forEach(letter => {
            const letterKeyEl = document.querySelector(`#${letter}-key`);
            letterKeyEl.style.background = "var(--undefined-key)";
        })
    }

    displayEndGameMessage() {
        const messageDivEl = document.querySelector("#message-box");
        const closeBtnEl = document.querySelector("#close-btn");
        closeBtnEl.addEventListener("click", playNewGame);
        const mainEl = document.querySelector("main");
        mainEl.addEventListener("click", () => messageDivEl.style.display = "none");
        const dynamicMessage = document.querySelector("#dynamic-message");
        const sliderBtnCtnr = document.createElement("div");
        sliderBtnCtnr.className = "slider-button-container";
        const lengthSlider = getLengthSlider();
        sliderBtnCtnr.append(lengthSlider, getPlayButton("Play again"));
        dynamicMessage.append(getEndGameHeader(this.state.hasWon),
                              this.revealMagicWords(),
                              getPlayButton("Play again"),
                              this.getEndGameMessage(),
                              this.getStatsHistogram(),
                              sliderBtnCtnr
        );
        lengthSlider.onchange = () => {
            updateSliderText();
            this.updateStatsDisplay();
        }
        setTimeout(() => {
            messageDivEl.style.display = "block";
            document.querySelectorAll(".play-btn")[0].focus();
            messageDivEl.scrollTo(0, 0);
        }, 2500);
    }

    revealMagicWords() {
        // if (!this.state.hasLost) return "";
        const wordsRevealEl = document.createElement("p");
        wordsRevealEl.className = "magic-words-reveal";
        const [word_0, word_1] = this.gameMagicWords.map(word => word.toLowerCase());
        const dictionaryUrl = "https://www.dictionary.com/browse/";
        wordsRevealEl.innerHTML = 
            `The words were <a target="blank" title="Look up '${word_0}' on Dictionary.com"
            href="${dictionaryUrl}${word_0}">${word_0.toUpperCase()}</a> and
            <a target="blank" title="Look up '${word_1}' on Dictionary.com" 
            href="${dictionaryUrl}${word_1}">${word_1.toUpperCase()}</a>`;
        return wordsRevealEl;
    }

    getStatsHistogram(wordLength=null, maxGuesses=null) {
        if (!wordLength) wordLength = this.wordLength;
        if (!maxGuesses) maxGuesses = this.maxGuesses;
        const gameStats = JSON.parse(localStorage.getItem("gameResults"));
        const thisLengthStats = gameStats[`wordLength-${wordLength}`] || {};
        const barToHighlight = this.state.isActive 
            ? null : wordLength !== this.wordLength 
                ? null : this.state.hasWon
                    ? this.guesses.length : "Lost";
        const xRange = [...Array.from(Array(maxGuesses - 1).keys()).map(num => num + 2), "Lost"];
        const histogram = createHistogram(thisLengthStats, "Number of guesses", barToHighlight, xRange);
        return histogram;
    }

    getEndGameMessage(wordLength=null) {
        if (!wordLength) wordLength = this.wordLength;
        const subHeader = document.createElement("h2");
        subHeader.textContent = "Your statistics:";
        const gameStats = this.getGameStatsHtml(wordLength);
        const messageTextEl = document.createElement("div");
        messageTextEl.id = "message-text";
        messageTextEl.append(subHeader, gameStats);
        return messageTextEl;
    }

    getGameStatsHtml(wordLength=null) {
        if (!wordLength) wordLength = this.wordLength;
        const gameStats = JSON.parse(localStorage.getItem("gameResults"));
        const thisLengthStats = gameStats[`wordLength-${wordLength}`] || {};
        const totalGames = Object.values(thisLengthStats).reduce((total, num) => total + num, 0);
        const gamesWon = totalGames - (thisLengthStats["Lost"] || 0);
        // For averageScore, a lost game is calculated as one more than the maximum guesses
        const lostGameValue = this.maxGuesses + 1;
        // If games have been played at this.wordLength, calculate the average score, else "N/A"
        let averageScore = totalGames
            ? (Object.entries(thisLengthStats).reduce((total, [guesses, num]) => 
            guesses === "Lost"
                ? total + (lostGameValue * num)
                : total + (guesses * num),
            0) / totalGames).toFixed(2)
            : "N/A";
        let statsMessage = `<div class="stats-text">
                                <div class="stats-bit">Total games: ${totalGames}</div>
                                <div class="stats-bit">Average: ${averageScore}</div>
                            </div>`;
        let successRate = totalGames ? (gamesWon / totalGames * 100).toFixed(2) + "%" : "N/A";
        statsMessage += `<div id="success-line">Success rate: ${successRate}</div>`;
        const statsEl = document.createElement("div");
        statsEl.id = "stats";
        statsEl.innerHTML = statsMessage;
        return statsEl;
    }
    
    updateStatsDisplay() {
        const lengthSlider = document.querySelectorAll(".length-slider")[0];
        const oldChart = document.querySelectorAll(".chart-box")[0];
        const oldChartParent = oldChart.parentNode;
        const wordLength = Number(lengthSlider.value);
        const maxGuesses = getMaxGuesses(wordLength);
        oldChartParent.replaceChild(this.getStatsHistogram(wordLength, maxGuesses), oldChart);
        const messageTextEl = document.querySelector("#message-text");
        const messageTextParent = messageTextEl.parentNode;
        messageTextParent.replaceChild(this.getEndGameMessage(Number(lengthSlider.value)), messageTextEl);
    }

}

class Board {
    constructor(side, magicWord, wordLength, maxGuesses) {
        this.side = side;
        this.wordLength = wordLength;
        this.maxGuesses = maxGuesses;
        this.magicWord = magicWord;
        this.guesses = [];
        this.keyboardUpdater = {};
        this.state = {
            hasWon: false,
            isActive: true
        };
        this.charPosRow = 0;
        this.charPosCol = 0;
        this.lastMatch = [];
    }

    createBoxes() {
        const board = document.querySelector(`#board-${this.side}`);
        let boardContent = "";
    
        for (let row = 0; row < this.maxGuesses; row++) {
            boardContent += `<div class="board-row" id="board-row-${this.side}-${row}">`;
            for (let column = 0; column < this.wordLength; column++) {
                boardContent += `<div class="box" id="box-${this.side}-${row}-${column}"></div>`;
            }
            boardContent += `</div>`;
        }
    
        board.innerHTML = boardContent;
    }

    addLetter(letter) {
        if (!this.state.isActive) return;
        
        const currentBox = document.querySelector(`#box-${this.side}-${this.charPosRow}-${this.charPosCol}`);
        currentBox.textContent = letter;

        this.charPosCol++;
    }

    deleteLastLetter() {
        if (!this.state.isActive) return;

        this.charPosCol--;

        const currentBox = document.querySelector(`#box-${this.side}-${this.charPosRow}-${this.charPosCol}`);
        currentBox.textContent = "";
    }

    matchWord(guess) {
        if (!this.state.isActive) return;

        if (this.magicWord === guess) {
            this.state.hasWon = true;
            this.lastMatch = Array.from({length: this.wordLength}, () => "perfect");
            guess.split("").forEach(letter => this.keyboardUpdater[letter] = "perfect");
            this.state = {...this.state, hasWon: true};
            this.applyWinCssTransition();
            return;
        }
        
        // If the guess is not identical to the magic word:
        // initialization
        this.lastMatch = Array.from({length: this.wordLength}, () => "excluded");
        const letterCounter = {};
        
        for (const letter of this.magicWord) {
            letterCounter[letter] = (letterCounter[letter] || 0) + 1;
        }

        for (let i = 0; i < this.wordLength; i++) {
            const currentLetter = guess[i];

            if (currentLetter === this.magicWord[i]){
                this.lastMatch[i] = "perfect";                
                letterCounter[currentLetter] -= 1;                
                this.keyboardUpdater[currentLetter] = "perfect";
            } else if (!(this.magicWord.includes(currentLetter))) {
                this.lastMatch[i] = "excluded";
                this.keyboardUpdater[currentLetter] = "excluded";
            }
        }

        for (let i = 0; i < this.wordLength; i++) {
            const currentLetter = guess[i];

            if ((this.magicWord.includes(guess[i])) && this.lastMatch[i] != "perfect") {
                if (letterCounter[guess[i]] > 0) {
                    this.lastMatch[i] = "imperfect";
                    letterCounter[guess[i]] -= 1;

                    this.keyboardUpdater[currentLetter] =
                        this.keyboardUpdater[currentLetter] === "perfect" ? "perfect" : "imperfect";

                } else {
                    this.lastMatch[i] = "excluded";
                }
            }
        }
    }

    applyWinCssTransition() {
        const lastRowEl = document.querySelector(`#board-row-${this.side}-${this.charPosRow - 1}`);
        lastRowEl.style.transition += "background-color 1s ease, transform 1s ease";
    }

    displayStyleByMatch() {
        if (!this.state.isActive) return;

        const currentRowEl = document.querySelector(`#board-row-${this.side}-${this.charPosRow - 1}`);
        const boxesOfCurrentRow = currentRowEl.querySelectorAll("*");
        boxesOfCurrentRow.forEach((box, position) => {
            box.classList.add(this.lastMatch[position]);
        });
    }
}

// currently unused
// function getRandomElFromArray(arr) {
//     const index = Math.floor(Math.random() * arr.length);
//     return arr[index];
// }

// returns an array
async function getWordsFromTextFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.text();
        return data.split("\r\n");
    } catch (error) {
        throw new Error(error);
    }
}

function restoreOriginalHtml() {
    document.open();
    document.write(originalHtml);
    document.close();
}

function getEndGameHeader(hasWon) {
    const header = document.createElement("h1");
    header.textContent = hasWon ? "You win!" : "Better luck next time!";
    header.className = hasWon ? "win-header" : "lost-header";
    return header;
}

function getPlayButton(text) {
    const playButton = document.createElement("button");
    playButton.setAttribute("class", "play-btn");
    playButton.setAttribute("type", "button");
    playButton.textContent = text;    
    playButton.onclick = () => {
        const lengthSlider = document.querySelectorAll(".length-slider")[0];
        localStorage.setItem("wordLength", lengthSlider.value);
        restoreOriginalHtml();
        main();
    };
    return playButton;
}

function getLengthSlider() {
    const lengthSlider = document.createElement("input");
    lengthSlider.type = "range";
    lengthSlider.className = "length-slider";
    lengthSlider.min = MIN_WORD_LENGTH;
    lengthSlider.max = MAX_WORD_LENGTH;
    lengthSlider.value = localStorage.getItem("wordLength") || DEFAULT_WORD_LENGTH;
    const sliderText = document.createElement("div");
    sliderText.className = "slider-text";
    sliderText.textContent = `${LENGTH_SLIDER_TEXT}: ${lengthSlider.value}`;
    const container = document.createElement("div");
    container.id = "slider-container";
    container.append(sliderText, lengthSlider);
    return container;
}

function updateSliderText() {
    const sliderText = document.querySelectorAll(".slider-text")[0];
    const lengthSlider = document.querySelectorAll(".length-slider")[0];
    sliderText.textContent = `${LENGTH_SLIDER_TEXT}: ${lengthSlider.value}`;
}

function renderColorScheme() {
    const colorScheme = localStorage.getItem("colorScheme") || "default";
    localStorage.setItem("colorScheme", colorScheme);
    const colorSelectOptionEls = document.querySelector("#color-select").children;    
    Array.from(colorSelectOptionEls).forEach(option => {
        if (option.id === `${colorScheme}-option`) {
            option.setAttribute("selected", "");
        } else {
            option.removeAttribute("selected");
        }
    });
    document.documentElement.className = colorScheme;
}

function setColorScheme() {
    const selectedColorScheme = document.querySelector("#color-select").value;
    document.documentElement.className = selectedColorScheme;
    localStorage.setItem("colorScheme", selectedColorScheme);
    this.blur();
}

function playNewGame() {
    const lengthSlider = document.querySelectorAll(".length-slider")[0];
    localStorage.setItem("wordLength", lengthSlider.value);
    restoreOriginalHtml();
    document.querySelector("#message-box").style.display = "none";
    main();
}

async function displayWelcome() {
    document.querySelector("#color-select").addEventListener("change", setColorScheme);
    renderColorScheme();
    const welcomeHeader = document.createElement("h1");
    welcomeHeader.textContent = "Welcome to Duordle";
    const closeBtnEl = document.querySelector("#close-btn");
    closeBtnEl.addEventListener("click", playNewGame);
    const sliderBtnCtnr = document.createElement("div");
    sliderBtnCtnr.className = "slider-button-container";
    const sliderCtnr = getLengthSlider();
    sliderBtnCtnr.append(sliderCtnr, getPlayButton("Start playing!"));
    const welcomeTextEl = document.createElement("div");
    welcomeTextEl.className = "align-left";
    welcomeTextEl.innerHTML = WELCOME_TEXT;

    const dynamicMessage = document.querySelector("#dynamic-message");
    dynamicMessage.append(welcomeHeader,
                          sliderBtnCtnr,
                          welcomeTextEl,
    );
    const lengthSlider = document.querySelector(".length-slider");
    const wordLength = lengthSlider.value;
    dynamicMessage.append(await getExamples(wordLength));
    lengthSlider.onchange = () => {
        updateSliderText();
        const oldExamples = document.querySelector(".examples-container");
        getExamples(lengthSlider.value).then(newExamples => {
            oldExamples.parentNode.replaceChild(newExamples, oldExamples);
        });
    }
    document.querySelector("#message-box").style.display = "block";
}

async function getExamples(wordLength) {
    if (!document.querySelector(".length-slider")) {
        console.error("No slider found in the DOM");
        return
    }
    const examples = [await createExampleRow(wordLength, "perfect"),
                      await createExampleRow(wordLength, "imperfect"),
                      await createExampleRow(wordLength)
    ];
    const examplesCtnr = document.createElement("div");
    examplesCtnr.className = "examples-container";
    examplesCtnr.append(...examples);
    return examplesCtnr;
}

async function createExampleRow(wordLength, highlightCategory="excluded") {
    const word = await getRandomWord(wordLength);
    const boardRow = document.createElement("div");
    boardRow.classList.add("board-row", "sample-row");
    const boxToHighlight = Math.floor(Math.random() * wordLength);
    for (let i = 0; i < wordLength; i++) {
        const box = document.createElement("div");
        const match = i === boxToHighlight ? highlightCategory : "excluded";
        box.classList.add("box", match);
        box.textContent = word[i];
        boardRow.appendChild(box);
    }
    const explanationDiv = document.createElement("div");
    explanationDiv.className = "example";
    explanationDiv.textContent = highlightCategory === "excluded"
        ? `The secret word does not contain any of the letters in '${word}'.`
            : highlightCategory === "perfect" 
            ? `The letter ${word[boxToHighlight]} is in the right place.`
                : `The letter ${word[boxToHighlight]} exists in the secret word, but not as the ${ordinalNums[boxToHighlight + 1]} letter.`;
    // boardRow.appendChild(explanationDiv);
    const exampleCtnr = document.createElement("div");
    exampleCtnr.className = "example-container";
    exampleCtnr.append(boardRow, explanationDiv);
    return exampleCtnr;
}

async function main() {
    renderColorScheme();
    const wordLength = localStorage.getItem("wordLength") || DEFAULT_WORD_LENGTH;
    const game = await Game.createGame(wordLength);
    if (!game) main();
    console.log(game.boards[0].magicWord);
    console.log(game.boards[1].magicWord);
    document.querySelector("#color-select").addEventListener("change", setColorScheme);
    window.addEventListener("keydown", (e) => {game.keyboardHandler(e)});
    game.createScreenKeyboard();
    game.createBoxes();
}

displayWelcome();


// function rgb(red, green, blue) {
//     if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
//         console.error("Invalid RGB value");
//         return null;
//     }
//     return `rgb(${red}, ${green}, ${blue})`;
// }