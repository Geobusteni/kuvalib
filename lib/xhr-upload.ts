// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

export interface UploadResult {
  status: number
  ok: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

// fetch() has no upload-progress event, so a large (13MB+) upload gives no
// feedback for however long the request takes. XMLHttpRequest is the only
// dependency-free way to get real byte-level progress.
export interface UploadProgress {
  loaded: number
  total: number
}

export function postWithProgress(
  url: string,
  form: FormData,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return sendWithProgress('POST', url, form, onProgress)
}

export function sendWithProgress(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
    }

    xhr.onload = () => {
      let data: unknown = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // Non-JSON or empty response body; leave data as {}.
      }
      resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data })
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.onabort = () => reject(new Error('Upload aborted'))

    xhr.send(body)
  })
}
