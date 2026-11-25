import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, EmptyState, ErrorBox, Loading, Row, Screen, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { formatDuration, formatPrice } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/types';
import { colors, spacing } from '@/theme';

export default function Services() {
  const business = useBusiness();

  const { data, loading, refreshing, error, refresh } = useFocusData(async () => {
    const { data: rows, error: err } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('sort_order')
      .order('created_at');
    if (err) throw err;
    return (rows ?? []) as Service[];
  }, [business.id]);

  const open = (id: string) => router.push({ pathname: '/service/[id]', params: { id } });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      footer={<Button title="שירות חדש" icon="add" onPress={() => open('new')} />}>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="cut-outline"
          title="עדיין אין שירותים"
          message="הוסיפו את השירותים שאתם מציעים, עם משך ומחיר."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data.map((s) => (
            <Card key={s.id} onPress={() => open(s.id)} style={!s.is_active && { backgroundColor: colors.surfaceRaised }}>
              <Row gap={spacing.md}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt bold>{s.name}</Txt>
                  <Txt variant="small" muted>
                    {formatDuration(s.duration_min)}
                    {s.price !== null ? ` · ${formatPrice(s.price)}` : ''}
                    {!s.is_active ? ' · מוסתר מהלקוחות' : ''}
                  </Txt>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
              </Row>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
