import { useRef, useEffect } from "react";

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

/** Live-style video from Ben with FaceTime-style name pill + self-view PiP. */
export function BenVideoCallFrame() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      /* autoplay blocked until user gesture — accept tap usually satisfies this */
    });
  }, []);

  return (
    <div className="ben-video-call" role="region" aria-label="Video call with Ben">
      <div className="ben-video-call__frame">
        <video
          ref={videoRef}
          className="ben-video-call__video"
          src="videos/ben-talking.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        <div className="ben-video-call__name-pill">
          <MicIcon />
          <span>Ben</span>
        </div>
        <div className="ben-video-call__pip" aria-hidden>
          <span className="ben-video-call__pip-avatar">C</span>
        </div>
      </div>
    </div>
  );
}
