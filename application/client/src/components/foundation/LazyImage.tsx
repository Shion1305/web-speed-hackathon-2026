import { ImgHTMLAttributes } from "react";

import { useNearViewport } from "@web-speed-hackathon-2026/client/src/hooks/use_near_viewport";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  rootMargin?: string;
}

export const LazyImage = ({ src, rootMargin = "320px 0px", ...props }: Props) => {
  const { isNearViewport, targetRef } = useNearViewport<HTMLImageElement>({ rootMargin });

  return (
    <img
      {...props}
      decoding={props.decoding ?? "async"}
      loading={props.loading ?? "lazy"}
      ref={targetRef}
      src={isNearViewport ? src : undefined}
    />
  );
};
