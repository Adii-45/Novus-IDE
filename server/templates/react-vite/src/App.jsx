import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app">
      <h1>React + Vite</h1>
      <p>Edit <code>src/App.jsx</code> and watch it hot-reload in the preview.</p>
      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
    </main>
  );
}
