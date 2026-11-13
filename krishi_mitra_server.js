// Krishi Mitra AI - local JavaScript backend; Node.js built-ins only.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = 3000;
const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'Krishi_Mitra_AI.html');
const knowledge = [];
const reviews = [];
const audit = [];
let gpsRecords = [];
let photoRecords = [];

// Load the checked-in official reference notes on startup. They are dated/source-labelled
// and are not treated as a complete or current substitute for season/state notifications.
const OFFICIAL_REFERENCE_FILE = path.join(ROOT, 'knowledge', 'pmfby_official_reference.txt');
if (fs.existsSync(OFFICIAL_REFERENCE_FILE)) {
  const content = fs.readFileSync(OFFICIAL_REFERENCE_FILE, 'utf8');
  if (content.trim()) knowledge.push({
    id: 'official-pmfby-reference',
    name: 'pmfby_official_reference.txt',
    content,
    createdAt: new Date().toISOString(),
    sourceType: 'curated-official-reference-notes'
  });
}
const OFFICIAL_SERVICES = [
  {name:'PMFBY official portal',url:'https://pmfby.gov.in/'},
  {name:'Farmer login',url:'https://pmfby.gov.in/farmerLogin'},
  {name:'Application status',url:'https://pmfby.gov.in/status'},
  {name:'Insurance company directory',url:'https://pmfby.gov.in/insuranceCompanyDirectory'},
  {name:'Ministry update dated 2 December 2025',url:'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2197713&lang=1&reg=3'},
  {name:'API Setu PMFBY collection',url:'https://directory.apisetu.gov.in/api-collection/pmfby'}
];


