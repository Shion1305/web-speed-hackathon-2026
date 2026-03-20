import { RefObject, useEffect, useMemo, useRef, useState } from "react";

interface Options {
  rootMargin?: string;
}

interface Result<T extends Element> {
  isNearViewport: boolean;
  targetRef: RefObject<T | null>;
}

export function useNearViewport<T extends Element>({
  rootMargin = "256px 0px",
}: Options = {}): Result<T> {
  const targetRef = useRef<T>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  const observerOptions = useMemo(() => ({ rootMargin }), [rootMargin]);

  useEffect(() => {
    if (isNearViewport) {
      return;
    }

    const target = targetRef.current;
    if (target == null) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);
      if (!isVisible) {
        return;
      }
      setIsNearViewport(true);
      observer.disconnect();
    }, observerOptions);

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [isNearViewport, observerOptions]);

  return {
    isNearViewport,
    targetRef,
  };
}
