'use client';

import { useEffect, useRef } from 'react';

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      canvasWidth: number;
      canvasHeight: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > this.canvasWidth) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvasHeight) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.fill();
      }
    }

    // Create particles
    const particles: Particle[] = [];
    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    // Draw connections
    const drawConnections = () => {
      if (!ctx) return;
      const maxDistance = 150;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      drawConnections();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#f7f7f7', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <div className="content-container">
        <a href="https://bnichettinad.cloud/" className="book-button">
          Click To Book Tickets
        </a>
        <a href="https://bnichettinad.cloud/" className="gif-container">
          <img
            src="/ez.gif"
            alt="BNI Animation"
            className="gif-image"
          />
        </a>
      </div>
      <style jsx>{`
        .content-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 30px;
          width: 100%;
          max-width: 400px;
          padding: 0 20px;
        }

        .gif-container {
          padding: 8px;
          background: linear-gradient(45deg, #ff0000, #ff6600, #ff3300, #ff0000);
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite, float 3s ease-in-out infinite;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(255, 0, 0, 0.6), 0 0 40px rgba(255, 102, 0, 0.4), 0 0 60px rgba(255, 51, 0, 0.3);
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.3s ease;
          display: block;
          margin: 0 auto;
        }

        .gif-container:hover {
          transform: scale(1.05);
        }

        .book-button {
          display: inline-block;
          padding: 20px 50px;
          margin-bottom: 40px;
          background: linear-gradient(135deg, #ff6600 0%, #ff9933 50%, #ff6600 100%);
          background-size: 200% 100%;
          color: #ffffff;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 1px;
          font-family: 'Inter', 'Arial', 'Helvetica Neue', sans-serif;
          text-decoration: none;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(255, 102, 0, 0.4);
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
          animation: gradientShimmer 3s ease infinite;
        }

        @keyframes gradientShimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .book-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(255, 102, 0, 0.5);
          filter: brightness(1.1);
        }

        .book-button:active {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 102, 0, 0.4);
        }

        .gif-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          display: block;
          border-radius: 8px;
          margin: 0 auto;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @media (max-width: 768px) {
          .content-container {
            gap: 25px;
            max-width: 350px;
          }

          .book-button {
            font-size: 1.5rem;
            padding: 18px 40px;
          }

          .gif-container {
            padding: 6px;
          }

          .gif-image {
            max-width: 250px;
          }
        }

        @media (max-width: 480px) {
          .content-container {
            gap: 20px;
            max-width: 300px;
            padding: 0 15px;
          }

          .book-button {
            font-size: 1.3rem;
            padding: 16px 35px;
          }

          .gif-container {
            padding: 5px;
          }

          .gif-image {
            max-width: 200px;
          }
        }

        @media (max-width: 380px) {
          .book-button {
            font-size: 1.1rem;
            padding: 14px 30px;
          }
        }
      `}</style>
    </div>
  );
}
