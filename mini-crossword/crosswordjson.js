let crosswordData = {};
let correctAnswers = {};
let currentDirection = 'across'; // track current input direction
// timer global variables
let timerInterval = null;
let timerStartEpoch = null; // ms since epoch when started
let timerElapsedMs = 0;     // accumulated time in ms
const LS_TIMER_ELAPSED = 'cw_timerElapsedMs';
const LS_TIMER_RUNNING = 'cw_timerRunning';
const LS_TIMER_BEST    = 'cw_bestTimeMs';

async function loadCrosswordData() {
  const response = await fetch('crossword-data.json'); 
  crosswordData = await response.json();
  generateCrossword();
  populateClues();
  loadSavedAnswers();
  loadTimerFromStorage(); // start the timer and continue it until crossword is completed
  if (!localStorage.getItem('crosswordCompleted')) {
    startTimer();
  }
}

function generateCrossword() {
  const crosswordContainer = document.querySelector('.crossword');

  // creating timer/top bar before generating grid
  const topBar = document.createElement('div');
  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'center';
  topBar.style.width = '75%';
  topBar.style.maxWidth = '800px';
  topBar.style.margin = '0 auto 10px';

  const timerEl = document.createElement('div');
  timerEl.id = 'timer-display';
  timerEl.style.fontFamily = '"Courier New", monospace';
  timerEl.style.fontSize = '18px';
  timerEl.style.fontWeight = '599';
  timerEl.textContent = '00:00';

  const bestEl = document.createElement('div');
  bestEl.id = 'best-time-display';
  bestEl.style.fontFamily = '"Courier New", monospace';
  bestEl.style.fontSize = '12px';
  bestEl.style.opacity = '0.8';

  topBar.appendChild(timerEl);
  topBar.appendChild(bestEl);
  crosswordContainer.prepend(topBar);
  
  // style of main container
  crosswordContainer.style.display = 'flex';
  crosswordContainer.style.flexDirection = 'column';
  crosswordContainer.style.alignItems = 'center';
  crosswordContainer.style.maxWidth = '800px';
  crosswordContainer.style.margin = '0 auto';
  crosswordContainer.style.padding = '20px';

  // creating a div for the grid
  const gridContainer = document.createElement('div');
  gridContainer.style.marginBottom = '20px';
  
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.margin = '0 auto';

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
        input.id = `cell-${rowIndex}-${cellIndex}`;
        td.appendChild(input);

        const clueNumber = getClueNumber(rowIndex, cellIndex);
        if (clueNumber !== null) {
          td.classList.add('numbered');
          td.setAttribute('data-number', clueNumber);
        }

        correctAnswers[`cell-${rowIndex}-${cellIndex}`] = cell.toUpperCase();
        
        input.addEventListener('input', (e) => handleInput(e, rowIndex, cellIndex));
        input.addEventListener('keydown', (e) => handleKeyDown(e, rowIndex, cellIndex));
        input.addEventListener('click', (e) => handleClick(e, rowIndex, cellIndex));
      }
      
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  
  gridContainer.appendChild(table);
  crosswordContainer.appendChild(gridContainer);

  // creating a container for clues
  const cluesContainer = document.createElement('div');
  cluesContainer.style.display = 'flex';
  cluesContainer.style.justifyContent = 'center';
  cluesContainer.style.gap = '40px';
  cluesContainer.style.width = '100%';
  cluesContainer.style.maxWidth = '600px';

  // creating containers for across and down clues
  const acrossContainer = document.createElement('div');
  acrossContainer.id = 'across-clues';
  acrossContainer.style.flex = '1';
  acrossContainer.style.maxWidth = '280px';

  const downContainer = document.createElement('div');
  downContainer.id = 'down-clues';
  downContainer.style.flex = '1';
  downContainer.style.maxWidth = '280px';

  cluesContainer.appendChild(acrossContainer);
  cluesContainer.appendChild(downContainer);
  crosswordContainer.appendChild(cluesContainer);
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

function handleInput(event, rowIndex, cellIndex) {
  const input = event.target;
  
  // converting input to uppercase
  if (input.value) {
    input.value = input.value.toUpperCase();
  }

  if (event.inputType === 'deleteContentBackward') {
    moveToPreviousCell(rowIndex, cellIndex);
  } else if (input.value) {
    moveToNextCellWithinWord(rowIndex, cellIndex);
  }
}

