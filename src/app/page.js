'use client';
import { useState } from 'react';

export default function HomePage() {
  const [name, setName] = useState('Alex');
  const [story, setStory] = useState('');
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStory('');
    setAudioSrc('');
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        setStory(data.story);
        setAudioSrc(data.audio);
      } else {
        setStory(`Error: ${data.error}`);
      }
    } catch (err) {
      setStory(`Fetch error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-8">
      <h1 className="text-3xl font-bold mb-6">ThrobSync Story Player</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md mb-6">
        <label htmlFor="name" className="block mb-2 font-medium">Your Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Story'}
        </button>
      </form>

      {story && (
        <div className="w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-2">Story Text</h2>
          <p className="mb-4 whitespace-pre-wrap bg-gray-100 p-4 rounded">{story}</p>
          {audioSrc && (
            <audio controls src={audioSrc} className="w-full">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
    </main>
  );
}
