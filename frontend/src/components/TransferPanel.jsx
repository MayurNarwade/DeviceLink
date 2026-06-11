import React, { useEffect, useRef, useState, useCallback } from 'react';
import useTransferStore from '../store/transferStore';

export default function TransferPanel({ dataChannel }) {
  const {
    outgoingFiles,
    incomingFiles,
    addOutgoingFile,
    updateOutgoingProgress,
    setOutgoingComplete,
    setOutgoingError,
    removeOutgoingFile,
    addIncomingFile,
    updateIncomingProgress,
    setIncomingComplete,
    removeIncomingFile,
  } = useTransferStore();

  const [dragOver, setDragOver] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const fileInputRef = useRef(null);
  const fileTransferRef = useRef(null);
  const dcRef = useRef(dataChannel);

  useEffect(() => {
    dcRef.current = dataChannel;
  }, [dataChannel]);

  // Listen for data channel open/close
  useEffect(() => {
    const dc = dataChannel;
    if (!dc) {
      setChannelReady(false);
      return;
    }

    const onOpen = () => setChannelReady(true);
    const onClose = () => setChannelReady(false);

    if (dc.readyState === 'open') {
      setChannelReady(true);
    } else {
      setChannelReady(false);
      dc.addEventListener('open', onOpen);
      dc.addEventListener('close', onClose);
    }

    return () => {
      dc.removeEventListener('open', onOpen);
      dc.removeEventListener('close', onClose);
    };
  }, [dataChannel]);

  // Initialise the engine when channel opens
  useEffect(() => {
    if (!channelReady || !dcRef.current) return;

    import('../lib/fileTransfer').then((module) => {
      const FileTransfer = module.default;
      if (fileTransferRef.current) {
        fileTransferRef.current.destroy();
      }
      fileTransferRef.current = new FileTransfer(
        dcRef.current,
        // onMeta – create incoming file entry immediately
        (fileId, fileName, fileSize, mimeType) => {
          addIncomingFile(fileId, fileName, fileSize, mimeType);
        },
        // onProgress – update outgoing or incoming progress
        (fileId, sent, total) => {
          // This is used for both outgoing and incoming (via chunk received count)
          // We'll use it for outgoing only; incoming progress is handled separately
          const pct = total ? Math.round((sent / total) * 100) : 0;
          updateOutgoingProgress(fileId, pct);
          // Also update incoming if we have a matching incoming file
          // (in case progress is from received chunks)
          updateIncomingProgress(fileId, pct);
        },
        // onFileReceived – incoming file complete
        (fileId, fileName, blob, mimeType) => {
          // The entry already exists from onMeta, just mark it complete
          const blobUrl = URL.createObjectURL(blob);
          setIncomingComplete(fileId, blobUrl);
        },
        // onError
        (fileId, error) => {
          setOutgoingError(fileId, error);
        }
      );
    });

    return () => {
      if (fileTransferRef.current) {
        fileTransferRef.current.destroy();
        fileTransferRef.current = null;
      }
    };
  }, [channelReady]);

  const handleRemoveIncoming = useCallback(
    (id, blobUrl) => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      removeIncomingFile(id);
    },
    [removeIncomingFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        const id = addOutgoingFile(file);
        if (fileTransferRef.current) {
          fileTransferRef.current
            .sendFile(file)
            .then(() => setOutgoingComplete(id))
            .catch((err) => setOutgoingError(id, err.message));
        }
      });
    },
    [addOutgoingFile, setOutgoingComplete, setOutgoingError]
  );

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const id = addOutgoingFile(file);
      if (fileTransferRef.current) {
        fileTransferRef.current
          .sendFile(file)
          .then(() => setOutgoingComplete(id))
          .catch((err) => setOutgoingError(id, err.message));
      }
    });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex items-center justify-center h-24 border-2 border-dashed rounded m-2 transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Drag & drop files here or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 underline"
          >
            browse
          </button>
        </p>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">
        {outgoingFiles.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Sending</h3>
            {outgoingFiles.map((file) => (
              <FileItem key={file.id} file={file} onRemove={() => removeOutgoingFile(file.id)} />
            ))}
          </div>
        )}
        {incomingFiles.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Receiving</h3>
            {incomingFiles.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={() => handleRemoveIncoming(file.id, file.blobUrl)}
                isIncoming
              />
            ))}
          </div>
        )}
        {outgoingFiles.length === 0 && incomingFiles.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">No files yet</p>
        )}
      </div>
    </div>
  );
}

function FileItem({ file, onRemove, isIncoming }) {
  const isImage = file.type?.startsWith('image/');
  return (
    <div className="flex items-center space-x-3 py-2 border-b border-gray-100 dark:border-gray-800">
      <div className="w-10 h-10 flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {isImage && file.blobUrl ? (
          <img src={file.blobUrl} alt="" className="object-cover w-full h-full" />
        ) : (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{file.name}</p>
        <div className="flex items-center text-xs text-gray-400">
          {file.status === 'sending' || file.status === 'receiving' ? (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-1 mr-2">
              <div
                className="bg-blue-500 h-1 rounded"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          ) : null}
          <span>{file.progress}%</span>
          {file.status === 'complete' && <span className="ml-2 text-green-500">✓</span>}
          {file.status === 'error' && <span className="ml-2 text-red-500">✗</span>}
        </div>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Download link for complete incoming files */}
      {isIncoming && file.status === 'complete' && file.blobUrl && (
        <a
          href={file.blobUrl}
          download={file.name}
          className="ml-2 text-blue-600 hover:underline text-sm"
        >
          Download
        </a>
      )}
    </div>
  );
}