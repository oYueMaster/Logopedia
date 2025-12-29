
export const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.pitch = 1.2;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};
