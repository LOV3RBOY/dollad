import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TransportControlsProps {
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (position: number) => void;
  onRecord?: () => void;
  className?: string;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying,
  position,
  duration,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onRecord,
  className = ''
}) => {
  const [volume, setVolume] = useState(100);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newPosition = (value[0] / 100) * duration;
    onSeek(newPosition);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    // This would control the master volume in a real implementation
  };

  return (
    <div className={`transport-controls bg-background-panel border-b border-border p-4 ${className}`}>
      <div className="flex items-center justify-center space-x-4">
        {/* Skip Back */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSeek(Math.max(0, position - 10))}
          className="transport-button"
          disabled={duration === 0}
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="outline"
          size="lg"
          onClick={isPlaying ? onPause : onPlay}
          className={`transport-button ${isPlaying ? 'active' : ''}`}
          disabled={duration === 0}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>

        {/* Stop */}
        <Button
          variant="outline"
          size="lg"
          onClick={onStop}
          className="transport-button"
          disabled={duration === 0}
        >
          <Square className="h-5 w-5" />
        </Button>

        {/* Skip Forward */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => onSeek(Math.min(duration, position + 10))}
          className="transport-button"
          disabled={duration === 0}
        >
          <SkipForward className="h-5 w-5" />
        </Button>

        {/* Record (if available) */}
        {onRecord && (
          <>
            <div className="h-8 w-px bg-border mx-2" />
            <Button
              variant="outline"
              size="lg"
              onClick={onRecord}
              className="transport-button"
            >
              <Mic className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Progress Bar */}
        <div className="flex items-center space-x-2 ml-8 min-w-0 flex-1">
          <span className="text-sm font-mono whitespace-nowrap">
            {formatTime(position)}
          </span>
          <div className="flex-1 min-w-32">
            <Slider
              value={[duration > 0 ? (position / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
              disabled={duration === 0}
            />
          </div>
          <span className="text-sm font-mono whitespace-nowrap">
            {formatTime(duration)}
          </span>
        </div>

        {/* Master Volume */}
        <div className="hidden md:flex items-center space-x-2 ml-4">
          <Volume2 className="h-4 w-4" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};
