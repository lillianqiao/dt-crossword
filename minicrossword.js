// change crossword data for every new crossword
//null for empty spaces, letters in ''
//write the clues and number them accordingly, then write their position based on grid spot
//[0,0] is the leftmost, topmost grid

const crosswordData = {
  grid: [c
  ['T', 'R', 'O', 'J', 'A', 'N'],
  [null, 'E', null, null, null, 'E'],
  ['E', 'G', 'G', null, null, 'W'],
  [null, 'A', null, null, null, 'S'],
  ['S', 'L', 'A', 'Y', null, null]
  ],
  acrossClues: [
    { number: 1, clue: 'A USC student is a...', position: [0, 0] },
    { number: 3, clue: 'Chicken baby', position: [2, 0] },
    { number: 5, clue: 'Gen Z slang for saying impressive', position: [4, 0] }
  ],
  downClues: [
    { number: 2, clue: 'A synonym for royal', position: [0, 1] },
    { number: 6, clue: 'Daily Trojan is a ---- source', position: [0, 5] }
  ]
};

const correctAnswers = {
  'cell-1-1': 'T', 'cell-1-2': 'R', 'cell-1-3': 'O', 'cell-1-4': 'J', 'cell-1-5': 'A', 'cell-1-6': 'N',
  'cell-2-2': 'E', 'cell-2-6': 'E',
  'cell-3-1': 'E', 'cell-3-2': 'G', 'cell-3-3': 'G', 'cell-3-6': 'W',
  'cell-4-2': 'A', 'cell-4-6': 'S',
  'cell-5-1': 'S', 'cell-5-2': 'L', 'cell-5-3': 'A', 'cell-5-4': 'Y',
};


// check if the current cell should be numbered and return the correct number
function getClueNumber(rowIndex, cellIndex) {
  // search for an across clue that starts at this position
  const acrossClue = crosswordData.acrossClues.find(
    clue => clue.position[0] === rowIndex && clue.position[1] === cellIndex
  );

  // search for a down clue that starts at this position
  const downClue = crosswordData.downClues.find(
    clue => clue.position[0] === rowIndex && clue.position[1] === cellIndex
  );

  // return the clue number from either across or down, whichever exists
  if (acrossClue) {
    return acrossClue.number;
  } else if (downClue) {
    return downClue.number;
  }

  return null; // no clue starts here
}

// generate the crossword grid
function generateCrossword() {
  const crosswordContainer = document.querySelector('.crossword');
  const table = document.createElement('table');

  crosswordData.grid.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');

      if (cell === null) {
        // black cells
        td.classList.add('black');
      } else {
        // white cells
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.id = `cell-${rowIndex + 1}-${cellIndex + 1}`;
        td.appendChild(input);

        // number the cells based on across/down clues
        const clueNumber = getClueNumber(rowIndex, cellIndex);
        if (clueNumber !== null) {
          td.classList.add('numbered');
          td.setAttribute('data-number', clueNumber);
        }
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  crosswordContainer.appendChild(table);
}

// load saved answers from localStorage
function loadSavedAnswers() {
  const savedAnswers = localStorage.getItem('userAnswers');
  const crosswordCompleted = localStorage.getItem('crosswordCompleted');
  if (crosswordCompleted) { //completed puzzle, reload answers to let users see
    if (savedAnswers) {
      const answers = JSON.parse(savedAnswers);
      for (const [cellId, answer] of Object.entries(answers)) {
        const cell = document.getElementById(cellId);
        if (cell) {
          cell.value = answer;  // populate the grid with the saved answer
          cell.style.backgroundColor = '#93C572'; // mark correct answers with green background
        }
      }
    }
  }
}

// dynamically populate clues 
function populateClues() {
  const acrossCluesContainer = document.getElementById('across-clues');
  const downCluesContainer = document.getElementById('down-clues');

  // populate Across clues
  crosswordData.acrossClues.forEach(clue => {
    const div = document.createElement('div');
    div.textContent = `${clue.number}. ${clue.clue}`;
    acrossCluesContainer.appendChild(div);
  });

  // populate Down clues
  crosswordData.downClues.forEach(clue => {
    const div = document.createElement('div');
    div.textContent = `${clue.number}. ${clue.clue}`;
    downCluesContainer.appendChild(div);
  });
}

// check solution in each grid
function checkSolution() {

  let allCorrect = true;
  let count = 0;

  for (const [cellId, answer] of Object.entries(correctAnswers)) {
    const cell = document.getElementById(cellId);
    const cellValue = cell.value.toUpperCase();

    if (cellValue === '') {
      // if the cell is empty, do nothing
      continue;
    }

    if (cellValue !== answer) // incorrect answer
    {
      // remove previous green background
      cell.style.backgroundColor = '';

      // create the red diagonal line 
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.top = '50%';
      line.style.left = '50%';
      line.style.width = '150%';
      line.style.height = '2px';
      line.style.backgroundColor = 'red';  // red line color
      line.style.transform = 'translate(-50%, -50%) rotate(45deg)';
      line.style.pointerEvents = 'none';  // so it doesn't block input interaction

      // append the diagonal line to the input cell
      line.classList.add('diagonal-line');
      cell.parentElement.style.position = 'relative';
      cell.parentElement.appendChild(line);

      allCorrect = false;  // mark the answer as incorrect
    }
    else {
      //if the letter is correct, make the cell green and remove any diagonal line
      cell.style.backgroundColor = '#93C572';

      count++; //for every grid that is correct

      //remove any previously added red line
      const existingLine = cell.parentElement.querySelector('.diagonal-line');
      if (existingLine) {
        existingLine.remove();
      }
    }
  }

  const correctAnswerCount = Object.keys(correctAnswers).length;

  if (allCorrect && count == correctAnswerCount) {
    localStorage.setItem("userAnswers", JSON.stringify(correctAnswers)); //set the answers so if users want to go back
    localStorage.setItem('crosswordCompleted', 'true'); //key to let program know user finished puzzle
    window.location.href = "congrats.html";
  }
}

function homeRedirect() //nav bar dt logo redirect to homepage
{
  window.location.href = "https://dailytrojan.com/";
}

function resetGrid() {
  // Clear the local storage
  localStorage.clear();

  // Get all input elements in the crossword grid
  const inputs = document.querySelectorAll('.crossword input[type="text"]');

  // Reset each input value, background color, and remove any red diagonal lines
  inputs.forEach(input => {
    input.value = ''; // Clear the input
    input.style.backgroundColor = ''; // Reset the background color

    // Remove any existing red diagonal lines
    const parentCell = input.parentElement;
    const existingLine = parentCell.querySelector('.diagonal-line');
    if (existingLine) {
      existingLine.remove(); // Remove the red line if present
    }
  });

  // Optionally, you can also reset the completed state if necessary
  localStorage.removeItem('crosswordCompleted');
}

//calls functions to initialize crossword and clues
generateCrossword();
populateClues();
loadSavedAnswers(); //always called but will only load ans when user is done playing
