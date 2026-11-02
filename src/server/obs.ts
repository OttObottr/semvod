import { createHash, randomUUID } from 'node:crypto';
export class OBSClient {
  private socket?: WebSocket;
  get connected(){return this.socket?.readyState===WebSocket.OPEN;}
  private requests = new Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  async connect(url: string,password: string) {
    const target = new URL(url);
    if (!['127.0.0.1','localhost','[::1]'].includes(target.hostname)) throw new Error('OBS must use a local loopback address.');
    await new Promise<void>((resolve,reject) => {
      const ws = this.socket = new WebSocket(url);
      const timeout = setTimeout(()=>{ws.close();reject(new Error('OBS connection timed out. Enable WebSocket Server in OBS → Tools.'));},10000);
      ws.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Cannot connect to OBS. Open OBS and enable Tools → WebSocket Server Settings.'));});
      ws.addEventListener('close',()=>{clearTimeout(timeout);reject(new Error('OBS closed the connection. Check the WebSocket password.'));for(const req of this.requests.values()){clearTimeout(req.timer);req.reject(new Error('OBS disconnected'));}this.requests.clear();});
      ws.addEventListener('message',event=>{
        try {
          const message = JSON.parse(String(event.data));
          if(message.op===0){
            const auth = message.d.authentication;
            const digest=(v:string)=>createHash('sha256').update(v).digest('base64');
            ws.send(JSON.stringify({op:1,d:{rpcVersion:1,eventSubscriptions:0,...(auth?{authentication:digest(digest(password+auth.salt)+auth.challenge)}:{})}}));
          } else if(message.op===2){clearTimeout(timeout);resolve();}
          else if(message.op===7){const req=this.requests.get(message.d.requestId);if(req){clearTimeout(req.timer);this.requests.delete(message.d.requestId);message.d.requestStatus.result?req.resolve(message.d.responseData):req.reject(new Error(message.d.requestStatus.comment||'OBS request failed'));}}
        } catch(error){clearTimeout(timeout);reject(error);}
      });
    });
  }
  call<T=any>(requestType:string,requestData:Record<string,unknown>={}):Promise<T>{
    return new Promise((resolve,reject)=>{
      if(!this.socket||this.socket.readyState!==WebSocket.OPEN)return reject(new Error('OBS is disconnected'));
      const requestId=randomUUID();const timer=setTimeout(()=>{this.requests.delete(requestId);reject(new Error(`OBS ${requestType} timed out`));},10000);
      this.requests.set(requestId,{resolve,reject,timer});this.socket.send(JSON.stringify({op:6,d:{requestType,requestId,requestData}}));
    });
  }
  close(){this.socket?.close();}
}
