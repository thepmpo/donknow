// Geometry comes from UIKit's view-local reserved regions, never model names or width guesses.
export type DuoRect = { x: number; y: number; width: number; height: number };
export type DuoInsets = { top: number; right: number; bottom: number; left: number };
export type DuoRegion = { kind: 'division' | 'occlusion'; active: boolean; frame: DuoRect };
export type DuoGeometry = {
  apiAvailable: boolean; hasHinge: boolean; width: number; height: number;
  safeArea: DuoInsets; regions: DuoRegion[];
  hingeStatus?: 'closed'|'fullyOpen'|'partiallyOpen'|'unknown';
};
export const DUO_MIN_CONTENT_WIDTH = 224; // Layout usability floor, never a device-detection threshold.
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function readDuoGeometry(value: unknown): DuoGeometry | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>, safe = item.safeArea as Record<string, unknown> | undefined;
  if (typeof item.apiAvailable !== 'boolean' || typeof item.hasHinge !== 'boolean' || !finite(item.width) || item.width <= 0 || !finite(item.height) || item.height <= 0 || !safe || !['top','right','bottom','left'].every(key => finite(safe[key]) && (safe[key] as number) >= 0) || !Array.isArray(item.regions) || item.regions.length > 32) return null;
  if(item.hingeStatus!==undefined&&!['closed','fullyOpen','partiallyOpen','unknown'].includes(String(item.hingeStatus)))return null;
  const regions: DuoRegion[] = [];
  for (const region of item.regions) {
    if (!region || typeof region !== 'object' || !['division','occlusion'].includes(region.kind) || typeof region.active !== 'boolean' || !region.frame || !['x','y','width','height'].every(key => finite(region.frame[key])) || region.frame.width < 0 || region.frame.height < 0) return null;
    regions.push({kind:region.kind, active:region.active, frame:{...region.frame}});
  }
  return {apiAvailable:item.apiAvailable, hasHinge:item.hasHinge, width:item.width, height:item.height, safeArea:safe as DuoInsets, regions,...(item.hingeStatus!==undefined?{hingeStatus:item.hingeStatus as DuoGeometry['hingeStatus']}:{})};
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

