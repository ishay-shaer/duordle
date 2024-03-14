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
// TODO (DONE - but unused) Download Plotly and use the file directly in the HTML head.
// TODO (DONE) Plot it
// TODO (DONE) Understand why scrollTo in displayEndGameMessage is not working - is it the focus on the button?
// TODO (DONE) Make available in 4, 5 or 6-letter words and let user choose on welcome screen.
// TODO (DONE) Make color-scheme select element work while welcome screen is showing
// TODO (DONE) Fix stats and histogram display for word lengths that have not been played yet (NaN)
// TODO (DONE) Style the length slider
// TODO (DONE - on end game message) Add links from guesses to their respective dictionary.com page
// TODO (DONE) Create welcome message and display it in the message box.
// TODO (DONE) Replace all createElement instances with the el function from getElement.js
// TODO (DONE) Every time a game is played, add magic words to an array in localStorage of max size 50? to avoid them in following games.
// TODO (DONE) Add a menu with help (welcome), give up, see stats
// TODO (DONE) Put all timeouts in a timeouts object
// TODO (DONE) Store current game in localStorage and load it when page is reloaded

// TODO Focus on play button on welcome screen
// TODO Create a handler function for menu items
// TODO Fix CSS for stats in the end-game message
// TODO Organize files into folders
// TODO Correct alphaSimilarity in 4-letter words to be of max 2 ?
// TODO Put menuItem() and its associated stuff in a seperate module
// TODO Improve word data with datamuse
// TODO Arrange all or most addEventListener's in one function
// TODO Add a favicon to the title
// TODO Make success line look cool
// TODO Add confetti effect when game has been won

"use strict";

import createHistogram from "./histogram.js";
import { getRandomRelatedWords, getRandomWord } from "./getRelatedWords.js";
import { el, menuItem, textToLowerDashed, getSiblings } from "./createElement.js";

const originalMainEl = document.querySelector("main").innerHTML;
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 6;
const DEFAULT_WORD_LENGTH = 5;
const timeouts = {};
const ERROR_DELAY = 2500;
const MESSAGE_BOX_DELAY = 2000;
const ordinalNums = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth"};
const MAX_WORD_HOLD = 50;
const getMaxGuesses = wordLength => wordLength > 5 ? 8 : 7;
let game = null;
const menuObj = {};

const WELCOME_PATH = "./welcome.txt";
const ABOUT_PATH = "./about.html";

class Game {
    constructor([word_0, word_1], possibleGuesses, oldGameGuesses) {
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
        this.oldGameGuesses = oldGameGuesses;
        this.lastGuess = "";
        this.deleteLastLetter = this.deleteLastLetter.bind(this);
        this.addLetter = this.addLetter.bind(this);
        this.enterAndMatchWord = this.enterAndMatchWord.bind(this);
        this.storeCurrentGame = this.storeCurrentGame.bind(this);
    }

    static async createGame(wordLength) {
        // Implementing a queue to avoid repeating words
        const oldGame = getOldGame(wordLength);
        let magicWords, oldGameGuesses;
        if (oldGame) {
            magicWords = oldGame.gameMagicWords;
            oldGameGuesses = oldGame.guesses;
        } else {
            let previousWords = localStorage.getItem("previousWords") || "[]";
            previousWords = JSON.parse(previousWords);
            do magicWords = await getRandomRelatedWords(wordLength)
                while (previousWords.includes(magicWords[0]) || previousWords.includes(magicWords[1]));
            previousWords = [...previousWords, ...magicWords];
            if (previousWords.length > MAX_WORD_HOLD)
                previousWords = previousWords.slice(-MAX_WORD_HOLD);
            localStorage.setItem("previousWords", JSON.stringify(previousWords));
            oldGameGuesses = null;
        }
        let possibleGuesses = await getPossibleGuesses(wordLength, magicWords);
        // let possibleGuesses = await getWordsFromTextFile(guessesFilePath);        
        // Adding game words to possibleGuesses in case they are not already included
        // Remove after running a script to add all words from the data into the words list
        return new Game(magicWords, possibleGuesses, oldGameGuesses);
    }

    createBoxes() {
        this.boards.forEach(board => board.createBoxes());
    }
    
    createKeyboardKey(keyText, keyFunc=this.addLetter) {
        return el("button", {
            class: "key",
            id: `${keyText}-key`,
            textContent: keyText,
            tabIndex: "-1",
            click: () => {
                keyFunc(keyText);
                document.activeElement.blur();
            }
        });
    }

