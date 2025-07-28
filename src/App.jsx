import React, { useEffect, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getRandomIndex, loadProgress, saveProgress, loadAttempts, saveAttempts } from './utils';
import { fetchAndParseCSV } from './csvLoader';

// const CSV_FILE = '/Top_50_Verbes_avec_exemples_traduits.csv';
// const CSV_FILE = '/Top_50_Verbes_avec_Faux_Pr_positionen.csv';
const CSV_FILE = '/Test3.csv';

export default function App() {
  const [verbs, setVerbs] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [guess, setGuess] = useState({ prep: '', case: '' });
  const [showAnswer, setShowAnswer] = useState(false);
  const [progress, setProgress] = useState(loadProgress());
  const [attempts, setAttempts] = useState(loadAttempts()); // { [idx]: correctCount }
  const [csvError, setCsvError] = useState(null);
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('mode');
    return (savedMode && ['prep', 'case', 'both'].includes(savedMode)) ? savedMode : 'both';
  }); // 'prep', 'case', 'both'
  const [prepositionChoices, setPrepositionChoices] = useState([]);
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('level');
    return saved === '2' ? 2 : 1;
  });
  const inputRef = useRef(null);

  // Helper to get a unique key for each verb (verb+preposition+example)
  function getVerbKey(verbObj) {
    return `${verbObj['Verb']}|${verbObj['Preposition']}|${verbObj['Exemple']}`;
  }

  // Helper to get shuffled preposition choices
  function getPrepositionChoices(current) {
    const correct = current['Preposition']?.trim();
    let wrongs = [];
    try {
      wrongs = JSON.parse(current['WrongPrepositions']);
    } catch {
      wrongs = (current['WrongPrepositions'] || '').split(',').map(p => p.trim()).filter(Boolean);
    }
    // Pick 3 random wrongs
    const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correct, ...shuffledWrongs].filter(Boolean);
    // Shuffle all choices
    return choices.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    fetchAndParseCSV(CSV_FILE, loadProgress(), setVerbs, setCurrentIdx, setCsvError);
  }, [CSV_FILE]);

  useEffect(() => {
    // Only update progress/attempts if verbs have changed (not on every render)
    if (!verbs.length) return;
    const savedProgress = loadProgress();
    const savedAttempts = loadAttempts();
    // Build new progress/attempts for current CSV
    const newLearned = [];
    const newAttempts = {};
    verbs.forEach((v, idx) => {
      const key = getVerbKey(v);
      // Find saved key for this verb
      if (savedAttempts[key] !== undefined) {
        newAttempts[idx] = savedAttempts[key];
      }
      if (savedProgress.learned && Array.isArray(savedProgress.learned)) {
        // Check if this verb was learned by key
        const learnedKey = savedProgress.learned.find(lk => lk === key);
        if (learnedKey) {
          newLearned.push(idx);
        }
      }
    });
    setProgress({ score: newLearned.length, learned: newLearned });
    setAttempts(newAttempts);
  }, [verbs]);

  useEffect(() => {
    // Save progress and attempts by verb key, not index
    if (!verbs.length) return;
    const progressToSave = {
      score: progress.score,
      learned: progress.learned
        .map(idx => verbs[idx] ? getVerbKey(verbs[idx]) : null)
        .filter(Boolean)
    };
    saveProgress(progressToSave);
    // Save attempts by verb key
    const attemptsToSave = {};
    Object.entries(attempts).forEach(([idx, val]) => {
      if (verbs[idx]) {
        attemptsToSave[getVerbKey(verbs[idx])] = val;
      }
    });
    saveAttempts(attemptsToSave);
  }, [progress, attempts, verbs]);

  useEffect(() => {
    if (['prep', 'case', 'both'].includes(mode)) {
      localStorage.setItem('mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (verbs.length && currentIdx !== null && mode !== 'case' && level === 1) {
      setPrepositionChoices(getPrepositionChoices(verbs[currentIdx]));
    }
  }, [verbs, currentIdx, mode, level]);

  useEffect(() => {
    localStorage.setItem('level', level);
  }, [level]);

  useEffect(() => {
    // Restore level from localStorage if available
    const saved = localStorage.getItem('level');
    if (saved === '2') setLevel(2);
    else setLevel(1);
  }, []);

  useEffect(() => {
    // Focus the text input when level 2 and preposition input is shown
    if (level === 2 && mode !== 'case' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [level, mode, currentIdx, showAnswer]);

  useHotkeys('enter', (event) => {
    // Only trigger guess if text input is focused (level 2)
    if (level === 2 && inputRef.current && document.activeElement === inputRef.current && !showAnswer) {
      handleGuess();
    } else if (showAnswer) {
      nextVerb();
    }
  });

  function handleGuess() {
    const current = verbs[currentIdx];
    const correctPrep = current['Preposition']?.trim().toLowerCase();
    const correctCase = current['Case']?.trim().toLowerCase();
    let isCorrect = true;
    if (mode !== 'case') {
      isCorrect = isCorrect && (guess.prep.trim().toLowerCase() === correctPrep);
    }
    if (mode !== 'prep') {
      isCorrect = isCorrect && (guess.case.trim().toLowerCase() === correctCase);
    }
    setShowAnswer(true);
    setAttempts((prev) => {
      const prevCount = prev[currentIdx] || 0;
      const newCount = isCorrect ? prevCount + 1 : prevCount;
      return { ...prev, [currentIdx]: newCount };
    });
    setProgress((p) => {
      const alreadyLearned = p.learned.includes(currentIdx);
      let newScore = p.score;
      let newLearned = p.learned;
      // Only add to learned if correct 3 times and not already learned
      const nextAttempts = (attempts[currentIdx] || 0) + (isCorrect ? 1 : 0);
      if (isCorrect && nextAttempts >= 3 && !alreadyLearned) {
        newScore = p.score + 1;
        newLearned = [...p.learned, currentIdx];
      }
      return { ...p, score: newScore, learned: newLearned };
    });
  }

  function nextVerb() {
    setShowAnswer(false);
    setGuess({ prep: '', case: '' });
    setCurrentIdx(getRandomIndex(verbs.length, progress.learned));
  }

  function giveUp() {
    setShowAnswer(true);
    // Do not mark as learned on give up
  }

  useEffect(() => {
    // Automatically trigger guess when all required selections are made, except for text input (level 2)
    if (!showAnswer) {
      if (level === 1) {
        if (mode === 'both' && guess.prep && guess.case) {
          handleGuess();
        } else if (mode === 'prep' && guess.prep) {
          handleGuess();
        } else if (mode === 'case' && guess.case) {
          handleGuess();
        }
      }
    }
  }, [guess, mode, level, showAnswer]);

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !showAnswer) {
      handleGuess();
    }
  }

  if (csvError) {
    return (
      <div style={{ color: 'red', padding: '2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
        Error: {csvError}
      </div>
    );
  }
  if (!verbs.length || currentIdx === null) return <div>Loading...</div>;
  if (progress.learned.length === verbs.length) {
    return (
      <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8, textAlign: 'center' }}>
        <h2>German Verb Trainer</h2>
        <div style={{ fontSize: '1.2em', margin: '2rem 0' }}>
          🎉 All verbs learned! 🎉<br />
          <b>Score:</b> {progress.score} / {verbs.length}
        </div>
        <button onClick={() => {
          setProgress({ score: 0, learned: [] });
          setAttempts({});
          setCurrentIdx(getRandomIndex(verbs.length, []));
        }}>
          Restart
        </button>
      </div>
    );
  }

  const current = verbs[currentIdx];

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>German Verb Trainer</h2>
      <div style={{ marginBottom: '1rem' }}>
        <b>Level:</b>
        <button onClick={() => setLevel(1)} style={{ marginLeft: 8, background: level === 1 ? '#388e3c' : '#eee', color: level === 1 ? '#fff' : '#333', border: '1px solid #388e3c', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>1 (Choices)</button>
        <button onClick={() => setLevel(2)} style={{ marginLeft: 8, background: level === 2 ? '#388e3c' : '#eee', color: level === 2 ? '#fff' : '#333', border: '1px solid #388e3c', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>2 (Text Input)</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <b>Mode:</b>
        <button onClick={() => { setMode('prep'); localStorage.setItem('mode', 'prep'); }} style={{ marginLeft: 8, background: mode === 'prep' ? '#1976d2' : '#eee', color: mode === 'prep' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Preposition Only</button>
        <button onClick={() => { setMode('case'); localStorage.setItem('mode', 'case'); }} style={{ marginLeft: 8, background: mode === 'case' ? '#1976d2' : '#eee', color: mode === 'case' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Case Only</button>
        <button onClick={() => { setMode('both'); localStorage.setItem('mode', 'both'); }} style={{ marginLeft: 8, background: mode === 'both' ? '#1976d2' : '#eee', color: mode === 'both' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Both</button>
      </div>
      <div><b>Verb:</b> {current['Verb']} <span style={{ color: '#888', fontStyle: 'italic', marginLeft: 8 }}>({current['Translation']})</span></div>
      <div style={{ margin: '1rem 0' }}>
        {mode !== 'case' && (
          <label>
            Preposition:
            {level === 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginLeft: 8 }}>
                {prepositionChoices.map((prep) => {
                  let btnColor = '#eee';
                  let btnTextColor = '#333';
                  let fontWeight = 'normal';
                  let border = '1px solid #bdbdbd';
                  if (showAnswer) {
                    const correctPrep = current['Preposition']?.trim().toLowerCase();
                    if (prep.trim().toLowerCase() === correctPrep) {
                      btnColor = guess.prep.trim().toLowerCase() === correctPrep ? '#c8e6c9' : '#bbdefb';
                      btnTextColor = '#256029';
                      fontWeight = 'bold';
                      border = '2px solid #388e3c';
                    } else if (prep === guess.prep) {
                      btnColor = '#ffcdd2';
                      btnTextColor = '#b71c1c';
                      fontWeight = 'bold';
                      border = '2px solid #b71c1c';
                    }
                  } else if (guess.prep === prep) {
                    btnColor = '#1976d2';
                    btnTextColor = '#fff';
                    fontWeight = 'bold';
                    border = '2px solid #1976d2';
                  }
                  return (
                    <button
                      key={prep}
                      type="button"
                      onClick={() => setGuess({ ...guess, prep })}
                      disabled={showAnswer}
                      style={{
                        background: btnColor,
                        color: btnTextColor,
                        border,
                        borderRadius: '4px',
                        padding: '10px 0',
                        cursor: 'pointer',
                        outline: 'none',
                        fontWeight,
                        width: '100%',
                        fontSize: '1.1em',
                        transition: 'background 0.2s, border 0.2s',
                      }}
                    >
                      {prep}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                ref={inputRef}
                value={guess.prep}
                onChange={(e) => setGuess({ ...guess, prep: e.target.value })}
                onKeyDown={handleInputKeyDown}
                disabled={showAnswer}
                style={{ marginLeft: 8 }}
              />
            )}
          </label>
        )}
        {mode !== 'prep' && (
          <label style={{ marginLeft: 16 }}>
            Case:
            <div style={{ display: 'inline-block', marginLeft: 8 }}>
              {["Akk", "Dat"].map((caseOpt) => {
                let btnColor = '#eee';
                let btnTextColor = '#333';
                let fontWeight = 'normal';
                let border = '1px solid #bdbdbd';
                if (showAnswer) {
                  const correctCase = current['Case']?.trim().toLowerCase();
                  if (caseOpt.toLowerCase() === correctCase) {
                    btnColor = guess.case.trim().toLowerCase() === correctCase ? '#c8e6c9' : '#bbdefb';
                    btnTextColor = '#256029';
                    fontWeight = 'bold';
                    border = '2px solid #388e3c';
                  } else if (caseOpt === guess.case) {
                    btnColor = '#ffcdd2';
                    btnTextColor = '#b71c1c';
                    fontWeight = 'bold';
                    border = '2px solid #b71c1c';
                  }
                } else if (guess.case === caseOpt) {
                  btnColor = '#1976d2';
                  btnTextColor = '#fff';
                  fontWeight = 'bold';
                  border = '2px solid #1976d2';
                }
                return (
                  <button
                    key={caseOpt}
                    type="button"
                    onClick={() => setGuess({ ...guess, case: caseOpt })}
                    disabled={showAnswer}
                    style={{
                      background: btnColor,
                      color: btnTextColor,
                      border,
                      borderRadius: caseOpt === 'Akk' ? '4px 0 0 4px' : '0 4px 4px 0',
                      padding: '6px 16px',
                      cursor: 'pointer',
                      outline: 'none',
                      fontWeight,
                      marginLeft: caseOpt === 'Dat' ? '-1px' : undefined,
                      fontSize: '1.1em',
                      transition: 'background 0.2s, border 0.2s',
                    }}
                  >
                    {caseOpt}
                  </button>
                );
              })}
            </div>
          </label>
        )}
      </div>
      {!showAnswer && (
        <>
          <button onClick={handleGuess}>Guess</button>
          <button onClick={giveUp} style={{ marginLeft: 8 }}>Give Up</button>
        </>
      )}
      {showAnswer && level === 1 && mode !== 'case' && (
        <div style={{ marginTop: '1rem' }}></div>
      )}
      {showAnswer && level === 2 && mode !== 'case' && (
        <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: 4 }}>
          <div>
            <b>Preposition:</b>
            <span style={{
              color: guess.prep.trim().toLowerCase() === (current['Preposition']?.trim().toLowerCase() || '') ? 'green' : 'red',
              fontWeight: 'bold',
              marginLeft: 8
            }}>
              {guess.prep}
            </span>
            {guess.prep.trim().toLowerCase() !== (current['Preposition']?.trim().toLowerCase() || '') && current['Preposition'] && (
              <span style={{ color: 'blue', marginLeft: 8 }}>
                ({current['Preposition']})
              </span>
            )}
          </div>
        </div>
      )}
      {/* Only show Example and Translation when answer is displayed */}
      {showAnswer && (
        <>
          <div><b>Example:</b> {current['Exemple']}</div>
          <div><b>Translation:</b> {current['ExampleTranslation']}</div>
        </>
      )}
      <button onClick={nextVerb} style={{ marginTop: 8 }}>Next</button>
      <div style={{ marginTop: '2rem', fontSize: '1.1em' }}>
        <b>Score:</b> {progress.score} | <b>Learned:</b> {progress.learned.length}/{verbs.length}
      </div>
    </div>
  );
}
