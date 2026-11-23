/** A bundled image (require(...)). */
type ImageAsset = number;

/**
 * Media shown in the app. To use real footage / photos from the studio, replace the
 * files (same names) or add entries — no code changes needed.
 *
 *   assets/video/hero-loop.mp4   background loop (portrait, 5–10 s, muted, < 5 MB)
 *   assets/video/hero-poster.jpg first frame, shown while the video loads
 *   assets/gallery/*.jpg         before / after pairs (same framing, square)
 */
export const HERO_VIDEO = require('../../assets/video/hero-loop.mp4');
export const HERO_POSTER: ImageAsset = require('../../assets/video/hero-poster.jpg');

export type BeforeAfterItem = {
  title: string;
  before: ImageAsset;
  after: ImageAsset;
  /** True for illustrations: the app labels them "המחשה" so they're never mistaken for real results. */
  illustration?: boolean;
};

/** Replace with real, consented photos of the studio's work before the App Store release. */
export const BEFORE_AFTER: BeforeAfterItem[] = [
  {
    title: 'עיצוב גבות',
    before: require('../../assets/gallery/demo-before.jpg'),
    after: require('../../assets/gallery/demo-after.jpg'),
    illustration: true,
  },
];