    createScreenKeyboard() {
        const keyboardEl = el("div", { id: "keyboard" });
        for (let row = 0; row < QWERTY.length; row++){
            const rowEl = el("div", { class: "keyboard-row", id: `keyboard-row-${row}` });
            if (row == 2) {
                rowEl.appendChild(this.createKeyboardKey("Del", this.deleteLastLetter));
            }
            for (let letter of QWERTY[row]) {
                rowEl.appendChild(this.createKeyboardKey(letter));
            }
            if (row == 2){
                rowEl.appendChild(this.createKeyboardKey("Enter", this.enterAndMatchWord));
            }
            keyboardEl.appendChild(rowEl);
        }
        document.querySelector("#boards-container").appendChild(keyboardEl);
    }

    storeCurrentGame() {
        // Destructuring and assigning const variables to properties of the game that's currently active
        const {wordLength, gameMagicWords, guesses} = this;
        const currentGame = {gameMagicWords, guesses};
        const currentGames = JSON.parse(localStorage.getItem("currentGames") || "{}");
        currentGames[`${wordLength}-letters`] = currentGame;
        localStorage.setItem("currentGames", JSON.stringify(currentGames));
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

    renderOldGuesses() {
        if (!this.oldGameGuesses) return;
        this.oldGameGuesses.forEach(guess => {
            for (const letter of guess) {
                this.addLetter(letter);
            }
            this.enterWord();
            this.matchWord();
        });
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
        if (this.state.isActive) this.storeCurrentGame();
    }

    enterWord() {
        if (!this.state.isActive) return;
        // if (!this.state.isRenderingOldGame) {
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
        if(isValid) currentRows.forEach(boardRow => {boardRow.classList.remove("invalid-word")})
        else currentRows.forEach(boardRow => {boardRow.classList.add("invalid-word")});
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
        clearTimeout(timeouts.hideError);
        errorBoxEl.style.visibility = "visible";
        errorBoxEl.style.opacity = "1";
        timeouts.hideError = setTimeout(() => {this.hideErrorMessage()}, ERROR_DELAY);
    }

    hideErrorMessage() {
        const errorBoxEl = document.querySelector("#error-box");
        errorBoxEl.style.visibility = "hidden";
        errorBoxEl.style.opacity = "0";
        clearTimeout(timeouts.hideError);
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

    giveUp() {
        this.state = {...this.state, hasLost: true, isActive: false};
        this.endGame();
        clearTimeout(timeouts.showMessageBox);
        displayMessageBox();
    }

    endGame() {
        this.removeGameFromLocalStorage();
        this.clearKeyboardStyle();
        this.storeGameResult();
        this.displayEndGameMessage();
        disableMenuItem(document.querySelector("#menu-item-give-up"));
        const playNewGameItems = document.querySelector("#menu-items-play-a-new-game");
        Array.from(playNewGameItems.children).forEach(option => {enableMenuItem(option)});
    }

    removeGameFromLocalStorage() {
        let oldGames = localStorage.getItem("currentGames");        
        if (!oldGames) throw new Error("currentGames not found on localStorage");
        oldGames = JSON.parse(oldGames);
        const updatedOldGames = Object.keys(oldGames).reduce((acc, key) => {
            if (key !== `${this.wordLength}-letters`) acc[key] = oldGames[key];
            return acc;
        }, {});
        localStorage.setItem("currentGames", JSON.stringify(updatedOldGames));
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
        });
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
        closeBtnEl.onclick = () => messageDivEl.style.display = "none";
        const mainEl = document.querySelector("main");
        mainEl.onclick = () => messageDivEl.style.display = "none";
        const dynamicMessage = document.querySelector("#dynamic-message");
        dynamicMessage.innerHTML = "";
        const sliderBtnCtnr = getSliderBtnCtnr();
        dynamicMessage.append(
            getEndGameHeader(this.state.hasWon),
            this.revealMagicWords(),
            getPlayButton(),
            el("h2", {textContent: "Your Statistics"}),
            this.getEndGameMessage(),
            this.getStatsHistogram(),
            sliderBtnCtnr
        );
        const lengthSlider = document.querySelector(".length-slider");
        lengthSlider.onchange = () => {
            updateBySliderVal();
            this.updateStatsDisplay();
        }
        timeouts.showMessageBox = setTimeout(displayMessageBox, MESSAGE_BOX_DELAY);
    }

