import React, { useEffect, useRef } from 'react';

const KenneyField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sprite = new Image();
    sprite.src = '/kenney/spritesheet_players.png';

    const spriteWidth = 64;
    const spriteHeight = 64;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sprite, frame * spriteWidth, 0, spriteWidth, spriteHeight, 100, 100, spriteWidth, spriteHeight);
      frame = (frame + 1) % 4;
    };

    const interval = setInterval(draw, 200);
    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} width={400} height={400} className="border rounded" />;
};

export default KenneyField;
