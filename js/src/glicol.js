// when publish, change the exact version number
// in local testing, comment the version out!


// window.version = "v0.9.5"


window.source = window.version ? `https://cdn.jsdelivr.net/gh/chaosprint/glicol@${version}/js/src/` : "src/"
fetch(source+'utils.js').then(res=>res.text()).then( text =>
  eval(text)
)
window.loadDocs = async () => {
  fetch(source+'glicol-api.json')
  .then(response => response.json())
  .then(data => window.docs = data)
}
window.loadDocs()

// https://github.com/padenot/ringbuf.js
// From a series of URL to js files, get an object URL that can be loaded in an
// AudioWorklet. This is useful to be able to use multiple files (utils, data
// structure, main DSP, etc.) without either using static imports, eval, manual
// concatenation with or without a build step, etc.
function URLFromFiles(files) {
  const promises = files.map(file => fetch(file).then(
    response => response.text()
    )
  )
  return Promise
    .all(promises)
    .then((texts) => {
      const text = texts.join('');
      const blob = new Blob([text], {type: "application/javascript"});
      return URL.createObjectURL(blob);
    });
}

// https://github.com/padenot/ringbuf.js
// customised for Glicol
exports = {}

Object.defineProperty(exports, '__esModule', { value: true });

// customised for Glicol
// TextParameter has a varied length
class TextParameterWriter {
  // From a RingBuffer, build an object that can enqueue a parameter change in
  // the queue.
  constructor(ringbuf) {
    if (ringbuf.type() != "Uint8Array") {
      throw "This class requires a ring buffer of Uint8Array";
    }
    // const SIZE_ELEMENT = 5;
    this.ringbuf = ringbuf
  }
  enqueue(buf) {
    return this.ringbuf.push(buf);
  }
  // Query the free space in the ring buffer. This is the amount of samples that
  // can be queued, with a guarantee of success.
  available_write() {
    return this.ringbuf.available_write();
  }
}

class TextParameterReader {
  constructor(ringbuf) {
    if (ringbuf.type() != "Uint8Array") {
      throw "This class requires a ring buffer of Uint8Array";
    }
    this.ringbuf = ringbuf;
  }
  dequeue(buf) {
    if (this.ringbuf.empty()) {
      return 0;
    }
    return this.ringbuf.pop(buf);
  }
  // Query the occupied space in the queue. This is the amount of samples that
  // can be read with a guarantee of success.
  available_read() {
    return this.ringbuf.available_read();
  }
}

// A Single Producer - Single Consumer thread-safe wait-free ring buffer.
//
// The producer and the consumer can be separate thread, but cannot change role,
// except with external synchronization.

class RingBuffer {
  static getStorageForCapacity(capacity, type) {
    if (!type.BYTES_PER_ELEMENT) {
      throw "Pass in a ArrayBuffer subclass";
    }
    var bytes = 8 + (capacity + 1) * type.BYTES_PER_ELEMENT;
    return new SharedArrayBuffer(bytes);
  }
  constructor(sab, type) {
    if (!ArrayBuffer.__proto__.isPrototypeOf(type) &&
      type.BYTES_PER_ELEMENT !== undefined) {
      throw "Pass a concrete typed array class as second argument";
    }
    // Maximum usable size is 1<<32 - type.BYTES_PER_ELEMENT bytes in the ring
    // buffer for this version, easily changeable.
    // -4 for the write ptr (uint32_t offsets)
    // -4 for the read ptr (uint32_t offsets)
    // capacity counts the empty slot to distinguish between full and empty.
    this._type = type;
    this.capacity = (sab.byteLength - 8) / type.BYTES_PER_ELEMENT;
    this.buf = sab;
    this.write_ptr = new Uint32Array(this.buf, 0, 1);
    this.read_ptr = new Uint32Array(this.buf, 4, 1);
    this.storage = new type(this.buf, 8, this.capacity);
  }
  // Returns the type of the underlying ArrayBuffer for this RingBuffer. This
  // allows implementing crude type checking.
  type() {
    return this._type.name;
  }
  push(elements) {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);
    if ((wr + 1) % this._storage_capacity() == rd) {
      // full 
      return 0;
    }
    let to_write = Math.min(this._available_write(rd, wr), elements.length);
    let first_part = Math.min(this._storage_capacity() - wr, to_write);
    let second_part = to_write - first_part;
    this._copy(elements, 0, this.storage, wr, first_part);
    this._copy(elements, first_part, this.storage, 0, second_part);
    // publish the enqueued data to the other side
    Atomics.store(
      this.write_ptr,
      0,
      (wr + to_write) % this._storage_capacity()
    );

