import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';

import { useTilt } from '@/hooks/use-tilt';
import { HERO_POSTER, HERO_VIDEO } from '@/lib/media';

/**
 * Full-bleed looping studio video with a dark gradient on top so text stays readable.
 * Moves gently with the phone's tilt, and slower than the content when `scrollY`
 * is given (parallax). With "Reduce Motion" on, shows the still poster instead.
 */
export function VideoBackdrop({
  scrollY,
  style,
  overlay = 'full',
}: {
  scrollY?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  /** 'full': dark all over (sign-in); 'hero': dark at top and bottom, lighter middle. */
  overlay?: 'full' | 'hero';
}) {
  const reduce = useReducedMotion();
  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    if (!reduce) p.play();
  });
  const tilt = useTilt();

  const motion = useAnimatedStyle(() => {
    const parallax = scrollY ? interpolate(scrollY.value, [-200, 0, 600], [-60, 0, 260]) : 0;
    return {
      transform: [
        { translateX: tilt.x.value * -14 },
        { translateY: tilt.y.value * -14 + parallax },
        { scale: 1.12 },
      ],
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, motion]}>
        <Image source={HERO_POSTER} style={StyleSheet.absoluteFill} contentFit="cover" />
        {reduce ? null : (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
            accessible={false}
          />
        )}
      </Animated.View>
      <LinearGradient
        colors={
          overlay === 'full'
            ? ['rgba(8,6,5,0.55)', 'rgba(8,6,5,0.35)', 'rgba(8,6,5,0.85)']
            : ['rgba(8,6,5,0.45)', 'rgba(8,6,5,0.15)', 'rgba(8,6,5,0.75)']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#0b0807' },
});
