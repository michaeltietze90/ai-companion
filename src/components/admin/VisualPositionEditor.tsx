/**
 * VisualPositionEditor Component
 * 
 * A drag-and-drop canvas for positioning visual assets on a Proto L resolution canvas.
 * Displays a 9:16 aspect ratio preview with the ability to drag elements to position them.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Move, ZoomIn, ZoomOut, Maximize2, Grid, 
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Position {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number | null; // Percentage 0-100, null = auto
}

interface VisualPositionEditorProps {
  imageUrl: string;
  position: Position;
  onChange: (position: Position) => void;
  name?: string;
}

const PRESET_POSITIONS = [
  { name: 'Center', x: 50, y: 50 },
  { name: 'Top', x: 50, y: 15 },
  { name: 'Bottom', x: 50, y: 85 },
  { name: 'Left', x: 15, y: 50 },
  { name: 'Right', x: 85, y: 50 },
  { name: 'Top-Left', x: 15, y: 15 },
  { name: 'Top-Right', x: 85, y: 15 },
  { name: 'Bottom-Left', x: 15, y: 85 },
  { name: 'Bottom-Right', x: 85, y: 85 },
];

const VisualPositionEditor = ({ 
  imageUrl, 
  position, 
  onChange,
  name = 'Asset'
}: VisualPositionEditorProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle mouse down on the asset
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle mouse move while dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate delta in percentage
    const deltaXPx = e.clientX - dragStart.x;
    const deltaYPx = e.clientY - dragStart.y;
    
    const deltaXPercent = (deltaXPx / rect.width) * 100;
    const deltaYPercent = (deltaYPx / rect.height) * 100;
    
    // Update position with clamping
    const newX = Math.max(0, Math.min(100, position.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100, position.y + deltaYPercent));
    
    onChange({
      ...position,
      x: Math.round(newX),
      y: Math.round(newY),
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, position, onChange]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Apply preset position
  const applyPreset = (preset: { x: number; y: number }) => {
    onChange({
      ...position,
      x: preset.x,
      y: preset.y,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Position Editor</Label>
        <div className="flex items-center gap-1">
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle grid"
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area - 9:16 aspect ratio */}
      <div 
        ref={canvasRef}
        className="relative bg-black rounded-lg overflow-hidden mx-auto"
        style={{ 
          aspectRatio: '9/16',
          maxHeight: '400px',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Center lines */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
            {/* Thirds */}
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/10" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/10" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/10" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/10" />
          </div>
        )}

        {/* Asset preview */}
        <div
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: `${position.width}%`,
            height: position.height ? `${position.height}%` : 'auto',
          }}
          onMouseDown={handleMouseDown}
        >
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-contain pointer-events-none"
              style={{ 
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                borderRadius: '4px'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              draggable={false}
            />
          ) : (
            <div 
              className="w-full h-full bg-secondary/50 flex items-center justify-center rounded"
              style={{ 
                aspectRatio: '16/9',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)'
              }}
            >
              <Move className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          
          {/* Drag handle indicator */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {position.x}%, {position.y}%
          </div>
        </div>

        {/* Resolution label */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          9:16 (2160×3840)
        </div>
      </div>

      {/* Preset position buttons */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Quick Positions</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_POSITIONS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Manual position inputs */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">X (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={position.x}
            onChange={(e) => onChange({ ...position, x: parseInt(e.target.value) || 50 })}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Y (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={position.y}
            onChange={(e) => onChange({ ...position, y: parseInt(e.target.value) || 50 })}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Width (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={position.width}
            onChange={(e) => onChange({ ...position, width: parseInt(e.target.value) || 50 })}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Height (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={position.height || ''}
            onChange={(e) => onChange({ 
              ...position, 
              height: e.target.value ? parseInt(e.target.value) : null 
            })}
            placeholder="Auto"
            className="h-8"
          />
        </div>
      </div>

      {/* Center buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...position, x: 50 })}
          className="flex-1"
        >
          <AlignHorizontalJustifyCenter className="w-4 h-4 mr-1" />
          Center H
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...position, y: 50 })}
          className="flex-1"
        >
          <AlignVerticalJustifyCenter className="w-4 h-4 mr-1" />
          Center V
        </Button>
      </div>
    </div>
  );
};

export default VisualPositionEditor;
