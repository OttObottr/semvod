// Tests use synthetic credentials and loopback only. Live verification is an explicit separate step.
process.env.NODE_ENV='test';
for(const name of ['OPENAI_API_KEY','TWITCH_CLIENT_ID','TWITCH_CLIENT_SECRET','OBS_PASSWORD'])process.env[name]='';
process.env.OBS_URL='ws://127.0.0.1:1';process.env.NO_PROXY='localhost,127.0.0.1';
const local=value=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
const nativeFetch=globalThis.fetch,NativeSocket=globalThis.WebSocket;
globalThis.fetch=async(input,init)=>{if(!local(input instanceof Request?input.url:String(input)))throw Error('External network disabled in tests');return nativeFetch(input,init);};
globalThis.WebSocket=class extends NativeSocket{constructor(url,protocols){if(!local(String(url)))throw Error('External network disabled in tests');super(url,protocols);}};
