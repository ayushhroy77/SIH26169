import React from 'react';
import { Stars } from '@react-three/drei';

export const StarField: React.FC = () => {
  return (
    <>
      <color attach="background" args={['#0a0e14']} />
      <Stars radius={100} depth={50} count={800} factor={4} fade speed={0.3} />
    </>
  );
};