export type DuoSceneLayout={
 body:DuoRect; column:DuoRect|null; back:DuoRect|null; segments:DuoRect[];
 panes:{leading:DuoRect;trailing:DuoRect}|null; divider:DuoRect|null;
 alignment:'trailing-occlusion'|'system-inset'|'trailing-edge';
 cameraRegion:DuoRect|null;
};
export const DUO_CHROME={width:64,height:272,itemSize:52,iconSize:28,gap:8,paneGap:16,dividerInset:16} as const;
const {width:CHROME_WIDTH,gap:CHROME_GAP,paneGap:PANE_GAP}=DUO_CHROME;
function clearFrame(initial:DuoRect,occupied:DuoRect[]){
 let frames=[initial];for(const area of occupied)frames=frames.flatMap(rect=>subtract(rect,area)).sort((a,b)=>b.width*b.height-a.width*a.height).slice(0,128);
 return frames.sort((a,b)=>b.width*b.height-a.width*a.height)[0]??{...initial,width:0,height:0};
}
/** Chrome uses full native view coordinates, never the already-inset body frame. */
export function duoSceneLayout(g:DuoGeometry,workspace=true):DuoSceneLayout{
 const bounds={x:0,y:0,width:g.width,height:g.height};
 // UIKit calls these occlusions, not camera IDs. Include inactive geometry because
 // the inner camera may be hidden; never replace this with a device-width table.
 const candidates=g.regions.filter(r=>r.kind==='occlusion').map(r=>intersectRects(bounds,r.frame)).filter((r):r is DuoRect=>!!r&&r.x+r.width/2>g.width/2&&r.y<g.height/2);
 const cameraRegion=candidates.sort((a,b)=>(b.x+b.width/2)-(a.x+a.width/2)||a.y-b.y)[0]??null;
 const alignment=cameraRegion?'trailing-occlusion':g.safeArea.right>=CHROME_WIDTH+CHROME_GAP*2?'system-inset':'trailing-edge';
 const center=cameraRegion?cameraRegion.x+cameraRegion.width/2:g.safeArea.right>=CHROME_WIDTH+CHROME_GAP*2?g.width-g.safeArea.right/2:g.width-CHROME_GAP-CHROME_WIDTH/2;
 const x=Math.max(CHROME_GAP,Math.min(g.width-CHROME_GAP-CHROME_WIDTH,center-CHROME_WIDTH/2));
 const top=Math.max(g.safeArea.top+CHROME_GAP,cameraRegion?cameraRegion.y+cameraRegion.height+CHROME_GAP:0),bottom=Math.max(top,g.height-g.safeArea.bottom-CHROME_GAP);
 const column=g.width>=CHROME_WIDTH+CHROME_GAP*2?{x,y:top,width:CHROME_WIDTH,height:bottom-top}:null;
 const occupied=g.regions.filter(r=>r.active).map(r=>r.frame);
 let segments=column?[column]:[];
 for(const area of occupied){segments=segments.flatMap(segment=>{
  const hit=intersectRects(segment,area);if(!hit)return[segment];
  // Keep the camera's x centerline: skip a blocked vertical interval instead of
  // shifting any control into a different column to the left.
  return [{...segment,height:Math.max(0,hit.y-segment.y)},{...segment,y:hit.y+hit.height,height:Math.max(0,segment.y+segment.height-hit.y-hit.height)}].filter(r=>r.height>0);
 });}
 segments.sort((a,b)=>a.y-b.y);
 const first=segments.find(r=>r.height>=CHROME_WIDTH);
 const back=first?{...first,height:CHROME_WIDTH}:null;
 let body=duoSafeFrame(g);
 if(column)body={...body,width:Math.max(0,Math.min(body.x+body.width,column.x-CHROME_GAP)-body.x)};
 let panes:DuoSceneLayout['panes']=null;
 if(workspace&&g.hingeStatus==='fullyOpen'&&g.width>g.height&&column){
  const full={x:g.safeArea.left,y:g.safeArea.top,width:Math.max(0,Math.min(column.x-CHROME_GAP,g.width-g.safeArea.right)-g.safeArea.left),height:Math.max(0,g.height-g.safeArea.top-g.safeArea.bottom)};
  const fold=g.regions.filter(r=>r.active&&r.kind==='division').map(r=>intersectRects(full,r.frame)).find(r=>r&&r.height===full.height&&r.x>full.x&&r.x+r.width<full.x+full.width);
  const leftWidth=fold?fold.x-full.x:Math.max(0,(full.width-PANE_GAP)/2),rightX=fold?fold.x+fold.width:full.x+leftWidth+PANE_GAP;
  const leading=clearFrame({...full,width:leftWidth},occupied),trailing=clearFrame({...full,x:rightX,width:Math.max(0,full.x+full.width-rightX)},occupied);
  if(leading.width>0&&trailing.width>0&&leading.height>0&&trailing.height>0){body=full;panes={leading,trailing};}
 }
 let divider:DuoRect|null=null;
 if(panes){
  const {leading,trailing}=panes,mid=(leading.x+leading.width+trailing.x)/2;
  const top=Math.max(leading.y,trailing.y)+DUO_CHROME.dividerInset;
  const bottom=Math.min(leading.y+leading.height,trailing.y+trailing.height)-DUO_CHROME.dividerInset;
  // A conservative 1pt envelope checks hardware clearance; rendering uses one physical pixel.
  const candidate={x:mid-.5,y:top,width:1,height:bottom-top};
  if(trailing.x>leading.x+leading.width&&candidate.height>0&&!occupied.some(area=>intersectRects(candidate,area)))divider=candidate;
 }
 return {body,column,back,segments,panes,divider,alignment,cameraRegion};
}
export function duoTabFrame(scene:DuoSceneLayout,backVisible:boolean):DuoRect|null{
 const candidates=scene.segments.map(segment=>{
  if(backVisible&&scene.back&&intersectRects(segment,scene.back)){const y=scene.back.y+scene.back.height+CHROME_GAP;return{...segment,y,height:Math.max(0,segment.y+segment.height-y)};}return segment;
 }).filter(r=>r.height>=DUO_CHROME.itemSize+12).sort((a,b)=>(b.y+b.height)-(a.y+a.height));
 return candidates[0]??null;
}

/** Independent accessory above the existing bottom-aligned tabs, in native coordinates. */
export function duoTodayFrame(scene:DuoSceneLayout,backVisible:boolean):DuoRect|null{
 const frame=duoTabFrame(scene,backVisible);if(!frame)return null;
 const height=DUO_CHROME.width,y=frame.y+frame.height-Math.min(frame.height,DUO_CHROME.height)-DUO_CHROME.gap-height;
 return y>=frame.y?{x:frame.x,y,width:frame.width,height}:null;
}

/** Independent view switch above Today; never moves the existing bottom tabs. */
export function duoCalendarViewFrame(scene:DuoSceneLayout,backVisible:boolean):DuoRect|null{
 const frame=duoTabFrame(scene,backVisible),today=duoTodayFrame(scene,backVisible);if(!frame||!today)return null;
 const y=today.y-DUO_CHROME.gap-DUO_CHROME.width;
 return y>=frame.y?{x:today.x,y,width:today.width,height:DUO_CHROME.width}:null;
}
