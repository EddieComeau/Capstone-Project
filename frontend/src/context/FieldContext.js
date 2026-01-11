import React, { createContext, useState, useEffect } from 'react';

export const FieldContext = createContext();

export const FieldProvider = ({ children }) => {
  const [fieldType, setFieldType] = useState('svg');

  useEffect(() => {
    const stored = localStorage.getItem('fieldType');
    if (stored) setFieldType(stored);
  }, []);

  const toggleFieldType = () => {
    const next =
      fieldType === 'kenney'
        ? 'lottie'
        : fieldType === 'lottie'
        ? 'svg'
        : 'kenney';
    setFieldType(next);
    localStorage.setItem('fieldType', next);
  };

  return (
    <FieldContext.Provider value={{ fieldType, toggleFieldType }}>
      {children}
    </FieldContext.Provider>
  );
};
