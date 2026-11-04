/** Serializes settled edits; failures retain the exact target until explicit retry or a newer edit. */
export class SettledAutosave<T> {
  private context: {owner:string;value:T;key:string;blocked:boolean}|null=null;
  private saved=''; private failed=''; private running=false; private generation=0;
  constructor(private persist:(value:T,owner:string)=>Promise<boolean>,private onError:(error:string)=>void) {}
  reset(owner:string,value:T) { this.generation++;this.saved=owner+':'+JSON.stringify(value);this.failed='';this.context=null; }
  set(owner:string,value:T,blocked:boolean) { this.context={owner,value,key:owner+':'+JSON.stringify(value),blocked}; }
  cancel() {this.generation++;this.context=null;}
  async flush(retry=false) {
    if(retry)this.failed='';
    if(this.running)return;
    this.running=true;
    try {
      while(this.context&&!this.context.blocked&&this.context.owner&&this.context.key!==this.saved&&this.context.key!==this.failed) {
        const target=this.context,generation=this.generation;
        let ok=false;try{ok=await this.persist(target.value,target.owner);}catch{/* Keep target for retry. */}
        if(generation!==this.generation)break;
        if(!ok){this.failed=target.key;this.onError('暂时未能保存，请重试。');break;}
        this.saved=target.key;this.failed='';this.onError('');
      }
    } finally {this.running=false;}
    if(this.context&&!this.context.blocked&&this.context.key!==this.saved&&this.context.key!==this.failed)await this.flush();
  }
}