function id(){ return crypto.randomUUID(); }
function log(action, details={}){ audit.push({at:new Date().toISOString(),action,...details}); if(audit.length>500)audit.shift(); }
function send(res,status,data,type='application/json; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(type.startsWith('application/json')?JSON.stringify(data):data);
}
function body(req,limit=2*1024*1024){return new Promise((resolve,reject)=>{
 let chunks=[],size=0;req.on('data',c=>{size+=c.length;if(size>limit){reject(new Error('Request too large'));req.destroy();return}chunks.push(c)});
 req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch{reject(new Error('Request body must be valid JSON'))}});
 req.on('error',reject);
});}
function clean(s,max=12000){return typeof s==='string'?s.trim().slice(0,max):''}
function tokens(s){return (s.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>x.length>1)}
function retrieve(query){
 const q=tokens(query); if(!q.length)return [];
 return knowledge.map(doc=>{
   const words=tokens(doc.content);const counts=new Map();for(const w of words)counts.set(w,(counts.get(w)||0)+1);
   let score=0;for(const w of q)if(counts.has(w))score+=1+Math.log(counts.get(w));
   return {doc,score:score/(Math.sqrt(q.length)*Math.sqrt(Math.max(words.length,1)))};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
}
function route(req,res){
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/'){
   if(!fs.existsSync(HTML_FILE))return send(res,404,'Krishi_Mitra_AI.html not found','text/plain; charset=utf-8');
   return send(res,200,fs.readFileSync(HTML_FILE,'utf8'),'text/html; charset=utf-8');
 }
 if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,service:'Krishi Mitra AI local backend',knowledgeDocuments:knowledge.length,reviewRequests:reviews.length});

 if(req.method==='GET'&&u.pathname==='/api/official-services')return send(res,200,{services:OFFICIAL_SERVICES,helpline:'14447',whatsapp:'7065514447'});
 if(req.method==='GET'&&u.pathname==='/api/integrations/status')return send(res,200,{
   officialPortalLinks:{status:'available',services:OFFICIAL_SERVICES},
   directApi:{status:'not_configured',message:'No authorized NCIP/insurer API specification or credentials have been supplied. No claim, enrolment, policy-status or grievance transaction is being sent from this prototype.'},
   apiSetu:{listing:'found',collection:'Policy Document',schema:'not_verified',note:'The public PMFBY collection page did not expose a usable API definition. Obtain the current schema and access approval before implementation.'}
 });

 if(req.method==='GET'&&u.pathname==='/api/knowledge/status')return send(res,200,{count:knowledge.length,documents:knowledge.map(d=>({id:d.id,name:d.name,characters:d.content.length}))});
 if(req.method==='GET'&&u.pathname==='/api/human-review')return send(res,200,{count:reviews.length,reviews:reviews.map(({id,createdAt,status})=>({id,createdAt,status}))});
 if(req.method==='GET'&&u.pathname==='/api/audit')return send(res,200,{events:audit});
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 body(req).then(data=>{
  if(u.pathname==='/api/assist'){
    const message=clean(data.message,10000),context=clean(data.context,3000),language=clean(data.language,60)||'English';
    if(!message)return send(res,400,{error:'Message is required'});
    const matches=retrieve(message+' '+context);
    let answer=`Krishi Mitra AI — local knowledge retrieval\n\nYour selected language: ${language}\n\n`;
    if(matches.length){
      answer+='Relevant passages from documents you uploaded:\n\n';
      matches.forEach((m,i)=>{answer+=`${i+1}. ${m.doc.name}\n${m.doc.content.slice(0,1800)}\n\n`});
      answer+='How to use this: These are retrieved text passages, not a verified decision about your claim. Check the document date, state, season and applicability. Contact the authorized insurer or official PMFBY channel for case-specific confirmation.';
    }else{
      answer+='I could not find a matching passage in the knowledge documents currently uploaded to this local system.\n\nNo PMFBY rule, deadline, eligibility result, claim status, weather evidence or approval has been inferred. Add the relevant current official circular/notification as a plain-text knowledge document, or contact your authorized insurer/official PMFBY channel for confirmation.';
    }
    answer+='\n\nCapability limit: this JavaScript-only version has no language model. It cannot reliably interpret every form of natural language or generate a full conversational answer. Retrieval uses keyword overlap and may miss relevant passages.';
    log('assist',{messageLength:message.length,matchCount:matches.length});
    return send(res,200,{answer,matches:matches.map(m=>({document:m.doc.name,score:Number(m.score.toFixed(4))})),mode:'local-keyword-retrieval'});
  }
  if(u.pathname==='/api/knowledge/upload'){
    const name=path.basename(clean(data.name,180)||'knowledge.txt'),content=clean(data.content,500000);
    if(!content)return send(res,400,{error:'Text document content is required'});
    if(!name.toLowerCase().endsWith('.txt'))return send(res,400,{error:'Only .txt knowledge files are supported'});
    const doc={id:id(),name,content,createdAt:new Date().toISOString()};knowledge.push(doc);log('knowledge_upload',{id:doc.id,name,characters:content.length});
    return send(res,201,{id:doc.id,name,characters:content.length});
  }
  if(u.pathname==='/api/gps'){
    const lat=Number(data.latitude),lon=Number(data.longitude),accuracy=Number(data.accuracy||0);
    if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180)return send(res,400,{error:'Valid latitude and longitude are required'});
    const rec={id:id(),latitude:lat,longitude:lon,accuracy,createdAt:new Date().toISOString()};gpsRecords.push(rec);log('gps_registered',{id:rec.id});
    return send(res,201,{registered:true,id:rec.id});
  }
  if(u.pathname==='/api/geo-photos'){
    const photos=Array.isArray(data.photos)?data.photos.slice(0,20):[];
    if(!photos.length)return send(res,400,{error:'Photo metadata is required'});
    const records=photos.map(p=>({id:id(),name:path.basename(clean(p.name,180)),type:clean(p.type,100),size:Number(p.size)||0,gps:data.gps&&Number.isFinite(Number(data.gps.latitude))?{latitude:Number(data.gps.latitude),longitude:Number(data.gps.longitude)}:null,createdAt:new Date().toISOString()}));
    photoRecords.push(...records);log('photo_metadata_registered',{count:records.length});
    return send(res,201,{registered:records.length,records:records.map(({id,name,gps})=>({id,name,gps}))});
  }
  if(u.pathname==='/api/human-review'){
    const reason=clean(data.reason,5000);if(!reason)return send(res,400,{error:'Review reason is required'});
    const rec={id:id(),reason,message:clean(data.message,10000),context:clean(data.context,3000),createdAt:new Date().toISOString(),status:'pending-local-review'};
    reviews.push(rec);log('human_review_requested',{id:rec.id});
    return send(res,201,{id:rec.id,status:rec.status});
  }
  if(u.pathname==='/api/tools/call'){
    const name=clean(data.name,80),args=data.arguments||{};
    const tools={
      search_knowledge:()=>({matches:retrieve(clean(args.query,5000)).map(m=>({document:m.doc.name,excerpt:m.doc.content.slice(0,1200)}))}),
      knowledge_status:()=>({count:knowledge.length,documents:knowledge.map(d=>d.name)}),
      request_human_review:()=>{const rec={id:id(),reason:clean(args.reason,5000),createdAt:new Date().toISOString(),status:'pending-local-review'};if(!rec.reason)throw Error('reason required');reviews.push(rec);return {id:rec.id,status:rec.status}}
    };
    if(!tools[name])return send(res,404,{error:'Unknown local tool'});
    try{const result=tools[name]();log('local_tool_call',{name});return send(res,200,{tool:name,result})}catch(e){return send(res,400,{error:e.message})}
  }
  if(u.pathname==='/api/translate')return send(res,501,{error:'Translation service is not available in this offline JavaScript-only build.'});
  return send(res,404,{error:'Endpoint not found'});
 }).catch(e=>{if(!res.headersSent)send(res,400,{error:e.message||'Invalid request'})});
}
http.createServer((req,res)=>{try{route(req,res)}catch(e){if(!res.headersSent)send(res,500,{error:'Internal server error'})}}).listen(PORT,HOST,()=>console.log(`Krishi Mitra AI running at http://${HOST}:${PORT}`));
