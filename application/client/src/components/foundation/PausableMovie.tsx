import { RefObject, useCallback, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { useNearViewport } from "@web-speed-hackathon-2026/client/src/hooks/use_near_viewport";

interface Props {
  src: string;
}

function captureCurrentFrame(imageRef: RefObject<HTMLImageElement | null>): string | null {
  const image = imageRef.current;
  if (image == null || image.naturalWidth === 0 || image.naturalHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (context == null) {
    return null;
  }

  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * クリックすると再生・一時停止を切り替えます。
 */
export const PausableMovie = ({ src }: Props) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const readyCanvasRef = useRef<HTMLCanvasElement>(null);
  const { isNearViewport, targetRef } = useNearViewport<HTMLButtonElement>({
    rootMargin: "320px 0px",
  });
  const handleLoadImage = useCallback(() => {
    const image = imageRef.current;
    const canvas = readyCanvasRef.current;
    if (image == null || canvas == null) {
      return;
    }
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    setIsMovieReady(true);
  }, []);

  const [isMovieReady, setIsMovieReady] = useState(false);
  const [pausedFrameUrl, setPausedFrameUrl] = useState<string | null>(null);
  const handleClick = useCallback(() => {
    if (!isMovieReady) {
      return;
    }
    setPausedFrameUrl((pausedFrameUrl) => {
      if (pausedFrameUrl == null) {
        return captureCurrentFrame(imageRef);
      }
      return null;
    });
  }, [isMovieReady]);

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <button
        aria-label="動画プレイヤー"
        className="relative block h-full w-full"
        onClick={handleClick}
        ref={targetRef}
        type="button"
      >
        <canvas
          ref={readyCanvasRef}
          aria-hidden={true}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
        {pausedFrameUrl == null ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
            loading="lazy"
            ref={imageRef}
            onLoad={handleLoadImage}
            src={isNearViewport ? src : undefined}
          />
        ) : (
          <img alt="" className="h-full w-full object-cover" src={pausedFrameUrl} />
        )}
      </button>
    </AspectRatioBox>
  );
};
