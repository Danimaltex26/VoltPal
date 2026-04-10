import { useState, useEffect } from 'react';

export default function LoadingSpinner({ message, messages }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!messages || messages.length <= 1) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages]);

  const displayMessage = messages ? messages[msgIndex] : message;

  return (
    <div className="spinner-container">
      <div className="spinner" />
      {displayMessage && <p className="spinner-message">{displayMessage}</p>}
    </div>
  );
}
