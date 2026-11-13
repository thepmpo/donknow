// Geometry comes from UIKit's view-local reserved regions, never model names or width guesses.
export type DuoRect = { x: number; y: number; width: number; height: number };
export type DuoInsets = { top: number; right: number; bottom: number; left: number };
export type DuoRegion = { kind: 'division' | 'occlusion'; active: boolean; frame: DuoRect };
export type DuoGeometry = {
  apiAvailable: boolean; hasHinge: boolean; width: number; height: number;
  safeArea: DuoInsets; regions: DuoRegion[];
};
export const DUO_MIN_CONTENT_WIDTH = 224; // Layout usability floor, never a device-detection threshold.
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function readDuoGeometry(value: unknown): DuoGeometry | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>, safe = item.safeArea as Record<string, unknown> | undefined;
  if (typeof item.apiAvailable !== 'boolean' || typeof item.hasHinge !== 'boolean' || !finite(item.width) || item.width <= 0 || !finite(item.height) || item.height <= 0 || !safe || !['top','right','bottom','left'].every(key => finite(safe[key]) && (safe[key] as number) >= 0) || !Array.isArray(item.regions) || item.regions.length > 32) return null;
  const regions: DuoRegion[] = [];
  for (const region of item.regions) {
    if (!region || typeof region !== 'object' || !['division','occlusion'].includes(region.kind) || typeof region.active !== 'boolean' || !region.frame || !['x','y','width','height'].every(key => finite(region.frame[key])) || region.frame.width < 0 || region.frame.height < 0) return null;
    regions.push({kind:region.kind, active:region.active, frame:{...region.frame}});
  }
  return {apiAvailable:item.apiAvailable, hasHinge:item.hasHinge, width:item.width, height:item.height, safeArea:safe as DuoInsets, regions};
}
export function hasDuoCapability(platform: string, geometry: DuoGeometry | null): boolean {
  return platform === 'ios' && geometry?.apiAvailable === true && geometry.hasHinge === true;
}
export function intersectRects(a: DuoRect, b: DuoRect): DuoRect | null {
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);
  return right>x && bottom>y ? {x,y,width:right-x,height:bottom-y} : null;
}
function subtract(rect: DuoRect, reserved: DuoRect): DuoRect[] {
  const hit=intersectRects(rect,reserved); if(!hit)return [rect];
  // Four maximal candidates may overlap one another. We select one, never render all of them.
  return [
    {x:rect.x,y:rect.y,width:hit.x-rect.x,height:rect.height},
    {x:hit.x+hit.width,y:rect.y,width:rect.x+rect.width-hit.x-hit.width,height:rect.height},
    {x:rect.x,y:rect.y,width:rect.width,height:hit.y-rect.y},
    {x:rect.x,y:hit.y+hit.height,width:rect.width,height:rect.y+rect.height-hit.y-hit.height},
  ].filter(x=>x.width>0&&x.height>0);
}
export function duoSafeFrame(geometry: DuoGeometry): DuoRect {
  const {width,height,safeArea}=geometry;
  let initial:DuoRect={x:Math.min(width,safeArea.left),y:Math.min(height,safeArea.top),width:Math.max(0,width-safeArea.left-safeArea.right),height:Math.max(0,height-safeArea.top-safeArea.bottom)};
  const minWidth=Math.min(initial.width,DUO_MIN_CONTENT_WIDTH);
  // With a full-height active book fold, keep the complete app on the right pane even
  // when the left pane is larger. Do not force controls into an unusably narrow strip.
  for(const region of geometry.regions.filter(region=>region.active&&region.kind==='division')){
    const hit=intersectRects(initial,region.frame);
    if(hit&&hit.height===initial.height){
      const right={x:hit.x+hit.width,y:initial.y,width:initial.x+initial.width-hit.x-hit.width,height:initial.height};
      if(right.width>=minWidth)initial=right;
    }
  }
  let candidates:DuoRect[]=[initial];
  const occupied=geometry.regions.filter(region=>region.active).map(region=>region.frame);
  for(const region of occupied){
    candidates=candidates.flatMap(rect=>subtract(rect,region));
    // A small bounded native region set cannot grow an unbounded candidate collection.
    candidates=candidates.sort((a,b)=>b.width*b.height-a.width*a.height||b.x-a.x||a.y-b.y).slice(0,128);
  }
  // Prefer usable widths over camera slivers, then use the largest clear area.
  const usable=candidates.filter(rect=>rect.width>=minWidth);
  return (usable.length?usable:candidates).sort((a,b)=>b.width*b.height-a.width*a.height||b.x-a.x||a.y-b.y)[0] ?? {x:0,y:0,width:0,height:0};
}
