// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

/** Background-music formats a showcase accepts. */
export type AudioExt = 'mp3' | 'm4a' | 'ogg' | 'wav'

export const AUDIO_MIME: Record<AudioExt, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
}

/**
 * Identifies an audio container from its leading bytes. Returns the canonical
 * extension, or null when the bytes match none of the accepted formats — the
 * client-supplied name and MIME type are never trusted.
 */
export function sniffAudio(buffer: Buffer): AudioExt | null {
  if (buffer.length < 12) return null

  // MP3: an ID3v2 tag, or a raw MPEG-audio frame sync (0xFFEx/0xFFFx).
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'mp3'
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'mp3'

  // OGG: "OggS"
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return 'ogg'

  // WAV: "RIFF" .... "WAVE"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return 'wav'
  }

  // MP4/M4A: "ftyp" box at offset 4.
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return 'm4a'

  return null
}

export function audioMimeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return (ext && ext in AUDIO_MIME && AUDIO_MIME[ext as AudioExt]) || 'application/octet-stream'
}
