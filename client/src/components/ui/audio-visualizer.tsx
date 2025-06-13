import React, { useRef, useEffect, useState } from 'react';

interface AudioVisualizerProps {
  audioUrl?: string;
  waveformData?: number[];
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  height?: number;
  className?: string;
  onSeek?: (time: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioUrl,
  waveformData,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  height = 120,
  className = '',
  onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [analyzedData, setAnalyzedData] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate waveform data from audio if not provided
  useEffect(() => {
    if (audioUrl && !waveformData && !isAnalyzing) {
      analyzeAudioFile(audioUrl);
    }
  }, [audioUrl, waveformData, isAnalyzing]);

  const analyzeAudioFile = async (url: string) => {
    setIsAnalyzing(true);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const rawData = audioBuffer.getChannelData(0);
      const samples = 500; // Number of samples for visualization
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = [];
      
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }
      
      // Normalize the data
      const multiplier = Math.pow(Math.max(...filteredData), -1);
      const normalizedData = filteredData.map(n => n * multiplier);
      
      setAnalyzedData(normalizedData);
    } catch (error) {
      console.error('Audio analysis failed:', error);
      // Generate fallback waveform
      const fallbackData = Array.from({ length: 500 }, () => Math.random() * 0.8 + 0.1);
      setAnalyzedData(fallbackData);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataToUse = waveformData || analyzedData;
    if (dataToUse.length === 0) return;

    const { width, height: canvasHeight } = canvas;
    const barWidth = width / dataToUse.length;
    const centerY = canvasHeight / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw waveform
    dataToUse.forEach((value, index) => {
      const barHeight = value * centerY;
      const x = index * barWidth;
      
      // Determine color based on playback position
      const progress = duration > 0 ? currentTime / duration : 0;
      const isPlayed = index / dataToUse.length <= progress;
      
      ctx.fillStyle = isPlayed 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--muted-foreground) / 0.3)';
      
      // Draw top bar
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight);
      
      // Draw bottom bar (mirror)
      ctx.fillRect(x, centerY, Math.max(1, barWidth - 1), barHeight);
    });

    // Draw progress line
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, canvasHeight);
      ctx.stroke();
    }
  }, [waveformData, analyzedData, currentTime, duration, isPlaying]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / canvas.width;
    const newTime = progress * duration;
    
    onSeek(newTime);
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = height;
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  return (
    <div className={`audio-visualizer ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full cursor-pointer rounded-md bg-background-surface"
        style={{ height }}
      />
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Analyzing audio...</span>
          </div>
        </div>
      )}
      {!audioUrl && !waveformData && !isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No audio loaded</span>
        </div>
      )}
    </div>
  );
};
