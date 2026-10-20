import React from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  GitMerge,
  MapPin,
  Milestone,
  RotateCcw,
} from 'lucide-react-native';

import type { ManeuverType } from '../../../services/driver/roadRoutingService';

/** One icon mapping for every turn-by-turn surface (banner, directions list). */
export default function ManeuverIcon({
  type,
  size = 24,
  color = '#FFFFFF',
}: {
  type?: ManeuverType;
  size?: number;
  color?: string;
}) {
  const strokeWidth = 2.8;
  switch (type) {
    case 'turn_left':
    case 'sharp_left':
      return <CornerUpLeft size={size} color={color} strokeWidth={strokeWidth} />;
    case 'turn_right':
    case 'sharp_right':
      return <CornerUpRight size={size} color={color} strokeWidth={strokeWidth} />;
    case 'slight_left':
      return <ArrowUpLeft size={size} color={color} strokeWidth={strokeWidth} />;
    case 'slight_right':
      return <ArrowUpRight size={size} color={color} strokeWidth={strokeWidth} />;
    case 'u_turn':
    case 'roundabout':
      return <RotateCcw size={size} color={color} strokeWidth={strokeWidth} />;
    case 'merge':
      return <GitMerge size={size} color={color} strokeWidth={strokeWidth} />;
    case 'ramp':
      return <Milestone size={size} color={color} strokeWidth={strokeWidth} />;
    case 'arrive':
      return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
    case 'straight':
    case 'depart':
    default:
      return <ArrowUp size={size} color={color} strokeWidth={strokeWidth} />;
  }
}
