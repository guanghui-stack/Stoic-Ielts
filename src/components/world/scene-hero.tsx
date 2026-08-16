import type { ReactNode } from "react";
import type { ArtAsset } from "@/lib/brand/art-manifest";
import { InkWashHero } from "@/components/brand/ink-wash-hero";

export function SceneHero(props: {
  asset: ArtAsset;
  eyebrow: string;
  title: ReactNode;
  functionalLabel: string;
  videoSrc?: string;
  children?: ReactNode;
}) {
  return (
    <div className="world-scene-hero world-scene-reveal">
      <InkWashHero {...props} />
    </div>
  );
}
