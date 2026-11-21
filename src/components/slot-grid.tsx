import { StyleSheet, View } from 'react-native';

import { Chip, Loading, Txt } from '@/components/ui';
import { timeOf } from '@/lib/dates';
import { spacing } from '@/theme';

/** Grid of free start times returned by `get_available_slots`. */
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
  if (loading) return <Loading />;
  if (!slots || slots.length === 0) {
    return (
      <Txt muted center style={{ paddingVertical: spacing.lg }}>
        {emptyText}
      </Txt>
    );
  }
  return (
    <View style={styles.grid}>
      {slots.map((s) => (
        <Chip
          key={s}
          label={timeOf(s, tz)}
          selected={s === selected}
          onPress={() => onSelect(s)}
          style={styles.slot}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { minWidth: 72 },
});
