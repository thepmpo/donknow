/** Web workspace dimensions in CSS pixels. Native device support uses measured geometry. */
export const webWorkspace={
 narrowBelow:760,
 asideFrom:1100,
 maxWidth:1128,
 narrowMargin:8,
 margin:24,
 top:54,
 sidebar:171,
 aside:245,
 radius:16,
} as const;

export function workspaceGeometry(viewport:number){
 const narrow=viewport<webWorkspace.narrowBelow;
 const margin=narrow?webWorkspace.narrowMargin:webWorkspace.margin;
 return {narrow,margin,width:Math.max(0,Math.min(webWorkspace.maxWidth, viewport-margin*2)),showAside:viewport>=webWorkspace.asideFrom};
}
