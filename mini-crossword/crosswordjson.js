let crosswordData = {};
let correctAnswers = {};
let currentDirection = 'across'; // track current input direction

async function loadCrosswordData() {
  const response = await fetch('crossword-data.json'); 
  crosswordData = await response.json();
  generateCrossword();
  populateClues();
  loadSavedAnswers();
}

function generateCrossword() {
  const crosswordContainer = document.querySelector('.crossword');
  
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
    moveToNextCell(rowIndex, cellIndex);
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
      moveHorizontally(rowIndex, cellIndex, 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      currentDirection = 'across';
      moveHorizontally(rowIndex, cellIndex, -1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      currentDirection = 'down';
      moveVertically(rowIndex, cellIndex, 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      currentDirection = 'down';
      moveVertically(rowIndex, cellIndex, -1);
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
    div.textContent = `${clue.number}. ${clue.clue}`;
    Object.assign(div.style, clueStyle);
    acrossCluesContainer.appendChild(div);
  });

  crosswordData.downClues.forEach(clue => {
    const div = document.createElement('div');
    div.textContent = `${clue.number}. ${clue.clue}`;
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

loadCrosswordData();