function handleKeyDown(event, rowIndex, cellIndex) {
  switch (event.key) {
    case 'Backspace':
    case 'Delete':
      event.preventDefault();
      const currentCell = document.getElementById(`cell-${rowIndex}-${cellIndex}`);
      if (currentCell.value === '') {
        // moving to previous cell and focusing it, regardless of whether it's filled
        if (currentDirection === 'across') {
          let prevCol = cellIndex - 1;
          while (prevCol >= 0) {
            if (crosswordData.grid[rowIndex][prevCol] !== null) {
              const prevCell = document.getElementById(`cell-${rowIndex}-${prevCol}`);
              prevCell.focus();
              break;
            }
            prevCol--;
          }
        } else {
          let prevRow = rowIndex - 1;
          while (prevRow >= 0) {
            if (crosswordData.grid[prevRow][cellIndex] !== null) {
              const prevCell = document.getElementById(`cell-${prevRow}-${cellIndex}`);
              prevCell.focus();
              break;
            }
            prevRow--;
          }
        }
      } else {
        // clearing current cell and keeping focus
        currentCell.value = '';
        currentCell.focus();
      }
      break;
    case 'Enter':
    case 'Return':
      event.preventDefault();
      //if it's the end of the word and user tabs, move to the next clue in the list
      const end = findWordEnd(rowIndex, cellIndex, currentDirection);
      if (end.row === rowIndex && end.col === cellIndex) {
        const start = findWordStart(rowIndex, cellIndex, currentDirection);
        focusNextClueSameListOrNextList(currentDirection, start.row, start.col);
        break;
      }
      if (currentDirection === 'across') {
        let nextCol = cellIndex + 1;
        while (nextCol < crosswordData.grid[rowIndex].length) {
          if (crosswordData.grid[rowIndex][nextCol] !== null) {
            focusCell(rowIndex, nextCol);
            break;
          }
          nextCol++;
        }
      } else {
        let nextRow = rowIndex + 1;
        while (nextRow < crosswordData.grid.length) {
          if (crosswordData.grid[nextRow][cellIndex] !== null) {
            focusCell(nextRow, cellIndex);
            break;
          }
          nextRow++;
        }
      }
      break;
    case 'ArrowRight':
      event.preventDefault();
      currentDirection = 'across';
      moveToNextCellWithinWord(rowIndex, cellIndex);
      // moveHorizontally(rowIndex, cellIndex, 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      currentDirection = 'across';
      // moveHorizontally(rowIndex, cellIndex, -1);
      moveToPrevCellWithinWord(rowIndex, cellIndex);
      break;
    case 'ArrowDown':
      event.preventDefault();
      currentDirection = 'down';
      // moveVertically(rowIndex, cellIndex, 1);
      moveToNextCellWithinWord(rowIndex, cellIndex);
      break;
    case 'ArrowUp':
      event.preventDefault();
      currentDirection = 'down';
      // moveVertically(rowIndex, cellIndex, -1);
      moveToPrevCellWithinWord(rowIndex, cellIndex);
      break;
  }
}

function handleClick(event, rowIndex, cellIndex) {
  const cell = document.getElementById(`cell-${rowIndex}-${cellIndex}`);
  const isAcross = isPartOfAcrossWord(rowIndex, cellIndex);
  const isDown = isPartOfDownWord(rowIndex, cellIndex);
  
  // setting direction on first click
  if (isAcross && isDown) {
    // keeping current direction if cell is part of both
    cell.focus();
  } else if (isAcross) {
    currentDirection = 'across';
    cell.focus();
  } else if (isDown) {
    currentDirection = 'down';
    cell.focus();
  }
  
  // updating header styles
  const acrossHeader = document.querySelector('#across-clues > div:first-child');
  const downHeader = document.querySelector('#down-clues > div:first-child');
  if (acrossHeader && downHeader) {
    acrossHeader.style.fontWeight = currentDirection === 'across' ? 'bold' : 'normal';
    downHeader.style.fontWeight = currentDirection === 'down' ? 'bold' : 'normal';
  }
  highlightCurrClue(rowIndex, cellIndex);
}

function findWordEnd(row, col, direction) {
  if (direction === 'across') {
    const rowLen = crosswordData.grid[row].length;
    while (col + 1 < rowLen && crosswordData.grid[row][col + 1] !== null) col++;
    return { row, col };
  } else {
    while (row + 1 < crosswordData.grid.length && crosswordData.grid[row + 1][col] !== null) row++;
    return { row, col };
  }
}

function getSortedClueLists() {
  const across = [...crosswordData.acrossClues].sort((a, b) => a.number - b.number);
  const down = [...crosswordData.downClues].sort((a, b) => a.number - b.number);
  return { across, down };
}