    revealMagicWords() {
        const [word_0, word_1] = this.gameMagicWords.map(word => word.toLowerCase());
        const thesaurusUrl = "https://thesaurus.plus/related/";
        return el("p", {
            class: "magic-words-reveal",
            innerHTML: `The duo was
            <a target="blank" title="Click to see how '${word_0}' and '${word_1}' are related"
            href="${thesaurusUrl}${word_0}/${word_1}">
                ${word_0.toUpperCase()} and ${word_1.toUpperCase()}
            </a>`
        });
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
        const subHeader = el("h2", { textContent: "Your Statistics" });
        const gameStats = getGameStatsEl(wordLength);
        return el("div", {id: "stats-text", children: [gameStats]});
    }
    
    updateStatsDisplay() {
        const oldChart = document.querySelectorAll(".chart-box")[0];
        const wordLength = Number(localStorage.getItem("wordLength"));
        const maxGuesses = getMaxGuesses(wordLength);
        oldChart.replaceWith(this.getStatsHistogram(wordLength, maxGuesses));
        const statsTextEl = document.querySelector("#stats-text");
        statsTextEl.replaceWith(this.getEndGameMessage(wordLength));
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
        for (let row = 0; row < this.maxGuesses; row++) {
            const boardRow = el("div", {class: "board-row", id: `board-row-${this.side}-${row}`});
            for (let column = 0; column < this.wordLength; column++) {
                boardRow.appendChild(el("div", {class: "box", id: `box-${this.side}-${row}-${column}`}));
            }
            board.appendChild(boardRow);            
        }
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
        const [side, row] = [this.side, this.charPosRow - 1];
        for (let col = 0; col < this.wordLength; col++) {
            const winBox = document.querySelector(`#box-${side}-${row}-${col}`);
            winBox.style.transition = `background-color .25s ${col * .25 + .25}s ease-in,
                                       transform .5s ${col * .25}s ease-in`;
        }
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

async function getTextfromFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return await response.text();
    } catch (err) {
        console.error(err);
    }
}

async function getWordsFromTextFile(filePath) {
    const text = await getTextfromFile(filePath);
    return text.split("\r\n");
}

async function getPossibleGuesses(wordLength, magicWords) {
    const guessesFilePath = `./words_${wordLength}_letters.txt`;
    let possibleGuesses = await getWordsFromTextFile(guessesFilePath);
    // Adding game words to possibleGuesses in case they are not already included
    // Remove after running a script to add all words from the data into the words list
    // const [word_0, word_1] = magicWords;
    return [...new Set([...possibleGuesses, ...magicWords])];
}

function getOldGame(wordLength) {
    const oldGames = localStorage.getItem("currentGames");
    if (!oldGames) return null;
    const oldGame = JSON.parse(oldGames)[`${wordLength}-letters`];
    // if (!oldGame) return null;
    return oldGame;
}

function clearScreen() {
    document.querySelector("main").innerHTML = originalMainEl;
    document.querySelector("#message-box").style.display = "none";
}

function displayMessageBox() {
    const messageDivEl = document.querySelector("#message-box");
    messageDivEl.style.display = "block";
    document.querySelectorAll(".play-btn")[0].focus();
    messageDivEl.scrollTo(0, 0);
}

function getEndGameHeader(hasWon) {
    return el("h1", {
        class: hasWon ? "win-header" : "lost-header",
        textContent: hasWon ? "You win!" : "You lost!"
    });
}

function getPlayButton(newGame=true) {
    const buttonText = newGame ? "Play now" : "Continue playing";
    const playButton = el("button", { class: "play-btn", type: "button", textContent: buttonText });
    playButton.onclick = newGame
        ? playNewGame
        : () => {
            document.querySelector("#message-box").style.display = "none";
        }
    return playButton;
}

function getLengthSlider(isolate=false) {
    const lengthSlider = el("input", {
        type: "range",
        class: "length-slider",
        min: MIN_WORD_LENGTH,
        max: MAX_WORD_LENGTH,
        value: localStorage.getItem("wordLength") || DEFAULT_WORD_LENGTH,
    });
    const sliderText = el("div", {
        class: "slider-text",
        textContent: `${lengthSlider.value} letters`
    });
    const anotherClass = isolate ? "slider-isolate" : null;
    return el("div", {classList: ["slider-container", anotherClass], children: [sliderText, lengthSlider]});
}

function getSliderBtnCtnr() {
    return el("div", {
        class: "slider-button-container", children: [
            getLengthSlider(),
            getPlayButton()
    ]});
}

