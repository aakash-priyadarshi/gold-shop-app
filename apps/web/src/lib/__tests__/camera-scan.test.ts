import { CAMERA_CONSTRAINTS, getRearCameraStream } from "../camera-scan";
import { canOpenScanCamera, hasCameraScanning } from "../posHardware";

describe("camera scan constraints", () => {
  it("tries the rear camera before a generic video stream", () => {
    expect(CAMERA_CONSTRAINTS.length).toBeGreaterThanOrEqual(3);
    const first = CAMERA_CONSTRAINTS[0].video as MediaTrackConstraints;
    expect(first.facingMode).toEqual({ ideal: "environment" });
    expect(CAMERA_CONSTRAINTS[CAMERA_CONSTRAINTS.length - 1]).toEqual({
      audio: false,
      video: true,
    });
  });

  it("falls through constraint sets until getUserMedia succeeds", async () => {
    const calls: MediaStreamConstraints[] = [];
    const stream = { id: "ok" } as unknown as MediaStream;
    const getUserMedia = async (constraints: MediaStreamConstraints) => {
      calls.push(constraints);
      if (calls.length < 2) throw new Error("NotFoundError");
      return stream;
    };
    const result = await getRearCameraStream(getUserMedia);
    expect(result).toBe(stream);
    expect(calls).toHaveLength(2);
  });

  it("opens the camera without requiring BarcodeDetector (Safari iOS)", () => {
    expect(hasCameraScanning()).toBe(canOpenScanCamera());
  });
});
