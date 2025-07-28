export function getRandomIndex(max, exclude) {
  let idx;
  do {
    idx = Math.floor(Math.random() * max);
  } while (exclude.includes(idx));
  return idx;
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('progress')) || { learned: [], score: 0 };
  } catch {
    return { learned: [], score: 0 };
  }
}

export function saveProgress(progress) {
  localStorage.setItem('progress', JSON.stringify(progress));
}

export function loadAttempts() {
  try {
    const data = localStorage.getItem('attempts');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveAttempts(attempts) {
  try {
    localStorage.setItem('attempts', JSON.stringify(attempts));
  } catch {}
}
