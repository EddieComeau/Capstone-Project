import React, { useContext } from 'react';
import { FieldContext } from '@/context/FieldContext';
import KenneyField from './KenneyField';
import LottieField from './LottieField';

const FieldRenderer = () => {
  const { fieldType } = useContext(FieldContext);

  if (fieldType === 'kenney') return <KenneyField />;
  if (fieldType === 'lottie') return <LottieField />;
  return <img src="/field.svg" alt="Static Field" className="w-full h-auto rounded" />;
};

export default FieldRenderer;