    return to_write;
  }
  pop(elements) {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);
    if (wr == rd) {return 0;}
    let to_read = Math.min(this._available_read(rd, wr), elements.length);
    let first_part = Math.min(this._storage_capacity() - rd, elements.length);
    let second_part = to_read - first_part;
    this._copy(this.storage, rd, elements, 0, first_part);
    this._copy(this.storage, 0, elements, first_part, second_part);
    Atomics.store(this.read_ptr, 0, (rd + to_read) % this._storage_capacity());
    return to_read;
  }
  // True if the ring buffer is empty false otherwise. This can be late on the
  // reader side: it can return true even if something has just been pushed.
  empty() {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);
    return wr == rd;
  }
  // True if the ring buffer is full, false otherwise. This can be late on the
  // write side: it can return true when something has just been poped.
  full() {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);

    return (wr + 1) % this.capacity != rd;
  }
  // The usable capacity for the ring buffer: the number of elements that can be
  // stored.
  capacity() {
    return this.capacity - 1;
  }
  // Number of elements available for reading. This can be late, and report less
  // elements that is actually in the queue, when something has just been
  // enqueued.
  available_read() {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);
    return this._available_read(rd, wr);
  }
  // Number of elements available for writing. This can be late, and report less
  // elemtns that is actually available for writing, when something has just
  // been dequeued.
  available_write() {
    var rd = Atomics.load(this.read_ptr, 0);
    var wr = Atomics.load(this.write_ptr, 0);
    return this._available_write(rd, wr);
  }

  // private methods //
  // Number of elements available for reading, given a read and write pointer..
  _available_read(rd, wr) {
    if (wr > rd) {
      return wr - rd;
    } else {
      return wr + this._storage_capacity() - rd;
    }
  }
  // Number of elements available from writing, given a read and write pointer.
  _available_write(rd, wr) {
    let rv = rd - wr - 1;
    if (wr >= rd) {
      rv += this._storage_capacity();
    }
    return rv;
  }
  // The size of the storage for elements not accounting the space for the index.
  _storage_capacity() {
    return this.capacity;
  }
  _copy(input, offset_input, output, offset_output, size) {
    for (var i = 0; i < size; i++) {
      output[offset_output + i] = input[offset_input + i];
    }
  }
}

exports.TextParameterReader = TextParameterReader;
exports.TextParameterWriter = TextParameterWriter;
exports.RingBuffer = RingBuffer;

window.loadModule = async () => {

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.actx = new window.AudioContext({
    // sampleRate: 44100
  })
  window.analyser = window.actx.createAnalyser();
  await URLFromFiles([source+'glicol-engine.js']).then((e) => {
    window.actx.audioWorklet.addModule(e).then(() => {
      let sab = exports.RingBuffer.getStorageForCapacity(2048, Uint8Array);
      let rb = new exports.RingBuffer(sab, Uint8Array);
      window.paramWriter = new TextParameterWriter(rb);
      window.node = new AudioWorkletNode(window.actx, 'glicol-engine', {
        outputChannelCount: [2],
        processorOptions: {
          codeQueue: sab,
        },
      })
      fetch(source+'glicol_wasm.wasm')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        window.node.port.postMessage({
          type: "load", obj: arrayBuffer
        })
      })
      window.actx.destination.channelInterpretation = "discrete";
      window.node.connect(analyser)
      window.analyser.connect(window.actx.destination)
      window.decoder = new TextDecoder('utf-8');
      window.node.port.onmessage = async e => {
        if (e.data.type === 'ready') {
          
          if (Object.keys(window.sampleBuffers).length !== 0) {
            for (let key in window.sampleBuffers) {
              let buffer = window.sampleBuffers[key];
              var sample;
              if (buffer.numberOfChannels === 1) {
                sample = buffer.getChannelData(0);
              } else if (buffer.numberOfChannels === 2) {
                sample = new Float32Array( buffer.length * 2);
                sample.set(buffer.getChannelData(0), 0);
                sample.set(buffer.getChannelData(1), buffer.length);
              } else {
                throw(Error("Only support mono or stereo samples."))
              }
              window.node.port.postMessage({
                type: "loadsample",
                sample: sample,
                channels: buffer.numberOfChannels,
                length: buffer.length,
                name: encoder.encode("\\"+ key.replace("-","_")),
                sr: buffer.sampleRate
              })
            }
          } else {
            await window.loadSamples()
          }
        } else if (e.data.type === 'e') {
          log(decoder.decode(e.data.info.slice(2).filter(v => v !== 0.0)))
        }      
      }
    })
  })
}
window.loadModule();
window.code = `o: seq 60 >> sp \\cb`
window.isGlicolRunning = false
window.encoder = new TextEncoder('utf-8');

window.run = async (code) =>{
  // const regexp = /\{([^{}]|(\?R))*\}/g
  // a working JS mix
  const regexp = /(?<=##)[^#]*(?=#)/g   // this is working but not for nested
  let match;
  let toreplace = [];
  while ((match = regexp.exec(code)) !== null) {
    toreplace.push(match[0])
  }
  toreplace.map((str)=>{
    let result = str.includes('\n') || str.includes(';') ?
    Function(`'use strict'; return ()=>{${str}}`)()() : 
    Function(`'use strict'; return ()=>(${str})`)()()
    if (typeof result !== "undefined") {
      code = code.replace(`##${str}#`, result)
    } else {
      code = code.replace(`##${str}#`, "")
    }
  })
  window.code = code
  try { window.actx.resume() } catch (e) {console.log(e)}
  if (window.paramWriter.available_write()) {
    window.paramWriter.enqueue(window.encoder.encode(code))
  }
  if ( document.getElementById("visualizer")) {
    window.visualizeTimeDomainData({canvas: document.getElementById("visualizer"), analyser: window.analyser});
  }
  if ( document.getElementById("freqVisualizer")) {
    window.visualizeFrequencyData({canvas: document.getElementById("freqVisualizer"), analyser: window.analyser});
  }
}