'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.hash.slice(1));
const hostId=params.get('sala');
if(hostId){$('entryTitle').textContent='Sua turma está te esperando.';$('joinBtn').textContent='Entrar na sala ↗';}
let peer,myId,myName,joined=false,isHost=false,localAV=null,localScreen=null,focused=null,joiningTimer;
const links=new Map(),members=new Map(),calls=new Map(),screens=new Map(),avStreams=new Map();
const screenAudioSettings=new Map();
let audioMenuId=null,audioMenuTrigger=null;
function notice(t){$('notice').textContent=t;$('notice').hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('notice').hidden=true,8000);}
function send(c,m){if(c?.open)c.send(m);}
function broadcast(m){for(const c of links.values())send(c,m);}
function info(){return {id:myId,name:myName,mic:!!localAV?.getAudioTracks().some(t=>t.enabled),cam:!!localAV?.getVideoTracks().some(t=>t.enabled)};}
function stopTracks(s){s?.getTracks().forEach(t=>t.stop());}
function renderPeople(){
 $('people').replaceChildren();$('count').textContent=members.size+' '+(members.size===1?'pessoa':'pessoas');
 for(const [id,m] of members){const b=document.createElement('button');b.className='person';b.title=m.name+(m.mic?' · Microfone ligado':' · Microfone desligado');const a=document.createElement('div');a.className='avatar';a.style.setProperty('--hue',String([...id].reduce((n,c)=>n+c.charCodeAt(0),0)%360));a.textContent=m.name.slice(0,2).toUpperCase();b.append(a);const stream=avStreams.get(id);if(m.cam&&stream?.getVideoTracks().length){const v=document.createElement('video');v.srcObject=stream;v.autoplay=true;v.playsInline=true;v.muted=true;b.append(v);}const n=document.createElement('span');n.textContent=m.name+(id===myId?' (você)':'')+(m.mic?'':' · ◌');b.append(n);b.onclick=()=>{if(m.cam&&stream){screens.set('camera:'+id,{stream,name:m.name+' · Câmera',local:true});renderScreens();focusScreen('camera:'+id);}else notice(m.name+(m.mic?' está com o microfone ligado.':' está com o microfone desligado.'));};$('people').append(b);}
}
function audioSettings(id){
 if(!screenAudioSettings.has(id))screenAudioSettings.set(id,{volume:100,muted:false,lastVolume:100});
 return screenAudioSettings.get(id);
}
function screenHasAudio(s){return !!s?.stream.getAudioTracks().some(t=>t.readyState==='live');}
function effectiveScreenMute(id){const a=audioSettings(id);return a.muted||a.volume===0;}
function updateScreenAudio(id){
 const s=screens.get(id);if(!s)return;
 const a=audioSettings(id);
 for(const card of $('screenGrid').children){
  if(card.dataset.key!==id)continue;
  const v=card.querySelector('video');v.volume=a.volume/100;v.muted=!!s.local||effectiveScreenMute(id);
  const button=card.querySelector('.screen-audio-button');
  if(button){button.textContent=!screenHasAudio(s)?'Sem áudio':s.local?'Áudio enviado':effectiveScreenMute(id)?'Som silenciado':`Som ${a.volume}%`;button.setAttribute('aria-label','Controlar áudio da transmissão de '+s.name);}
 }
 if(audioMenuId===id)refreshAudioMenu();
}
function refreshAudioMenu(){
 const s=screens.get(audioMenuId);if(!s){closeAudioMenu();return;}
 const a=audioSettings(audioMenuId),available=screenHasAudio(s)&&!s.local;
 $('screenAudioOwner').textContent=s.name;
 $('screenVolume').value=String(a.volume);
 $('screenVolumeValue').textContent=s.local?'Sem retorno':!screenHasAudio(s)?'Sem áudio':effectiveScreenMute(audioMenuId)?'Silenciado':a.volume+'%';
 $('screenMute').textContent=effectiveScreenMute(audioMenuId)?'Ativar som da transmissão':'Silenciar transmissão';
 $('screenMute').setAttribute('aria-pressed',String(effectiveScreenMute(audioMenuId)));
 for(const id of ['screenVolume','screenVolumeDown','screenVolumeUp','screenMute'])$(id).disabled=!available;
 $('screenAudioHint').textContent=s.local?(screenHasAudio(s)?'Você está enviando o áudio capturado, mesmo com o microfone desligado. Sua prévia fica sem retorno para evitar eco.':'O navegador não capturou áudio. Compartilhe novamente e marque “Compartilhar áudio”.'):!screenHasAudio(s)?'Esta transmissão chegou sem áudio. Quem transmite precisa ativar “Compartilhar áudio” no navegador.':'Só altera o que você ouve desta transmissão. Não altera as vozes nem o som para outras pessoas.';
}
function closeAudioMenu(restoreFocus=false){
 $('screenAudioMenu').hidden=true;audioMenuId=null;
 if(restoreFocus&&audioMenuTrigger?.isConnected)audioMenuTrigger.focus();
 audioMenuTrigger=null;
}
function openAudioMenu(id,x,y,trigger){
 if(!screens.has(id))return;
 audioMenuId=id;audioMenuTrigger=trigger;
 const menu=$('screenAudioMenu');menu.hidden=false;refreshAudioMenu();
 const rect=menu.getBoundingClientRect();
 menu.style.left=Math.max(8,Math.min(x,window.innerWidth-rect.width-8))+'px';
 menu.style.top=Math.max(8,Math.min(y,window.innerHeight-rect.height-8))+'px';
 $('closeScreenAudio').focus({preventScroll:true});
}
function setScreenVolume(value){
 if(audioMenuId===null)return;
 const s=screens.get(audioMenuId);if(!s||s.local||!screenHasAudio(s))return;
 const a=audioSettings(audioMenuId);a.volume=Math.max(0,Math.min(100,Number(value)));a.muted=false;
 if(a.volume>0)a.lastVolume=a.volume;
 updateScreenAudio(audioMenuId);
}
$('screenVolume').oninput=e=>setScreenVolume(e.target.value);
$('screenVolumeDown').onclick=()=>setScreenVolume(audioSettings(audioMenuId).volume-10);
$('screenVolumeUp').onclick=()=>setScreenVolume(audioSettings(audioMenuId).volume+10);
$('screenMute').onclick=()=>{
 if(audioMenuId===null)return;
 const a=audioSettings(audioMenuId);
 if(effectiveScreenMute(audioMenuId)){a.muted=false;if(a.volume===0)a.volume=a.lastVolume||100;}else a.muted=true;
 updateScreenAudio(audioMenuId);
};
$('closeScreenAudio').onclick=()=>closeAudioMenu(true);
document.addEventListener('pointerdown',e=>{if(!$('screenAudioMenu').contains(e.target))closeAudioMenu();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&audioMenuId!==null){e.preventDefault();e.stopPropagation();closeAudioMenu(true);}
 if(e.key==='Tab'&&audioMenuId!==null){
  const buttons=[...$('screenAudioMenu').querySelectorAll('button:not(:disabled),input:not(:disabled)')];
  const first=buttons[0],last=buttons.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
window.addEventListener('resize',()=>closeAudioMenu());
document.addEventListener('scroll',e=>{if(!$('screenAudioMenu').contains(e.target))closeAudioMenu();},true);
function renderScreens(){
 const grid=$('screenGrid');grid.replaceChildren();
 for(const [id,s] of screens){
  const box=document.createElement('div');box.className='screen'+(focused===id?' selected':'');box.dataset.key=id;box.tabIndex=0;box.setAttribute('role','group');box.setAttribute('aria-label','Transmissão de '+s.name);
  const v=document.createElement('video');v.srcObject=s.stream;v.autoplay=true;v.playsInline=true;
  const a=audioSettings(id);v.volume=a.volume/100;v.muted=!!s.local||effectiveScreenMute(id);
  v.play().catch(()=>{if(!s.local&&screenHasAudio(s)&&!effectiveScreenMute(id))notice('Clique na transmissão para liberar o áudio.');});
  const label=document.createElement('span');label.className='caption';label.textContent=s.name+' · Clique para focar';box.append(v,label);
  box.onclick=()=>{v.play().catch(()=>{});focusScreen(id);};
  box.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();v.play().catch(()=>{});openAudioMenu(id,e.clientX,e.clientY,box);};
  box.onkeydown=e=>{
   if(e.target!==box)return;
   if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=box.getBoundingClientRect();openAudioMenu(id,r.left+20,r.top+20,box);}
   else if(e.key==='Enter'||e.key===' '){e.preventDefault();box.click();}
  };
  if(!id.startsWith('camera:')){
   const b=document.createElement('button');b.className='screen-audio-button';b.title='Áudio da transmissão · também disponível com botão direito';
   b.onclick=e=>{e.stopPropagation();const r=b.getBoundingClientRect();openAudioMenu(id,r.left,r.bottom+6,b);v.play().catch(()=>{});};box.append(b);
  }
  grid.append(box);updateScreenAudio(id);
 }
 if(!screens.has(focused))focused=null;
 $('empty').hidden=screens.size>0;$('stage').classList.toggle('focused',!!focused);$('unfocus').hidden=!focused;
 if(audioMenuId!==null){if(screens.has(audioMenuId))refreshAudioMenu();else closeAudioMenu();}
}
function focusScreen(id){focused=id;$('stage').classList.add('focused');for(const b of $('screenGrid').children)b.classList.toggle('selected',b.dataset.key===id);$('unfocus').hidden=false;}
$('unfocus').onclick=()=>{for(const k of screens.keys())if(k.startsWith('camera:'))screens.delete(k);focused=null;renderScreens();};
function receiveStream(id,stream,kind){if(kind==='screen'){screens.set(id,{stream,name:members.get(id)?.name||'Participante',local:false});renderScreens();}else{avStreams.set(id,stream);let audio=$('audio-'+id);if(!audio){audio=document.createElement('audio');audio.id='audio-'+id;audio.autoplay=true;$('audioBin').append(audio);}audio.srcObject=stream;audio.play().catch(()=>notice('Clique em qualquer lugar da sala para ativar o áudio.'));renderPeople();}}
document.addEventListener('click',()=>document.querySelectorAll('audio,#screenGrid video').forEach(a=>a.play().catch(()=>{})));
function bindCall(call,kind,incoming){const key=(incoming?'in:':'out:')+kind+':'+call.peer;calls.get(key)?.close();calls.set(key,call);call.on('stream',s=>receiveStream(call.peer,s,kind));call.on('close',()=>{if(calls.get(key)!==call)return;calls.delete(key);if(incoming){if(kind==='screen'){screens.delete(call.peer);renderScreens();}else{avStreams.delete(call.peer);$('audio-'+call.peer)?.remove();screens.delete('camera:'+call.peer);renderPeople();renderScreens();}}});call.on('error',()=>notice('Não foi possível receber uma mídia. Tente reconectar; esta rede pode precisar de TURN.'));}
function outgoing(id,kind,stream){const key='out:'+kind+':'+id;calls.get(key)?.close();calls.delete(key);if(stream){const call=peer.call(id,stream,{metadata:{kind}});if(call)bindCall(call,kind,false);}}
function publishAV(){members.set(myId,info());avStreams.set(myId,localAV);broadcast({type:'info',member:info()});for(const id of links.keys())outgoing(id,'av',localAV);renderPeople();updateControls();}
function removeMember(id){links.delete(id);members.delete(id);avStreams.delete(id);screens.delete(id);screens.delete('camera:'+id);$('audio-'+id)?.remove();for(const [key,c] of calls)if(c.peer===id){calls.delete(key);c.close();}renderPeople();renderScreens();if(isHost)broadcast({type:'roster',members:[...members.values()]});}
function link(c){if(links.has(c.peer)){c.close();return;}links.set(c.peer,c);c.on('open',()=>{send(c,{type:'hello',member:info()});if(localAV)outgoing(c.peer,'av',localAV);if(localScreen)outgoing(c.peer,'screen',localScreen);});c.on('data',m=>{if(!m||typeof m!=='object')return;if(m.type==='hello'||m.type==='info'){const x=m.member;if(!x||x.id!==c.peer||typeof x.name!=='string')return;if(isHost&&!members.has(c.peer)&&members.size>=6){send(c,{type:'full'});setTimeout(()=>c.close(),400);return;}members.set(c.peer,{id:c.peer,name:x.name.slice(0,32),mic:!!x.mic,cam:!!x.cam});if(m.type==='hello'&&isHost)broadcast({type:'roster',members:[...members.values()]});if(!joined&&c.peer===hostId)enterRoom();renderPeople();}else if(m.type==='roster'&&c.peer===hostId&&Array.isArray(m.members)){for(const x of m.members.slice(0,6)){if(typeof x.id!=='string'||typeof x.name!=='string'||x.id===myId)continue;members.set(x.id,{...x,name:x.name.slice(0,32)});if(!links.has(x.id)&&x.id<myId)link(peer.connect(x.id,{reliable:true}));}renderPeople();}else if(m.type==='screen-off'){screens.delete(c.peer);renderScreens();}else if(m.type==='av-off'){avStreams.delete(c.peer);$('audio-'+c.peer)?.remove();screens.delete('camera:'+c.peer);renderPeople();renderScreens();}else if(m.type==='full'){notice('A sala está cheia (6 pessoas).');leave(false);}else if(m.type==='end'&&c.peer===hostId){notice('Quem criou a sala saiu. Crie uma nova sala para continuar.');leave(false);}});c.on('close',()=>{if(!joined)return;if(c.peer===hostId&&!isHost){notice('A conexão com quem criou a sala foi encerrada. Entre novamente.');leave(false);}else removeMember(c.peer);});c.on('error',()=>{notice('Falha ao conectar com um participante.');removeMember(c.peer);});}
function enterRoom(){clearTimeout(joiningTimer);joined=true;$('lobby').hidden=true;$('room').hidden=false;$('connection').textContent='● Você está na sala';renderPeople();updateControls();}
function updateControls(){const i=info();$('mic').textContent=i.mic?'Microfone ligado':'Microfone desligado';$('mic').setAttribute('aria-pressed',i.mic);$('cam').textContent=i.cam?'Câmera ligada':'Câmera desligada';$('cam').setAttribute('aria-pressed',i.cam);$('share').textContent=localScreen?'■ Parar transmissão':'▱ Compartilhar tela';}
$('joinForm').onsubmit=async e=>{e.preventDefault();if(!window.Peer){notice('A biblioteca de conexão não carregou. Atualize a página.');return;}myName=$('name').value.trim();if(!myName){$('name').focus();return;}$('joinBtn').disabled=true;try{if($('wantMic').checked||$('wantCam').checked){try{localAV=await navigator.mediaDevices.getUserMedia({audio:$('wantMic').checked,video:$('wantCam').checked?{width:{ideal:640},height:{ideal:360}}:false});}catch{notice('Não foi possível acessar os dispositivos. Você pode ativá-los depois.');}}peer=new Peer(undefined,{...(window.SALA_RTC_CONFIG?{config:window.SALA_RTC_CONFIG}:{})});joiningTimer=setTimeout(()=>{notice('Não foi possível entrar. A sala pode ter fechado ou a rede pode estar bloqueando a conexão.');leave(false);},20000);peer.on('open',id=>{myId=id;members.set(id,info());if(localAV)avStreams.set(id,localAV);isHost=!hostId;if(isHost){history.replaceState(null,'','#sala='+encodeURIComponent(id));enterRoom();}else link(peer.connect(hostId,{reliable:true}));});peer.on('connection',c=>{if(!joined){c.close();return;}link(c);});peer.on('call',call=>{if(!joined||!links.has(call.peer)){call.close();return;}const kind=call.metadata?.kind;if(kind!=='av'&&kind!=='screen'){call.close();return;}bindCall(call,kind,true);call.answer();});peer.on('error',err=>{notice(err.type==='peer-unavailable'?'Sala não encontrada. Quem criou precisa estar com a página aberta.':'Falha na conexão: '+err.type+'. Tente entrar novamente.');if(!joined)leave(false);});peer.on('disconnected',()=>{if(joined)notice('Conexão com o serviço de salas interrompida. Recarregue para reconectar.');});}catch{notice('Não foi possível abrir a sala neste navegador.');leave(false);}};
async function toggleMedia(kind){if(!joined)return;const btn=kind==='audio'?$('mic'):$('cam');btn.disabled=true;try{const tracks=localAV?.getTracks().filter(t=>t.kind===kind)||[];if(tracks.length){tracks.forEach(t=>{t.stop();localAV.removeTrack(t);});if(!localAV.getTracks().length){localAV=null;broadcast({type:'av-off'});}}else{const s=await navigator.mediaDevices.getUserMedia({audio:kind==='audio',video:kind==='video'?{width:{ideal:640},height:{ideal:360}}:false});if(!joined){stopTracks(s);return;}if(!localAV)localAV=new MediaStream();s.getTracks().forEach(t=>localAV.addTrack(t));}publishAV();}catch{notice('Acesso negado ou dispositivo indisponível. Confira a permissão no navegador.');}finally{btn.disabled=false;}}
$('mic').onclick=()=>toggleMedia('audio');$('cam').onclick=()=>toggleMedia('video');
function stopScreen(){const s=localScreen;localScreen=null;stopTracks(s);for(const id of links.keys())outgoing(id,'screen',null);screens.delete(myId);broadcast({type:'screen-off'});renderScreens();updateControls();}
async function share(){if(localScreen){stopScreen();return;}if(!navigator.mediaDevices?.getDisplayMedia){notice('Este navegador não permite compartilhar tela. Tente Chrome ou Edge no computador.');return;}try{const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:20,max:30}},audio:true,systemAudio:'include'});if(!joined){stopTracks(s);return;}localScreen=s;if(!screenHasAudio({stream:s}))notice('A tela está sendo transmitida sem som. Para incluir áudio, compartilhe novamente e marque “Compartilhar áudio” no navegador.');s.getVideoTracks()[0].onended=stopScreen;screens.set(myId,{stream:s,name:myName+' (você)',local:true});for(const id of links.keys())outgoing(id,'screen',s);renderScreens();updateControls();}catch(e){if(e.name!=='NotAllowedError')notice('Não foi possível compartilhar a tela. Tente novamente.');}}
$('share').onclick=share;$('startScreen').onclick=share;
$('invite').onclick=async()=>{const url=new URL(location.href);url.hash='sala='+encodeURIComponent(isHost?myId:hostId);try{await navigator.clipboard.writeText(url.href);notice('Convite copiado! Envie para sua turma.');}catch{prompt('Copie o convite:',url.href);}};
function leave(redirect=true){closeAudioMenu();screenAudioSettings.clear();clearTimeout(joiningTimer);const wasHost=isHost;joined=false;if(wasHost)broadcast({type:'end'});stopTracks(localAV);stopTracks(localScreen);localAV=null;localScreen=null;peer?.destroy();links.clear();members.clear();screens.clear();avStreams.clear();calls.clear();$('audioBin').replaceChildren();$('room').hidden=true;$('lobby').hidden=false;$('joinBtn').disabled=false;$('connection').textContent='● Sem cadastro';if(wasHost){history.replaceState(null,'',location.pathname+location.search);if(redirect)location.reload();}isHost=false;}
$('leave').onclick=()=>leave();window.addEventListener('beforeunload',()=>{if(isHost)broadcast({type:'end'});stopTracks(localAV);stopTracks(localScreen);peer?.destroy();});
