(()=>{var e={};e.id=370,e.ids=[370],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},6113:e=>{"use strict";e.exports=require("crypto")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},97578:(e,t,i)=>{"use strict";i.r(t),i.d(t,{GlobalError:()=>r.a,__next_app__:()=>x,originalPathname:()=>p,pages:()=>c,routeModule:()=>m,tree:()=>d}),i(10134),i(7907),i(31819),i(43138);var a=i(57341),s=i(95085),n=i(81918),r=i.n(n),l=i(20192),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);i.d(t,o);let d=["",{children:["(app)",{children:["proformas",{children:["nouvelle",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(i.bind(i,10134)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\proformas\\nouvelle\\page.jsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(i.bind(i,7907)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\layout.jsx"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(i.bind(i,43138)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\proformas\\nouvelle\\page.jsx"],p="/(app)/proformas/nouvelle/page",x={require:i,loadChunk:()=>Promise.resolve()},m=new a.AppPageRouteModule({definition:{kind:s.x.APP_PAGE,page:"/(app)/proformas/nouvelle/page",pathname:"/proformas/nouvelle",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},94402:(e,t,i)=>{Promise.resolve().then(i.bind(i,23418))},23418:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>_});var a=i(72075),s=i(24334),n=i(13076),r=i(932),l=i(47466),o=i(86235),d=i(13680),c=i(10088),p=i(73066),x=i(60595),m=i(3919),u=i(99692),h=i(61468),g=i(73795),y=i(48020),b=i(44573),f=i(41258),v=i(61409),j=i(34319);let N=["Pi\xe8ces","M\xe8tre","Litre","Kg","Lot","Forfait"];function _(){let e=(0,n.useRouter)(),t=(0,n.useSearchParams)().get("id"),i=(0,g.q)(e=>e.shop),[h,_]=(0,s.useState)([{id:(0,l.Z)(),designation:"",quantity:1,unit:"Pi\xe8ces",unit_price:0}]),[$,k]=(0,s.useState)([]),[T,D]=(0,s.useState)(!1),[P]=(0,s.useState)(t||(0,l.Z)()),[A,C]=(0,s.useState)(""),{register:q,handleSubmit:M,reset:E,watch:z,setValue:S}=(0,r.cI)({defaultValues:{date:(0,u.WU)(new Date,"yyyy-MM-dd"),city:i?.city||"",client_name:"",client_address:"",client_phone:"",validity:"30 jours"}});function U(e,t,i){_(a=>a.map(a=>a.id===e?{...a,[t]:i}:a))}(0,s.useCallback)(async()=>{if(!i?.id)return;let[e,a]=await Promise.all([(0,y.go)("products",i.id),(0,y.go)("invoices",i.id)]);if(k(e),t){let e=await y.Yp.invoices.get(t),i=await y.Yp.invoice_items.where("invoice_id").equals(t).toArray();e&&(E({date:e.date,city:e.city||"",client_name:e.client_name||"",client_address:e.client_address||"",client_phone:e.client_phone||"",validity:e.validity||"30 jours"}),C(e.invoice_number),i.length>0&&_(i))}else C((0,b.W2)(a.filter(e=>"proforma"===e.type),"proforma"))},[i?.id,t,E]);let Z=h.map(e=>({...e,total_price:Number(e.quantity)*Number(e.unit_price)})),O=(0,b.j0)(Z);async function I(e){D(!0);try{let t={id:P,shop_id:i.id,type:"proforma",invoice_number:A,date:e.date,city:e.city||i?.city||"",client_name:e.client_name,client_address:e.client_address,client_phone:e.client_phone,validity:e.validity,total_amount:O,amount_in_words:(0,b.RQ)(O),status:"finalized",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};for(let e of(await (0,y.kL)("invoices",t),await y.Yp.invoice_items.where("invoice_id").equals(P).toArray()))await (0,y.hD)("invoice_items",e.id);for(let e=0;e<Z.length;e++){let t=Z[e];await (0,y.kL)("invoice_items",{id:t.id,invoice_id:P,shop_id:i.id,designation:t.designation,quantity:Number(t.quantity),unit:t.unit,unit_price:Number(t.unit_price),total_price:t.total_price,sort_order:e})}o.A.success("Proforma enregistr\xe9 !")}catch(e){o.A.error(e.message)}finally{D(!1)}}let R=z();return(0,a.jsxs)("div",{className:"min-h-screen bg-gray-50",children:[(0,a.jsxs)("div",{className:"sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3",children:[a.jsx("button",{onClick:()=>e.push("/proformas"),className:"p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors",children:a.jsx(d.Z,{className:"w-4 h-4"})}),(0,a.jsxs)("h1",{className:"font-display font-bold text-gray-900",children:["Proforma ",A]}),(0,a.jsxs)("div",{className:"ml-auto flex items-center gap-2",children:[a.jsx(f.un,{variant:"secondary",icon:c.Z,onClick:function(){let e=z(),t=(0,v.Vv)({shop:i,invoiceNumber:A,formValues:e,items:Z,grandTotal:O,type:"proforma"}),a=document.createElement("iframe");a.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(a),a.contentDocument.open(),a.contentDocument.write(t),a.contentDocument.close(),a.onload=()=>{setTimeout(()=>{a.contentWindow.focus(),a.contentWindow.print(),setTimeout(()=>document.body.removeChild(a),1500)},300)}},children:"Imprimer"}),a.jsx(f.un,{icon:p.Z,onClick:M(I),disabled:T,children:T?"Enregistrement…":"Enregistrer"})]})]}),(0,a.jsxs)("div",{className:"max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-6",children:[(0,a.jsxs)("div",{className:"space-y-5",children:[(0,a.jsxs)("div",{className:"card p-5",children:[a.jsx("h3",{className:"font-semibold text-gray-800 mb-4",children:"Informations g\xe9n\xe9rales"}),(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[a.jsx(f.Wi,{label:"Date",required:!0,children:a.jsx("input",{...q("date",{required:!0}),type:"date",className:f.Gn})}),a.jsx(f.Wi,{label:"Ville",children:a.jsx("input",{...q("city"),placeholder:i?.city||"Niamey",className:f.Gn})})]}),a.jsx("div",{className:"mt-4",children:a.jsx(f.Wi,{label:"Validit\xe9 de l'offre",children:a.jsx("input",{...q("validity"),placeholder:"Ex: 30 jours, 15 jours...",className:f.Gn})})})]}),(0,a.jsxs)("div",{className:"card p-5",children:[a.jsx("h3",{className:"font-semibold text-gray-800 mb-4",children:"Client / Destinataire"}),(0,a.jsxs)("div",{className:"space-y-3",children:[a.jsx(f.Wi,{label:"Nom",children:a.jsx("input",{...q("client_name"),placeholder:"Ex: M. HAROUNA",className:f.Gn})}),(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[a.jsx(f.Wi,{label:"Adresse",children:a.jsx("input",{...q("client_address"),placeholder:"Ex: Niamey",className:f.Gn})}),a.jsx(f.Wi,{label:"T\xe9l\xe9phone",children:a.jsx(j.Z,{value:z("client_phone"),onChange:e=>S("client_phone",e),placeholder:"92 00 00 00",className:f.Gn})})]})]})]}),(0,a.jsxs)("div",{className:"card p-5",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between mb-4",children:[a.jsx("h3",{className:"font-semibold text-gray-800",children:"Articles"}),a.jsx(f.un,{size:"sm",icon:x.Z,onClick:function(){_(e=>[...e,{id:(0,l.Z)(),designation:"",quantity:1,unit:"Pi\xe8ces",unit_price:0}])},children:"Ajouter"})]}),a.jsx("div",{className:"space-y-3",children:h.map((e,t)=>(0,a.jsxs)("div",{className:"border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsxs)("span",{className:"text-xs font-semibold text-gray-400",children:["Article ",t+1]}),a.jsx("button",{onClick:()=>{var t;return t=e.id,void(1!==h.length&&_(e=>e.filter(e=>e.id!==t)))},className:"text-gray-300 hover:text-red-500 transition-colors",children:a.jsx(m.Z,{className:"w-3.5 h-3.5"})})]}),(0,a.jsxs)("select",{className:`${f.Gn} text-xs`,onChange:t=>(function(e,t){let i=$.find(e=>e.id===t);i&&U(e,"designation",i.name)})(e.id,t.target.value),defaultValue:"",children:[a.jsx("option",{value:"",children:"— Remplir depuis catalogue —"}),$.map(e=>a.jsx("option",{value:e.id,children:e.name},e.id))]}),a.jsx("input",{value:e.designation,onChange:t=>U(e.id,"designation",t.target.value),placeholder:"D\xe9signation du produit / service",className:f.Gn}),(0,a.jsxs)("div",{className:"grid grid-cols-4 gap-2",children:[(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Qt\xe9"}),a.jsx(j.Z,{value:e.quantity,onChange:t=>U(e.id,"quantity",t),className:`${f.Gn} mt-0.5`})]}),(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Unit\xe9"}),a.jsx("select",{value:e.unit,onChange:t=>U(e.id,"unit",t.target.value),className:`${f.Gn} mt-0.5`,children:N.map(e=>a.jsx("option",{children:e},e))})]}),(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Prix unit."}),a.jsx(j.Z,{value:e.unit_price,onChange:t=>U(e.id,"unit_price",t),className:`${f.Gn} mt-0.5`})]}),(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Total"}),a.jsx("div",{className:`${f.Gn} mt-0.5 bg-gray-100 text-gray-600 flex items-center text-xs`,children:(0,b.zz)(Number(e.quantity)*Number(e.unit_price))})]})]})]},e.id))}),(0,a.jsxs)("div",{className:"mt-4 pt-4 border-t border-gray-100 flex justify-between items-center",children:[a.jsx("span",{className:"font-semibold text-gray-700",children:"MONTANT TOTAL"}),a.jsx("span",{className:"font-display text-xl font-bold",style:{color:"var(--color-primary)"},children:(0,b.zz)(O)})]})]})]}),a.jsx("div",{children:(0,a.jsxs)("div",{className:"card p-6 sticky top-24",children:[a.jsx("h3",{className:"font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide",children:"Aper\xe7u"}),a.jsx(w,{shop:i,proformaNumber:A,formValues:R,items:Z,grandTotal:O})]})})]})]})}function w({shop:e,proformaNumber:t,formValues:i,items:s,grandTotal:n}){let r=i.date?(0,u.WU)(new Date(i.date),"dd MMMM yyyy",{locale:h.fr}):"—",l=i.city||e?.city||"Niamey";return(0,a.jsxs)("div",{className:"bg-white font-sans text-gray-900 p-5 text-xs border border-gray-100 rounded-xl",children:[(0,a.jsxs)("div",{className:"flex justify-between items-start mb-8",children:[(0,a.jsxs)("div",{className:"flex items-start gap-4",children:[e?.logo_url&&a.jsx("img",{src:e.logo_url,alt:"Logo",className:"w-16 h-16 object-contain"}),(0,a.jsxs)("div",{children:[a.jsx("h2",{className:"font-display font-bold text-lg",style:{color:e?.color_primary||"#1a56db"},children:e?.name}),e?.address&&a.jsx("p",{className:"text-gray-500",children:e.address}),e?.nif&&(0,a.jsxs)("p",{className:"text-gray-500",children:["NIF: ",e.nif]})]})]}),(0,a.jsxs)("div",{className:"text-right",children:[(0,a.jsxs)("p",{className:"text-gray-500",children:[l,", le ",r]}),i.validity&&(0,a.jsxs)("p",{className:"text-gray-400 text-xs mt-1",children:["Validit\xe9 : ",i.validity]})]})]}),a.jsx("div",{className:"text-center mb-6",children:(0,a.jsxs)("h1",{className:"font-display text-xl font-bold uppercase tracking-wide",style:{color:e?.color_primary||"#1a56db"},children:["FACTURE PROFORMA N\xb0",t]})}),(i.client_name||i.client_address||i.client_phone)&&(0,a.jsxs)("div",{className:"border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-3 gap-4",children:[i.client_name&&(0,a.jsxs)("div",{children:[a.jsx("span",{className:"text-gray-500",children:"CLIENT : "}),a.jsx("strong",{children:i.client_name})]}),i.client_address&&(0,a.jsxs)("div",{children:[a.jsx("span",{className:"text-gray-500",children:"ADRESSE : "}),i.client_address]}),i.client_phone&&(0,a.jsxs)("div",{children:[a.jsx("span",{className:"text-gray-500",children:"T\xe9l : "}),i.client_phone]})]}),(0,a.jsxs)("table",{className:"w-full border-collapse mb-4",children:[a.jsx("thead",{children:(0,a.jsxs)("tr",{style:{background:e?.color_primary||"#1a56db"},className:"text-white",children:[a.jsx("th",{className:"text-left px-3 py-2 font-semibold",children:"D\xe9signation"}),a.jsx("th",{className:"text-center px-3 py-2 font-semibold w-16",children:"Qt\xe9"}),a.jsx("th",{className:"text-center px-3 py-2 font-semibold w-20",children:"Unit\xe9"}),a.jsx("th",{className:"text-right px-3 py-2 font-semibold w-28",children:"Prix Unitaire"}),a.jsx("th",{className:"text-right px-3 py-2 font-semibold w-28",children:"Prix Total"})]})}),a.jsx("tbody",{children:s.map((e,t)=>(0,a.jsxs)("tr",{className:t%2==0?"bg-gray-50":"bg-white",children:[a.jsx("td",{className:"px-3 py-2",children:e.designation||"—"}),a.jsx("td",{className:"px-3 py-2 text-center",children:e.quantity}),a.jsx("td",{className:"px-3 py-2 text-center",children:e.unit}),a.jsx("td",{className:"px-3 py-2 text-right",children:(0,b.zz)(e.unit_price)}),a.jsx("td",{className:"px-3 py-2 text-right font-semibold",children:(0,b.zz)(e.total_price)})]},e.id))}),a.jsx("tfoot",{children:(0,a.jsxs)("tr",{style:{background:e?.color_primary||"#1a56db"},className:"text-white",children:[a.jsx("td",{colSpan:4,className:"px-3 py-2 font-bold text-right",children:"MONTANT TOTAL"}),a.jsx("td",{className:"px-3 py-2 font-bold text-right",children:(0,b.zz)(n)})]})})]}),a.jsx("p",{className:"text-gray-600 italic mb-6",children:(0,b.RQ)(n)}),a.jsx("div",{className:"border border-amber-200 bg-amber-50 rounded-lg p-3 mb-4 text-xs text-amber-700",children:"⚠ Ce document est un devis / proforma et ne constitue pas une facture d\xe9finitive."}),a.jsx("div",{className:"mt-8 pt-4 border-t border-gray-200 text-center text-gray-400 text-xs",children:[e?.phone&&`T\xe9l : ${e.phone}`,e?.whatsapp&&`WhatsApp : ${e.whatsapp}`,e?.email&&`Email : ${e.email}`].filter(Boolean).join("   \xb7   ")})]})}},34319:(e,t,i)=>{"use strict";i.d(t,{Z:()=>r});var a=i(72075),s=i(24334),n=i.n(s);function r({value:e,onChange:t,onBlur:i,placeholder:s,required:r,className:l,disabled:o}){let d=e=>{if(""===e||null==e)return"";let[t,i]=String(e).split("."),a=t.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");return void 0!==i?`${a},${i}`:a},[c,p]=n().useState(()=>d(e)),x=n().useRef(e);return a.jsx("input",{type:"text",inputMode:"decimal",value:c,onChange:e=>{let i,a;let s=e.target.value.replace(/[\s\u00a0]/g,""),n=s.indexOf(",");n>=0?(i=s.slice(0,n).replace(/\D/g,""),a=s.slice(n+1).replace(/\D/g,"")):(i=s.replace(/\D/g,""),a=null);let r=i.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");p(null!==a?`${r},${a}`:r);let l=null!==a?`${i}.${a}`:i;x.current=l,t(l)},onBlur:i,placeholder:s,required:r,disabled:o,className:l})}},61409:(e,t,i)=>{"use strict";i.d(t,{EV:()=>l,Vv:()=>r,iZ:()=>o});var a=i(99692),s=i(61468),n=i(44573);function r({shop:e,invoiceNumber:t,formValues:i,items:r,grandTotal:l,type:o="facture"}){let d=i.date?(0,a.WU)(new Date(i.date),"dd MMMM yyyy",{locale:s.fr}):"—",c=i.city||e?.city||"Niamey",p=e?.color_primary||"#1a56db",x="proforma"===o,m="bon_livraison"===o,u="bon_commande"===o,h="FACTURE DE VENTE";x&&(h="FACTURE PROFORMA"),m&&(h="BON DE LIVRAISON"),u&&(h="BON DE COMMANDE");let g=r.map((e,t)=>`
    <tr style="background:${t%2==0?"#f9fafb":"#fff"}">
      <td style="padding:8px 12px">${e.designation||"—"}</td>
      <td style="padding:8px 12px;text-align:center">${e.quantity}</td>
      <td style="padding:8px 12px;text-align:center">${e.unit||"Pi\xe8ces"}</td>
      ${m||u?"":`
      <td style="padding:8px 12px;text-align:right">${(0,n.zz)(e.unit_price)}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600">${(0,n.zz)(e.total_price)}</td>
      `}
    </tr>
  `).join(""),y=i.client_name||i.client_address||i.client_phone?`<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
        ${i.client_name?`<div><span style="color:#6b7280">${x||m?"DESTINATAIRE":"CLIENT"} : </span><strong>${i.client_name}</strong></div>`:""}
        ${i.client_address?`<div><span style="color:#6b7280">ADRESSE : </span>${i.client_address}</div>`:""}
        ${i.client_phone?`<div><span style="color:#6b7280">T\xe9l : </span>${i.client_phone}</div>`:""}
      </div>`:"",b=m||u?"":`
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Unitaire</th>
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Total</th>
  `,f=m||u?"":`
    <tfoot>
      <tr style="background:${p};color:white">
        <td colspan="3" style="padding:8px 12px;font-weight:700;text-align:right">MONTANT TOTAL</td>
        <td style="padding:8px 12px;font-weight:700;text-align:right">${(0,n.zz)(l)}</td>
      </tr>
    </tfoot>
  `,v=m||u?"":`<p style="color:#4b5563;font-style:italic;margin-bottom:32px">${(0,n.RQ)(l)}</p>`,j=x?`<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:24px;color:#b45309;font-size:13px">
        ⚠ Ce document est un devis / proforma et ne constitue pas une facture d\xe9finitive.
      </div>`:"",N=x&&i.validity?`<p style="color:#6b7280;font-size:12px;margin-top:4px">Validit\xe9 : ${i.validity}</p>`:"",_=e?.signature_url||e?.cachet_url?`<div style="text-align:right;margin-top:48px">
        <p style="color:#4b5563;margin-bottom:8px">Signature</p>
        ${e.signature_url?`<img src="${e.signature_url}" alt="Signature" style="height:56px;object-fit:contain;display:block;margin-left:auto" />`:""}
        ${e.cachet_url?`<img src="${e.cachet_url}" alt="Cachet" style="height:56px;object-fit:contain;display:block;margin-left:auto;margin-top:8px" />`:""}
      </div>`:`<div style="margin-top:48px;text-align:right">
        <p style="color:#4b5563">Signature</p>
        <div style="height:56px"></div>
      </div>`,w=[e?.phone&&`T\xe9l : ${e.phone}`,e?.whatsapp&&`WhatsApp : ${e.whatsapp}`,e?.email&&`Email : ${e.email}`].filter(Boolean).join("   \xb7   ");return`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${h} N\xb0${t}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #111827;
      background: white;
      padding: 20mm 15mm;
    }
    table { border-collapse: collapse; width: 100%; }
    @media print {
      body { padding: 10mm 12mm; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div style="display:flex;align-items:flex-start;gap:16px">
      ${e?.logo_url?`<img src="${e.logo_url}" alt="Logo" style="width:64px;height:64px;object-fit:contain" />`:""}
      <div>
        <h2 style="font-size:18px;font-weight:700;color:${p};margin-bottom:4px">${e?.name||""}</h2>
        ${e?.address?`<p style="color:#6b7280;font-size:12px">${e.address}</p>`:""}
        ${e?.city?`<p style="color:#6b7280;font-size:12px">${e.city}</p>`:""}
        ${e?.nif?`<p style="color:#6b7280;font-size:12px">NIF: ${e.nif}</p>`:""}
      </div>
    </div>
    <div style="text-align:right">
      <p style="color:#6b7280;font-size:12px">${c}, le ${d}</p>
      ${N}
    </div>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${p}">
      ${h} N\xb0${t}
    </h1>
  </div>

  <!-- Client -->
  ${y}

  <!-- Items table -->
  <table style="margin-bottom:16px">
    <thead>
      <tr style="background:${p};color:white">
        <th style="padding:8px 12px;text-align:left">D\xe9signation</th>
        <th style="padding:8px 12px;text-align:center;width:60px">Qt\xe9</th>
        <th style="padding:8px 12px;text-align:center;width:80px">Unit\xe9</th>
        ${b}
      </tr>
    </thead>
    <tbody>${g}</tbody>
    ${f}
  </table>

  <!-- Amount in words -->
  ${v}

  <!-- Proforma warning -->
  ${j}

  <!-- Signature -->
  ${_}

  <!-- Footer -->
  ${w?`
  <div style="margin-top:48px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:10px">
    ${w}
  </div>`:""}
</body>
</html>`}function l({shop:e,type:t,saleGroup:i,invoiceNumber:a}){let s={date:i.date,city:e?.city||"",client_name:i.client_name||"",client_address:"",client_phone:"",validity:"30 jours"},n=i.items.map(e=>({id:e.id,designation:e.product_name,quantity:e.quantity,unit:e.unit||"Pi\xe8ces",unit_price:e.unit_sale_price||0,total_price:e.total_sale||0})),l=n.reduce((e,t)=>e+t.total_price,0),o=r({shop:e,invoiceNumber:a||`VTE-${i.date}`,formValues:s,items:n,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}function o({shop:e,type:t,purchase:i,invoiceNumber:a}){let s={date:i.date,city:e?.city||"",client_name:i.supplier||"",client_address:"",client_phone:""},n=[{id:i.id,designation:i.product_name,quantity:i.quantity,unit:"Pi\xe8ces",unit_price:i.unit_price||0,total_price:i.total_amount||0}],l=i.total_amount||0,o=r({shop:e,invoiceNumber:a||`ACH-${i.date}`,formValues:s,items:n,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}},13680:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]])},60595:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},10088:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},73066:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]])},24459:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},3919:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},47466:(e,t,i)=>{"use strict";i.d(t,{Z:()=>d});var a=i(6113),s=i.n(a);let n={randomUUID:s().randomUUID},r=new Uint8Array(256),l=r.length,o=[];for(let e=0;e<256;++e)o.push((e+256).toString(16).slice(1));let d=function(e,t,i){if(n.randomUUID&&!t&&!e)return n.randomUUID();let a=(e=e||{}).random||(e.rng||function(){return l>r.length-16&&(s().randomFillSync(r),l=0),r.slice(l,l+=16)})();if(a[6]=15&a[6]|64,a[8]=63&a[8]|128,t){i=i||0;for(let e=0;e<16;++e)t[i+e]=a[e];return t}return function(e,t=0){return o[e[t+0]]+o[e[t+1]]+o[e[t+2]]+o[e[t+3]]+"-"+o[e[t+4]]+o[e[t+5]]+"-"+o[e[t+6]]+o[e[t+7]]+"-"+o[e[t+8]]+o[e[t+9]]+"-"+o[e[t+10]]+o[e[t+11]]+o[e[t+12]]+o[e[t+13]]+o[e[t+14]]+o[e[t+15]]}(a)}},10134:(e,t,i)=>{"use strict";i.r(t),i.d(t,{$$typeof:()=>r,__esModule:()=>n,default:()=>l});var a=i(90506);let s=(0,a.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\proformas\nouvelle\page.jsx`),{__esModule:n,$$typeof:r}=s;s.default;let l=(0,a.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\proformas\nouvelle\page.jsx#default`)}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),a=t.X(0,[228,916,294,617,487,179,163,932,719,363],()=>i(97578));module.exports=a})();