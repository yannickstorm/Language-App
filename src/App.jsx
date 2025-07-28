import React, { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getRandomIndex, loadProgress, saveProgress, loadAttempts, saveAttempts } from './utils';
import { fetchAndParseCSV } from './csvLoader';

const CSV_FILE = '/Top_50_Verbes_avec_exemples_traduits.csv';
// const CSV_FILE = '/Test3.csv';

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

  // Helper to get a unique key for each verb (verb+preposition+example)
  function getVerbKey(verbObj) {
    return `${verbObj['Verb']}|${verbObj['Preposition']}|${verbObj['Exemple']}`;
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

  useHotkeys('enter', () => {
    if (showAnswer) {
      nextVerb();
    } else {
      handleGuess();
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
        <b>Mode:</b>
        <button onClick={() => setMode('prep')} style={{ marginLeft: 8, background: mode === 'prep' ? '#1976d2' : '#eee', color: mode === 'prep' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Preposition Only</button>
        <button onClick={() => setMode('case')} style={{ marginLeft: 8, background: mode === 'case' ? '#1976d2' : '#eee', color: mode === 'case' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Case Only</button>
        <button onClick={() => setMode('both')} style={{ marginLeft: 8, background: mode === 'both' ? '#1976d2' : '#eee', color: mode === 'both' ? '#fff' : '#333', border: '1px solid #1976d2', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Both</button>
      </div>
      <div><b>Verb:</b> {current['Verb']} <span style={{ color: '#888', fontStyle: 'italic', marginLeft: 8 }}>({current['Translation']})</span></div>
      <div style={{ margin: '1rem 0' }}>
        {mode !== 'case' && (
          <label>
            Preposition:
            <input
              value={guess.prep}
              onChange={(e) => setGuess({ ...guess, prep: e.target.value })}
              disabled={showAnswer}
              style={{ marginLeft: 8 }}
            />
          </label>
        )}
        {mode !== 'prep' && (
          <label style={{ marginLeft: 16 }}>
            Case:
            <div style={{ display: 'inline-block', marginLeft: 8 }}>
              <button
                type="button"
                onClick={() => setGuess({ ...guess, case: 'Akk' })}
                disabled={showAnswer}
                style={{
                  background: guess.case === 'Akk' ? '#1976d2' : '#eee',
                  color: guess.case === 'Akk' ? '#fff' : '#333',
                  border: '1px solid #1976d2',
                  borderRadius: '4px 0 0 4px',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: guess.case === 'Akk' ? 'bold' : 'normal',
                }}
              >
                Akk
              </button>
              <button
                type="button"
                onClick={() => setGuess({ ...guess, case: 'Dat' })}
                disabled={showAnswer}
                style={{
                  background: guess.case === 'Dat' ? '#1976d2' : '#eee',
                  color: guess.case === 'Dat' ? '#fff' : '#333',
                  border: '1px solid #1976d2',
                  borderRadius: '0 4px 4px 0',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: guess.case === 'Dat' ? 'bold' : 'normal',
                  marginLeft: '-1px',
                }}
              >
                Dat
              </button>
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
      {showAnswer && (
        <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: 4 }}>
          {mode !== 'case' && (
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
          )}
          {mode !== 'prep' && (
            <div>
              <b>Case:</b>
              <span style={{
                color: guess.case.trim().toLowerCase() === (current['Case']?.trim().toLowerCase() || '') ? 'green' : 'red',
                fontWeight: 'bold',
                marginLeft: 8
              }}>
                {guess.case}
              </span>
              {guess.case.trim().toLowerCase() !== (current['Case']?.trim().toLowerCase() || '') && current['Case'] && (
                <span style={{ color: 'blue', marginLeft: 8 }}>
                  ({current['Case']})
                </span>
              )}
            </div>
          )}
          <div><b>Example:</b> {current['Exemple']}</div>
          <div><b>Translation:</b> {current['ExampleTranslation']}</div>
          <button onClick={nextVerb} style={{ marginTop: 8 }}>Next</button>
        </div>
      )}
      <div style={{ marginTop: '2rem', fontSize: '1.1em' }}>
        <b>Score:</b> {progress.score} | <b>Learned:</b> {progress.learned.length}/{verbs.length}
      </div>
    </div>
  );
}
