import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,StyleSheet,Text,View} from 'react-native';
import {useReducedMotion,MotionPressable as Pressable} from './motion';
import {TodoRow} from './ui';
import {TodoLiftScope,TodoLiftPreview} from './todo-gestures';
import type {LiftPreviewProps,RowPoint} from './todo-gesture-types';
import {compareTodoOrder,moveTodoIds} from './todo-organization';
import {colors,typography} from './theme';
import type {Todo} from './domain';
import type {TodoStore} from './useTodos';

type Bounds={id:string;y:number;height:number};
type DateTarget={day:string;node:React.ComponentRef<typeof View>};
type DropDate={day:string;x:number;y:number;width:number;height:number};
type Drag={todo:Todo;dates:DropDate[];dayTarget?:string;ids:string[];origin:RowPoint;point:RowPoint;rows:Bounds[];target?:string|null;geometry?:LiftPreviewProps['geometry'];width?:number};
export function CalendarDayTodos({todos,store,onEdit,day,interactive,dateTargets}:{todos:Todo[];store:TodoStore;onEdit:(todo:Todo)=>void;day:string;interactive:boolean;dateTargets:ReadonlySet<DateTarget>}){
 return <TodoLiftScope><Rows key={day} todos={todos} store={store} onEdit={onEdit} interactive={interactive} day={day} dateTargets={dateTargets}/></TodoLiftScope>;
}
function Rows({todos,store,onEdit,interactive,day,dateTargets}:{todos:Todo[];store:TodoStore;onEdit:(todo:Todo)=>void;interactive:boolean;day:string;dateTargets:ReadonlySet<DateTarget>}){
 const root=useRef<React.ComponentRef<typeof View>>(null),nodes=useRef(new Map<string,React.ComponentRef<typeof View>>()),session=useRef<Drag|null>(null);
 const [selected,setSelected]=useState<string[]>([]),[lifted,setLifted]=useState<Drag|null>(null),[target,setTarget]=useState<string|null|undefined>();
 const position=useRef(new Animated.ValueXY()).current,scale=useRef(new Animated.Value(1)).current,reduced=useReducedMotion();
 const rows=[...todos].sort(compareTodoOrder);
 const select=(id:string)=>setSelected(ids=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]);
 useEffect(()=>{if(!interactive){session.current=null;setLifted(null);setTarget(undefined);setSelected([]);}},[interactive]);
 function move(point:RowPoint){
  const current=session.current;if(!current)return;
  current.point=point;
  if(current.geometry&&Platform.OS==='web'){
   const g=current.geometry;position.setValue({x:Math.max(0,Math.min(g.maxX,point.x-g.x)),y:Math.max(0,Math.min(g.maxY,point.y-g.y))});
  }
  current.dayTarget=current.dates.find(box=>point.x>=box.x&&point.y>=box.y&&point.x<box.x+box.width&&point.y<box.y+box.height)?.day;
  if(current.dayTarget){current.target=undefined;setTarget(undefined);return;}
  if(!current.rows.length)return;
  const next=Math.abs(point.y-current.origin.y)<6?undefined:current.rows.find(row=>point.y<row.y+row.height/2)?.id??null;
  current.target=next;setTarget(next);
 }
 function lift(todo:Todo,point:RowPoint){
  const node=nodes.current.get(todo.id);if(!node||!root.current||store.busyIds.length||session.current)return;
  const ids=selected.includes(todo.id)?selected:[todo.id],drag:Drag={todo,ids,origin:point,point,rows:[],dates:[]};session.current=drag;
  for(const {day,node} of dateTargets)node.measureInWindow((x,y,width,height)=>{
   if(session.current===drag&&width>0&&height>0)drag.dates.push({day,x,y,width,height});
  });
  for(const [id,ref] of nodes.current)if(!ids.includes(id))ref.measureInWindow((_x,y,_w,height)=>{
   if(session.current!==drag||height<=0)return;
   drag.rows.push({id,y,height});drag.rows.sort((a,b)=>a.y-b.y);move(drag.point);
  });
  root.current.measureInWindow((x,y,w,h)=>node.measureInWindow((rx,ry,width,height)=>{
   if(session.current!==drag||width<=0||height<=0)return;
   drag.geometry={x:x+point.x-rx,y:y+point.y-ry,maxX:Math.max(0,w-width),maxY:Math.max(0,h-height),initial:point};
   drag.width=width;setLifted(drag);move(drag.point);
  }));
 }
 function drop(completed:boolean){
  const drag=session.current;session.current=null;setLifted(null);setTarget(undefined);
  if(!completed||!drag)return;
  if(drag.dayTarget){
   const dueDate=drag.dayTarget;
   if(dueDate!==day)void (async()=>{
    const failed:string[]=[];
    for(const id of drag.ids){
     if(!store.isCurrentSession())return;
     if(!await store.update(id,{dueDate}))failed.push(id);
    }
    if(store.isCurrentSession())setSelected(failed);
   })();
   return;
  }
  if(drag.target===undefined)return;
  const last=rows.filter(t=>!drag.ids.includes(t.id)).at(-1);
  const items=[...store.visible.filter(t=>!t.done)].sort(compareTodoOrder);
  const after=last?items.slice(items.findIndex(t=>t.id===last.id)+1).find(t=>!drag.ids.includes(t.id))?.id??null:null;
  void store.reorder(moveTodoIds(items,drag.ids,drag.target??after)).then(saved=>{if(saved)setSelected([]);});
 }
 return <View ref={root} collapsable={false} testID="calendar-day-todos">
  {!!selected.length&&!lifted&&<Pressable accessibilityRole="button" accessibilityLabel="Ticket 선택 마치기" onPress={()=>setSelected([])} style={styles.done}><Text style={styles.action}>완료</Text></Pressable>}
  {rows.map(todo=><View key={todo.id} collapsable={false} ref={node=>{if(node)nodes.current.set(todo.id,node);else nodes.current.delete(todo.id);}} style={lifted?.ids.includes(todo.id)?styles.lifted:undefined}>
   {lifted&&target===todo.id&&<View pointerEvents="none" style={styles.line}/>}
   <TodoRow compact todo={todo} selected={selected.length?selected.includes(todo.id):undefined} onEdit={()=>onEdit(todo)} onSelect={interactive?()=>select(todo.id):undefined}
    onSelectAccessible={interactive?()=>setSelected(ids=>ids.includes(todo.id)?ids:[...ids,todo.id]):undefined}
    onLift={interactive&&!store.pending[todo.id]?point=>lift(todo,point):undefined} onDrag={move} onDrop={drop}
    busy={!!todo.saveState||store.busyIds.includes(todo.id)} pending={!!store.pending[todo.id]} pendingUntil={store.pending[todo.id]}
    canToggleWhileBusy={store.completionIds.includes(todo.id)} canSelectWhileBusy={store.completionIds.includes(todo.id)} onToggle={()=>void store.update(todo.id,{done:!todo.done})}/>
  </View>)}
  {lifted&&target===null&&<View pointerEvents="none" style={[styles.line,{top:undefined,bottom:0}]}/>}
  {lifted?.geometry&&<TodoLiftPreview testID="calendar-day-todo-drag" geometry={lifted.geometry} reduced={reduced} fallbackPosition={position} fallbackScale={scale} style={[styles.preview,{width:lifted.width}]}><Text numberOfLines={1} style={styles.title}>{lifted.todo.title}</Text></TodoLiftPreview>}
 </View>;
}
const styles=StyleSheet.create({
 done:{position:'absolute',right:0,top:-36,minHeight:36,justifyContent:'center',paddingHorizontal:12},
 action:{...typography.detail,color:colors.blueText,fontWeight:'600'},
 lifted:{opacity:0},
 line:{position:'absolute',top:0,left:0,right:0,zIndex:1,height:2,backgroundColor:colors.action,borderRadius:1},
 preview:{position:'absolute',top:0,left:0,zIndex:20,minHeight:48,justifyContent:'center',paddingHorizontal:14,borderRadius:12,backgroundColor:colors.todoSelection,shadowColor:'#101828',shadowOpacity:.18,shadowRadius:11,shadowOffset:{width:0,height:4},elevation:9},
 title:{...typography.detail,color:colors.text,fontWeight:'600'},
});
