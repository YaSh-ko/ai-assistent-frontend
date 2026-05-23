import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface ParticlesBackgroundProps {
  variant?: 'default' | 'chat';
}

const ParticlesBackground = ({ variant = 'default' }: ParticlesBackgroundProps) => {
  const isChat = variant === 'chat';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const clickCountRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const maxClicks = isChat ? 0 : 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Установка размеров canvas
    const resizeCanvas = () => {
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
    };
    resizeCanvas();

    // Создание начальных частиц с учетом размера экрана
    const createParticles = () => {
      const particles: Particle[] = [];
      const area = canvas.width * canvas.height;
      // Адаптивная плотность: меньше частиц на маленьких экранах
      const baseParticleCount = isChat ? 100 : 80;
      const areaRatio = area / (1920 * 1080);
      const particleCount = Math.floor(baseParticleCount * Math.sqrt(areaRatio));
      const finalCount = isChat
        ? Math.max(20, Math.min(100, particleCount))
        : Math.max(20, Math.min(120, particleCount));

      for (let i = 0; i < finalCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * (isChat ? 0.5 : 0.6),
          vy: (Math.random() - 0.5) * (isChat ? 0.5 : 0.6),
          size: isChat ? Math.random() * 1.5 + 0.8 : Math.random() * 2 + 1.5,
          opacity: isChat ? 0.4 : 0.5
        });
      }
      return particles;
    };

    particlesRef.current = createParticles();

    // Отталкивание частиц от курсора
    const repulseParticles = (mouseX: number, mouseY: number) => {
      const repulseDistance = 140;
      particlesRef.current.forEach(particle => {
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const distance = Math.hypot(dx, dy);

        if (distance < repulseDistance) {
          const force = (repulseDistance - distance) / repulseDistance;
          const angle = Math.atan2(dy, dx);
          particle.vx += Math.cos(angle) * force * 0.15;
          particle.vy += Math.sin(angle) * force * 0.15;
        }
      });
    };

    // Добавление частиц по клику
    const addParticles = (x: number, y: number) => {
      if (clickCountRef.current >= maxClicks) {
        console.log('Достигнут лимит создания частиц (10 кликов)');
        return;
      }
      clickCountRef.current += 1;

      for (let i = 0; i < 4; i++) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 2 + 1.5,
          opacity: 0.5
        });
      }
    };

    // Анимация
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Обновление и отрисовка частиц
      particlesRef.current.forEach((particle) => {
        // Движение
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Поддержание минимальной скорости
        const speed = Math.hypot(particle.vx, particle.vy);
        const minSpeed = 0.1;
        if (speed < minSpeed) {
          const angle = Math.atan2(particle.vy, particle.vx);
          particle.vx = Math.cos(angle) * minSpeed;
          particle.vy = Math.sin(angle) * minSpeed;
        }

        // Ограничение максимальной скорости
        const maxSpeed = 0.2;
        if (speed > maxSpeed) {
          particle.vx = (particle.vx / speed) * maxSpeed;
          particle.vy = (particle.vy / speed) * maxSpeed;
        }

        // Границы экрана с отскоком
        if (particle.x < 0) {
          particle.x = 0;
          particle.vx = Math.abs(particle.vx);
        }
        if (particle.x > canvas.width) {
          particle.x = canvas.width;
          particle.vx = -Math.abs(particle.vx);
        }
        if (particle.y < 0) {
          particle.y = 0;
          particle.vy = Math.abs(particle.vy);
        }
        if (particle.y > canvas.height) {
          particle.y = canvas.height;
          particle.vy = -Math.abs(particle.vy);
        }

        // Отрисовка частицы
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();
      });

      // Отрисовка линий между близкими частицами (только в default режиме)
      if (!isChat) {
        const linkDistance = 140;
        for (let i = 0; i < particlesRef.current.length; i++) {
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            const p1 = particlesRef.current[i];
            const p2 = particlesRef.current[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.hypot(dx, dy);

            if (distance < linkDistance) {
              const opacity = (1 - distance / linkDistance) * 0.4;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Обработчики событий
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      repulseParticles(e.clientX, e.clientY);
    };

    const handleClick = (e: MouseEvent) => {
      addParticles(e.clientX, e.clientY);
    };

    const handleResize = () => {
      resizeCanvas();
      // Пересоздаем частицы с учетом нового размера экрана
      particlesRef.current = createParticles();
      // Сбрасываем счетчик кликов при изменении размера
      clickCountRef.current = 0;
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    if (!isChat) {
      canvas.addEventListener('click', handleClick);
    }
    globalThis.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      globalThis.removeEventListener('mousemove', handleMouseMove);
      if (!isChat) {
        canvas.removeEventListener('click', handleClick);
      }
      globalThis.removeEventListener('resize', handleResize);
    };
  }, [isChat, maxClicks]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isChat ? 'none' : 'auto',
        zIndex: 0
      }}
    />
  );
};

export default ParticlesBackground;