function getClueIndexByStart(direction, startRow, startCol) {
  const { across, down } = getSortedClueLists();
  const list = direction === 'across' ? across : down;
  const idx = list.findIndex(c => c.position[0] === startRow && c.position[1] === startCol);
  return { idx, list, across, down };
}

function focusClueStart(direction, clueObj) {
  currentDirection = direction;
  updateHeaderStyles();
  const [r, c] = clueObj.position;
  focusCell(r, c);
  highlightCurrClue(r, c);
}

function focusNextClueSameListOrNextList(direction, startRow, startCol) {
  const { idx, list, across, down } = getClueIndexByStart(direction, startRow, startCol);
  if (idx === -1) return;

  // next in the same list if it exists
  if (idx + 1 < list.length) {
    const nextClue = list[idx + 1];
    focusClueStart(direction, nextClue);
    return;
  }

  // otherwise jump to the first clue of the other list
  const nextDirection = direction === 'across' ? 'down' : 'across';
  const nextList = nextDirection === 'across' ? across : down;
  if (!nextList.length) return; // safety
  focusClueStart(nextDirection, nextList[0]);
}


function onClueClick(direction, clue) { //setting cursor to the first letter of the clue clicked
  currentDirection = direction;
  updateHeaderStyles();

  const [row, col] = clue.position; // put the cursor on the first letter of the word
  focusCell(row, col);

  // highlight the clicked clue
  highlightCurrClue(row, col);

  const cell = document.getElementById(`cell-${row}-${col}`);
  if (cell) cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


function isPartOfAcrossWord(row, col) {
  if (crosswordData.grid[row][col] === null) return false;
  const rowLen = crosswordData.grid[row].length;
  const left = col > 0 && crosswordData.grid[row][col - 1] !== null;
  const right = col + 1 < rowLen && crosswordData.grid[row][col + 1] !== null;
  return left || right; // at least one neighbor horizontally
}

function isPartOfDownWord(row, col) {
  if (crosswordData.grid[row][col] === null) return false;
  const up = row > 0 && crosswordData.grid[row - 1][col] !== null;
  const down = row + 1 < crosswordData.grid.length && crosswordData.grid[row + 1][col] !== null;
  return up || down; // at least one neighbor vertically
}

function findWordStart(row, col, direction) {
  if (direction === 'across') {
    while (col > 0 && crosswordData.grid[row][col - 1] !== null) col--;
    return { row, col };
  } else {
    while (row > 0 && crosswordData.grid[row - 1][col] !== null) row--;
    return { row, col };
  }
}

function getClueByStart(row, col, direction) {
  const list = direction === 'across' ? crosswordData.acrossClues : crosswordData.downClues;
  return list.find(clue => clue.position[0] === row && clue.position[1] === col) || null;
}


function moveToNextCell(rowIndex, cellIndex) {
  if (currentDirection === 'across') {
    moveHorizontally(rowIndex, cellIndex, 1);
  } else {
    moveVertically(rowIndex, cellIndex, 1);
  }
}

function moveToPreviousCell(rowIndex, cellIndex) {
  if (currentDirection === 'across') {
    moveHorizontally(rowIndex, cellIndex, -1);
  } else {
    moveVertically(rowIndex, cellIndex, -1);
  }
}

function moveToNextCellWithinWord(rowIndex, cellIndex) {
  if (currentDirection === 'across') {
    const nextCol = cellIndex + 1;
    if (nextCol < crosswordData.grid[rowIndex].length &&
        crosswordData.grid[rowIndex][nextCol] !== null) {
      focusCell(rowIndex, nextCol);
    }
    // else: end of word -> stay put
  } else { // down
    const nextRow = rowIndex + 1;
    if (nextRow < crosswordData.grid.length &&
        crosswordData.grid[nextRow][cellIndex] !== null) {
      focusCell(nextRow, cellIndex);
    }
  }
}

function moveToPrevCellWithinWord(rowIndex, cellIndex) {
  if (currentDirection === 'across') {
    const prevCol = cellIndex - 1;
    if (prevCol >= 0 && crosswordData.grid[rowIndex][prevCol] !== null) {
      focusCell(rowIndex, prevCol);
    }
  } else { // down
    const prevRow = rowIndex - 1;
    if (prevRow >= 0 && crosswordData.grid[prevRow][cellIndex] !== null) {
      focusCell(prevRow, cellIndex);
    }
  }
}

function moveHorizontally(rowIndex, cellIndex, direction) {
  let nextCol = cellIndex + direction;
  let nextRow = rowIndex;

  while (nextCol >= 0 && nextCol < crosswordData.grid[rowIndex].length) {
    if (crosswordData.grid[nextRow][nextCol] !== null) {
      const nextCell = document.getElementById(`cell-${nextRow}-${nextCol}`);
      if (!nextCell.value) {
        // only focusing if the cell is empty
        focusCell(nextRow, nextCol);
        return;
      }
      // if cell is filled, continue searching
      nextCol += direction;
    } else {
      nextCol += direction;
    }
  }
}

function moveVertically(rowIndex, cellIndex, direction) {
  let nextRow = rowIndex + direction;
  let nextCol = cellIndex;

  while (nextRow >= 0 && nextRow < crosswordData.grid.length) {
    if (crosswordData.grid[nextRow][nextCol] !== null) {
      const nextCell = document.getElementById(`cell-${nextRow}-${nextCol}`);
      if (!nextCell.value) {
        // only focusing if the cell is empty
        focusCell(nextRow, nextCol);
        return;
      }
      // if cell is filled, continue searching
      nextRow += direction;
    } else {
      nextRow += direction;
    }
  }
}

function focusCell(row, col) {
  const cell = document.getElementById(`cell-${row}-${col}`);
  if (cell) {
    cell.focus();
    highlightCurrClue(row, col); //also highlight changing clues as keyboard moves to different wordsß
  }
}

function createDirectionButton(text, direction) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.padding = '10px';
  button.style.backgroundColor = direction === currentDirection ? '#93C572' : '#ffcc00';
  button.style.border = '1px solid #ccc';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  button.style.marginBottom = '15px';
  button.style.width = '50%';
  button.style.fontSize = '16px';
  button.style.fontWeight = 'bold';
  
  button.addEventListener('click', () => {
    currentDirection = direction;
    // updating both buttons' styles
    const acrossButton = document.querySelector('#across-button');
    const downButton = document.querySelector('#down-button');
    if (acrossButton && downButton) {
      acrossButton.style.backgroundColor = direction === 'across' ? '#990000' : '#ffcc00';
      downButton.style.backgroundColor = direction === 'down' ? '#990000' : '#ffcc00';
    }
  });
  
  return button;
}

