import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, ErrorBox, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { useBusiness } from '@/context/auth';
import { useFocusData } from '@/hooks/use-focus-data';
import { formatPhone, normalizePhone } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';
import { colors, spacing } from '@/theme';

export default function Customers() {
  const business = useBusiness();
  const [query, setQuery] = useState('');

  const { data, loading, refreshing, error, refresh } = useFocusData(async () => {
    const { data: rows, error: err } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name');
    if (err) throw err;
    return (rows ?? []) as Customer[];
  }, [business.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = /\d/.test(q) ? normalizePhone(q).replace(/^0/, '') : '';
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || (digits.length > 0 && c.phone.includes(digits)),
    );
  }, [data, query]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Field label="חיפוש" value={query} onChangeText={setQuery} placeholder="שם או טלפון" />
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={query ? 'לא נמצאו לקוחות' : 'עדיין אין לקוחות'}
          message={query ? undefined : 'כל לקוח/ה שקובע/ת תור נשמר/ת כאן אוטומטית.'}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="small" muted>
            {filtered.length === 1 ? 'לקוח/ה אחד/ת' : `${filtered.length} לקוחות`}
          </Txt>
          {filtered.map((c) => (
            <Card key={c.id} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}>
              <Row gap={spacing.md}>
                <View style={styles.avatar}>
                  <Txt bold color={colors.primary}>
                    {c.name.trim().charAt(0)}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt bold>{c.name}</Txt>
                  <Txt variant="small" muted>
                    {formatPhone(c.phone)}
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

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
