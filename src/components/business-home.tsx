import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BrowMark } from '@/components/brow-mark';
import { MyAppointmentCard } from '@/components/my-appointment-card';
import { Appear, Button, Card, EmptyState, IconButton, Loading, PressableScale, Row, Txt } from '@/components/ui';
import { ServiceQuiz } from '@/components/service-quiz';
import { VideoBackdrop } from '@/components/video-backdrop';
import { useAuth } from '@/context/auth';
import { useMyAppointments } from '@/hooks/use-my-appointments';
import { usePublicBusiness } from '@/hooks/use-public-business';
import { formatDuration, formatPhone, formatPrice, timeRange, todayIn, WEEKDAYS, weekdayOf } from '@/lib/dates';
import { whatsappUrl } from '@/lib/links';
import { colors, MAX_WIDTH, radius, spacing } from '@/theme';

/**
 * The customer-facing home of a business: brand hero with the signature brow
 * animation, the customer's next appointment, services, hours and contact.
 */
export function BusinessHome({ slug }: { slug: string }) {
  const { data, loading, error, retry } = usePublicBusiness(slug);
  const { profile } = useAuth();
  const { upcoming } = useMyAppointments(slug);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const insets = useSafeAreaInsets();

  // Scroll position drives the parallax video and the hero fading out.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const heroFade = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 320], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 320], [0, -40], Extrapolation.CLAMP) }],
  }));
  const [pastHero, setPastHero] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > 480,
    (past, prev) => {
      if (past !== prev) scheduleOnRN(setPastHero, past);
    },
  );
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  if (loading) return <Loading />;
  if (error && !data) {
    return (
      <SafeAreaView style={styles.screen}>
        <EmptyState icon="cloud-offline-outline" title="אין חיבור כרגע" message={error} action={<Button title="נסו שוב" onPress={retry} />} />
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={styles.screen}>
        <EmptyState icon="search-outline" title="העסק לא נמצא" message="ייתכן שהקישור שגוי או שהעסק שינה את הכתובת." />
      </SafeAreaView>
    );
  }

  const { business, services, hours } = data;
  const tz = business.timezone;
  const today = todayIn(tz);
  const todayHours = hours.filter((h) => h.weekday === weekdayOf(today));
  const book = (serviceId?: string) =>
    router.push({ pathname: '/book/[slug]', params: serviceId ? { slug, service: serviceId } : { slug } });

  const hero = (
    <View style={[styles.heroBox, { paddingTop: insets.top + spacing.xxl, minHeight: (wide ? 640 : 560) + insets.top }]}>
      <VideoBackdrop scrollY={scrollY} overlay="hero" />
      <Animated.View style={[styles.hero, heroFade]}>
      <Animated.View entering={FadeIn.duration(900)} style={{ gap: spacing.xs }}>
        {firstName ? (
          <Txt center color="rgba(255,255,255,0.85)">
            היי {firstName} 👋
          </Txt>
        ) : null}
        <Txt label variant="tiny" center color="rgba(255,255,255,0.7)">
          {business.category ? `${business.category} · ` : ''}
          {business.address?.split(',').pop()?.trim() || 'סטודיו'}
        </Txt>
      </Animated.View>
      <BrowMark width={wide ? 170 : 120} color="#FFFFFF" style={{ marginVertical: spacing.lg }} />
      <Animated.View entering={FadeInDown.delay(500).duration(800)}>
        <Txt variant="display" center color="#FFFFFF" style={wide && { fontSize: 64, lineHeight: 70 }}>
          {business.name}
        </Txt>
      </Animated.View>
      {business.description ? (
        <Animated.View entering={FadeInDown.delay(750).duration(800)}>
          <Txt center color="rgba(255,255,255,0.78)" style={styles.tagline}>
            {business.description}
          </Txt>
        </Animated.View>
      ) : null}
      <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.heroCta}>
        <Button title="קביעת תור" icon="calendar-outline" variant="inverse" onPress={() => book()} />
        <Row gap={spacing.md} style={{ justifyContent: 'center' }}>
          {business.phone ? (
            <IconButton filled icon="call-outline" label="התקשרות" onPress={() => Linking.openURL(`tel:${business.phone}`)} />
          ) : null}
          {business.phone ? (
            <IconButton
              filled
              icon="logo-whatsapp"
              label="וואטסאפ"
              onPress={() => Linking.openURL(whatsappUrl(business.phone!, `היי, אשמח לפרטים לגבי תור ב${business.name}`))}
            />
          ) : null}
          {business.address ? (
            <IconButton
              filled
              icon="navigate-outline"
              label="ניווט בוויז"
              onPress={() => Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(business.address!)}`)}
            />
          ) : null}
        </Row>
      </Animated.View>
      </Animated.View>
    </View>
  );

  const content = (
    <View style={styles.content}>
      {upcoming.length > 0 ? (
        <Appear delay={300}>
          <Txt label variant="tiny" style={styles.sectionLabel}>
            התור הבא שלך
          </Txt>
          <View style={{ gap: spacing.sm }}>
            {upcoming.slice(0, 2).map((a) => (
              <MyAppointmentCard key={a.id} appt={a} />
            ))}
          </View>
        </Appear>
      ) : null}

      <View>
        <Txt label variant="tiny" style={styles.sectionLabel}>
          טיפולים
        </Txt>
        <View style={styles.services}>
          {services.map((s, i) => (
            <Appear key={s.id} index={i} delay={200}>
              <PressableScale
                onPress={() => book(s.id)}
                accessibilityLabel={`${s.name}, ${formatDuration(s.duration_min)}${s.price !== null ? `, ${formatPrice(s.price)}` : ''}`}
                style={styles.serviceRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3">{s.name}</Txt>
                  <Txt variant="small" muted>
                    {formatDuration(s.duration_min)}
                  </Txt>
                </View>
                {s.price !== null ? (
                  <Txt variant="h3" weight="light">
                    {formatPrice(s.price)}
                  </Txt>
                ) : null}
                <View style={styles.serviceArrow}>
                  <Ionicons name="arrow-back" size={16} color={colors.text} />
                </View>
              </PressableScale>
            </Appear>
          ))}
          {services.length === 0 ? <Txt muted>בקרוב יתווספו טיפולים לקביעה אונליין.</Txt> : null}
        </View>
      </View>

      <Appear delay={350}>
        <ServiceQuiz services={services} onBook={book} />
      </Appear>

      <Appear delay={400}>
        <Txt label variant="tiny" style={styles.sectionLabel}>
          שעות פעילות
        </Txt>
        <Card style={{ gap: spacing.xs }}>
          <Row style={{ marginBottom: spacing.xs }}>
            <View style={[styles.statusDot, { backgroundColor: todayHours.length ? colors.success : colors.textFaint }]} />
            <Txt bold>
              {todayHours.length
                ? `היום פתוח · ${todayHours.map((h) => timeRange(h.start_time, h.end_time)).join(', ')}`
                : 'היום סגור'}
            </Txt>
          </Row>
          {WEEKDAYS.map((name, wd) => {
            const ranges = hours.filter((h) => h.weekday === wd);
            const isToday = wd === weekdayOf(today);
            return (
              <Row key={name}>
                <Txt variant="small" muted={!isToday} bold={isToday} style={{ flex: 1 }}>
                  {name}
                </Txt>
                <Txt variant="small" muted={!isToday} bold={isToday}>
                  {ranges.length ? ranges.map((h) => timeRange(h.start_time, h.end_time)).join(' · ') : 'סגור'}
                </Txt>
              </Row>
            );
          })}
        </Card>
      </Appear>

      {business.address || business.phone ? (
        <Appear delay={500}>
          <Txt label variant="tiny" style={styles.sectionLabel}>
            איך מגיעים
          </Txt>
          <Card>
            {business.address ? (
              <Row>
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <Txt style={{ flex: 1 }}>{business.address}</Txt>
              </Row>
            ) : null}
            {business.phone ? (
              <Row>
                <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                <Txt style={{ flex: 1 }}>{formatPhone(business.phone)}</Txt>
              </Row>
            ) : null}
          </Card>
        </Appear>
      ) : null}

      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/terms')} accessibilityRole="link" hitSlop={8}>
          <Txt variant="tiny" faint>
            תנאי שימוש
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" hitSlop={8}>
          <Txt variant="tiny" faint>
            מדיניות פרטיות
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/accessibility')} accessibilityRole="link" hitSlop={8}>
          <Txt variant="tiny" faint>
            נגישות
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/support')} accessibilityRole="link" hitSlop={8}>
          <Txt variant="tiny" faint>
            תמיכה
          </Txt>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Light status bar over the dark video; dark once the page is scrolled past it. */}
      <StatusBar style={pastHero ? (colors.isDark ? 'light' : 'dark') : 'light'} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        {hero}
        <View style={styles.sheet}>
          <View style={styles.page}>{content}</View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const insetsPad = Platform.OS === 'web' ? 0 : 12;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heroBox: { justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl + spacing.lg, overflow: 'hidden' },
  hero: { alignItems: 'center', gap: spacing.sm, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  // Content slides up over the bottom of the video like a sheet.
  sheet: {
    marginTop: -spacing.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + insetsPad,
  },
  page: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  tagline: { maxWidth: 360, marginTop: spacing.sm },
  heroCta: { width: '100%', maxWidth: 360, gap: spacing.lg, marginTop: spacing.xl },
  content: { gap: spacing.xxl },
  sectionLabel: { marginBottom: spacing.md },
  services: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  serviceArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myAppt: { backgroundColor: colors.surfaceRaised },
  myApptDate: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
});
