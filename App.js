
import React, { useState, useEffect, useRef } from 'https://esm.sh/react@19.0.0';
import htm from 'https://esm.sh/htm@3.1.1';
import confetti from 'https://esm.sh/canvas-confetti@1.9.2';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@1.34.0';

const html = htm.bind(React.createElement);

const INITIAL_PECS = [
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
  { id: 't9', name: 'Bicicleta', image: 'https://img.icons8.com/color/200/bicycle.png', category: 'tarde' },
  { id: 't10', name: 'Papitas', image: 'https://img.icons8.com/color/200/french-fries.png', category: 'tarde' },
  { id: 'n1', name: 'Lonche', image: 'https://img.icons8.com/color/200/sandwich.png', category: 'noche' },
  { id: 'n2', name: 'Dormir', image: 'https://img.icons8.com/emoji/200/sleeping-face.png', category: 'noche' },
  { id: 'v1', name: 'Ayuda', image: 'https://img.icons8.com/color/200/help.png', category: 'varios' },
  { id: 'v2', name: 'Quiero', image: 'https://img.icons8.com/color/200/hand.png', category: 'varios' },
  { id: 'v3', name: 'Yo', image: 'https://img.icons8.com/color/200/boy.png', category: 'varios' }
];

const App = () => {
  const [view, setView] = useState('list');
  const [cat, setCat] = useState('dia');
  const [pecs, setPecs] = useState([]);
  const [active, setActive] = useState(null);
  const [isRec, setIsRec] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [res, setRes] = useState(null);
  const [stream, setStream] = useState(null);
  const [sentence, setSentence] = useState([null, null, null]);
  const [login, setLogin] = useState({ u: '', p: '' });
  const [newItem, setNewItem] = useState({ name: '', image: '', category: 'dia' });

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const saved = localStorage.getItem('logopedia_master_data_v6');
    setPecs(saved ? JSON.parse(saved) : INITIAL_PECS);
  }, []);

  const save = (data) => {
    setPecs(data);
    localStorage.setItem('logopedia_master_data_v6', JSON.stringify(data));
  };

  const speak = (t) => {
    if (!t) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-ES';
    u.pitch = 1.3;
    u.rate = 0.8;
    // Fix para Chrome Mobile: a veces necesita una pequeña interacción o resume
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  };

  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      
      // Detección de tipos MIME para compatibilidad Android/iOS
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/aac';

      const r = new MediaRecorder(s, { mimeType });
      recorderRef.current = r;
      chunksRef.current = [];
      
      r.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      r.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setIsAnalysing(true);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          await analyze(base64, mimeType);
        };
      };

      r.start();
      setIsRec(true);
    } catch (e) { 
      alert("Error de micrófono: " + e.message); 
    }
  };

  const stopRec = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsRec(false);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
    }
  };

  const analyze = async (base64, mime) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [
          { text: `Eres un asistente de logopedia para niños con autismo. Evalúa si el audio contiene la palabra "${active.name}" (o algo muy similar). Responde ÚNICAMENTE con este JSON: {"status": "success" | "retry", "message": "un mensaje motivador y corto"}` },
          { inlineData: { data: base64, mimeType: mime } }
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
      
      const data = JSON.parse(response.text);
      setRes(data);
      speak(data.message);
      if (data.status === 'success') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e) {
      console.error("Error en análisis:", e);
      const fallback = { status: 'retry', message: '¡Sigue intentando! Vamos a decir: ' + active.name };
      setRes(fallback);
      speak(fallback.message);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addToSentence = (item) => {
    const emptyIdx = sentence.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      const newSentence = [...sentence];
      newSentence[emptyIdx] = item;
      setSentence(newSentence);
      speak(item.name);
    }
  };

  return html`
    <div className="flex h-screen bg-sky-50 overflow-hidden font-sans select-none">
      <!-- SIDEBAR -->
      <aside className="w-20 md:w-24 bg-white border-r border-sky-100 flex flex-col items-center py-10 gap-8 shadow-2xl z-40">
        <button onClick=${() => {setCat('dia'); setView('list');}} className="text-4xl md:text-5xl hover:scale-125 transition-transform ${cat === 'dia' && view === 'list' ? 'bg-sky-100 p-2 rounded-2xl' : ''}">☀️</button>
        <button onClick=${() => {setCat('tarde'); setView('list');}} className="text-4xl md:text-5xl hover:scale-125 transition-transform ${cat === 'tarde' && view === 'list' ? 'bg-orange-100 p-2 rounded-2xl' : ''}">🌤️</button>
        <button onClick=${() => {setCat('noche'); setView('list');}} className="text-4xl md:text-5xl hover:scale-125 transition-transform ${cat === 'noche' && view === 'list' ? 'bg-indigo-100 p-2 rounded-2xl' : ''}">🌙</button>
        <button onClick=${() => {setCat('varios'); setView('list');}} className="text-4xl md:text-5xl hover:scale-125 transition-transform ${cat === 'varios' && view === 'list' ? 'bg-green-100 p-2 rounded-2xl' : ''}">📦</button>
        <div className="h-px w-10 bg-sky-100 my-2"></div>
        <button onClick=${() => setView('phrases')} className="text-4xl md:text-5xl hover:scale-125 transition-transform ${view === 'phrases' ? 'bg-rose-100 p-2 rounded-2xl' : ''}">🗣️</button>
        <button onClick=${() => setView('login')} className="mt-auto text-3xl opacity-10 hover:opacity-100 transition-opacity">⚙️</button>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        ${view === 'list' && html`
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-3xl md:text-5xl font-black text-sky-800 mb-8 md:mb-12 uppercase tracking-tight text-center md:text-left">
                ${cat === 'dia' ? '¡Buenos días!' : cat === 'tarde' ? 'En la Tarde' : cat === 'noche' ? 'En la Noche' : 'Mis Cosas'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-10">
              ${pecs.filter(p => p.category === cat).map(p => html`
                <button key=${p.id} onClick=${() => {setActive(p); setView('challenge'); setRes(null); speak(p.name);}} 
                  className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[4rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all border-4 border-white flex flex-col items-center gap-4 md:gap-6 active:scale-95 group">
                  <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                    <img src=${p.image} className="max-w-full max-h-full object-contain pointer-events-none group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-bold text-sky-900 uppercase text-[10px] md:text-xs tracking-widest text-center">${p.name}</span>
                </button>
              `)}
            </div>
          </div>
        `}

        ${view === 'phrases' && html`
          <div className="max-w-4xl mx-auto flex flex-col gap-8 md:gap-12 pt-6 animate-in slide-in-from-bottom duration-500">
            <h2 className="text-2xl md:text-4xl font-black text-center text-sky-900 uppercase tracking-widest">¿Qué quieres decir?</h2>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 bg-white p-6 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-inner border-4 border-dashed border-sky-200 min-h-[180px] md:min-h-[250px]">
              ${sentence.map((s, idx) => html`
                <div key=${idx} onClick=${() => {const n = [...sentence]; n[idx] = null; setSentence(n);}}
                  className="w-24 h-24 md:w-44 md:h-44 bg-sky-50 rounded-[2rem] md:rounded-[3rem] border-2 border-sky-100 flex items-center justify-center cursor-pointer hover:bg-red-50 group transition-all relative shadow-sm">
                  ${s ? html`
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src=${s.image} className="w-20 h-20 md:w-36 md:h-36 object-contain" />
                        <div className="absolute top-0 right-0 md:-top-3 md:-right-3 bg-red-500 text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 shadow-xl">X</div>
                    </div>
                  ` : html`<span className="text-sky-200 font-black uppercase text-[8px] md:text-[10px]">Vacío</span>`}
                </div>
              `)}
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-10">
              <button onClick=${() => {
                const phrase = sentence.filter(s => s).map(s => s.name).join(' ');
                if (phrase) speak(phrase);
                else speak("Toca los dibujos para hablar");
              }} 
                className="bg-sky-600 text-white px-10 md:px-20 py-4 md:py-8 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-xl md:text-3xl shadow-2xl active:scale-90 hover:bg-sky-700 transition-all uppercase tracking-widest">ESCUCHAR 🔊</button>
              <button onClick=${() => setSentence([null, null, null])} 
                className="bg-slate-200 text-slate-500 px-8 md:px-16 py-4 md:py-8 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-xl md:text-3xl active:scale-90 hover:bg-slate-300 transition-all uppercase">LIMPIAR 🗑️</button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4 pt-8 md:pt-12 border-t border-sky-100 h-64 overflow-y-auto pr-2">
              ${pecs.map(p => html`
                <button key=${p.id} onClick=${() => addToSentence(p)} 
                  className="bg-white p-3 rounded-2xl shadow-sm border-2 border-transparent hover:border-sky-400 active:scale-90 transition-all flex flex-col items-center">
                  <img src=${p.image} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                  <span className="text-[8px] md:text-[9px] font-black uppercase mt-1 text-sky-800 text-center truncate w-full">${p.name}</span>
                </button>
              `)}
            </div>
          </div>
        `}

        ${view === 'challenge' && html`
          <div className="max-w-2xl mx-auto text-center pt-2 md:pt-6 animate-in zoom-in duration-300">
            <button onClick=${() => setView('list')} className="mb-8 md:mb-12 font-black text-sky-400 uppercase tracking-widest hover:text-sky-600 flex items-center justify-center gap-2 mx-auto transition-colors">
              <span className="text-xl">⬅</span> VOLVER
            </button>
            <div className="bg-white p-8 md:p-16 rounded-[4rem] md:rounded-[6rem] shadow-2xl border-[10px] md:border-[16px] border-sky-100 flex flex-col items-center gap-8 md:gap-12">
              <div className="relative">
                <div className="w-48 h-48 md:w-72 md:h-72 flex items-center justify-center">
                    <img src=${active.image} className="max-w-full max-h-full object-contain drop-shadow-2xl animate-pulse" />
                </div>
                <h1 className="absolute -bottom-6 md:-bottom-10 left-1/2 -translate-x-1/2 bg-sky-600 text-white px-8 md:px-16 py-3 md:py-6 rounded-full text-2xl md:text-5xl font-black uppercase tracking-widest shadow-2xl whitespace-nowrap border-4 md:border-8 border-white">${active.name}</h1>
              </div>
              
              <div className="mt-8 md:mt-12 w-full">
                ${!res && !isAnalysing ? html`
                  <div className="flex flex-col items-center gap-8">
                    <button 
                      onMouseDown=${startRec} 
                      onMouseUp=${stopRec}
                      onTouchStart=${startRec}
                      onTouchEnd=${stopRec}
                      className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-red-500 shadow-[0_15px_40px_rgba(239,68,68,0.5)] flex items-center justify-center text-white text-6xl md:text-[10rem] active:scale-90 transition-all cursor-pointer ${isRec ? 'ring-[15px] md:ring-[25px] ring-red-100 animate-pulse' : 'hover:scale-105'}">
                      🎤
                    </button>
                    <p className="font-black text-sky-300 uppercase text-lg md:text-2xl tracking-widest animate-bounce">MANTÉN PARA HABLAR</p>
                  </div>
                ` : null}

                ${isAnalysing && html`
                  <div className="flex flex-col items-center gap-6 py-12">
                      <div className="w-20 h-20 md:w-32 md:h-32 border-[8px] md:border-[12px] border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-2xl md:text-4xl font-black text-sky-600 animate-pulse uppercase tracking-widest">ANALIZANDO...</p>
                  </div>
                `}

                ${res && html`
                  <div className="flex flex-col items-center gap-8 md:gap-12 animate-in fade-in duration-700">
                    <div className="text-[8rem] md:text-[12rem] drop-shadow-2xl transform hover:scale-110 transition-transform">${res.status === 'success' ? '🌟' : '🦁'}</div>
                    <p className="text-2xl md:text-5xl font-black text-sky-900 uppercase leading-tight max-w-lg">${res.message}</p>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 mt-4 w-full justify-center">
                      ${res.status === 'retry' && html`
                          <button onClick=${() => {setRes(null); speak(active.name);}} className="bg-sky-500 text-white px-10 md:px-20 py-4 md:py-8 rounded-[1.5rem] md:rounded-[3rem] font-black text-xl md:text-3xl shadow-2xl hover:bg-sky-600 active:scale-95 transition-all uppercase tracking-widest">REPETIR 🎤</button>
                      `}
                      <button onClick=${() => setView('list')} className="bg-sky-950 text-white px-10 md:px-20 py-4 md:py-8 rounded-[1.5rem] md:rounded-[3rem] font-black text-xl md:text-3xl shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest">LISTO ➔</button>
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>
        `}

        ${view === 'login' && html`
          <div className="flex items-center justify-center h-full animate-in zoom-in duration-300 p-4">
            <form onSubmit=${(e) => {
              e.preventDefault();
              if (login.u === 'xavier8605' && login.p === 'Alfonso1@') setView('admin');
              else alert("Usuario o contraseña incorrectos ❌");
            }} className="bg-white p-8 md:p-16 rounded-[3rem] md:rounded-[5rem] shadow-2xl w-full max-w-md border-[8px] md:border-[12px] border-sky-100 flex flex-col gap-6 md:gap-10">
              <h2 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase text-sky-900 tracking-widest">Acceso Profesor</h2>
              <input value=${login.u} onChange=${e=>setLogin({...login, u: e.target.value})} placeholder="Usuario" className="p-5 md:p-8 bg-sky-50 rounded-[1.5rem] md:rounded-[2.5rem] border-4 border-sky-100 outline-none focus:border-sky-400 font-black text-xl md:text-3xl text-center placeholder:text-sky-200" required />
              <input type="password" value=${login.p} onChange=${e=>setLogin({...login, p: e.target.value})} placeholder="Contraseña" className="p-5 md:p-8 bg-sky-50 rounded-[1.5rem] md:rounded-[2.5rem] border-4 border-sky-100 outline-none focus:border-sky-400 font-black text-xl md:text-3xl text-center placeholder:text-sky-200" required />
              <button type="submit" className="bg-sky-800 text-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-xl md:text-3xl mt-4 hover:bg-sky-900 transition-all shadow-2xl active:scale-95 uppercase tracking-widest">ENTRAR 🔐</button>
              <button onClick=${() => setView('list')} type="button" className="text-sky-300 font-black uppercase text-sm mt-2 tracking-widest hover:text-sky-500 transition-colors mx-auto">Volver</button>
            </form>
          </div>
        `}

        ${view === 'admin' && html`
          <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 md:mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-sky-900 uppercase">Panel de Gestión</h2>
                <button onClick=${() => setView('list')} className="bg-red-50 text-red-500 px-8 py-3 rounded-2xl font-black border-4 border-red-100 hover:bg-red-500 hover:text-white transition-all uppercase shadow-lg">SALIR 🚪</button>
            </div>

            <div className="bg-white p-8 md:p-16 rounded-[3rem] md:rounded-[5rem] shadow-sm mb-12 border-4 md:border-8 border-sky-50">
                <h3 className="text-xl md:text-2xl font-black text-sky-600 uppercase mb-8 md:mb-10 tracking-widest text-center md:text-left">Añadir Pictograma (Archivo Local)</h3>
                <form onSubmit=${(e) => {
                    e.preventDefault();
                    if (!newItem.image || !newItem.name) return alert("Completa el nombre y selecciona una imagen 📁");
                    const item = { ...newItem, id: Date.now().toString() };
                    save([...pecs, item]);
                    setNewItem({ name: '', image: '', category: 'dia' });
                    alert("¡Imagen guardada localmente! ✨");
                }} className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10 items-end">
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nombre del dibujo</label>
                        <input value=${newItem.name} onChange=${e=>setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Manzana" className="p-5 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 ring-sky-400 font-bold text-lg" required />
                    </div>
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest text-center">Elegir Imagen</label>
                        <input type="file" accept="image/*" id="file-input" onChange=${handleFile} className="hidden" />
                        <label htmlFor="file-input" className="p-5 bg-sky-50 border-4 border-dashed border-sky-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-sky-100 transition-all min-h-[80px]">
                            ${newItem.image ? html`
                                <img src=${newItem.image} className="w-12 h-12 object-contain rounded-lg" />
                            ` : html`
                                <span className="text-sky-400 font-black text-2xl">📁</span>
                            `}
                        </label>
                    </div>
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Categoría</label>
                        <select value=${newItem.category} onChange=${e=>setNewItem({...newItem, category: e.target.value})} className="p-5 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] outline-none font-black text-lg uppercase">
                            <option value="dia">Mañana ☀️</option>
                            <option value="tarde">Tarde 🌤️</option>
                            <option value="noche">Noche 🌙</option>
                            <option value="varios">Varios 📦</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-sky-600 text-white p-6 rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-sky-700 transition-all uppercase active:scale-95">AÑADIR ✨</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${pecs.map(p => html`
                    <div key=${p.id} className="bg-white p-6 rounded-[3rem] flex items-center justify-between border-4 border-sky-50 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-6">
                            <img src=${p.image} className="w-16 h-16 object-contain rounded-xl" />
                            <div>
                                <p className="font-black text-sky-900 uppercase text-sm">${p.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${p.category}</p>
                            </div>
                        </div>
                        <button onClick=${() => {
                            if(confirm("¿Seguro que quieres borrarlo?")) save(pecs.filter(x => x.id !== p.id));
                        }} className="bg-red-50 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] transition-all uppercase">BORRAR</button>
                    </div>
                `)}
            </div>
          </div>
        `}
      </main>
    </div>
  `;
};

export default App;
