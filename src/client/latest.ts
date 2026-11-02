// Invalidating a selection prevents its delayed success, error or cleanup from changing the next one.
export function latestRequest() {
  let revision=0;
  return {
    invalidate(){revision++;},
    async run<T>(work:()=>Promise<T>,commit:(value:T)=>void,fail:(error:unknown)=>void,done:()=>void){
      const request=++revision;
      try{const value=await work();if(request===revision)commit(value);}
      catch(error){if(request===revision)fail(error);}
      finally{if(request===revision)done();}
    }
  };
}
