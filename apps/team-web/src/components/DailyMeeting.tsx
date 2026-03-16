"use client";

import DailyIframe, {
    DailyCall,
    DailyParticipant,
} from "@daily-co/daily-js";
import {
    Loader2,
    Mic,
    MicOff,
    PhoneOff,
    Video,
    VideoOff,
    Volume2,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

/* ── Brand constants ─────────────────────────────────────────────────── */
const BRAND = {
  accent: "#C9A227",
  accentHover: "#B69221",
  bg: "#1a1a2e",
  bgDeep: "#0f0f1b",
  bgCard: "#242445",
  border: "#3e3e5e",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  logo: "https://www.orivraa.com/brand/orivraa-logo.svg",
};

/* ── Types ────────────────────────────────────────────────────────────── */
interface DailyMeetingProps {
  url: string;
  token?: string;
  userName?: string;
  onClose: () => void;
}

interface ParticipantTile {
  sessionId: string;
  userName: string;
  isLocal: boolean;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  audio: boolean;
  video: boolean;
}

/* ── Video tile ───────────────────────────────────────────────────────── */
const VideoTile: React.FC<{
  participant: ParticipantTile;
  large?: boolean;
}> = ({ participant, large }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.videoTrack) {
      videoRef.current.srcObject = new MediaStream([participant.videoTrack]);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [participant.videoTrack]);

  useEffect(() => {
    if (audioRef.current && participant.audioTrack && !participant.isLocal) {
      audioRef.current.srcObject = new MediaStream([participant.audioTrack]);
    }
  }, [participant.audioTrack, participant.isLocal]);

  const initials = participant.userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border transition-all ${
        large ? "w-full h-full" : "w-full aspect-video"
      }`}
      style={{
        borderColor: participant.audio ? BRAND.accent : BRAND.border,
        backgroundColor: BRAND.bgDeep,
      }}
    >
      {/* Video or avatar */}
      {participant.video && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="rounded-full flex items-center justify-center text-white font-bold"
            style={{
              width: large ? 96 : 64,
              height: large ? 96 : 64,
              fontSize: large ? 32 : 24,
              background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accentHover})`,
            }}
          >
            {initials}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote participants */}
      {!participant.isLocal && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
        {participant.audio ? (
          <Volume2 className="h-3 w-3" style={{ color: BRAND.accent }} />
        ) : (
          <MicOff className="h-3 w-3 text-red-400" />
        )}
        <span className="text-xs font-medium text-white truncate max-w-[120px]">
          {participant.isLocal ? "You" : participant.userName}
        </span>
      </div>

      {/* AI Agent badge */}
      {!participant.isLocal && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
          style={{
            background: `linear-gradient(135deg, ${BRAND.accent}dd, ${BRAND.accentHover}dd)`,
            color: "white",
          }}
        >
          AI AGENT
        </div>
      )}
    </div>
  );
};

/* ── Audio visualizer bar ─────────────────────────────────────────── */
const AudioVisualizer: React.FC<{ stream: MediaStream | null }> = ({
  stream,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvasRef.current!.width;
      const h = canvasRef.current!.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h;
        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
        gradient.addColorStop(0, BRAND.accent);
        gradient.addColorStop(1, `${BRAND.accent}44`);
        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      audioCtx.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={32}
      className="rounded opacity-80"
    />
  );
};

