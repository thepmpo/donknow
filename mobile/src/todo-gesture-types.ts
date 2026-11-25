import type {ReactElement} from 'react';

export type RowPoint = {x:number;y:number};
export type RowGestureProps = {
  children: ReactElement;
  canSwipeRight: boolean;
  canSwipeLeft: boolean;
  canLift: boolean;
  onSwipeStart: () => void;
  onSwipeMove: (distance:number) => void;
  onSwipeEnd: (distance:number, completed:boolean) => void;
  onLift: (point:RowPoint) => void;
  onDrag: (point:RowPoint) => void;
  onDrop: (completed:boolean) => void;
};

