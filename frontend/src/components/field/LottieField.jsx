import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

const LottieField = () => {
  return (
    <Player
      autoplay
      loop
      src="/lotties/field.json"
      style={{ height: '400px', width: '400px' }}
    />
  );
};

export default LottieField;
