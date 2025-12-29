
import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ stream }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let animation;
    const draw = () => {
      animation = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.fillStyle = '#3b82f6';
      dataArray.forEach((val, i) => {
        const h = (val / 255) * 60;
        ctx.fillRect(i * 12, 60 - h, 8, h);
      });
    };
    draw();
    return () => { cancelAnimationFrame(animation); audioContext.close(); };
  }, [stream]);

  return React.createElement('canvas', { ref: canvasRef, width: 300, height: 60, className: "rounded-xl" });
};

export default AudioVisualizer;
