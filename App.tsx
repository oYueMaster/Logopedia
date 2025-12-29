
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import confetti from 'canvas-confetti';

type Category = 'dia' | 'tarde' | 'noche' | 'varios';
interface PECS {
  id: string;
  name: string;
  image: string;
  category: Category;
}

const INITIAL_PECS: PECS[] = [
  { id: 'd1', name: 'Levantarse', image: 'https://img.icons8.com/emoji/200/sun-with-face.png', category: 'dia' },
  { id: 'd2', name: 'Dientes', image: 'https://img.icons8.com/color/200/toothbrush.png', category: 'dia' },
  { id: 'd3', name: 'Desayuno', image: 'https://img.icons8.com/color/200/pancakes.png', category: 'dia' },
  { id: 'd4', name: 'Pan', image: 'https://img.icons8.com/color/200/bread.png', category: 'dia' },
  { id: 'd5', name: 'Leche', image: 'https://img.icons8.com/color/200/milk-bottle.png', category: 'dia' },
  { id: 'd6', name: 'Fruta', image: 'https://img.icons8.com/color/200/apple.png', category: 'dia' },
  { id: 'd7', name: 'Agua', image: 'https://img.icons8.com/color/200/water-glass.png', category: 'dia' },
  { id: 't1', name: 'Sopa', image: 'https://img.icons8.com/color/200/soup-plate.png', category: 'tarde' },
  { id: 't2', name: 'Fideos', image: 'https://img.icons8.com/color/200/spaghetti.png', category: 'tarde' },
  { id: 't3', name: 'Arroz', image: 'https://img.icons8.com/color/200/rice-bowl.png', category: 'tarde' },
  { id: 't4', name: 'Carne', image: 'https://img.icons8.com/color/200/steak.png', category: 'tarde' },
  { id: 't5', name: 'Jugo', image: 'https://img.icons8.com/color/200/orange-juice.png', category: 'tarde' },
  { id: 't6', name: 'Baño', image: 'https://img.icons8.com/color/200/bathtub.png', category: 'tarde' },
  { id: 't7', name: 'Parque', image: 'https://img.icons8.com/color/200/park-bench.png', category: 'tarde' },
  { id: 't8', name: 'Jugar', image: 'https://img.icons8.com/color/200/toy-car.png', category: 'tarde' },
  { id: 'n1', name: 'Lonche', image: 'https://img.icons8.com/color/200/sandwich.png', category: 'noche' },
  { id: 'n2', name: 'Dormir', image: 'https://img.icons8.com/emoji/200/sleeping-face.png', category: 'noche' },
  { id: 'v1', name: 'Ayuda', image: 'https://img.icons8.com/color/200/help.png', category: 'varios' },
  { id: 'v2', name: 'Quiero', image: 'https://img.icons8.com/color/200/hand.png', category: 'varios' }
];

