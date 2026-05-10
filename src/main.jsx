import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const examples = [
  'What flashing do I need for a chimney on 5-rib roofing?',
  'When do long roof runs need movement allowance?',
  'How should I think about valleys in high wind zones?',
  'Can I seal a leaking penetration from underneath?',
  'What should I check before installing a roof at low pitch?'
];

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function askRoofCode(e) {
    e?.preventDefault();
    const message = question.trim();
    if (!message) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setAnswer(data.reply || 'No answer returned.');
    } catch (err) {
      setError(err.message || 'Could not contact the assistant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="badge">NZ Roofing Guidance Assistant</div>
        <h1>RoofCode NZ</h1>
        <p>
          Ask practical roofing questions about flashings, laps, ridges, valleys, penetrations,
          low pitch roofs, wind zones, fixings, gutters and moisture control.
        </p>
      </section>

      <section className="card warning">
        <strong>Important:</strong> This tool gives guidance only. Always verify exact compliance
        against the current NZ Building Code, E2/AS1, NZMRM Code of Practice, manufacturer data
        sheets and consent drawings.
      </section>

      <form className="card form" onSubmit={askRoofCode}>
        <label htmlFor="question">Ask a roofing question</label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: On a long 5-rib run, when do I need movement allowance or special washers?"
        />
        <button disabled={loading || !question.trim()} type="submit">
          {loading ? 'Checking...' : 'Ask RoofCode NZ'}
        </button>
      </form>

      <section className="examples">
        {examples.map((item) => (
          <button key={item} onClick={() => setQuestion(item)}>
            {item}
          </button>
        ))}
      </section>

      {error && <section className="card error">{error}</section>}

      {answer && (
        <section className="card answer">
          <h2>Answer</h2>
          <pre>{answer}</pre>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