function populateClues() {
  const acrossCluesContainer = document.getElementById('across-clues');
  const downCluesContainer = document.getElementById('down-clues');

  // clearing existing content
  acrossCluesContainer.innerHTML = '';
  downCluesContainer.innerHTML = '';

  // creating and adding the across header
  const acrossHeader = document.createElement('div');
  acrossHeader.textContent = 'Across';
  acrossHeader.style.fontWeight = currentDirection === 'across' ? 'bold' : 'normal';
  acrossHeader.style.fontSize = '18px';
  acrossHeader.style.marginBottom = '15px';
  acrossHeader.style.cursor = 'pointer';
  acrossHeader.style.color = currentDirection === 'across' ? '#990000' : '#000';
  acrossHeader.addEventListener('click', () => {
    currentDirection = 'across';
    updateHeaderStyles();
    // Focus the current cell if one is selected
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') {
      activeElement.focus();
    }
  });
  acrossCluesContainer.appendChild(acrossHeader);

  // creating and adding the down header
  const downHeader = document.createElement('div');
  downHeader.textContent = 'Down';
  downHeader.style.fontWeight = currentDirection === 'down' ? 'bold' : 'normal';
  downHeader.style.fontSize = '18px';
  downHeader.style.marginBottom = '15px';
  downHeader.style.cursor = 'pointer';
  downHeader.style.color = currentDirection === 'down' ? '#990000' : '#000';
  downHeader.addEventListener('click', () => {
    currentDirection = 'down';
    updateHeaderStyles();
    // focusing current cell if one is selected
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') {
      activeElement.focus();
    }
  });
  downCluesContainer.appendChild(downHeader);

  // style for clue containers
  const clueStyle = {
    padding: '5px',
    marginBottom: '5px',
    borderRadius: '3px',
    fontSize: '14px'
  };

  // adding clues
  crosswordData.acrossClues.forEach(clue => {
    const div = document.createElement('div');
    div.id = `clue-across-${clue.number}`;
    div.textContent = `${clue.number}. ${clue.clue}`;
    Object.assign(div.style, clueStyle);
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => onClueClick('across', clue)); //making the clue interactive
    acrossCluesContainer.appendChild(div);
  });

  crosswordData.downClues.forEach(clue => {
    const div = document.createElement('div');
    div.id = `clue-down-${clue.number}`;
    div.textContent = `${clue.number}. ${clue.clue}`;
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => onClueClick('down', clue)); //making the clue interactive
    Object.assign(div.style, clueStyle);
    downCluesContainer.appendChild(div);
  });
}

