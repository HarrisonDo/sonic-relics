import { useCallback, useEffect, useRef, useState } from "react";
import type { Preferences, Track } from "../lib/model";

export type PlaybackStatus =
  "loading" | "paused" | "playing" | "ended" | "error";

export function useAudioPlayer(
  track: Track,
  preferences: Preferences,
  onEnded: () => void,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preferencesRef = useRef(preferences);
  const onEndedRef = useRef(onEnded);
  const shouldPlayRef = useRef(false);
  const operationRef = useRef(0);
  const [status, setStatus] = useState<PlaybackStatus>("paused");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(track.duration);
  const [error, setError] = useState<string | null>(null);
  const [analysisAvailable, setAnalysisAvailable] = useState(true);
  preferencesRef.current = preferences;
  onEndedRef.current = onEnded;

  const ensureContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    if (!audioRef.current) return null;
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(context.destination);
      sourceRef.current = source;
      contextRef.current = context;
      analyserRef.current = analyser;
      return context;
    } catch {
      setAnalysisAvailable(false);
      return null;
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldPlayRef.current = true;
    const operation = ++operationRef.current;
    setError(null);
    if (audio.ended) audio.currentTime = 0;
    const context = ensureContext();
    try {
      await Promise.all([audio.play(), context?.resume()]);
      if (
        operation === operationRef.current &&
        shouldPlayRef.current &&
        !audio.paused
      )
        setStatus("playing");
    } catch (cause) {
      if (operation !== operationRef.current || !shouldPlayRef.current) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      shouldPlayRef.current = false;
      setStatus("error");
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "点一下播放按钮，就可以开始聆听。"
          : "这首音频暂时无法播放，试试 MP3 或 WAV 格式。",
      );
    }
  }, [ensureContext]);

  const pause = useCallback(() => {
    shouldPlayRef.current = false;
    operationRef.current++;
    audioRef.current?.pause();
    setStatus("paused");
  }, []);

  const toggle = useCallback(() => {
    if (shouldPlayRef.current) pause();
    else void play();
  }, [pause, play]);

  const prepareTrack = useCallback(
    (autoplay: boolean) => {
      shouldPlayRef.current = autoplay;
      if (autoplay)
        void ensureContext()
          ?.resume()
          .catch(() => undefined);
    },
    [ensureContext],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setTime(audio.currentTime);
    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const ready = () => {
      updateDuration();
      if (!shouldPlayRef.current) setStatus("paused");
    };
    const playing = () => setStatus("playing");
    const paused = () => {
      if (!audio.ended && audio.readyState > 0 && !shouldPlayRef.current)
        setStatus("paused");
    };
    const waiting = () => {
      if (shouldPlayRef.current) setStatus("loading");
    };
    const ended = () => {
      setStatus("ended");
      onEndedRef.current();
    };
    const failed = () => {
      if (!audio.error) return;
      shouldPlayRef.current = false;
      setStatus("error");
      setError(
        audio.error.code === 2
          ? "音频未能加载，请检查连接后重试。"
          : "浏览器无法解码这首音频，试试 MP3 或 WAV。",
      );
    };
    const events: Record<string, EventListener> = {
      timeupdate: updateTime,
      durationchange: updateDuration,
      loadedmetadata: ready,
      playing,
      pause: paused,
      waiting,
      ended,
      error: failed,
    };
    Object.entries(events).forEach(([event, callback]) =>
      audio.addEventListener(event, callback),
    );
    return () => {
      Object.entries(events).forEach(([event, callback]) =>
        audio.removeEventListener(event, callback),
      );
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      sourceRef.current?.disconnect();
      void contextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    operationRef.current++;
    audio.pause();
    setTime(0);
    setDuration(track.duration);
    setError(null);
    setStatus("loading");
    audio.src = track.src;
    audio.load();
    if (shouldPlayRef.current) void play();
    // Year corrections and visual changes deliberately leave this audio instance intact.
  }, [track.id, track.src, play]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = preferences.volume;
    audioRef.current.muted = preferences.muted;
    audioRef.current.loop = preferences.repeat === "one";
  }, [preferences.volume, preferences.muted, preferences.repeat]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || !Number.isFinite(value))
      return;
    audio.currentTime = Math.max(0, Math.min(value, audio.duration));
    setTime(audio.currentTime);
  }, []);

  const skipSeconds = useCallback(
    (delta: number) => seek((audioRef.current?.currentTime ?? 0) + delta),
    [seek],
  );

  const readSpectrum = useCallback((buffer: Uint8Array<ArrayBuffer>) => {
    const audio = audioRef.current;
    if (
      !analyserRef.current ||
      !audio ||
      audio.paused ||
      preferencesRef.current.muted ||
      preferencesRef.current.volume === 0
    ) {
      buffer.fill(0);
      return 0;
    }
    analyserRef.current.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += (buffer[i] / 255) ** 2;
    return Math.sqrt(sum / buffer.length);
  }, []);

  const mechanicalClick = useCallback(() => {
    if (!preferencesRef.current.soundEffects || preferencesRef.current.muted)
      return;
    const context = ensureContext();
    if (!context) return;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(210, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      70,
      context.currentTime + 0.035,
    );
    gain.gain.setValueAtTime(
      0.075 * preferencesRef.current.volume,
      context.currentTime,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.045);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }, [ensureContext]);

  return {
    audioRef,
    status,
    time,
    duration,
    error,
    analysisAvailable,
    playing: status === "playing",
    play,
    pause,
    toggle,
    prepareTrack,
    seek,
    skipSeconds,
    readSpectrum,
    mechanicalClick,
  };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
