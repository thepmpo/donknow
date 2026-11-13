import type {LayoutRectangle} from 'react-native';
export type NavigationPoint={x:number;y:number};
export function tabAtPoint<T extends string>(point:NavigationPoint,frames:Partial<Record<T,LayoutRectangle>>):T|null{
 for(const [id,frame] of Object.entries(frames) as [T,LayoutRectangle][]){
  if(frame&&point.x>=frame.x&&point.x<=frame.x+frame.width&&point.y>=frame.y&&point.y<=frame.y+frame.height)return id;
 }
 return null;
}
export function lensPosition(point:NavigationPoint,size:{width:number;height:number},bounds:{width:number;height:number}){
 return {x:Math.max(0,Math.min(Math.max(0,bounds.width-size.width),point.x-size.width/2)),y:Math.max(0,Math.min(Math.max(0,bounds.height-size.height),point.y-size.height/2))};
}
export function shouldScrub(dx:number,dy:number,vertical:boolean,overflow:boolean){
 const along=Math.abs(vertical?dy:dx),across=Math.abs(vertical?dx:dy);
 return !overflow&&along>6&&along>across*1.3;
}
