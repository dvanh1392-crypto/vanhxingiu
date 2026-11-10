const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const rooms = new Map();
const COLORS = ['#2b77e5','#ed577e','#1a9b7c','#a264db'];
const code = () => crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const cleanName = v => String(v || '').trim().slice(0,20) || 'Người chơi';
const validToken = v => typeof v === 'string' && /^[a-f0-9]{32}$/.test(v);
function publicState(r) {
 return { code:r.code, status:r.status, host:r.host, count:r.count, next:r.next, startedAt:r.startedAt, endedAt:r.endedAt,
 players:r.players.map(p=>({id:p.id,name:p.name,color:p.color,score:p.score,connected:!!p.socketId})),
 layout:r.layout, claimed:r.claimed };
}
function send(r){io.to(r.code).emit('state',publicState(r));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function layout(count){
 // A fixed, irregular, non-overlapping grid of hit zones; same positions for all clients.
 const cols=count===100?10:count===200?14:18;
 const rows=Math.ceil(count/cols);
 const cells=shuffle(Array.from({length:cols*rows},(_,i)=>i));
 return Array.from({length:count},(_,i)=>{
   const c=cells[i]%cols, row=Math.floor(cells[i]/cols);
   return {n:i+1,x:(c+0.5+(crypto.randomInt(1000)/1000-.5)*.34)/cols*100,
   y:(row+0.5+(crypto.randomInt(1000)/1000-.5)*.32)/rows*100,
   a:crypto.randomInt(-180,181),size:crypto.randomInt(86,117)};
 });
}
function leaveSocket(socket){
 const code=socket.data.code, id=socket.data.playerId;
 if(!code)return;
 const r=rooms.get(code);socket.leave(code);socket.data.code=null;socket.data.playerId=null;
 if(!r)return;
 const p=r.players.find(p=>p.id===id);
 if(p && p.socketId===socket.id) p.socketId=null;
 if(r.status==='lobby' && p){r.players=r.players.filter(x=>x.id!==id);if(r.host===id)r.host=r.players[0]?.id||null;}
 if(!r.players.length){rooms.delete(code);return;}send(r);
}
function ackError(ack,msg){if(typeof ack==='function')ack({ok:false,error:msg});}
function join(socket,r,name,token,ack){
 let p=r.players.find(p=>p.token===token);
 if(!p){
  if(r.status!=='lobby')return ackError(ack,'Trận đã bắt đầu. Không thể vào thêm.');
  if(r.players.length>=4)return ackError(ack,'Phòng đã đủ 4 người.');
  p={id:crypto.randomUUID(),token:crypto.randomBytes(16).toString('hex'),name:cleanName(name),color:COLORS[r.players.length],score:0,socketId:null};r.players.push(p);
 }
 if(p.socketId && p.socketId!==socket.id){const old=io.sockets.sockets.get(p.socketId);if(old){old.leave(r.code);old.data.code=null;old.data.playerId=null;old.emit('replaced');}}
 p.socketId=socket.id;
 socket.join(r.code);socket.data.code=r.code;socket.data.playerId=p.id;
 ack({ok:true,code:r.code,id:p.id,token:p.token});send(r);
}
io.on('connection',socket=>{
 socket.on('create',(data={},ack=()=>{})=>{
  leaveSocket(socket);let c;do{c=code()}while(rooms.has(c));
  const r={code:c,status:'lobby',host:null,count:[100,200,300].includes(Number(data.count))?Number(data.count):100,players:[],next:1,layout:[],claimed:[],startedAt:null,endedAt:null};rooms.set(c,r);
  join(socket,r,data.name,null,(result)=>{if(result.ok)r.host=result.id;ack(result);send(r);});
 });
 socket.on('join',(data={},ack=()=>{})=>{
  const c=String(data.code||'').trim().toUpperCase();const r=rooms.get(c);
  if(!r)return ackError(ack,'Không tìm thấy phòng. Kiểm tra mã phòng.');
  leaveSocket(socket);join(socket,r,data.name,validToken(data.token)?data.token:null,ack);
 });
 socket.on('configure',(data={},ack=()=>{})=>{
  const r=rooms.get(socket.data.code);
  if(!r||r.host!==socket.data.playerId||r.status!=='lobby')return ackError(ack,'Chỉ chủ phòng được đổi độ khó trước trận.');
  if(![100,200,300].includes(Number(data.count)))return ackError(ack,'Mức độ không hợp lệ.');
  r.count=Number(data.count);send(r);ack({ok:true});
 });
 socket.on('start',(_,ack=()=>{})=>{
  const r=rooms.get(socket.data.code);
  if(!r||r.host!==socket.data.playerId)return ackError(ack,'Chỉ chủ phòng được bắt đầu.');
  if(r.players.length<2)return ackError(ack,'Cần ít nhất 2 người.');
  if(r.status==='playing')return ackError(ack,'Trận đang diễn ra.');
  r.players.forEach(p=>p.score=0);r.layout=layout(r.count);r.claimed=[];r.next=1;r.status='playing';r.startedAt=Date.now()+3000;r.endedAt=null;send(r);ack({ok:true});
 });
 socket.on('pick',(data={},ack=()=>{})=>{
  const r=rooms.get(socket.data.code),p=r?.players.find(x=>x.id===socket.data.playerId);
  if(!r||!p||p.socketId!==socket.id||r.status!=='playing')return ackError(ack,'Không thể chọn số lúc này.');
  if(Date.now()<r.startedAt)return ackError(ack,'Chưa bắt đầu!');
  if(!Number.isInteger(data.n)||data.n!==r.next)return ackError(ack,'Không đúng số cần tìm hoặc đã có người chọn trước.');
  p.score++;r.claimed.push({n:r.next,playerId:p.id});r.next++;
  if(r.next>r.count){r.status='finished';r.endedAt=Date.now();}
  send(r);ack({ok:true});
 });
 socket.on('leave',(_,ack=()=>{})=>{leaveSocket(socket);ack({ok:true});});
 socket.on('disconnect',()=>{
  const r=rooms.get(socket.data.code);const p=r?.players.find(x=>x.id===socket.data.playerId);
  if(p&&p.socketId===socket.id){p.socketId=null;if(r.status==='lobby'){r.players=r.players.filter(x=>x.id!==p.id);if(r.host===p.id)r.host=r.players[0]?.id||null;}
   if(!r.players.length)rooms.delete(r.code);else send(r);
  }
 });
});
setInterval(()=>{for(const [c,r] of rooms){if(r.status==='finished'&&Date.now()-r.endedAt>2*60*60*1000)rooms.delete(c);}},600000).unref();
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Number Hunt online listening on '+(process.env.PORT||3000)));