function updateHeaderStyles() {
  const acrossHeader = document.querySelector('#across-clues > div:first-child');
  const downHeader = document.querySelector('#down-clues > div:first-child');
  if (acrossHeader && downHeader) {
    acrossHeader.style.fontWeight = currentDirection === 'across' ? 'bold' : 'normal';
    downHeader.style.fontWeight = currentDirection === 'down' ? 'bold' : 'normal';
    acrossHeader.style.color = currentDirection === 'across' ? '#990000' : '#000';
    downHeader.style.color = currentDirection === 'down' ? '#990000' : '#000';
  }
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

function highlightCurrClue(rowIndex, cellIndex) { //highlights the current clue the player is on in butter yellow 

  // clear previous highlights
  document.querySelectorAll('.clue-highlight').forEach(element => {
    element.style.backgroundColor = '';
    element.classList.remove('clue-highlight');
  });

  // find the clue for the word that contains (rowIndex, cellIndex) in currentDirection
  const start = findWordStart(rowIndex, cellIndex, currentDirection);
  const clue = getClueByStart(start.row, start.col, currentDirection);
  if (!clue) return;

  const element = document.getElementById(`clue-${currentDirection}-${clue.number}`);
  if (element) {
    element.style.backgroundColor = '#FFF4B8'; // butter yellow
    element.classList.add('clue-highlight');
    // keep the clue in view without jumping the page
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function checkSolution() {
  let allCorrect = true;
  let count = 0;
  const totalCells = Object.keys(correctAnswers).length;

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

  // when all cells are correct and filled, save and redirect to congrats page
  if (allCorrect && count === totalCells) {
    localStorage.setItem('userAnswers', JSON.stringify(correctAnswers));
    localStorage.setItem('crosswordCompleted', 'true');
    stopAndRecordBest(); // stop timer and save best time
    setTimeout(function() {
      window.location.href = "congrats.html"; // 2 seconds before redirecting to congrats page
    }, 1000);
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

// timer logic
function fmt(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateTimerUI() {
  const disp = document.getElementById('timer-display');
  if (!disp) return;
  const now = Date.now();
  const running = timerStartEpoch !== null;
  const liveMs = running ? (now - timerStartEpoch) : 0;
  const total = timerElapsedMs + liveMs;
  disp.textContent = fmt(total);

  const best = Number(localStorage.getItem(LS_TIMER_BEST) || 0);
  const bestEl = document.getElementById('best-time-display');
  if (bestEl && best > 0) bestEl.textContent = `Completed In: ${fmt(best)}`;
}

function tick() {
  updateTimerUI();
}

function startTimer() {
  if (timerStartEpoch !== null) return; // already running
  timerStartEpoch = Date.now();
  localStorage.setItem(LS_TIMER_RUNNING, '1');
  timerInterval = setInterval(tick, 250); // 4x/sec for smoothness
  tick();
}

function pauseTimer() {
  if (timerStartEpoch === null) return;
  timerElapsedMs += Date.now() - timerStartEpoch;
  timerStartEpoch = null;
  localStorage.setItem(LS_TIMER_ELAPSED, String(timerElapsedMs));
  localStorage.removeItem(LS_TIMER_RUNNING);
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  updateTimerUI();
}

function resetTimer() {
  timerElapsedMs = 0;
  timerStartEpoch = null;
  localStorage.removeItem(LS_TIMER_ELAPSED);
  localStorage.removeItem(LS_TIMER_RUNNING);
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  updateTimerUI();
}

function loadTimerFromStorage() {
  // if the puzzle was already completed previously, do nothing
  const completed = localStorage.getItem('crosswordCompleted');
  if (completed) { updateTimerUI(); return; }

  const savedElapsed = Number(localStorage.getItem(LS_TIMER_ELAPSED) || 0);
  const wasRunning   = localStorage.getItem(LS_TIMER_RUNNING) === '1';
  timerElapsedMs = isNaN(savedElapsed) ? 0 : savedElapsed;

  if (wasRunning) startTimer(); else updateTimerUI();
}

function stopAndRecordBest() {
  // stop and store final time + best
  pauseTimer();
  const finalMs = timerElapsedMs;
  const best = Number(localStorage.getItem(LS_TIMER_BEST) || 0);
  if (best === 0 || finalMs < best) {
    localStorage.setItem(LS_TIMER_BEST, String(finalMs));
  }
}

loadCrosswordData();