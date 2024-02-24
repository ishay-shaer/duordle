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

// TODO 
// TODO Arrange all or most addEventListener's in one function
// TODO Add a favicon to the title
// TODO Create welcome message and display it in the message box.
// TODO Add magic word if not exist into the guesses file instead of each game into the array.
// TODO Every time a game is played, add magic words to an array in localStorage of max size 50? to avoid them in following games.
// TODO Create a "Loading..." message (with some animation?) that will show while fetching word from WordsAPI
// TODO Make available in 4, 5 or 6-letter words and let user choose on welcome screen.
// TODO Add confetti effect when game has been won.

"use strict";

import createHistogram from "./histogram.js";
import getRandomRelatedWords from "./getRelatedWords.js";


const originalHtml = document.documentElement.outerHTML;
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
let stopErrorDisplay; // Used for timeout in the displayErrorMessage function.

class Game {
    constructor([word_0, word_1], possibleGuesses) {
        this.wordLength = word_0.length;
        this.maxGuesses = this.wordLength + 2;
        this.state = {
            hasWon: false,
            hasLost: false,
            isActive: true,
        }
        this.gameMagicWords = [word_0, word_1];
        this.possibleGuesses = possibleGuesses;
        this.boards = [new Board(0, word_0), new Board(1, word_1)];
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
        document.querySelector("#error-box").style.visibility = "hidden";

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

    // refactor: make Board.deleteLastLetter and seperate
    deleteLastLetter() {
        if (!this.state.isActive || this.charPosCol === 0) return;
        document.querySelector("#error-box").style.visibility = "hidden";
        
        this.charPosCol--;
        this.boards.forEach(board => board.deleteLastLetter());

        this.currentGuess = this.currentGuess.slice(0, this.charPosCol);
        this.isCurrentGuessValid = false;
        
        // If we delete last letter, the guess is going to be too short but we can display it as normal.
        this.displayStyleByValidity(true);
        
    }

    enterAndMatchWord() {
        if (!this.state.isActive) return;
        document.querySelector("#error-box").style.visibility = "hidden";

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
            errorBoxEl.textContent = "Word not found"
        }
        clearTimeout(stopErrorDisplay);
        errorBoxEl.style.visibility = "visible";
        errorBoxEl.style.opacity = "1";
        stopErrorDisplay = setTimeout(() => {
            errorBoxEl.style.visibility = "hidden";
            errorBoxEl.style.opacity = "0";
        }, 2500);
    }

    // Game
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
        const storedResultsString = localStorage.getItem("gameResults") || "{}";
        const storedResultsObj = JSON.parse(storedResultsString);
        const gameResult = this.state.hasLost ? "Lost" : this.guesses.length;
        const newResults = {...storedResultsObj, [gameResult]: (storedResultsObj[gameResult] || 0) + 1};

        localStorage.setItem("gameResults", JSON.stringify(newResults));
    }
    
    unifyKeyboard(boardSideToEliminate) {
        const boardSideToTakeOver = Math.abs(boardSideToEliminate - 1);
        this.boards[boardSideToEliminate].keyboardUpdater = 
            this.boards[boardSideToTakeOver].keyboardUpdater;
    }

    renderKeyboardStyle(renderAll = false, ) {
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
        const messageTextEl = document.querySelector("#message-text");
        const reloadBtnEl = document.querySelector("#reload-btn");
        const closeBtnEl = document.querySelector("#close-btn");
        const mainEl = document.querySelector("main");

        reloadBtnEl.addEventListener("click", () => {
            restoreOriginalHtml();
            main();
        })

        closeBtnEl.addEventListener("click", () => messageDivEl.style.display = "none");
        mainEl.addEventListener("click", () => messageDivEl.style.display = "none");

        let message;
        if (this.state.hasWon) {
            message = `<h1 id="win-header">You win!</h1>
                You got it right at guess ${this.guesses.length} out of ${this.maxGuesses}<br>`;
        } else {
            const gameMagicWords = this.boards.map((board) => board.magicWord);
            message = `Better luck next time! <br>
                The words were ${gameMagicWords[0]} and ${gameMagicWords[1]}<br>`;
        }
        
        message += "<h2>Your statistics:</h2>" + this.getGameStatsHtml();

        messageTextEl.innerHTML = message;
        const chartBoxEl = document.createElement("div");
        chartBoxEl.id = "chart-box";
        chartBoxEl.style.height = "250px";
        messageTextEl.appendChild(chartBoxEl);
        const gameStats = JSON.parse(localStorage.getItem("gameResults"));
        const barToHighlight = this.state.hasWon ? this.guesses.length : "Lost";
        const xRange = [...Array.from(Array(this.maxGuesses - 1).keys()).map(num => num + 2), "Lost"];
        createHistogram(chartBoxEl, gameStats, "Number of guesses", barToHighlight, xRange);

        setTimeout(() => {
            messageDivEl.style.display = "block";
            reloadBtnEl.focus();
            messageDivEl.scrollTo(0, 0);
        }, 2500);
    }

    getGameStatsHtml() {
        const gameStats = JSON.parse(localStorage.getItem("gameResults"));
        const totalGames = Object.values(gameStats).reduce((total, num) => total + num, 0);
        const gamesWon = totalGames - (gameStats["Lost"] || 0);
        const averageScore = Object.entries(gameStats).reduce((total, [guesses, num]) => 
            guesses === "Lost" ? total + ((this.maxGuesses + 1) * num) : total + (guesses * num), 0) / totalGames;
        let statsMessage = `Total games: ${totalGames}<br>
                            Average: ${averageScore.toFixed(2)}`; 

        statsMessage += `<br><p id="success-line">Success rate: ${(gamesWon / totalGames * 100).toFixed(2)}%<p>`;

        return `<div id="stats">${statsMessage}</div>`;
    }

}

