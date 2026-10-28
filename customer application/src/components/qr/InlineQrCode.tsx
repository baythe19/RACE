import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { toQR } from 'toqr';

interface Props {
  /** Payload to encode (e.g. a UPI deep-link). */
  value: string;
  /** Rendered size in dp (module matrix is square). */
  size?: number;
  /** Dark module colour. Defaults to near-black. */
  color?: string;
  /** Background colour behind modules. */
  backgroundColor?: string;
}

/**
 * Minimal QR renderer built on the tiny `toqr` encoder (already a transitive
 * dependency) + react-native-svg. Avoids adding react-native-qrcode-svg.
 */
export default function InlineQrCode({
  value,
  size = 168,
  color = '#111827',
  backgroundColor = '#FFFFFF',
}: Props) {
  const { modules, side } = useMemo(() => {
    try {
      const matrix = toQR(value);
      return { modules: matrix, side: Math.sqrt(matrix.length) };
    } catch {
      return { modules: null, side: 0 };
    }
  }, [value]);

  if (!modules || !side) {
    // Encoder input too long / failed — render a quiet placeholder box.
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  const cell = size / side;

  return (
    <View style={[styles.wrap, { width: size, height: size, backgroundColor }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${side} ${side}`}>
        {Array.from(modules).map((dark, idx) =>
          dark ? (
            <Rect
              key={idx}
              x={idx % side}
              y={Math.floor(idx / side)}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
  },
});
