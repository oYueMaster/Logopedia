
export const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Intentar encontrar una voz femenina en español
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => 
    (v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Female') || v.name.includes('Mónica') || v.name.includes('Paulina')))
  );

  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  utterance.lang = 'es-ES';
  // Ajustes para voz "joven y suave"
  utterance.pitch = 1.25; 
  utterance.rate = 0.85; 
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};
