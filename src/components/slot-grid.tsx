import { StyleSheet, View } from 'react-native';

import { Appear, Chip, Skeleton, Txt } from '@/components/ui';
import { timeOf } from '@/lib/dates';
import { spacing } from '@/theme';

const PARTS: { label: string; until: string }[] = [
  { label: 'בוקר', until: '12:00' },
  { label: 'צהריים', until: '17:00' },
  { label: 'ערב', until: '24:00' },
];

/** Free start times from `get_available_slots`, grouped into morning / noon / evening. */
export function SlotGrid({
  slots,
  loading,
  tz,
  selected,
  onSelect,
  emptyText = 'אין שעות פנויות ביום הזה.',
}: {
  slots: string[] | null;
  loading: boolean;
  tz: string;
  selected: string | null;
  onSelect: (slot: string) => void;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height={44} style={styles.slot} />
        ))}
      </View>
    );
  }
  if (!slots || slots.length === 0) {
    return (
      <Appear>
        <Txt muted center style={{ paddingVertical: spacing.xl }}>
          {emptyText}
        </Txt>
      </Appear>
    );
  }

  const groups = PARTS.map((p, i) => {
    const from = i === 0 ? '00:00' : PARTS[i - 1].until;
    const items = slots.filter((s) => {
      const t = timeOf(s, tz);
      return t >= from && t < p.until;
    });
    return { ...p, items };
  }).filter((g) => g.items.length > 0);
  // Running index across groups, so the stagger flows from the first slot to the last.
  const offsets = groups.map((_, i) => groups.slice(0, i).reduce((sum, g) => sum + g.items.length, 0));

  return (
    <View style={{ gap: spacing.lg }}>
      {groups.map((g, gi) => (
        <View key={g.label} style={{ gap: spacing.sm }}>
          <Txt label variant="tiny">
            {g.label}
          </Txt>
          <View style={styles.grid}>
            {g.items.map((s, si) => (
              <Appear key={s} index={offsets[gi] + si} style={styles.slot}>
                <Chip label={timeOf(s, tz)} selected={s === selected} onPress={() => onSelect(s)} />
              </Appear>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '23%', flexGrow: 0 },
});
