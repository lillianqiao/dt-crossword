// // Call the function to load the crossword data
// loadCrosswordData();
let crosswordData = {};
let correctAnswers = {};

// Fetch crossword data from JSON file
async function loadCrosswordData() {
  const response = await fetch('crossword-data.json'); 
  crosswordData = await response.json();
  generateCrossword();   // Call to generate the crossword grid
  populateClues();       // Populate across and down clues
  loadSavedAnswers();    // Load any saved answers
}

function getClueNumber(rowIndex, cellIndex) {
  const acrossClue = crosswordData.acrossClues.find(
    clue => clue.position[0] === rowIndex && clue.position[1] === cellIndex
  );
  const downClue = crosswordData.downClues.find(
    clue => clue.position[0] === rowIndex && clue.position[1] === cellIndex
  );

  if (acrossClue) {
    return acrossClue.number;
  } else if (downClue) {
    return downClue.number;
  }

  return null;
}

function generateCrossword() {
  const crosswordContainer = document.querySelector('.crossword');
  const table = document.createElement('table');
  let clickCount = 0;

  crosswordData.grid.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');

      if (cell === null) {
        td.classList.add('black');
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.id = `cell-${rowIndex + 1}-${cellIndex + 1}`;
        td.appendChild(input);

        const clueNumber = getClueNumber(rowIndex, cellIndex);
        if (clueNumber !== null) {
          td.classList.add('numbered');
          td.setAttribute('data-number', clueNumber);
        }

        correctAnswers[`cell-${rowIndex + 1}-${cellIndex + 1}`] = cell.toUpperCase();
        
        input.addEventListener('input', function() { // event listener to move focus to the next cell in the same row
          if (input.value) {
              moveToNextCellRow(rowIndex, cellIndex);
          }
        });

        input.addEventListener('input', function() { // event listener to move focus to the next cell in the same row
          if (input.value) {
              moveToNextCellColumn(rowIndex, cellIndex);
          }
        });
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  crosswordContainer.appendChild(table);
}

function moveToNextCellRow(rowIndex, cellIndex) {
  const nextCellIndex = cellIndex + 1; // Move to the next cell in the same row
  const nextRow = rowIndex;
  
  // If the next cell is out of bounds, move to the first cell of the next row
  if (nextCellIndex >= crosswordData.grid[nextRow].length) {
    nextRow++;
    if (nextRow < crosswordData.grid.length) {
      cellIndex = 0; // Move to the first cell of the next row
    } else {
      return; // End of grid, do nothing
    }
  } else {
    cellIndex = nextCellIndex; // Stay in the same row
  }

  // Find the next cell's input element and focus it
  const nextCellId = `cell-${nextRow + 1}-${cellIndex + 1}`;
  const nextCell = document.getElementById(nextCellId);
  if (nextCell) {
    nextCell.focus();
  }
}

function moveToNextCellColumn(rowIndex, cellIndex) {
    const nextRow = rowIndex + 1; // Move to the next row
    const nextCellIndex = cellIndex; // Stay in the same column
  
    // Check if the next row is within bounds
    if (nextRow < crosswordData.grid.length) {
      // Find the next cell's input element and focus it
      const nextCellId = `cell-${nextRow + 1}-${nextCellIndex + 1}`;
      const nextCell = document.getElementById(nextCellId);
      if (nextCell) {
        nextCell.focus();
      }
    }
  }
  

function populateClues() {
  const acrossCluesContainer = document.getElementById('across-clues');
  const downCluesContainer = document.getElementById('down-clues');

  crosswordData.acrossClues.forEach(clue => {
    const div = document.createElement('div');
    div.textContent = `${clue.number}. ${clue.clue}`;
    acrossCluesContainer.appendChild(div);
  });

  crosswordData.downClues.forEach(clue => {
    const div = document.createElement('div');
    div.textContent = `${clue.number}. ${clue.clue}`;
    downCluesContainer.appendChild(div);
  });
}

function loadSavedAnswers() {
  const savedAnswers = localStorage.getItem('userAnswers');
  const crosswordCompleted = localStorage.getItem('crosswordCompleted');

  if (crosswordCompleted && savedAnswers) {
    const answers = JSON.parse(savedAnswers);
    for (const [cellId, answer] of Object.entries(answers)) {
      const cell = document.getElementById(cellId);
      if (cell) {
        cell.value = answer;
        cell.style.backgroundColor = '#93C572';
      }
    }
  }
}

function checkSolution() {
  let allCorrect = true;
  let count = 0;

  for (const [cellId, answer] of Object.entries(correctAnswers)) {
    const cell = document.getElementById(cellId);
    const cellValue = cell.value.toUpperCase();

    if (cellValue === '') continue;

    if (cellValue !== answer) {
      cell.style.backgroundColor = '';
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.top = '50%';
      line.style.left = '50%';
      line.style.width = '150%';
      line.style.height = '2px';
      line.style.backgroundColor = 'red';
      line.style.transform = 'translate(-50%, -50%) rotate(45deg)';
      line.style.pointerEvents = 'none';
      line.classList.add('diagonal-line');
      cell.parentElement.style.position = 'relative';
      cell.parentElement.appendChild(line);
      allCorrect = false;
    } else {
      cell.style.backgroundColor = '#93C572';
      count++;
      const existingLine = cell.parentElement.querySelector('.diagonal-line');
      if (existingLine) {
        existingLine.remove();
      }
    }
  }

  const correctAnswerCount = Object.keys(correctAnswers).length;
  if (allCorrect && count === correctAnswerCount) {
    localStorage.setItem('userAnswers', JSON.stringify(correctAnswers));
    localStorage.setItem('crosswordCompleted', 'true');
    window.location.href = "congrats.html";
  }
}

function resetGrid() {
  localStorage.clear();
  const inputs = document.querySelectorAll('.crossword input[type="text"]');
  inputs.forEach(input => {
    input.value = '';
    input.style.backgroundColor = '';
    const parentCell = input.parentElement;
    const existingLine = parentCell.querySelector('.diagonal-line');
    if (existingLine) existingLine.remove();
  });
  localStorage.removeItem('crosswordCompleted');
}

// Call the function to load the crossword data
loadCrosswordData();