class Board {
    constructor(side, magicWord) {
        this.wordLength = magicWord.length;
        this.side = side;
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

    // Board
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

// Not currently used
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

function createBoxes(boardSide, wordLength, maxGuesses) {
    const board = document.querySelector(`#board-${boardSide}`);
    let boardContent = "";

    for (let row = 0; row < maxGuesses; row++){
        boardContent += `<div class="board-row board-row-${wordLength}-letters" id="board-row-${boardSide}-${row}">`;
        for (let column=0; column<wordLength; column++){
            boardContent += `<span class="box" id="box-${boardSide}-${row}-${column}"></span>`;
        }
        boardContent += `</div>`;
    }

    board.innerHTML = boardContent;
}

function restoreOriginalHtml() {
    document.open();
    document.write(originalHtml);
    document.close();
}

function renderColorScheme() {
    const colorScheme = localStorage.getItem("colorScheme") || "default";
    const htmlClassList = document.querySelector("html").classList;
    const colorSelectOptionEls = document.querySelector("#color-select").children;
    
    localStorage.setItem("colorScheme", colorScheme);

    Array.from(colorSelectOptionEls).forEach(el => {
        if (el.id === `${colorScheme}-option`) {
            el.setAttribute("selected", "");
        } else {
            el.removeAttribute("selected");
        }
    });

    if (localStorage.getItem("colorScheme") === "high-contrast") {
        htmlClassList.remove("default");
        htmlClassList.add("high-contrast");
    } else {
        htmlClassList.remove("high-contrast");
        htmlClassList.add("default");
    }
}

function setColorScheme() {
    const selectedColorScheme = document.querySelector("#color-select").value;
    const htmlClassList = document.querySelector("html").classList;

    htmlClassList.remove(...htmlClassList);
    htmlClassList.add(selectedColorScheme);
    localStorage.setItem("colorScheme", selectedColorScheme);
    this.blur();
}

// Calculates alphabetic similarity between 2 words of the same length.
// Returns number of letters that are identical and identically positioned in the 2 words
// Not currently used
// function getAlphaSimilarity(word_0, word_1) {
//     if (word_0.length != word_1.length) {
//         throw new Error("Cannot calculate alphabetic similarity of words of different lengths");
//     }
    
//     const numOfLetters = word_0.length;
//     let similarityCounter = 0;
//     for (let i=0; i<numOfLetters; i++) {
//         if (word_0[i] === word_1[i]) {
//             similarityCounter++;
//         }
//     }
//     return similarityCounter;
// }

async function main() {
    let wordLength = window.prompt("Enter word length (4-6)");
    if (!wordLength) wordLength = 5;
    const game = await Game.createGame(wordLength);
    if (!game) main();
    console.log(game.boards[0].magicWord);
    console.log(game.boards[1].magicWord);
    document.querySelector("#color-select").addEventListener("change", setColorScheme);
    renderColorScheme();
    window.addEventListener("keydown", (e) => {game.keyboardHandler(e)});
    game.createScreenKeyboard();
    createBoxes(0, game.wordLength, game.maxGuesses);
    createBoxes(1, game.wordLength, game.maxGuesses);
}

main();
