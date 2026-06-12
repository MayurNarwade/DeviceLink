// fileTransfer.js – uses base64 encoding for chunk data
const CHUNK_SIZE = 64 * 1024;          // 64 KB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class FileTransfer {
  constructor(dataChannel, onMeta, onProgress, onFileReceived, onError) {
    this.dataChannel = dataChannel;
    this.onMeta = onMeta;
    this.onProgress = onProgress;
    this.onFileReceived = onFileReceived;
    this.onError = onError;
    this.sendQueue = [];
    this.receiveBuffers = new Map();
    this.cancelledTransfers = new Set();
    this.readyToSend = true;
    this.dataChannel.addEventListener('message', this._handleMessage);
  }

  _handleMessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'file-meta') this._handleMeta(msg);
        else if (msg.type === 'file-chunk') this._handleChunk(msg);
        else if (msg.type === 'file-cancel') this._handleCancel(msg);
        else if (msg.type === 'file-complete') this._handleComplete(msg);
      } catch (e) {}
    }
  };

  async sendFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      this.onError?.(file.name, 'File too large. Max 500 MB.');
      return;
    }
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const meta = {
      type: 'file-meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      chunkCount: Math.ceil(file.size / CHUNK_SIZE),
    };
    this._sendMessage(meta);

    let offset = 0;
    const total = file.size;
    while (offset < total) {
      const blob = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const chunk = {
        type: 'file-chunk',
        fileId,
        chunkIndex: offset / CHUNK_SIZE,
        data: base64,        // ← base64 text, not raw binary
      };
      await this._enqueueSend(chunk);
      offset += CHUNK_SIZE;
      this.onProgress?.(fileId, offset, total);
    }
    this._sendMessage({ type: 'file-complete', fileId });
  }

  _enqueueSend(packet) {
    return new Promise((resolve) => {
      this.sendQueue.push({ packet, resolve });
      this._processQueue();
    });
  }

  _processQueue() {
    if (!this.readyToSend || this.sendQueue.length === 0) return;
    this.readyToSend = false;
    const { packet, resolve } = this.sendQueue.shift();
    try {
      this.dataChannel.send(JSON.stringify(packet));
      resolve();
      this._checkBuffer();
    } catch (e) {
      resolve();
      this._checkBuffer();
    }
  }

  _checkBuffer() {
    if (
      this.dataChannel.bufferedAmount >
      this.dataChannel.bufferedAmountLowThreshold
    ) {
      const onLow = () => {
        this.dataChannel.removeEventListener('bufferedamountlow', onLow);
        this.readyToSend = true;
        this._processQueue();
      };
      this.dataChannel.addEventListener('bufferedamountlow', onLow);
    } else {
      this.readyToSend = true;
      this._processQueue();
    }
  }

  _sendMessage(obj) {
    try {
      this.dataChannel.send(JSON.stringify(obj));
    } catch (e) {}
  }

  _handleMeta(msg) {
    const { fileId, fileName, fileSize, mimeType, chunkCount } = msg;
    this.onMeta?.(fileId, fileName, fileSize, mimeType);
    this.receiveBuffers.set(fileId, {
      fileName,
      fileSize,
      mimeType,
      chunks: new Array(chunkCount),
      receivedCount: 0,
      totalChunks: chunkCount,
    });
  }

  _handleChunk(msg) {
    const { fileId, chunkIndex, data } = msg;
    const buf = this.receiveBuffers.get(fileId);
    if (!buf || this.cancelledTransfers.has(fileId)) return;
    // Decode base64 back to Uint8Array
    buf.chunks[chunkIndex] = base64ToUint8Array(data);
    buf.receivedCount++;
    this.onProgress?.(fileId, buf.receivedCount, buf.totalChunks);
  }

  _handleComplete(msg) {
    const { fileId } = msg;
    const buf = this.receiveBuffers.get(fileId);
    if (!buf || buf.receivedCount !== buf.totalChunks) {
      this.onError?.(fileId, 'Incomplete file transfer');
      return;
    }
    const blob = new Blob(buf.chunks, { type: buf.mimeType });
    this.onFileReceived?.(fileId, buf.fileName, blob, buf.mimeType);
    this.receiveBuffers.delete(fileId);
  }

  cancelSend(fileId) {
    this.cancelledTransfers.add(fileId);
    this._sendMessage({ type: 'file-cancel', fileId });
    this.sendQueue = this.sendQueue.filter(
      (item) => item.packet.fileId !== fileId
    );
  }

  cancelReceive(fileId) {
    this.cancelledTransfers.add(fileId);
    this.receiveBuffers.delete(fileId);
  }

  destroy() {
    this.dataChannel.removeEventListener('message', this._handleMessage);
    this.sendQueue = [];
    this.receiveBuffers.clear();
  }
}

export default FileTransfer;