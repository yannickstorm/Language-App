import Papa from 'papaparse';
import { getRandomIndex } from './utils';

export function fetchAndParseCSV(CSV_FILE, progress, setVerbs, setCurrentIdx, setCsvError) {
  console.log('Fetching CSV:', CSV_FILE);
  fetch(CSV_FILE)
    .then((res) => {
      console.log('Fetch response:', res);
      if (!res.ok) {
        console.error('CSV file not found');
        setCsvError('CSV file not found');
        return Promise.reject('CSV file not found');
      }
      return res.text();
    })
    .then((text) => {
      console.log('CSV file text:', text.slice(0, 200));
      if (text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        console.error('Vite served index.html instead of CSV file.');
        setCsvError('CSV file not found (Vite served index.html instead)');
        return;
      }
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Papa.parse results:', results);
          if (!results.data.length) {
            console.error('CSV file is empty or invalid.');
            setCsvError('CSV file is empty or invalid.');
            return;
          }
          setVerbs(results.data);
          setCurrentIdx(getRandomIndex(results.data.length, progress.learned));
        },
        error: (err) => {
          console.error('Papa.parse error:', err);
          setCsvError('Failed to parse CSV file.');
        }
      });
    })
    .catch((err) => {
      console.error('Fetch/Papa.parse error:', err);
      setCsvError(err.message || 'Failed to load CSV file.');
    });
}
