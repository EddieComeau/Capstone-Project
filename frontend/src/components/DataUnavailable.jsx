// DataUnavailable.jsx
import React from 'react';

const DataUnavailable = ({ message = "Data currently unavailable" }) => {
  return (
    <div
      className="flex items-center justify-center text-center text-sm text-muted-foreground border border-dashed rounded-xl px-4 py-8 bg-muted/20"
    >
      📉 {message}
    </div>
  );
};

export default DataUnavailable;