function getSliderValue() {
    const lengthSlider = document.querySelector(".length-slider");
    if (!lengthSlider) throw new Error("No length slider found on the DOM");
    return lengthSlider.value;
}

function updateBySliderVal(shouldUpdateStorage=true) {
    const sliderText = document.querySelectorAll(".slider-text")[0];
    const lengthSlider = document.querySelectorAll(".length-slider")[0];
    sliderText.textContent = `${lengthSlider.value} letters`;
    if (shouldUpdateStorage) localStorage.setItem("wordLength", lengthSlider.value);
}

function renderColorScheme() {
    const colorScheme = localStorage.getItem("colorScheme") || "default";
    // In case it has not been set:
    localStorage.setItem("colorScheme", colorScheme);
    document.documentElement.className = colorScheme;
}

function playNewGame() {
    const wordLength = localStorage.getItem("wordLength");
    const currentWordLengthItem = document.querySelector(`#menu-item-${"⬜".repeat(wordLength)}`);
    // if (game?.state.isActive && game?.wordLength === localStorage.getItem("wordLength")) return;
    clearScreen();
    main();
    disableMenuItem(currentWordLengthItem);
    getSiblings(currentWordLengthItem).forEach(otherItem => {
        enableMenuItem(otherItem);
    });
    enableMenuItem(document.querySelector("#menu-item-give-up"));
}

async function displayWelcome() {
    renderColorScheme();
    tickColorMenuItem();
    const welcomeHeader = el("h1", {textContent: "Welcome to Duordle"});
    const closeBtnEl = document.querySelector("#close-btn");
    closeBtnEl.onclick = playNewGame;
    const welcomeText = await getTextfromFile(WELCOME_PATH);
    const welcomeTextEl = el("div", {
        class: "align-left",
        children: [el("p", {innerHTML: welcomeText})]
    });
    const dynamicMessage = document.querySelector("#dynamic-message");
    dynamicMessage.innerHTML = "";
    dynamicMessage.append(welcomeHeader, welcomeTextEl);
    const wordLength = Number(localStorage.getItem("wordLength")) || DEFAULT_WORD_LENGTH;
    dynamicMessage.appendChild(getSliderBtnCtnr());
    const lengthSlider = document.querySelector(".length-slider");
    lengthSlider.onchange = () => {
        updateBySliderVal();
        const oldExamples = document.querySelector(".examples-container");
        getExamples(localStorage.getItem("wordLength")).then(newExamples => {
            oldExamples.replaceWith(newExamples);
        });
    }
    dynamicMessage.append(
        await getExamples(wordLength),
        getPlayButton(!game?.state.isActive)
    );
    const messageBox = document.querySelector("#message-box");
    messageBox.style.display = "block";
    messageBox.scrollTo(0, 0);
}

async function getExamples(wordLength) {
    const examples = [await getExampleRow(wordLength, "perfect"),
                      await getExampleRow(wordLength, "imperfect"),
                      await getExampleRow(wordLength)
    ];
    const examplesCtnr = el("div", {class: "examples-container"});
    const examplesHeader = el("h2", { class: "examples-header", textContent: "Examples:" });
    examplesCtnr.append(examplesHeader, ...examples);
    return examplesCtnr;
}

async function getExampleRow(wordLength, highlightCategory="excluded") {
    const word = await getRandomWord(wordLength);
    const boardRow = el("div", {class: "board-row sample-row"});
    const boxToHighlight = Math.floor(Math.random() * wordLength);
    for (let i = 0; i < wordLength; i++) {        
        const match = i === boxToHighlight ? highlightCategory : "excluded";
        const box = el("div", {classList: ["box", match], textContent: word[i]});
        boardRow.appendChild(box);
    }
    const explanationDiv = el("div", {class: "example"});
    explanationDiv.textContent = highlightCategory === "excluded"
        ? `The secret word does not contain any of the letters in '${word}'.`
            : highlightCategory === "perfect" 
            ? `The letter ${word[boxToHighlight]} is in the right place.`
                : `The letter ${word[boxToHighlight]} exists in the secret word, but not as the ${ordinalNums[boxToHighlight + 1]} letter.`;
    const exampleCtnr = el("div", {class: "example-container"});
    exampleCtnr.append(boardRow, explanationDiv);
    return exampleCtnr;
}

