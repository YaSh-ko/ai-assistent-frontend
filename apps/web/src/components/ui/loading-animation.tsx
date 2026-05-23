import React, { useEffect, useRef } from 'react';

interface RadialPulseLoaderProps {
  size?: number;
  color?: string;
  text?: string;
  showText?: boolean;
}

const RadialPulseLoader: React.FC<RadialPulseLoaderProps> = ({
  size = 150,
  color = '#ffffff',
  text = 'Loading...',
  showText = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numRays = 8;
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const pulse = Math.sin(time * 0.03 + i * 0.5) * (size * 0.2) + (size * 0.25);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const x = centerX + Math.cos(angle) * pulse;
        const y = centerY + Math.sin(angle) * pulse;
        ctx.lineTo(x, y);

        const opacity = 0.3 + Math.sin(time * 0.03 + i * 0.5) * 0.7;
        
        // Конвертируем hex в rgb для использования с opacity
        const r = Number.parseInt(color.slice(1, 3), 16);
        const g = Number.parseInt(color.slice(3, 5), 16);
        const b = Number.parseInt(color.slice(5, 7), 16);
        
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, color]);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <canvas ref={canvasRef}></canvas>
      {showText && <div className="text-sm text-muted-foreground">{text}</div>}
    </div>
  );
};

export default RadialPulseLoader;