export default function App() {
  const [view, setView] = useState<'list' | 'challenge' | 'sentence' | 'admin_login' | 'admin_panel'>('list');
  const [activeCat, setActiveCat] = useState<Category>('dia');
  const [pecs, setPecs] = useState<PECS[]>(INITIAL_PECS);
  const [activeItem, setActiveItem] = useState<PECS | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<{status: string, message: string} | null>(null);
  const [sentence, setSentence] = useState<(PECS | null)[]>([null, null, null]);
  const [login, setLogin] = useState({ u: '', p: '' });
  const [newItem, setNewItem] = useState<Partial<PECS>>({ category: 'dia', name: '', image: '' });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('logopedia_v8_final');
    if (saved) setPecs(JSON.parse(saved));
  }, []);

  const saveAll = (data: PECS[]) => {
    setPecs(data);
    localStorage.setItem('logopedia_v8_final', JSON.stringify(data));
  };

  const speak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.pitch = 1.2;
    u.rate = 0.85;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  };

  const startRecording = async () => {
    setAiResponse(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        handleProcessAudio(audioBlob, mimeType);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Permite el micrófono para poder jugar.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessAudio = async (blob: Blob, mimeType: string) => {
    if (!activeItem) return;
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
        const apiKey = (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [
            { text: `Asistente logopedia TEA. El niño debe decir "${activeItem.name}". Si el audio se parece, status: "success". Si no, status: "retry". JSON: {"status": "success"|"retry", "message": "refuerzo corto"}` },
            { inlineData: { data: base64Audio, mimeType: mimeType } }
          ]}],
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING, enum: ["success", "retry"] },
                message: { type: Type.STRING }
              },
              required: ["status", "message"]
            }
          }
        });
        const data = JSON.parse(response.text || '{}');
        setAiResponse(data);
        speak(data.message);
        if (data.status === 'success') confetti({ particleCount: 150, spread: 70 });
      } catch (e) {
        setAiResponse({ status: 'retry', message: `¡Casi! Repite: ${activeItem.name}` });
      } finally { setIsAnalyzing(false); }
    };
  };

  return (
    <div className="flex h-screen bg-sky-50 overflow-hidden font-sans">
      <aside className="w-20 md:w-28 bg-white border-r border-sky-100 flex flex-col items-center py-12 gap-10 shadow-xl z-40">
        <button onClick={() => { setActiveCat('dia'); setView('list'); }} className={`text-4xl md:text-5xl transition-all ${activeCat === 'dia' && view === 'list' ? 'scale-125' : 'opacity-20'}`}>☀️</button>
        <button onClick={() => { setActiveCat('tarde'); setView('list'); }} className={`text-4xl md:text-5xl transition-all ${activeCat === 'tarde' && view === 'list' ? 'scale-125' : 'opacity-20'}`}>🌤️</button>
        <button onClick={() => { setActiveCat('noche'); setView('list'); }} className={`text-4xl md:text-5xl transition-all ${activeCat === 'noche' && view === 'list' ? 'scale-125' : 'opacity-20'}`}>🌙</button>
        <button onClick={() => { setActiveCat('varios'); setView('list'); }} className={`text-4xl md:text-5xl transition-all ${activeCat === 'varios' && view === 'list' ? 'scale-125' : 'opacity-20'}`}>📦</button>
        <button onClick={() => setView('sentence')} className={`text-4xl md:text-5xl transition-all ${view === 'sentence' ? 'scale-125' : 'opacity-20'}`}>🗣️</button>
        <button onClick={() => setView('admin_login')} className="mt-auto opacity-5 p-4 text-2xl">⚙️</button>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        {view === 'list' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl md:text-6xl font-black text-sky-900 mb-12 uppercase text-center md:text-left">
              {activeCat === 'dia' ? 'Buenos Días' : activeCat === 'tarde' ? 'Tarde' : activeCat === 'noche' ? 'Noche' : 'Mis Cosas'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
              {pecs.filter(p => p.category === activeCat).map(p => (
                <button key={p.id} onClick={() => { setActiveItem(p); setView('challenge'); speak(p.name); }}
                  className="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all border-4 border-white flex flex-col items-center gap-4">
                  <img src={p.image} className="w-24 h-24 md:w-32 md:h-32 object-contain" />
                  <span className="font-bold text-sky-800 uppercase text-[10px] md:text-xs text-center">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'challenge' && activeItem && (
          <div className="max-w-2xl mx-auto text-center pt-10">
            <button onClick={() => setView('list')} className="mb-10 text-sky-400 font-bold uppercase underline">Volver</button>
            <div className="bg-white p-12 rounded-[5rem] shadow-2xl border-[16px] border-sky-100 flex flex-col items-center gap-10">
              <img src={activeItem.image} className="w-56 h-56 md:w-72 object-contain drop-shadow-2xl animate-pulse" />
              <h1 className="bg-sky-600 text-white px-10 py-4 rounded-full text-3xl font-black uppercase">{activeItem.name}</h1>
              
              {!aiResponse && !isAnalyzing ? (
                <div className="flex flex-col items-center gap-6">
                  <button 
                    onMouseDown={startRecording} onMouseUp={stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }} onTouchEnd={stopRecording}
                    className={`w-40 h-40 rounded-full bg-rose-500 shadow-xl flex items-center justify-center text-white text-6xl active:scale-90 ${isRecording ? 'ring-8 ring-rose-200' : ''}`}>
                    🎤
                  </button>
                  <p className="font-black text-sky-300 uppercase">Mantén para hablar</p>
                </div>
              ) : null}

              {isAnalyzing && <div className="text-3xl font-black text-sky-600 animate-pulse">ESCUCHANDO...</div>}

              {aiResponse && (
                <div className="flex flex-col items-center gap-6 animate-in fade-in">
                  <div className="text-9xl">{aiResponse.status === 'success' ? '🌟' : '🦁'}</div>
                  <p className="text-3xl font-black text-sky-950 uppercase">{aiResponse.message}</p>
                  <button onClick={() => { setAiResponse(null); setView('list'); }} className="bg-sky-950 text-white px-12 py-6 rounded-3xl font-black text-xl uppercase">Continuar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'admin_login' && (
          <div className="flex items-center justify-center h-full">
            <form onSubmit={e => { e.preventDefault(); if (login.u === 'xavier8605' && login.p === 'Alfonso1@') setView('admin_panel'); else alert('❌'); }} 
                  className="bg-white p-16 rounded-[4rem] shadow-2xl w-full max-w-sm flex flex-col gap-6">
              <h2 className="text-3xl font-black text-center text-sky-900">ADMIN</h2>
              <input value={login.u} onChange={e=>setLogin({...login, u: e.target.value})} placeholder="Usuario" className="p-4 bg-sky-50 rounded-2xl border-2 border-sky-100 text-center" />
              <input type="password" value={login.p} onChange={e=>setLogin({...login, p: e.target.value})} placeholder="Clave" className="p-4 bg-sky-50 rounded-2xl border-2 border-sky-100 text-center" />
              <button className="bg-sky-800 text-white p-6 rounded-2xl font-black">ENTRAR</button>
              <button type="button" onClick={() => setView('list')} className="text-sky-300">Cerrar</button>
            </form>
          </div>
        )}

        {view === 'admin_panel' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black text-sky-900">Gestionar</h2>
              <button onClick={() => setView('list')} className="bg-red-500 text-white px-6 py-2 rounded-xl">Salir</button>
            </div>
            <div className="bg-white p-8 rounded-[3rem] mb-10 shadow-sm">
              <form onSubmit={e => { e.preventDefault(); if(!newItem.image || !newItem.name) return; saveAll([...pecs, {...newItem, id: Date.now().toString()} as PECS]); alert('Listo'); }} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <input value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} placeholder="Nombre" className="p-4 bg-slate-50 rounded-xl" />
                <input type="file" onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = () => setNewItem({...newItem, image: r.result as string}); r.readAsDataURL(f); } }} />
                <select value={newItem.category} onChange={e=>setNewItem({...newItem, category: e.target.value as any})} className="p-4 bg-slate-50 rounded-xl">
                  <option value="dia">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option><option value="varios">Varios</option>
                </select>
                <button className="bg-sky-600 text-white p-4 rounded-xl font-black">Agregar</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pecs.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border">
                  <div className="flex items-center gap-4"><img src={p.image} className="w-12 h-12 object-contain" /><p className="font-bold">{p.name}</p></div>
                  <button onClick={() => saveAll(pecs.filter(x => x.id !== p.id))} className="text-red-500">Borrar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'sentence' && (
           <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-black text-sky-900 mb-8">Mis Frases</h2>
              <div className="flex gap-4 justify-center mb-10 bg-white p-10 rounded-3xl min-h-[150px] items-center">
                {sentence.map((s, idx) => (
                  <div key={idx} onClick={() => { const n = [...sentence]; n[idx] = null; setSentence(n); }} className="w-24 h-24 bg-sky-50 border-2 rounded-2xl flex items-center justify-center">
                    {s && <img src={s.image} className="w-20 h-20 object-contain" />}
                  </div>
                ))}
              </div>
              <button onClick={() => speak(sentence.filter(s => s).map(s => s?.name).join(' '))} className="bg-sky-600 text-white p-6 rounded-2xl font-black text-2xl mb-10 shadow-lg">Hablar 🔊</button>
              <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                {pecs.map(p => (
                  <button onClick={() => { const i = sentence.findIndex(s => s === null); if(i !== -1){ const n = [...sentence]; n[i] = p; setSentence(n); speak(p.name); } }} className="bg-white p-2 rounded-2xl border">
                    <img src={p.image} className="w-10 h-10 object-contain mx-auto" />
                    <p className="text-[8px] font-bold mt-1">{p.name}</p>
                  </button>
                ))}
              </div>
           </div>
        )}
      </main>
    </div>
  );
}
