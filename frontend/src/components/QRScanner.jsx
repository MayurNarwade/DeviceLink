import React from 'react';
import { useState, useRef, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState('');

  const handleResult = useCallback((result, error) => {
    if (!!result) {
      onScan(result?.text);
    }
    if (!!error) {
      setError(error.message);
    }
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white text-2xl">&times;</button>
        </div>
        <div className="overflow-hidden rounded-lg">
          <QrReader
            onResult={handleResult}
            constraints={{ facingMode: 'environment' }}
            containerStyle={{ width: '100%' }}
            videoStyle={{ objectFit: 'cover' }}
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <p className="text-xs text-gray-400">Point camera at a QR code</p>
      </div>
    </div>
  );
}