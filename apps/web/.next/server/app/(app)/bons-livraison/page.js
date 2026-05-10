(()=>{var e={};e.id=518,e.ids=[518],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},69813:(e,t,i)=>{"use strict";i.r(t),i.d(t,{GlobalError:()=>o.a,__next_app__:()=>m,originalPathname:()=>c,pages:()=>p,routeModule:()=>x,tree:()=>d}),i(16616),i(7907),i(31819),i(43138);var n=i(57341),a=i(95085),s=i(81918),o=i.n(s),r=i(20192),l={};for(let e in r)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>r[e]);i.d(t,l);let d=["",{children:["(app)",{children:["bons-livraison",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(i.bind(i,16616)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\bons-livraison\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(i.bind(i,7907)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\layout.jsx"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(i.bind(i,43138)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],p=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\bons-livraison\\page.jsx"],c="/(app)/bons-livraison/page",m={require:i,loadChunk:()=>Promise.resolve()},x=new n.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/(app)/bons-livraison/page",pathname:"/bons-livraison",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},97933:(e,t,i)=>{Promise.resolve().then(i.bind(i,79761))},79761:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>g});var n=i(72075),a=i(24334),s=i(39257),o=i(24459),r=i(10088),l=i(99692),d=i(61468),p=i(73795),c=i(48020),m=i(44573),x=i(61409),u=i(41258);function g(){let e=(0,p.q)(e=>e.shop),[t,i]=(0,a.useState)([]),[g,h]=(0,a.useState)(""),[b,y]=(0,a.useState)(!0);(0,a.useCallback)(async()=>{e?.id&&(i((await (0,c.go)("sales",e.id)).filter(e=>!e.cancelled_at).sort((e,t)=>new Date(t.date)-new Date(e.date))),y(!1))},[e?.id]);let f=(0,a.useMemo)(()=>{let e={};for(let i of t){let t=i.session_id||i.sale_batch_id||i.id;e[t]||(e[t]={key:t,date:i.date,store:i.store||"",client_name:i.client_name||"",items:[]}),e[t].items.push(i)}return Object.values(e).sort((e,t)=>new Date(t.date)-new Date(e.date))},[t]),v=(0,a.useMemo)(()=>{let e=g.toLowerCase();return f.filter(t=>t.client_name?.toLowerCase().includes(e)||t.store?.toLowerCase().includes(e)||t.items.some(t=>t.product_name?.toLowerCase().includes(e)))},[f,g]);function _(e){return e.items.reduce((e,t)=>e+Number(t.total_sale||0),0)}return(0,n.jsxs)("div",{className:"p-6",children:[n.jsx(u.mr,{title:"Bons de livraison",subtitle:`${f.length} vente${1!==f.length?"s":""} disponible${1!==f.length?"s":""}`}),(0,n.jsxs)("div",{className:"grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6",children:[n.jsx(u.Rm,{label:"Ventes disponibles",value:f.length,color:"blue",icon:s.Z}),n.jsx(u.Rm,{label:"Montant total",value:(0,m.zz)(f.reduce((e,t)=>e+_(t),0)),color:"green"}),n.jsx(u.Rm,{label:"Articles",value:f.reduce((e,t)=>e+t.items.length,0),color:"amber"})]}),(0,n.jsxs)("div",{className:"card overflow-hidden",children:[n.jsx("div",{className:"flex items-center gap-3 px-5 py-4 border-b border-gray-100",children:n.jsx("div",{className:"flex-1 max-w-xs",children:n.jsx(u.E1,{value:g,onChange:h,placeholder:"Client, produit, magasin…"})})}),b?n.jsx("div",{className:"p-10 text-center text-gray-400 text-sm",children:"Chargement…"}):0===v.length?n.jsx(u.ub,{icon:o.Z,title:"Aucune vente trouv\xe9e",description:"Les bons de livraison se g\xe9n\xe8rent \xe0 partir des ventes enregistr\xe9es."}):n.jsx("div",{className:"divide-y divide-gray-50",children:v.map(t=>n.jsx("div",{className:"px-5 py-4 hover:bg-gray-50 transition-colors",children:(0,n.jsxs)("div",{className:"flex items-start gap-4",children:[n.jsx("div",{className:"w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-none",children:n.jsx(s.Z,{className:"w-5 h-5"})}),(0,n.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,n.jsxs)("div",{className:"flex items-center gap-2 flex-wrap",children:[n.jsx("p",{className:"font-semibold text-gray-900",children:t.client_name||"Client non renseign\xe9"}),(0,n.jsxs)(u.Ct,{color:"blue",children:[t.items.length," ligne",t.items.length>1?"s":""]})]}),(0,n.jsxs)("p",{className:"text-xs text-gray-400 mt-0.5",children:[(0,l.WU)(new Date(t.date),"dd MMM yyyy",{locale:d.fr}),t.store?` \xb7 ${t.store}`:""]}),n.jsx("div",{className:"mt-2 text-sm text-gray-600",children:t.items.map(e=>e.product_name).filter(Boolean).join(", ")})]}),(0,n.jsxs)("div",{className:"text-right",children:[n.jsx("p",{className:"font-bold text-gray-900",children:(0,m.zz)(_(t))}),n.jsx(u.un,{size:"sm",variant:"secondary",icon:r.Z,onClick:()=>{(0,x.EV)({shop:e,type:"bon_livraison",saleGroup:t,invoiceNumber:`BL-${String(t.date).replaceAll("-","")}-${String(t.key).slice(0,4).toUpperCase()}`})},className:"mt-2",children:"Imprimer"})]})]})},t.key))})]})]})}},61409:(e,t,i)=>{"use strict";i.d(t,{EV:()=>r,Vv:()=>o,iZ:()=>l});var n=i(99692),a=i(61468),s=i(44573);function o({shop:e,invoiceNumber:t,formValues:i,items:o,grandTotal:r,type:l="facture"}){let d=i.date?(0,n.WU)(new Date(i.date),"dd MMMM yyyy",{locale:a.fr}):"—",p=i.city||e?.city||"Niamey",c=e?.color_primary||"#1a56db",m="proforma"===l,x="bon_livraison"===l,u="bon_commande"===l,g="FACTURE DE VENTE";m&&(g="FACTURE PROFORMA"),x&&(g="BON DE LIVRAISON"),u&&(g="BON DE COMMANDE");let h=o.map((e,t)=>`
    <tr style="background:${t%2==0?"#f9fafb":"#fff"}">
      <td style="padding:8px 12px">${e.designation||"—"}</td>
      <td style="padding:8px 12px;text-align:center">${e.quantity}</td>
      <td style="padding:8px 12px;text-align:center">${e.unit||"Pi\xe8ces"}</td>
      ${x||u?"":`
      <td style="padding:8px 12px;text-align:right">${(0,s.zz)(e.unit_price)}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600">${(0,s.zz)(e.total_price)}</td>
      `}
    </tr>
  `).join(""),b=i.client_name||i.client_address||i.client_phone?`<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
        ${i.client_name?`<div><span style="color:#6b7280">${m||x?"DESTINATAIRE":"CLIENT"} : </span><strong>${i.client_name}</strong></div>`:""}
        ${i.client_address?`<div><span style="color:#6b7280">ADRESSE : </span>${i.client_address}</div>`:""}
        ${i.client_phone?`<div><span style="color:#6b7280">T\xe9l : </span>${i.client_phone}</div>`:""}
      </div>`:"",y=x||u?"":`
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Unitaire</th>
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Total</th>
  `,f=x||u?"":`
    <tfoot>
      <tr style="background:${c};color:white">
        <td colspan="3" style="padding:8px 12px;font-weight:700;text-align:right">MONTANT TOTAL</td>
        <td style="padding:8px 12px;font-weight:700;text-align:right">${(0,s.zz)(r)}</td>
      </tr>
    </tfoot>
  `,v=x||u?"":`<p style="color:#4b5563;font-style:italic;margin-bottom:32px">${(0,s.RQ)(r)}</p>`,_=m?`<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:24px;color:#b45309;font-size:13px">
        ⚠ Ce document est un devis / proforma et ne constitue pas une facture d\xe9finitive.
      </div>`:"",$=m&&i.validity?`<p style="color:#6b7280;font-size:12px;margin-top:4px">Validit\xe9 : ${i.validity}</p>`:"",w=e?.signature_url||e?.cachet_url?`<div style="text-align:right;margin-top:48px">
        <p style="color:#4b5563;margin-bottom:8px">Signature</p>
        ${e.signature_url?`<img src="${e.signature_url}" alt="Signature" style="height:56px;object-fit:contain;display:block;margin-left:auto" />`:""}
        ${e.cachet_url?`<img src="${e.cachet_url}" alt="Cachet" style="height:56px;object-fit:contain;display:block;margin-left:auto;margin-top:8px" />`:""}
      </div>`:`<div style="margin-top:48px;text-align:right">
        <p style="color:#4b5563">Signature</p>
        <div style="height:56px"></div>
      </div>`,j=[e?.phone&&`T\xe9l : ${e.phone}`,e?.whatsapp&&`WhatsApp : ${e.whatsapp}`,e?.email&&`Email : ${e.email}`].filter(Boolean).join("   \xb7   ");return`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${g} N\xb0${t}</title>
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
        <h2 style="font-size:18px;font-weight:700;color:${c};margin-bottom:4px">${e?.name||""}</h2>
        ${e?.address?`<p style="color:#6b7280;font-size:12px">${e.address}</p>`:""}
        ${e?.city?`<p style="color:#6b7280;font-size:12px">${e.city}</p>`:""}
        ${e?.nif?`<p style="color:#6b7280;font-size:12px">NIF: ${e.nif}</p>`:""}
      </div>
    </div>
    <div style="text-align:right">
      <p style="color:#6b7280;font-size:12px">${p}, le ${d}</p>
      ${$}
    </div>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${c}">
      ${g} N\xb0${t}
    </h1>
  </div>

  <!-- Client -->
  ${b}

  <!-- Items table -->
  <table style="margin-bottom:16px">
    <thead>
      <tr style="background:${c};color:white">
        <th style="padding:8px 12px;text-align:left">D\xe9signation</th>
        <th style="padding:8px 12px;text-align:center;width:60px">Qt\xe9</th>
        <th style="padding:8px 12px;text-align:center;width:80px">Unit\xe9</th>
        ${y}
      </tr>
    </thead>
    <tbody>${h}</tbody>
    ${f}
  </table>

  <!-- Amount in words -->
  ${v}

  <!-- Proforma warning -->
  ${_}

  <!-- Signature -->
  ${w}

  <!-- Footer -->
  ${j?`
  <div style="margin-top:48px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:10px">
    ${j}
  </div>`:""}
</body>
</html>`}function r({shop:e,type:t,saleGroup:i,invoiceNumber:n}){let a={date:i.date,city:e?.city||"",client_name:i.client_name||"",client_address:"",client_phone:"",validity:"30 jours"},s=i.items.map(e=>({id:e.id,designation:e.product_name,quantity:e.quantity,unit:e.unit||"Pi\xe8ces",unit_price:e.unit_sale_price||0,total_price:e.total_sale||0})),r=s.reduce((e,t)=>e+t.total_price,0),l=o({shop:e,invoiceNumber:n||`VTE-${i.date}`,formValues:a,items:s,grandTotal:r,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(l),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}function l({shop:e,type:t,purchase:i,invoiceNumber:n}){let a={date:i.date,city:e?.city||"",client_name:i.supplier||"",client_address:"",client_phone:""},s=[{id:i.id,designation:i.product_name,quantity:i.quantity,unit:"Pi\xe8ces",unit_price:i.unit_price||0,total_price:i.total_amount||0}],r=i.total_amount||0,l=o({shop:e,invoiceNumber:n||`ACH-${i.date}`,formValues:a,items:s,grandTotal:r,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(l),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}},10088:(e,t,i)=>{"use strict";i.d(t,{Z:()=>n});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,i(8341).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},24459:(e,t,i)=>{"use strict";i.d(t,{Z:()=>n});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,i(8341).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},16616:(e,t,i)=>{"use strict";i.r(t),i.d(t,{$$typeof:()=>o,__esModule:()=>s,default:()=>r});var n=i(90506);let a=(0,n.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\bons-livraison\page.jsx`),{__esModule:s,$$typeof:o}=a;a.default;let r=(0,n.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\bons-livraison\page.jsx#default`)}};var t=require("../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),n=t.X(0,[228,916,294,617,487,179,163,719,363],()=>i(69813));module.exports=n})();