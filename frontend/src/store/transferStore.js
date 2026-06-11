import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTransferStore = create(
  persist(
    (set) => ({
      outgoingFiles: [],
      incomingFiles: [],

      addOutgoingFile: (file) => {
        const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newFile = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'queued',
        };
        set((state) => ({ outgoingFiles: [...state.outgoingFiles, newFile] }));
        return id;
      },

      updateOutgoingProgress: (id, progress) =>
        set((state) => ({
          outgoingFiles: state.outgoingFiles.map((f) =>
            f.id === id ? { ...f, progress, status: 'sending' } : f
          ),
        })),

      setOutgoingComplete: (id) =>
        set((state) => ({
          outgoingFiles: state.outgoingFiles.map((f) =>
            f.id === id ? { ...f, status: 'complete', progress: 100 } : f
          ),
        })),

      setOutgoingError: (id, error) =>
        set((state) => ({
          outgoingFiles: state.outgoingFiles.map((f) =>
            f.id === id ? { ...f, status: 'error', error } : f
          ),
        })),

      removeOutgoingFile: (id) =>
        set((state) => ({
          outgoingFiles: state.outgoingFiles.filter((f) => f.id !== id),
        })),

      clearOutgoing: () => set({ outgoingFiles: [] }),

      addIncomingFile: (fileId, fileName, fileSize, mimeType) =>
        set((state) => ({
          incomingFiles: [
            ...state.incomingFiles,
            {
              id: fileId,
              name: fileName,
              size: fileSize,
              type: mimeType,
              progress: 0,
              status: 'receiving',
              blobUrl: null,
            },
          ],
        })),

      updateIncomingProgress: (id, progress) =>
        set((state) => ({
          incomingFiles: state.incomingFiles.map((f) =>
            f.id === id ? { ...f, progress } : f
          ),
        })),

      setIncomingComplete: (id, blobUrl) =>
        set((state) => ({
          incomingFiles: state.incomingFiles.map((f) =>
            f.id === id ? { ...f, status: 'complete', progress: 100, blobUrl } : f
          ),
        })),

      setIncomingError: (id, error) =>
        set((state) => ({
          incomingFiles: state.incomingFiles.map((f) =>
            f.id === id ? { ...f, status: 'error', error } : f
          ),
        })),

      removeIncomingFile: (id) => {
        set((state) => {
          const file = state.incomingFiles.find((f) => f.id === id);
          if (file?.blobUrl) URL.revokeObjectURL(file.blobUrl);
          return {
            incomingFiles: state.incomingFiles.filter((f) => f.id !== id),
          };
        });
      },

      clearIncoming: () =>
        set((state) => {
          state.incomingFiles.forEach((f) => {
            if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
          });
          return { incomingFiles: [] };
        }),
    }),
    {
      name: 'transfer-storage',
      storage: sessionStorage, // ✅ modern
    }
  )
);

export default useTransferStore;