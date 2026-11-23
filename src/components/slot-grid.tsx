import { useEffect } from 'react';
import { View } from 'react-native';

import { Appear, Skeleton, Txt } from '@/components/ui';
import { WHEEL_ITEM_HEIGHT, WheelPicker } from '@/components/wheel-picker';
import { timeOf } from '@/lib/dates';
import { colors, spacing } from '@/theme';

function partOfDay(time: string) {
  if (time < '12:00') return 'בוקר';
  if (time < '17:00') return 'צהריים';
  return 'ערב';
}

/**
 * Free start times from `get_available_slots`, on a scroll wheel. The first free
 * time is pre-selected, so the customer only scrolls if they want another one.
 */
export function SlotGrid({
  slots,
  loading,
  tz,
  selected,
  onSelect,
  emptyText = 'אין שעות פנויות ביום הזה.',
  autoSelect = true,
  error,
}: {
  slots: string[] | null;
  loading: boolean;
  tz: string;
  selected: string | null;
  onSelect: (slot: string) => void;
  emptyText?: string;
  /** Pre-select the first free time (off for rescheduling, where an accidental save would move the appointment). */
  autoSelect?: boolean;
  error?: string | null;
}) {
  useEffect(() => {
    if (autoSelect && slots && slots.length > 0 && (!selected || !slots.includes(selected))) onSelect(slots[0]);
  }, [autoSelect, slots, selected, onSelect]);

  if (loading) return <Skeleton height={WHEEL_ITEM_HEIGHT * 5} />;
  if (error) {
    return (
      <Txt color={colors.danger} center style={{ paddingVertical: spacing.xl }}>
        {error}
      </Txt>
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

  const items = slots.map((s) => {
    const t = timeOf(s, tz);
    return { key: s, label: t, caption: partOfDay(t) };
  });

  return (
    <View>
      <WheelPicker items={items} selectedKey={selected} onChange={onSelect} accessibilityLabel="בחירת שעה" />
      <Txt variant="tiny" faint center style={{ marginTop: spacing.sm }}>
        {slots.length === 1 ? 'שעה פנויה אחת' : `${slots.length} שעות פנויות`} · גוללים לבחירה
      </Txt>
    </View>
  );
}