/* ── Main component ───────────────────────────────────────────────── */
export const DailyMeeting: React.FC<DailyMeetingProps> = ({
  url,
  token,
  userName = "Orivraa User",
  onClose,
}) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<ParticipantTile[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Extract participant tile from daily participant ────────── */
  const toTile = useCallback((p: DailyParticipant): ParticipantTile => {
    const audioTrack = p.tracks?.audio?.persistentTrack ?? null;
    const videoTrack = p.tracks?.video?.persistentTrack ?? null;
    return {
      sessionId: p.session_id,
      userName: p.user_name || "Guest",
      isLocal: p.local,
      audioTrack,
      videoTrack,
      audio: !p.tracks?.audio?.off,
      video: !p.tracks?.video?.off,
    };
  }, []);

  /* ── Sync all participants ─────────────────────────────────── */
  const syncParticipants = useCallback(
    (call: DailyCall) => {
      const all = call.participants();
      const tiles: ParticipantTile[] = [];
      for (const [, p] of Object.entries(all)) {
        tiles.push(toTile(p));
        if (p.local && p.tracks?.audio?.persistentTrack) {
          setLocalStream(new MediaStream([p.tracks.audio.persistentTrack]));
        }
      }
      setParticipants(tiles);
    },
    [toTile],
  );

  /* ── Create call and join ──────────────────────────────────── */
  useEffect(() => {
    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: false,
    });

    setCallObject(call);

    const handleJoined = () => {
      setLoading(false);
      syncParticipants(call);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    };

    const handleParticipantUpdate = () => syncParticipants(call);
    const handleLeft = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      onClose();
    };
    const handleError = (e: any) => {
      setError(e?.errorMsg || "Failed to join meeting");
      setLoading(false);
    };

    call.on("joined-meeting", handleJoined);
    call.on("participant-joined", handleParticipantUpdate);
    call.on("participant-updated", handleParticipantUpdate);
    call.on("participant-left", handleParticipantUpdate);
    call.on("track-started", handleParticipantUpdate);
    call.on("track-stopped", handleParticipantUpdate);
    call.on("left-meeting", handleLeft);
    call.on("error", handleError);

    call
      .join({ url, token, userName, startVideoOff: true })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      call.leave().catch(() => {});
      call.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token, userName]);

  /* ── Controls ──────────────────────────────────────────────── */
  const toggleMic = () => {
    callObject?.setLocalAudio(!micOn);
    setMicOn(!micOn);
  };
  const toggleCam = () => {
    callObject?.setLocalVideo(!camOn);
    setCamOn(!camOn);
  };
  const leave = () => {
    callObject?.leave();
    onClose();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const localP = participants.find((p) => p.isLocal);
  const remotePs = participants.filter((p) => !p.isLocal);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: BRAND.bgDeep }}>
      {/* ── Top bar ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: BRAND.border, background: BRAND.bg }}
      >
        <div className="flex items-center gap-3">
          <img
            src={BRAND.logo}
            alt="Orivraa"
            className="h-7 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="h-5 w-px" style={{ background: BRAND.border }} />
          <span className="text-sm font-semibold" style={{ color: BRAND.text }}>
            AI Sales Meeting
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: error ? "#ef4444" : "#22c55e" }}
            />
            <span className="text-xs font-mono" style={{ color: BRAND.textMuted }}>
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Audio visualizer */}
          {localStream && <AudioVisualizer stream={localStream} />}

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/10"
            style={{ color: BRAND.textMuted }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2
                className="h-12 w-12 animate-spin"
                style={{ color: BRAND.accent }}
              />
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: BRAND.accent }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: BRAND.text }}>
              Connecting to meeting room...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <X className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-sm text-red-300">{error}</p>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Participant grid */}
            <div className="w-full max-w-5xl flex-1 flex items-center justify-center">
              {remotePs.length === 0 && localP ? (
                /* Solo: show local large + waiting message */
                <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                  <VideoTile participant={localP} large />
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{ background: `${BRAND.accent}22` }}
                  >
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      style={{ color: BRAND.accent }}
                    />
                    <span className="text-sm" style={{ color: BRAND.accent }}>
                      Waiting for AI agent to join...
                    </span>
                  </div>
                </div>
              ) : (
                /* Grid: remote large, local small PiP */
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Main remote tile */}
                  {remotePs[0] && (
                    <div className="w-full max-w-3xl aspect-video">
                      <VideoTile participant={remotePs[0]} large />
                    </div>
                  )}

                  {/* Additional remote tiles */}
                  {remotePs.length > 1 && (
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      {remotePs.slice(1).map((p) => (
                        <div key={p.sessionId} className="w-32">
                          <VideoTile participant={p} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Local PiP */}
                  {localP && (
                    <div className="absolute bottom-4 right-4 w-40 shadow-2xl">
                      <VideoTile participant={localP} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom control bar ─────────────────────────────── */}
      {!loading && !error && (
        <div
          className="flex items-center justify-center gap-3 px-6 py-4 border-t"
          style={{ borderColor: BRAND.border, background: BRAND.bg }}
        >
          {/* Mic toggle */}
          <Button
            onClick={toggleMic}
            className="rounded-full h-12 w-12 p-0 transition-all"
            style={{
              background: micOn ? BRAND.bgCard : "#ef4444",
              color: "white",
              border: `1px solid ${micOn ? BRAND.border : "transparent"}`,
            }}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Camera toggle */}
          <Button
            onClick={toggleCam}
            className="rounded-full h-12 w-12 p-0 transition-all"
            style={{
              background: camOn ? BRAND.bgCard : "#ef4444",
              color: "white",
              border: `1px solid ${camOn ? BRAND.border : "transparent"}`,
            }}
          >
            {camOn ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          {/* Hang up */}
          <Button
            onClick={leave}
            className="rounded-full h-12 w-12 p-0 bg-red-600 hover:bg-red-700 text-white"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* ── Branding footer ───────────────────────────────── */}
      <div
        className="flex items-center justify-center py-1.5 text-[10px] tracking-wide"
        style={{ color: BRAND.textMuted, background: BRAND.bgDeep }}
      >
        Powered by Orivraa AI • Daily.co & Pipecat Cloud
      </div>
    </div>
  );
};
