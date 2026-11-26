import type {Animated,StyleProp,ViewStyle} from 'react-native';
import type {ReactElement,ReactNode} from 'react';

export type RowPoint = {x:number;y:number};
export type RowGestureProps = {
  children: ReactElement;
  canSwipeRight: boolean;
  canSwipeLeft: boolean;
  canLift: boolean;
  fill?:boolean;
  reduced: boolean;
  onSwipeStart: () => void;
  onSwipeEnd: (distance:number, completed:boolean) => void;
  onLift: (point:RowPoint) => void;
  onDrag: (point:RowPoint) => void;
  onDrop: (completed:boolean) => void;
};


export type LiftPreviewProps = {
  testID?:string;
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  geometry: {x:number;y:number;maxX:number;maxY:number;initial:RowPoint};
  reduced: boolean;
  fallbackPosition: Animated.ValueXY;
  fallbackScale: Animated.Value;
};
