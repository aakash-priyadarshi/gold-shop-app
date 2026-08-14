/**
 * Phone / webcam scanning for barcodes, QR, and Data Matrix.
 * RFID/EPC tags are radio — they need a HID wedge gun, not the camera.
 *
 * Safari iOS has no BarcodeDetector; we fall back to ZXing. Chrome Android
 * uses BarcodeDetector when present.
 */

export const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  { audio: false, video: { facingMode: "environment" } },
  { audio: false, video: true },
];

export const BARCODE_DETECTOR_FORMATS = [
  "qr_code",
  "aztec",
  "data_matrix",
  "pdf417",
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
] as const;

export function canUseGetUserMedia(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia;
}

export async function getRearCameraStream(
  getUserMedia?: (
    constraints: MediaStreamConstraints,
  ) => Promise<MediaStream>,
): Promise<MediaStream> {
  const request =
    getUserMedia ??
    navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  let last: unknown;
  for (const constraints of CAMERA_CONSTRAINTS) {
    try {
      return await request(constraints);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Camera unavailable");
}

/** iOS Safari only plays inline video when these attributes are set before play(). */
export function prepareScanVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): void {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
}

export async function playScanVideo(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch {
    // iOS may require a second play after metadata.
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.play().then(() => resolve()).catch(reject);
      };
      video.addEventListener("loadedmetadata", onReady);
      window.setTimeout(() => {
        video.removeEventListener("loadedmetadata", onReady);
        video.play().then(() => resolve()).catch(reject);
      }, 400);
    });
  }
}
