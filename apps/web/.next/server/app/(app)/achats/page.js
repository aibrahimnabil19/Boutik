(()=>{var e={};e.id=3,e.ids=[3],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},6113:e=>{"use strict";e.exports=require("crypto")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},67699:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>n.a,__next_app__:()=>u,originalPathname:()=>p,pages:()=>c,routeModule:()=>x,tree:()=>d}),a(28295),a(7907),a(31819),a(43138);var i=a(57341),s=a(95085),r=a(81918),n=a.n(r),l=a(20192),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);a.d(t,o);let d=["",{children:["(app)",{children:["achats",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,28295)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\achats\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,7907)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\layout.jsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,43138)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\achats\\page.jsx"],p="/(app)/achats/page",u={require:a,loadChunk:()=>Promise.resolve()},x=new i.AppPageRouteModule({definition:{kind:s.x.APP_PAGE,page:"/(app)/achats/page",pathname:"/achats",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},51837:(e,t,a)=>{Promise.resolve().then(a.bind(a,44697))},44697:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>w});var i=a(72075),s=a(24334),r=a(932),n=a(47466),l=a(86235),o=a(52134),d=a(2595),c=a(60595),p=a(71638),u=a(10088),x=a(3919),m=a(99692),h=a(61468),g=a(73795),y=a(48020),b=a(44573),f=a(41258),v=a(61409),j=a(34319),N=a(13076);let _=[{key:"bon_commande",label:"Bon de commande",icon:o.Z,description:"Document de commande fournisseur"},{key:"bon_livraison",label:"Bon de r\xe9ception",icon:d.Z,description:"Confirme la r\xe9ception des marchandises"}];function w(){let e=(0,g.q)(e=>e.shop);(0,N.useRouter)(),(0,N.useSearchParams)().get("action");let[t,a]=(0,s.useState)([]),[o,d]=(0,s.useState)([]),[w,C]=(0,s.useState)([]),[$,k]=(0,s.useState)(""),[q,A]=(0,s.useState)(!1),[D,S]=(0,s.useState)(null),[P,z]=(0,s.useState)(!0),[M,Z]=(0,s.useState)(null),[E,T]=(0,s.useState)([]),[U,W]=(0,s.useState)(null),[I,O]=(0,s.useState)("paid"),[R,F]=(0,s.useState)(""),[G,B]=(0,s.useState)(!1),[L,V]=(0,s.useState)({name:"",phone:"",address:""}),{register:Q,handleSubmit:H,reset:X,watch:Y,setValue:J,control:K}=(0,r.cI)({defaultValues:{date:(0,m.WU)(new Date,"yyyy-MM-dd"),quantity:1,unit_price:""}}),ee=Number(Y("quantity")||0)*Number(Y("unit_price")||0),et=(0,s.useCallback)(async()=>{if(!e?.id)return;let[t,i,s,r]=await Promise.all([(0,y.go)("purchases",e.id),(0,y.go)("products",e.id),(0,y.go)("suppliers",e.id),(0,y.go)("sales",e.id)]);T(s),a(t.sort((e,t)=>new Date(t.date)-new Date(e.date))),d(i),C(r),z(!1)},[e?.id]);async function ea(t){t.preventDefault();let a=L.name.trim();if(!a){l.A.error("Nom du fournisseur requis.");return}let i=new Date().toISOString(),s={id:(0,n.Z)(),shop_id:e.id,name:a,phone:L.phone||"",address:L.address||"",created_at:i,updated_at:i,sync_status:"pending"};await (0,y.kL)("suppliers",s),T(e=>[...e,s].sort((e,t)=>e.name.localeCompare(t.name))),J("supplier",s.name),B(!1),V({name:"",phone:"",address:""}),l.A.success("Fournisseur ajout\xe9")}async function ei(t){let a=Number(t.quantity),i=Number(t.unit_price),s=a*i,r=E.find(e=>e.name===t.supplier)||null;if(!r){l.A.error("Choisissez un fournisseur.");return}if(!M){l.A.error("Choisissez un produit du catalogue.");return}let o="credit"===I?Math.max(0,Number(R||0)):s,d=Math.max(0,s-o),c=d>0?"credit":"paid";if("credit"===c&&!r){l.A.error("Choisissez un fournisseur pour enregistrer un achat \xe0 cr\xe9dit.");return}if(o>s){l.A.error("Le montant pay\xe9 ne peut pas d\xe9passer le total de l’achat.");return}let p=new Date().toISOString(),u={id:(0,n.Z)(),shop_id:e.id,date:t.date,supplier_id:r?.id||null,supplier:r.name,product_id:M.id,product_code:M.code||"",product_name:M.name,quantity:a,unit_price:i,total_amount:s,payment_status:c,paid_amount:o,remaining_amount:d,notes:t.notes||"",created_at:p,updated_at:p,sync_status:"pending"};await (0,y.kL)("purchases",u),d>0&&r&&await (0,y.kL)("supplier_transactions",{id:(0,n.Z)(),shop_id:e.id,supplier_id:r.id,date:t.date,label:`Achat \xe0 cr\xe9dit — ${u.id.slice(0,8).toUpperCase()}`,amount:d,created_at:p,updated_at:p,sync_status:"pending"}),l.A.success("Achat enregistr\xe9"),A(!1),W(u),et()}function es(){X({date:(0,m.WU)(new Date,"yyyy-MM-dd"),quantity:1}),Z(null),O("paid"),F(""),A(!0)}let er=(0,s.useMemo)(()=>t.filter(e=>e.product_name?.toLowerCase().includes($.toLowerCase())||e.supplier?.toLowerCase().includes($.toLowerCase())),[t,$]),en=(0,s.useMemo)(()=>t.reduce((e,t)=>e+(t.total_amount||0),0),[t]);return(0,i.jsxs)("div",{className:"p-6",children:[i.jsx(f.mr,{title:"Achats",subtitle:`${t.length} achat${1!==t.length?"s":""}`,action:i.jsx(f.un,{icon:c.Z,onClick:es,children:"Nouvel achat"})}),(0,i.jsxs)("div",{className:"grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6",children:[i.jsx(f.Rm,{label:"Total d\xe9pens\xe9",value:(0,b.zz)(en),color:"purple",icon:p.Z}),i.jsx(f.Rm,{label:"Nombre d'achats",value:t.length,color:"blue"}),i.jsx(f.Rm,{label:"Fournisseurs distincts",value:new Set(t.map(e=>e.supplier).filter(Boolean)).size,color:"amber"})]}),(0,i.jsxs)("div",{className:"card overflow-hidden",children:[i.jsx("div",{className:"flex items-center gap-3 px-5 py-4 border-b border-gray-100",children:i.jsx("div",{className:"flex-1 max-w-xs",children:i.jsx(f.E1,{value:$,onChange:k,placeholder:"Rechercher…"})})}),P?i.jsx("div",{className:"p-10 text-center text-gray-400 text-sm",children:"Chargement…"}):0===er.length?i.jsx(f.ub,{icon:p.Z,title:"Aucun achat",description:"Enregistrez vos achats fournisseurs.",action:i.jsx(f.un,{icon:c.Z,onClick:es,children:"Nouvel achat"})}):i.jsx("div",{className:"overflow-x-auto",children:(0,i.jsxs)("table",{className:"w-full text-sm",children:[i.jsx("thead",{children:i.jsx("tr",{className:"border-b border-gray-100 bg-gray-50",children:["Date","Fournisseur","Produit","Quantit\xe9","Prix unit.","Total",""].map(e=>i.jsx("th",{className:"text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap",children:e},e))})}),i.jsx("tbody",{className:"divide-y divide-gray-50",children:er.map(e=>(0,i.jsxs)("tr",{className:"hover:bg-gray-50 transition-colors cursor-pointer",onClick:()=>W(e),children:[i.jsx("td",{className:"px-4 py-3 text-gray-500 whitespace-nowrap",children:(0,m.WU)(new Date(e.date),"dd MMM yy",{locale:h.fr})}),i.jsx("td",{className:"px-4 py-3 font-medium text-gray-800",children:e.supplier||"—"}),(0,i.jsxs)("td",{className:"px-4 py-3",children:[i.jsx("p",{className:"text-gray-900 max-w-[200px] truncate",children:e.product_name}),e.product_code&&i.jsx("p",{className:"text-xs text-gray-400",children:e.product_code})]}),i.jsx("td",{className:"px-4 py-3 text-gray-700",children:e.quantity}),i.jsx("td",{className:"px-4 py-3 text-gray-600",children:(0,b.zz)(e.unit_price)}),i.jsx("td",{className:"px-4 py-3 font-bold text-gray-900",children:(0,b.zz)(e.total_amount)}),i.jsx("td",{className:"px-4 py-3",onClick:e=>e.stopPropagation(),children:(0,i.jsxs)("div",{className:"flex gap-1",children:[i.jsx("button",{onClick:()=>W(e),className:"p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors",title:"Imprimer document",children:i.jsx(u.Z,{className:"w-3.5 h-3.5"})}),i.jsx("button",{onClick:()=>S(e.id),className:"p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors",children:i.jsx(x.Z,{className:"w-3.5 h-3.5"})})]})})]},e.id))})]})})]}),i.jsx(f.u_,{open:!!U,onClose:()=>W(null),title:"Imprimer un document",maxW:"max-w-sm",children:(0,i.jsxs)("div",{className:"space-y-3",children:[i.jsx("p",{className:"text-sm text-gray-500 mb-4",children:"Choisissez le type de document \xe0 g\xe9n\xe9rer pour cet achat."}),U&&_.map(t=>{let a=t.icon;return(0,i.jsxs)("button",{onClick:()=>{var a;return a=t.key,void((0,v.iZ)({shop:e,type:a,purchase:U,invoiceNumber:`ACH-${U.date}-${U.id.slice(0,4).toUpperCase()}`}),W(null))},className:"w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group",children:[i.jsx("div",{className:"w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-none transition-colors",children:i.jsx(a,{className:"w-5 h-5 text-blue-600"})}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"font-semibold text-gray-900",children:t.label}),i.jsx("p",{className:"text-xs text-gray-400",children:t.description})]}),i.jsx(u.Z,{className:"w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors"})]},t.key)}),i.jsx("div",{className:"pt-2",children:i.jsx(f.un,{variant:"secondary",onClick:()=>W(null),className:"w-full",children:"Fermer"})})]})}),i.jsx(f.u_,{open:q,onClose:()=>A(!1),title:"Nouvel achat",maxW:"max-w-lg",children:(0,i.jsxs)("form",{onSubmit:H(ei),className:"space-y-4",children:[(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(f.Wi,{label:"Date",required:!0,children:i.jsx("input",{...Q("date",{required:!0}),type:"date",className:f.Gn})}),i.jsx(f.Wi,{label:"Fournisseur",required:!0,children:(0,i.jsxs)("div",{className:"flex gap-2",children:[(0,i.jsxs)("select",{...Q("supplier",{required:!0}),className:f.ZO,required:!0,children:[i.jsx("option",{value:"",children:"— Choisir un fournisseur —"}),E.map(e=>i.jsx("option",{value:e.name,children:e.name},e.id))]}),i.jsx("button",{type:"button",onClick:()=>B(!0),className:"h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition",title:"Ajouter un fournisseur",children:i.jsx(c.Z,{className:"w-4 h-4"})})]})})]}),i.jsx(f.Wi,{label:"Produit du catalogue",required:!0,children:(0,i.jsxs)("select",{onChange:function(e){let t=o.find(t=>t.id===e.target.value);Z(t||null),t&&(J("unit_price",t.purchase_price||""),J("supplier",t.supplier||""))},className:f.ZO,value:M?.id||"",required:!0,children:[i.jsx("option",{value:"",children:"— Choisir un produit —"}),o.map(e=>(0,i.jsxs)("option",{value:e.id,children:[e.name," ",e.code?`(${e.code})`:""]},e.id))]})}),M&&(0,i.jsxs)("div",{className:"rounded-xl border border-blue-100 bg-blue-50 p-4 grid sm:grid-cols-3 gap-3",children:[(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"ID du produit"}),i.jsx("p",{className:"font-mono text-xs text-blue-900 break-all",children:M.id})]}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"Code produit"}),i.jsx("p",{className:"font-mono text-sm font-bold text-blue-900",children:M.code||"—"})]}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"Stock restant actuel"}),i.jsx("p",{className:"text-lg font-bold text-blue-900",children:(0,b.uf)((0,b.oC)(M,t,w))})]})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(f.Wi,{label:"Quantit\xe9",required:!0,children:i.jsx(r.Qr,{name:"quantity",control:K,rules:{required:!0},render:({field:e})=>i.jsx(j.Z,{value:e.value,onChange:e.onChange,onBlur:e.onBlur,required:!0,className:f.Gn})})}),i.jsx(f.Wi,{label:"Prix unitaire (FCFA)",required:!0,children:i.jsx(r.Qr,{name:"unit_price",control:K,rules:{required:!0},render:({field:e})=>i.jsx(j.Z,{value:e.value,onChange:e.onChange,onBlur:e.onBlur,placeholder:"0",required:!0,className:f.Gn})})})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(f.Wi,{label:"Paiement",children:(0,i.jsxs)("select",{value:I,onChange:e=>O(e.target.value),className:f.ZO,children:[i.jsx("option",{value:"paid",children:"Pay\xe9 comptant"}),i.jsx("option",{value:"credit",children:"Achat \xe0 cr\xe9dit"})]})}),"credit"===I&&i.jsx(f.Wi,{label:"Montant pay\xe9",children:i.jsx(j.Z,{value:R,onChange:F,placeholder:"0",className:f.Gn})})]}),ee>0&&(0,i.jsxs)("div",{className:"rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between",children:[i.jsx("span",{className:"text-sm text-blue-700 font-medium",children:"Montant total"}),(0,i.jsxs)("div",{className:"text-right",children:[i.jsx("span",{className:"font-bold text-blue-800 block",children:(0,b.zz)(ee)}),"credit"===I&&(0,i.jsxs)("span",{className:"text-xs text-amber-700",children:["Reste : ",(0,b.zz)(Math.max(0,ee-Number(R||0)))]})]})]}),i.jsx(f.Wi,{label:"Notes",children:i.jsx("input",{...Q("notes"),placeholder:"Optionnel",className:f.Gn})}),(0,i.jsxs)("div",{className:"flex gap-3 justify-end pt-2",children:[i.jsx(f.un,{variant:"secondary",onClick:()=>A(!1),children:"Annuler"}),i.jsx(f.un,{type:"submit",children:"Enregistrer"})]})]})}),i.jsx(f.u_,{open:G,onClose:()=>B(!1),title:"Nouveau fournisseur",maxW:"max-w-md",children:(0,i.jsxs)("form",{onSubmit:ea,className:"space-y-4",children:[i.jsx(f.Wi,{label:"Nom du fournisseur",required:!0,children:i.jsx("input",{value:L.name,onChange:e=>V(t=>({...t,name:e.target.value})),placeholder:"Ex: Fournisseur principal",className:f.Gn,required:!0})}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(f.Wi,{label:"T\xe9l\xe9phone",children:i.jsx(j.Z,{value:L.phone,onChange:e=>V(t=>({...t,phone:e})),placeholder:"96 87 75 88",className:f.Gn})}),i.jsx(f.Wi,{label:"Adresse",children:i.jsx("input",{value:L.address,onChange:e=>V(t=>({...t,address:e.target.value})),placeholder:"Ex: Niamey",className:f.Gn})})]}),(0,i.jsxs)("div",{className:"flex gap-3 justify-end pt-2",children:[i.jsx(f.un,{variant:"secondary",onClick:()=>B(!1),children:"Annuler"}),i.jsx(f.un,{type:"submit",children:"Ajouter"})]})]})}),i.jsx(f.QH,{open:!!D,onClose:()=>S(null),onConfirm:()=>{(0,y.hD)("purchases",D),et(),l.A.success("Achat supprim\xe9")},title:"Supprimer l'achat",message:"\xcates-vous s\xfbr ?"})]})}},34319:(e,t,a)=>{"use strict";a.d(t,{Z:()=>n});var i=a(72075),s=a(24334),r=a.n(s);function n({value:e,onChange:t,onBlur:a,placeholder:s,required:n,className:l,disabled:o}){let d=e=>{if(""===e||null==e)return"";let[t,a]=String(e).split("."),i=t.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");return void 0!==a?`${i},${a}`:i},[c,p]=r().useState(()=>d(e)),u=r().useRef(e);return i.jsx("input",{type:"text",inputMode:"decimal",value:c,onChange:e=>{let a,i;let s=e.target.value.replace(/[\s\u00a0]/g,""),r=s.indexOf(",");r>=0?(a=s.slice(0,r).replace(/\D/g,""),i=s.slice(r+1).replace(/\D/g,"")):(a=s.replace(/\D/g,""),i=null);let n=a.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");p(null!==i?`${n},${i}`:n);let l=null!==i?`${a}.${i}`:a;u.current=l,t(l)},onBlur:a,placeholder:s,required:n,disabled:o,className:l})}},61409:(e,t,a)=>{"use strict";a.d(t,{EV:()=>l,Vv:()=>n,iZ:()=>o});var i=a(99692),s=a(61468),r=a(44573);function n({shop:e,invoiceNumber:t,formValues:a,items:n,grandTotal:l,type:o="facture"}){let d=a.date?(0,i.WU)(new Date(a.date),"dd MMMM yyyy",{locale:s.fr}):"—",c=a.city||e?.city||"Niamey",p=e?.color_primary||"#1a56db",u="proforma"===o,x="bon_livraison"===o,m="bon_commande"===o,h="FACTURE DE VENTE";u&&(h="FACTURE PROFORMA"),x&&(h="BON DE LIVRAISON"),m&&(h="BON DE COMMANDE");let g=n.map((e,t)=>`
    <tr style="background:${t%2==0?"#f9fafb":"#fff"}">
      <td style="padding:8px 12px">${e.designation||"—"}</td>
      <td style="padding:8px 12px;text-align:center">${e.quantity}</td>
      <td style="padding:8px 12px;text-align:center">${e.unit||"Pi\xe8ces"}</td>
      ${x||m?"":`
      <td style="padding:8px 12px;text-align:right">${(0,r.zz)(e.unit_price)}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600">${(0,r.zz)(e.total_price)}</td>
      `}
    </tr>
  `).join(""),y=a.client_name||a.client_address||a.client_phone?`<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
        ${a.client_name?`<div><span style="color:#6b7280">${u||x?"DESTINATAIRE":"CLIENT"} : </span><strong>${a.client_name}</strong></div>`:""}
        ${a.client_address?`<div><span style="color:#6b7280">ADRESSE : </span>${a.client_address}</div>`:""}
        ${a.client_phone?`<div><span style="color:#6b7280">T\xe9l : </span>${a.client_phone}</div>`:""}
      </div>`:"",b=x||m?"":`
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Unitaire</th>
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Total</th>
  `,f=x||m?"":`
    <tfoot>
      <tr style="background:${p};color:white">
        <td colspan="3" style="padding:8px 12px;font-weight:700;text-align:right">MONTANT TOTAL</td>
        <td style="padding:8px 12px;font-weight:700;text-align:right">${(0,r.zz)(l)}</td>
      </tr>
    </tfoot>
  `,v=x||m?"":`<p style="color:#4b5563;font-style:italic;margin-bottom:32px">${(0,r.RQ)(l)}</p>`,j=u?`<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:24px;color:#b45309;font-size:13px">
        ⚠ Ce document est un devis / proforma et ne constitue pas une facture d\xe9finitive.
      </div>`:"",N=u&&a.validity?`<p style="color:#6b7280;font-size:12px;margin-top:4px">Validit\xe9 : ${a.validity}</p>`:"",_=e?.signature_url||e?.cachet_url?`<div style="text-align:right;margin-top:48px">
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
</html>`}function l({shop:e,type:t,saleGroup:a,invoiceNumber:i}){let s={date:a.date,city:e?.city||"",client_name:a.client_name||"",client_address:"",client_phone:"",validity:"30 jours"},r=a.items.map(e=>({id:e.id,designation:e.product_name,quantity:e.quantity,unit:e.unit||"Pi\xe8ces",unit_price:e.unit_sale_price||0,total_price:e.total_sale||0})),l=r.reduce((e,t)=>e+t.total_price,0),o=n({shop:e,invoiceNumber:i||`VTE-${a.date}`,formValues:s,items:r,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}function o({shop:e,type:t,purchase:a,invoiceNumber:i}){let s={date:a.date,city:e?.city||"",client_name:a.supplier||"",client_address:"",client_phone:""},r=[{id:a.id,designation:a.product_name,quantity:a.quantity,unit:"Pi\xe8ces",unit_price:a.unit_price||0,total_price:a.total_amount||0}],l=a.total_amount||0,o=n({shop:e,invoiceNumber:i||`ACH-${a.date}`,formValues:s,items:r,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}},60595:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},10088:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},24459:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},3919:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},47466:(e,t,a)=>{"use strict";a.d(t,{Z:()=>d});var i=a(6113),s=a.n(i);let r={randomUUID:s().randomUUID},n=new Uint8Array(256),l=n.length,o=[];for(let e=0;e<256;++e)o.push((e+256).toString(16).slice(1));let d=function(e,t,a){if(r.randomUUID&&!t&&!e)return r.randomUUID();let i=(e=e||{}).random||(e.rng||function(){return l>n.length-16&&(s().randomFillSync(n),l=0),n.slice(l,l+=16)})();if(i[6]=15&i[6]|64,i[8]=63&i[8]|128,t){a=a||0;for(let e=0;e<16;++e)t[a+e]=i[e];return t}return function(e,t=0){return o[e[t+0]]+o[e[t+1]]+o[e[t+2]]+o[e[t+3]]+"-"+o[e[t+4]]+o[e[t+5]]+"-"+o[e[t+6]]+o[e[t+7]]+"-"+o[e[t+8]]+o[e[t+9]]+"-"+o[e[t+10]]+o[e[t+11]]+o[e[t+12]]+o[e[t+13]]+o[e[t+14]]+o[e[t+15]]}(i)}},28295:(e,t,a)=>{"use strict";a.r(t),a.d(t,{$$typeof:()=>n,__esModule:()=>r,default:()=>l});var i=a(90506);let s=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\achats\page.jsx`),{__esModule:r,$$typeof:n}=s;s.default;let l=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\achats\page.jsx#default`)}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),i=t.X(0,[228,916,294,617,487,798,163,932,719,363],()=>a(67699));module.exports=i})();