function getGameStatsEl(wordLength=null) {
    if (!wordLength) wordLength = DEFAULT_WORD_LENGTH;
    const gameStats = JSON.parse(localStorage.getItem("gameResults"));
    const thisLengthStats = gameStats[`wordLength-${wordLength}`] || {};
    const totalGames = Object.values(thisLengthStats).reduce((total, num) => total + num, 0);
    const gamesWon = totalGames - (thisLengthStats["Lost"] || 0);
    // For averageScore, a lost game is calculated as one more than the maximum guesses
    const lostGameValue = getMaxGuesses(wordLength) + 1;
    // If games have been played at this.wordLength, calculate the average score, else "N/A"
    let averageScore = totalGames
        ? (Object.entries(thisLengthStats).reduce((total, [guesses, num]) => 
        guesses === "Lost"
            ? total + (lostGameValue * num)
            : total + (guesses * num),
        0) / totalGames).toFixed(2)
        : "N/A";
    let successRate = totalGames ? (gamesWon / totalGames * 100).toFixed(2) + "%" : "N/A";
    return el("div", {id: "stats", children: [
        el("div", {id: "stats-text", children: [
            el("div", {class: "stats-bit", textContent: `Total games: ${totalGames}`}),
            el("div", {class: "stats-bit", textContent: `Average: ${averageScore}`})
        ]}),
        el("div", {id: "success-line", textContent: `Success rate: ${successRate}`})
    ] });
}

function displayStats() {
    if (!localStorage.getItem("gameResults")) return;
    const messageBox = document.querySelector("#message-box");
    const closeBtnEl = document.querySelector("#close-btn");
    closeBtnEl.onclick = game?.state ? () => messageBox.style.display = "none" : playNewGame;
    const statsHeader = el("h1", {textContent: "Your statistics"});
    const dynamicMessage = document.querySelector("#dynamic-message");
    const wordLength = Number(localStorage.getItem("wordLength")) || DEFAULT_WORD_LENGTH;
    const maxGuesses = getMaxGuesses(wordLength);
    const xRange = [...Array.from(Array(maxGuesses - 1).keys()).map(num => num + 2), "Lost"];
    const gameStats = JSON.parse(localStorage.getItem("gameResults"));
    const thisLengthStats = gameStats[`wordLength-${wordLength}`] || {};
    const histogram = createHistogram(thisLengthStats, "Number of guesses", null, xRange);
    dynamicMessage.innerHTML = "";
    dynamicMessage.append(
        statsHeader,        
        getGameStatsEl(wordLength),
        getLengthSlider(true),
        histogram,
        getPlayButton(!game?.state.isActive)
    );
    document.querySelector(".length-slider").onchange = () => {
        updateBySliderVal(false);
        const newWordLength = getSliderValue();
        const newLengthStats = gameStats[`wordLength-${newWordLength}`] || {};
        const newMaxGuesses = getMaxGuesses(newWordLength);
        const newXRange = [...Array.from(Array(newMaxGuesses - 1).keys()).map(num => num + 2), "Lost"];
        document.querySelector("#stats").replaceWith(getGameStatsEl(newWordLength));
        document.querySelector(".chart-box").replaceWith(createHistogram(newLengthStats, "Number of guesses", null, newXRange));
    }
    messageBox.style.display = "block";
    messageBox.scrollTo(0, 0);
}

async function displayAbout() {
    const messageBox = document.querySelector("#message-box");
    const closeBtnEl = document.querySelector("#close-btn");
    closeBtnEl.onclick = game?.state ? () => messageBox.style.display = "none" : playNewGame;
    const aboutHeader = el("h1", {textContent: "About Duordle"});
    const aboutText = await getTextfromFile(ABOUT_PATH);
    const aboutTextEl = el("div", {class: "align-left", innerHTML: aboutText});
    const wordLength = Number(localStorage.getItem("wordLength")) || DEFAULT_WORD_LENGTH;
    const examples = await getExamples(wordLength);
    const dynamicMessage = document.querySelector("#dynamic-message");
    dynamicMessage.innerHTML = "";
    dynamicMessage.append(aboutHeader, aboutTextEl, examples, getPlayButton(!game?.state.isActive));    
    messageBox.style.display = "block";
    messageBox.scrollTo(0, 0);
}

function enableMenuItem(menuItem) {
    menuItem.enabled = true;
    menuItem.classList.add("menu-item-enabled");
    menuItem.classList.remove("menu-item-disabled");
}

