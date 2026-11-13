/** Serialize before committing headers: failures can still produce a complete JSON 500. */
export function sendJson(res,status,data,headers={}){
 const payload=JSON.stringify(data);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
 res.end(payload);
}
