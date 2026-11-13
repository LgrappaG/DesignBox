export interface LocalImageProcessResult {
  url: string;
  source: 'imgbb' | 'dataurl';
  sizeKB: number;
  oversizedWarning?: string;
  uploadError?: string;
}

const SOFT_LOCAL_IMAGE_WARN_KB = 1500;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not produce a string DataURL.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read local image file.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processes a local image selection:
 * 1. If imgbbApiKey is configured, uploads to ImgBB and returns a public HTTPS URL.
 * 2. Otherwise (or if ImgBB upload fails), falls back to a persistent offline Base64 DataURL
 *    instead of an ephemeral blob: URL.
 */
export async function processLocalImageFile(
  file: File,
  imgbbApiKey: string
): Promise<LocalImageProcessResult> {
  const sizeKB = Math.round(file.size / 1024);
  const oversizedWarning =
    sizeKB > SOFT_LOCAL_IMAGE_WARN_KB
      ? `Large local image (${(sizeKB / 1024).toFixed(1)} MB) embedded offline; consider compressing or using ImgBB so project storage stays fast.`
      : undefined;

  const trimmedKey = imgbbApiKey.trim();
  if (trimmedKey) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(trimmedKey)}`, {
        method: 'POST',
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      };
      if (json.success && json.data?.url) {
        return {
          url: json.data.url,
          source: 'imgbb',
          sizeKB,
        };
      }
      const dataUrl = await readFileAsDataUrl(file);
      return {
        url: dataUrl,
        source: 'dataurl',
        sizeKB,
        oversizedWarning,
        uploadError: json.error?.message || 'ImgBB upload rejected; kept persistent offline DataURL.',
      };
    } catch (err) {
      const dataUrl = await readFileAsDataUrl(file);
      return {
        url: dataUrl,
        source: 'dataurl',
        sizeKB,
        oversizedWarning,
        uploadError:
          err instanceof Error
            ? `ImgBB error (${err.message}); kept persistent offline DataURL.`
            : 'ImgBB upload failed; kept persistent offline DataURL.',
      };
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    url: dataUrl,
    source: 'dataurl',
    sizeKB,
    oversizedWarning,
  };
}