function disableMenuItem(menuItem) {
    menuItem.enabled = false;
    menuItem.classList.add("menu-item-disabled");
    menuItem.classList.remove("menu-item-enabled");
}

function getNewGameOptions() {
    const newGameOptions = [];
    for (let squaresNum = MIN_WORD_LENGTH; squaresNum <= MAX_WORD_LENGTH; squaresNum++) {
        newGameOptions.push({text: "⬜".repeat(squaresNum)});
    }
    return newGameOptions;
}

function giveUpIfEnabled() {
    if (!this.enabled) return;
    if (game?.state.isActive) game.giveUp();
}

function openMenu() {
    clearTimeout(timeouts.graceEnter);
    clearTimeout(timeouts.graceLeave);
    menuObj.menuItems.classList.add("menu-items-main-expand");
    this.blur();
    this.classList.add("expanded");
}

function preventMenuClose() {
    clearTimeout(timeouts.graceEnter);
    clearTimeout(timeouts.graceLeave);
    menuObj.menuItems.classList.add("menu-items-main-expand");
    menuObj.menuBtn.classList.add("expanded");
}

function closeMenu() {
    timeouts.graceEnter = setTimeout(() => {
        menuObj.menuItems.classList.remove("menu-items-main-expand");            
    }, 1000);
    timeouts.graceLeave = setTimeout(() => {
        menuObj.menuBtn.classList.remove("expanded");
    }, 1700);
}

function tickColorMenuItem() {
    const colorScheme = localStorage.getItem("colorScheme") || "default";
    const colorItem = document.querySelector(`#menu-item-${colorScheme}`);
    if (colorItem.lastChild.textContent !== "✓")
        colorItem.appendChild(el("span", {textContent: "✓"}));
}

function setColorScheme() {
    if (!this.enabled) return;
    if (this.lastChild.textContent !== "✓") {
        const otherOptions = getSiblings(this);
        otherOptions.forEach(option => {
            if (option.lastChild.textContent === "✓") {
                option.lastElementChild.remove();
            }
        });
        this.appendChild(el("span", {textContent: "✓"}));
    }
    localStorage.setItem("colorScheme", textToLowerDashed(this.firstChild.textContent));
    renderColorScheme();
}

function initializeMenu() {
    menuObj.menu = document.querySelector("#menu");
    menuObj.menuBtn = document.querySelector("#menu-btn");
    menuObj.colors = menuItem("Colors", true, [{text: "Default"}, {text: "High contrast"}]);
    menuObj.about = menuItem("About");
    menuObj.about.onclick = displayAbout;
    menuObj.stats = menuItem("Statistics");
    menuObj.stats.onclick = displayStats;
    let newGameOptions = getNewGameOptions();
    menuObj.playNewGame = menuItem("Play a new game", true, newGameOptions);
    menuObj.giveUp = menuItem("Give up", false);
    menuObj.giveUp.onclick = giveUpIfEnabled;
    menuObj.menuItems = document.querySelector("#menu-items-main");
    menuObj.menuItems.append(menuObj.about, menuObj.colors, menuObj.stats, menuObj.playNewGame, menuObj.giveUp);
    menuObj.menuBtn.onclick = openMenu;
    menuObj.menuItems.onmouseenter = preventMenuClose;
    menuObj.menu.onmouseleave = closeMenu;
    document.querySelector("#menu-item-default").onclick = setColorScheme;
    document.querySelector("#menu-item-high-contrast").onclick = setColorScheme;
    for (let i = MIN_WORD_LENGTH; i <= MAX_WORD_LENGTH; i++) {
        document.querySelector(`#menu-item-${"⬜".repeat(i)}`).onclick = () => {
            localStorage.setItem("wordLength", i);
            playNewGame();
        }
    }
}

async function main() {
    // Number(localStorage.getItem("wordLength")) evaluates to 0 if nothing is stored
    const wordLength = Number(localStorage.getItem("wordLength")) || DEFAULT_WORD_LENGTH;
    game = await Game.createGame(wordLength);
    if (!game) main();
    console.log(game.boards[0].magicWord);
    console.log(game.boards[1].magicWord);
    game.createScreenKeyboard();
    game.createBoxes();
    game.renderOldGuesses();
    window.onkeydown = e => {game.keyboardHandler(e)};
}

initializeMenu();
displayWelcome();


// function rgb(red, green, blue) {
//     if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
//         console.error("Invalid RGB value");
//         return null;
//     }
//     return `rgb(${red}, ${green}, ${blue})`;
// }
