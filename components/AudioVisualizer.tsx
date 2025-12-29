
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fix: Provide an initial value to useRef to satisfy strict type definitions (resolves "Expected 1 arguments, but got 0" error)
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    // Fix: AudioContext may expect at least one argument (options object) in certain environments.
    // Also including webkitAudioContext for broader browser support.
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({});
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (!ctx) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(59, 130, 246)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 rounded-lg bg-blue-50" 
      width={300} 
      height={64}
    />
  );
};

export default AudioVisualizer;
