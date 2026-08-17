import { useEffect, useState } from 'react';
import { HealthResponse } from '@larry/shared';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Larry] health check started');
    
    fetch('http://localhost:3001/api/health')
      .then((res) => {
        console.log('[Larry] response:', res.status, 'OK:', res.ok);
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: HealthResponse) => {
        console.log('[Larry] health success:', data);
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        console.error('[Larry] health error:', err);
        setError(err.message);
      });
  }, []);

  console.log('[Larry] Render state -> Error:', error, '| Health:', health ? 'Data exists' : 'Null');

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Larry Control MVP</h1>
      <p>Project Foundation initialized.</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Backend Status</h2>
        {error ? (
          <p style={{ color: 'red' }}>Error connecting to backend: {error}</p>
        ) : health ? (
          <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p>Pinging backend...</p>
        )}
      </div>
    </div>
  );
}
