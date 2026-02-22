import { ArrayBufferTarget, Muxer } from 'mp4-muxer'

import { failMe } from '../fail-me'
import type { DisplayWord } from '../rsvp/display-rules'
import { findCurrentWord } from '../rsvp/display-rules'
import { renderRsvpFrame } from '../rsvp/rsvp-renderer'

const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

export async function exportToMp4(
  audioBuffer: AudioBuffer,
  displayWords: DisplayWord[],
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('WebCodecs is not supported in this browser. Please use Chrome 94+.')
  }

  const duration = audioBuffer.duration
  const totalFrames = Math.ceil(duration * FPS)

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: WIDTH,
      height: HEIGHT,
    },
    audio: {
      codec: 'aac',
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    },
    fastStart: 'in-memory',
  })

  // --- Video encoding ---
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d') ?? failMe('failed to get 2d context from OffscreenCanvas')

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
    error: e => {
      throw e
    },
  })

  videoEncoder.configure({
    codec: 'avc1.640033', // High profile, level 5.1
    width: WIDTH,
    height: HEIGHT,
    bitrate: 4_000_000,
    framerate: FPS,
  })

  for (let i = 0; i < totalFrames; i++) {
    const time = i / FPS
    const word = findCurrentWord(displayWords, time)
    renderRsvpFrame(ctx, word, { width: WIDTH, height: HEIGHT })

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(time * 1_000_000), // microseconds
      duration: Math.round(1_000_000 / FPS),
    })

    const keyFrame = i % 60 === 0
    videoEncoder.encode(frame, { keyFrame })
    frame.close()

    // Yield to main thread periodically
    if (i % 10 === 0) {
      onProgress((i / totalFrames) * 0.8) // video is 80% of the work
      await new Promise(r => setTimeout(r, 0))
    }

    // Backpressure: wait if encoder queue is large
    while (videoEncoder.encodeQueueSize > 10) {
      await new Promise(r => setTimeout(r, 5))
    }
  }

  await videoEncoder.flush()
  videoEncoder.close()

  // --- Audio encoding ---
  onProgress(0.85)

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? undefined),
    error: e => {
      throw e
    },
  })

  audioEncoder.configure({
    codec: 'mp4a.40.2', // AAC-LC
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
    bitrate: 128_000,
  })

  // Feed audio in chunks
  const chunkSize = audioBuffer.sampleRate // 1 second at a time
  const numChunks = Math.ceil(audioBuffer.length / chunkSize)

  for (let c = 0; c < numChunks; c++) {
    const offset = c * chunkSize
    const length = Math.min(chunkSize, audioBuffer.length - offset)

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate: audioBuffer.sampleRate,
      numberOfFrames: length,
      numberOfChannels: audioBuffer.numberOfChannels,
      timestamp: Math.round((offset / audioBuffer.sampleRate) * 1_000_000),
      data: combineChannels(audioBuffer, offset, length),
    })

    audioEncoder.encode(audioData)
    audioData.close()

    onProgress(0.85 + (c / numChunks) * 0.1)
    await new Promise(r => setTimeout(r, 0))
  }

  await audioEncoder.flush()
  audioEncoder.close()

  // Finalize
  onProgress(0.95)
  muxer.finalize()

  const blob = new Blob([target.buffer], { type: 'video/mp4' })
  onProgress(1)
  return blob
}

function combineChannels(audioBuffer: AudioBuffer, offset: number, length: number): Float32Array<ArrayBuffer> {
  // For f32-planar, channels are laid out sequentially
  const numChannels = audioBuffer.numberOfChannels
  const result = new Float32Array(length * numChannels)
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      result[ch * length + i] = channelData[offset + i] ?? failMe(`sample at ${offset + i} not found`)
    }
  }
  return result
}
