(()=>{var e={};e.id=3,e.ids=[3],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},6113:e=>{"use strict";e.exports=require("crypto")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},67699:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>n.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>c,routeModule:()=>m,tree:()=>d}),a(28295),a(7907),a(31819),a(88045);var i=a(57341),r=a(95085),s=a(81918),n=a.n(s),l=a(20192),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);a.d(t,o);let d=["",{children:["(app)",{children:["achats",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,28295)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\achats\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,7907)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\layout.jsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,88045)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\achats\\page.jsx"],u="/(app)/achats/page",p={require:a,loadChunk:()=>Promise.resolve()},m=new i.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/(app)/achats/page",pathname:"/achats",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},51837:(e,t,a)=>{Promise.resolve().then(a.bind(a,44697))},44697:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>A});var i=a(72075),r=a(24334),s=a(932),n=a(47466),l=a(86235),o=a(52134),d=a(2595),c=a(60595),u=a(71638),p=a(10088),m=a(25244),x=a(3919),h=a(63906),g=a(61468),b=a(73795),f=a(48020),y=a(44573),v=a(41258),j=a(61409),N=a(34319),w=a(98611),_=a(13076),C=a(28929),k=a(24396);let $=[{key:"bon_commande",label:"Bon de commande",icon:o.Z,description:"Document de commande fournisseur"},{key:"bon_livraison",label:"Bon de r\xe9ception",icon:d.Z,description:"Confirme la r\xe9ception des marchandises"}];function A(){let e=(0,b.q)(e=>e.shop);(0,_.useRouter)(),(0,_.useSearchParams)().get("action");let[t,a]=(0,r.useState)([]),[o,d]=(0,r.useState)([]),[A,q]=(0,r.useState)([]),[S,D]=(0,r.useState)(""),[E,z]=(0,r.useState)(!1),[P,M]=(0,r.useState)(null),[Z,T]=(0,r.useState)(!0),[U,W]=(0,r.useState)(null),[F,I]=(0,r.useState)([]),[R,O]=(0,r.useState)(null),[L,G]=(0,r.useState)(""),[B,V]=(0,r.useState)(""),[H,Q]=(0,r.useState)(!1),[J,K]=(0,r.useState)({name:"",phone:"",address:""}),[X,Y]=(0,r.useState)(null),[ee,et]=(0,r.useState)(""),[ea,ei]=(0,r.useState)((0,k.mD)()),{register:er,handleSubmit:es,reset:en,watch:el,setValue:eo,control:ed}=(0,s.cI)({defaultValues:{date:(0,h.WU)(new Date,"yyyy-MM-dd"),quantity:1,unit_price:""}}),ec=Number(el("quantity")||0)*Number(el("unit_price")||0),eu=(0,r.useCallback)(async()=>{if(!e?.id)return;let[t,i,r,s]=await Promise.all([(0,f.go)("purchases",e.id),(0,f.go)("products",e.id),(0,f.go)("suppliers",e.id),(0,f.go)("sales",e.id)]);I(r),a(t.sort((e,t)=>new Date(t.date)-new Date(e.date))),d(i),q(s),T(!1)},[e?.id]);async function ep(t){if(t.preventDefault(),!X)return;let a=Number(ee||0),i=Number(X.remaining_amount||0);if(a<=0){l.A.error("Montant invalide.");return}if(a>i){l.A.error("Le paiement d\xe9passe le reste \xe0 payer.");return}let r=new Date().toISOString(),s=i-a,o=Number(X.paid_amount||0)+a;await (0,f.kL)("purchases",{...X,paid_amount:o,remaining_amount:s,payment_status:s<=0?"paid":"credit",updated_at:r,sync_status:"pending"}),X.supplier_id&&await (0,f.kL)("supplier_transactions",{id:(0,n.Z)(),shop_id:e.id,supplier_id:X.supplier_id,date:(0,h.WU)(new Date,"yyyy-MM-dd"),label:`Paiement fournisseur — ${X.id.slice(0,8).toUpperCase()}`,amount:-a,created_at:r,updated_at:r,sync_status:"pending"}),l.A.success("Paiement fournisseur enregistr\xe9"),Y(null),et(""),await eu()}async function em(t){t.preventDefault();let a=J.name.trim();if(!a){l.A.error("Nom du fournisseur requis.");return}let i=new Date().toISOString(),r={id:(0,n.Z)(),shop_id:e.id,name:a,phone:J.phone||"",address:J.address||"",created_at:i,updated_at:i,sync_status:"pending"};await (0,f.kL)("suppliers",r),I(e=>[...e,r].sort((e,t)=>e.name.localeCompare(t.name))),eo("supplier",r.name),Q(!1),K({name:"",phone:"",address:""}),l.A.success("Fournisseur ajout\xe9")}async function ex(t){if(!L){l.A.error("Choisissez le mode de paiement.");return}let a=Number(t.quantity),i=Number(t.unit_price),r=a*i,s=F.find(e=>e.name===t.supplier)||null;if(!s){l.A.error("Choisissez un fournisseur.");return}if(!U){l.A.error("Choisissez un produit du catalogue.");return}let o="credit"===L?Math.max(0,Number(B||0)):r,d=Math.max(0,r-o),c=d>0?"credit":"paid";if("credit"===c&&!s){l.A.error("Choisissez un fournisseur pour enregistrer un Entr\xe9e de stock \xe0 cr\xe9dit.");return}if(o>r){l.A.error("Le montant pay\xe9 ne peut pas d\xe9passer le total de l’achat.");return}let u=new Date().toISOString(),p={id:(0,n.Z)(),shop_id:e.id,date:t.date,supplier_id:s?.id||null,supplier:s.name,product_id:U.id,product_code:U.code||"",product_name:U.name,quantity:a,unit_price:i,total_amount:r,payment_status:c,paid_amount:o,remaining_amount:d,notes:t.notes||"",created_at:u,updated_at:u,sync_status:"pending"};await (0,f.kL)("purchases",p),d>0&&s&&await (0,f.kL)("supplier_transactions",{id:(0,n.Z)(),shop_id:e.id,supplier_id:s.id,date:t.date,label:`Entr\xe9e de stock \xe0 cr\xe9dit — ${p.id.slice(0,8).toUpperCase()}`,amount:d,created_at:u,updated_at:u,sync_status:"pending"}),l.A.success("Entr\xe9e de stock enregistr\xe9e"),z(!1),O(p),eu()}function eh(){en({date:(0,h.WU)(new Date,"yyyy-MM-dd"),quantity:1}),W(null),G(""),V(""),z(!0)}let eg=(0,r.useMemo)(()=>{let e=S.toLowerCase().trim();return t.filter(t=>(!e||t.product_name?.toLowerCase().includes(e)||t.product_code?.toLowerCase().includes(e)||t.supplier?.toLowerCase().includes(e))&&(0,k.JI)(t.date,ea))},[t,S,ea]),eb=(0,r.useMemo)(()=>eg.reduce((e,t)=>e+Number(t.total_amount||0),0),[eg]);return(0,i.jsxs)("div",{className:"p-6",children:[i.jsx(v.mr,{action:i.jsx(v.un,{icon:c.Z,onClick:eh,children:"Nouvelle entr\xe9e"}),subtitle:`${t.length} achat${1!==t.length?"s":""}`}),(0,i.jsxs)("div",{className:"grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6",children:[i.jsx(v.Rm,{label:"Total d\xe9pens\xe9",value:(0,y.zz)(eb),color:"purple",icon:u.Z}),i.jsx(v.Rm,{label:"Nombre d'entr\xe9es",value:t.length,color:"blue"}),i.jsx(v.Rm,{label:"Fournisseurs distincts",value:new Set(t.map(e=>e.supplier).filter(Boolean)).size,color:"amber"})]}),(0,i.jsxs)("div",{className:"card overflow-hidden",children:[(0,i.jsxs)("div",{className:"flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100",children:[i.jsx("div",{className:"flex-1 min-w-[220px] max-w-xs",children:i.jsx(v.E1,{value:S,onChange:D,placeholder:"Produit, code, fournisseur…"})}),i.jsx(C.Z,{value:ea,onChange:ei})]}),Z?i.jsx("div",{className:"p-10 text-center text-gray-400 text-sm",children:"Chargement…"}):0===eg.length?i.jsx(v.ub,{icon:u.Z,title:"Aucun achat",description:"Enregistrez vos achats fournisseurs.",action:i.jsx(v.un,{icon:c.Z,onClick:eh,children:"Nouvel achat"})}):i.jsx("div",{className:"overflow-x-auto",children:(0,i.jsxs)("table",{className:"w-full text-sm",children:[i.jsx("thead",{children:i.jsx("tr",{className:"border-b border-gray-100 bg-gray-50",children:["Date","Fournisseur","Produit","Quantit\xe9","Prix unit.","Total",""].map(e=>i.jsx("th",{className:"text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap",children:e},e))})}),i.jsx("tbody",{className:"divide-y divide-gray-50",children:eg.map(e=>(0,i.jsxs)("tr",{className:"hover:bg-gray-50 transition-colors cursor-pointer",onClick:()=>O(e),children:[(0,i.jsxs)("td",{className:"px-4 py-3 text-gray-500 whitespace-nowrap",children:[(0,h.WU)(new Date(e.date),"dd MMM yy",{locale:g.fr}),e.created_at&&i.jsx("span",{className:"block text-[11px] text-gray-400",children:(0,h.WU)(new Date(e.created_at),"HH:mm",{locale:g.fr})})]}),i.jsx("td",{className:"px-4 py-3 font-medium text-gray-800",children:e.supplier||"—"}),(0,i.jsxs)("td",{className:"px-4 py-3",children:[i.jsx("p",{className:"text-gray-900 max-w-[200px] truncate",children:e.product_name}),e.product_code&&i.jsx("p",{className:"text-xs text-gray-400",children:e.product_code})]}),i.jsx("td",{className:"px-4 py-3 text-gray-700",children:e.quantity}),i.jsx("td",{className:"px-4 py-3 text-gray-600",children:(0,y.zz)(e.unit_price)}),i.jsx("td",{className:"px-4 py-3 font-bold text-gray-900",children:(0,y.zz)(e.total_amount)}),i.jsx("td",{className:"px-4 py-3",onClick:e=>e.stopPropagation(),children:(0,i.jsxs)("div",{className:"flex gap-1",children:[i.jsx("button",{onClick:()=>O(e),className:"p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors",title:"Imprimer document",children:i.jsx(p.Z,{className:"w-3.5 h-3.5"})}),i.jsx("button",{onClick:t=>{t.stopPropagation(),!e||0>=Number(e.remaining_amount||0)||(Y(e),et(""))},disabled:0>=Number(e.remaining_amount||0),className:"p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",title:"Payer le cr\xe9dit",children:i.jsx(m.Z,{className:"w-3.5 h-3.5"})}),i.jsx("button",{onClick:()=>M(e.id),className:"p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors",children:i.jsx(x.Z,{className:"w-3.5 h-3.5"})})]})})]},e.id))})]})})]}),i.jsx(v.u_,{open:!!R,onClose:()=>O(null),title:"Imprimer un document",maxW:"max-w-sm",children:(0,i.jsxs)("div",{className:"space-y-3",children:[i.jsx("p",{className:"text-sm text-gray-500 mb-4",children:"Choisissez le type de document \xe0 g\xe9n\xe9rer pour cet achat."}),R&&$.map(t=>{let a=t.icon;return(0,i.jsxs)("button",{onClick:()=>{var a;return a=t.key,void((0,j.iZ)({shop:e,type:a,purchase:R,invoiceNumber:`ACH-${R.date}-${R.id.slice(0,4).toUpperCase()}`}),O(null))},className:"w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group",children:[i.jsx("div",{className:"w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-none transition-colors",children:i.jsx(a,{className:"w-5 h-5 text-blue-600"})}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"font-semibold text-gray-900",children:t.label}),i.jsx("p",{className:"text-xs text-gray-400",children:t.description})]}),i.jsx(p.Z,{className:"w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors"})]},t.key)}),i.jsx("div",{className:"pt-2",children:i.jsx(v.un,{variant:"secondary",onClick:()=>O(null),className:"w-full",children:"Fermer"})})]})}),i.jsx(v.u_,{open:E,onClose:()=>z(!1),title:"Nouvelle entr\xe9e de stock",maxW:"max-w-lg",children:(0,i.jsxs)("form",{onSubmit:es(ex),className:"space-y-4",children:[(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(v.Wi,{label:"Date",required:!0,children:i.jsx("input",{...er("date",{required:!0}),type:"date",className:v.Gn})}),i.jsx(v.Wi,{label:"Fournisseur",required:!0,children:(0,i.jsxs)("div",{className:"flex gap-2",children:[(0,i.jsxs)("select",{...er("supplier",{required:!0}),className:v.ZO,required:!0,children:[i.jsx("option",{value:"",children:"— Choisir un fournisseur —"}),F.map(e=>i.jsx("option",{value:e.name,children:e.name},e.id))]}),i.jsx("button",{type:"button",onClick:()=>Q(!0),className:"h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition",title:"Ajouter un fournisseur",children:i.jsx(c.Z,{className:"w-4 h-4"})})]})})]}),i.jsx(v.Wi,{label:"Produit du catalogue",required:!0,children:(0,i.jsxs)("select",{onChange:function(e){let t=o.find(t=>t.id===e.target.value);W(t||null),t&&(eo("unit_price",t.purchase_price||""),eo("supplier",t.supplier||""))},className:v.ZO,value:U?.id||"",required:!0,children:[i.jsx("option",{value:"",children:"— Choisir un produit —"}),o.map(e=>(0,i.jsxs)("option",{value:e.id,children:[e.name," ",e.code?`(${e.code})`:""]},e.id))]})}),U&&(0,i.jsxs)("div",{className:"rounded-xl border border-blue-100 bg-blue-50 p-4 grid sm:grid-cols-3 gap-3",children:[(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"ID du produit"}),i.jsx("p",{className:"font-mono text-xs text-blue-900 break-all",children:U.id})]}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"Code produit"}),i.jsx("p",{className:"font-mono text-sm font-bold text-blue-900",children:U.code||"—"})]}),(0,i.jsxs)("div",{children:[i.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-blue-500",children:"Stock restant actuel"}),i.jsx("p",{className:"text-lg font-bold text-blue-900",children:(0,y.uf)((0,y.oC)(U,t,A))})]})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(v.Wi,{label:"Quantit\xe9",required:!0,children:i.jsx(s.Qr,{name:"quantity",control:ed,rules:{required:!0},render:({field:e})=>i.jsx(N.Z,{value:e.value,onChange:e.onChange,onBlur:e.onBlur,required:!0,className:v.Gn})})}),i.jsx(v.Wi,{label:"Prix unitaire (FCFA)",required:!0,children:i.jsx(s.Qr,{name:"unit_price",control:ed,rules:{required:!0},render:({field:e})=>i.jsx(N.Z,{value:e.value,onChange:e.onChange,onBlur:e.onBlur,placeholder:"0",required:!0,className:v.Gn})})})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(v.Wi,{label:"Paiement",required:!0,children:(0,i.jsxs)("select",{value:L,onChange:e=>G(e.target.value),className:v.ZO,required:!0,children:[i.jsx("option",{value:"",children:"— Choisir le mode de paiement —"}),i.jsx("option",{value:"paid",children:"Pay\xe9 comptant"}),i.jsx("option",{value:"credit",children:"Entr\xe9e de stock \xe0 cr\xe9dit"})]})}),"credit"===L&&i.jsx(v.Wi,{label:"Montant pay\xe9",children:i.jsx(N.Z,{value:B,onChange:V,placeholder:"0",className:v.Gn})})]}),ec>0&&(0,i.jsxs)("div",{className:"rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between",children:[i.jsx("span",{className:"text-sm text-blue-700 font-medium",children:"Montant total"}),(0,i.jsxs)("div",{className:"text-right",children:[i.jsx("span",{className:"font-bold text-blue-800 block",children:(0,y.zz)(ec)}),"credit"===L&&(0,i.jsxs)("span",{className:"text-xs text-amber-700",children:["Reste : ",(0,y.zz)(Math.max(0,ec-Number(B||0)))]})]})]}),i.jsx(v.Wi,{label:"Notes",children:i.jsx("input",{...er("notes"),placeholder:"Optionnel",className:v.Gn})}),(0,i.jsxs)("div",{className:"flex gap-3 justify-end pt-2",children:[i.jsx(v.un,{variant:"secondary",onClick:()=>z(!1),children:"Annuler"}),i.jsx(v.un,{type:"submit",children:"Enregistrer"})]})]})}),i.jsx(v.u_,{open:H,onClose:()=>Q(!1),title:"Nouveau fournisseur",maxW:"max-w-md",children:(0,i.jsxs)("form",{onSubmit:em,className:"space-y-4",children:[i.jsx(v.Wi,{label:"Nom du fournisseur",required:!0,children:i.jsx("input",{value:J.name,onChange:e=>K(t=>({...t,name:e.target.value})),placeholder:"Ex: Fournisseur principal",className:v.Gn,required:!0})}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[i.jsx(v.Wi,{label:"T\xe9l\xe9phone",children:i.jsx(w.Z,{value:J.phone,onChange:e=>K(t=>({...t,phone:e})),placeholder:"99 12 34 56",className:v.Gn})}),i.jsx(v.Wi,{label:"Adresse",children:i.jsx("input",{value:J.address,onChange:e=>K(t=>({...t,address:e.target.value})),placeholder:"Ex: Niamey",className:v.Gn})})]}),(0,i.jsxs)("div",{className:"flex gap-3 justify-end pt-2",children:[i.jsx(v.un,{variant:"secondary",onClick:()=>Q(!1),children:"Annuler"}),i.jsx(v.un,{type:"submit",children:"Ajouter"})]})]})}),i.jsx(v.u_,{open:!!X,onClose:()=>Y(null),title:"Paiement fournisseur",maxW:"max-w-md",children:X&&(0,i.jsxs)("form",{onSubmit:ep,className:"space-y-4",children:[(0,i.jsxs)("div",{className:"rounded-xl bg-amber-50 border border-amber-100 p-4",children:[i.jsx("p",{className:"text-xs text-amber-600",children:"Total entr\xe9e de stock"}),i.jsx("p",{className:"font-bold text-gray-900",children:(0,y.zz)(X.total_amount)}),i.jsx("p",{className:"text-xs text-amber-600 mt-2",children:"D\xe9j\xe0 pay\xe9"}),i.jsx("p",{className:"font-bold text-gray-900",children:(0,y.zz)(X.paid_amount)}),i.jsx("p",{className:"text-xs text-amber-600 mt-2",children:"Reste \xe0 payer"}),i.jsx("p",{className:"font-bold text-amber-700",children:(0,y.zz)(X.remaining_amount)})]}),i.jsx(v.Wi,{label:"Montant pay\xe9 maintenant",required:!0,children:i.jsx(N.Z,{value:ee,onChange:et,placeholder:"0",required:!0,className:v.Gn})}),(0,i.jsxs)("div",{className:"flex gap-3 justify-end",children:[i.jsx(v.un,{variant:"secondary",onClick:()=>Y(null),children:"Annuler"}),i.jsx(v.un,{type:"submit",children:"Enregistrer paiement"})]})]})}),i.jsx(v.QH,{open:!!P,onClose:()=>M(null),onConfirm:()=>{(0,f.hD)("purchases",P),eu(),l.A.success("Achat supprim\xe9")},title:"Supprimer l'achat",message:"\xcates-vous s\xfbr ?"})]})}},34319:(e,t,a)=>{"use strict";a.d(t,{Z:()=>n});var i=a(72075),r=a(24334),s=a.n(r);function n({value:e,onChange:t,onBlur:a,placeholder:r,required:n,className:l,disabled:o}){let d=e=>{if(""===e||null==e)return"";let[t,a]=String(e).split("."),i=t.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");return void 0!==a?`${i},${a}`:i},[c,u]=s().useState(()=>d(e)),p=s().useRef(e);return i.jsx("input",{type:"text",inputMode:"decimal",value:c,onChange:e=>{let a,i;let r=e.target.value.replace(/[\s\u00a0]/g,""),s=r.indexOf(",");s>=0?(a=r.slice(0,s).replace(/\D/g,""),i=r.slice(s+1).replace(/\D/g,"")):(a=r.replace(/\D/g,""),i=null);let n=a.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");u(null!==i?`${n},${i}`:n);let l=null!==i?`${a}.${i}`:a;p.current=l,t(l)},onBlur:a,placeholder:r,required:n,disabled:o,className:l})}},98611:(e,t,a)=>{"use strict";a.d(t,{Z:()=>l});var i=a(72075),r=a(24334),s=a.n(r);function n(e){let t=String(e||"").replace(/\D/g,"").slice(0,8);return t.match(/.{1,2}/g)?.join(" ")||""}function l({value:e,onChange:t,onBlur:a,placeholder:r="99 12 34 56",required:l,className:o,disabled:d}){let[c,u]=s().useState(()=>n(e));return i.jsx("input",{type:"tel",inputMode:"numeric",value:c,onChange:function(e){let a=n(e.target.value);u(a),t(a)},onBlur:a,placeholder:r,required:l,disabled:d,className:o,maxLength:11})}},61409:(e,t,a)=>{"use strict";a.d(t,{EV:()=>l,Vv:()=>n,iZ:()=>o});var i=a(63906),r=a(61468),s=a(44573);function n({shop:e,invoiceNumber:t,formValues:a,items:n,grandTotal:l,type:o="facture"}){let d=a.date?(0,i.WU)(new Date(a.date),"dd MMMM yyyy",{locale:r.fr}):"—",c=a.city||e?.city||"Niamey",u="#1F4E79",p="proforma"===o,m="bon_livraison"===o,x="bon_commande"===o,h="FACTURE DE VENTE";p&&(h="FACTURE PROFORMA"),m&&(h="BON DE LIVRAISON"),x&&(h="BON DE COMMANDE");let g=!m&&!x,b=n.map((e,t)=>`
    <tr class="${t%2==1?"alt":""}">
      <td class="td designation">${e.designation||e.product_name||"—"}</td>
      <td class="td center">${e.quantity||0}</td>
      <td class="td center">${e.unit||"Pi\xe8ces"}</td>
      ${g?`
            <td class="td right">${(0,s.zz)(e.unit_price||e.unit_sale_price||0).replace(" FCFA","")}</td>
            <td class="td right bold">${(0,s.zz)(e.total_price||e.total_sale||0).replace(" FCFA","")}</td>
          `:""}
    </tr>
  `).join("");return`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${h} ${t}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: white;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 13px;
    }

    .page {
      width: 100%;
      min-height: 277mm;
      padding: 0;
      position: relative;
    }

    .top {
      display: grid;
      grid-template-columns: 1fr 380px;
      align-items: start;
      min-height: 88px;
    }

    .logo {
      max-width: 115px;
      max-height: 82px;
      object-fit: contain;
    }

    .activity {
      background: #F39A21;
      color: white;
      font-weight: 800;
      text-align: center;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .company {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
      margin-top: 8px;
    }

    .title-row {
      display: grid;
      grid-template-columns: 1fr 410px 1fr;
      align-items: center;
      margin-top: 8px;
    }

    .doc-title {
      grid-column: 2;
      background: ${u};
      color: white;
      text-align: center;
      font-weight: 800;
      font-size: 16px;
      padding: 4px 8px;
    }

    .date {
      text-align: right;
      font-size: 14px;
      white-space: nowrap;
    }

    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1.25fr 1fr;
      background: ${u};
      color: white;
      font-weight: 800;
      margin-top: 20px;
      border: 1px solid ${u};
    }

    .client-cell {
      padding: 5px 10px;
      border-right: 2px solid white;
      text-align: center;
      font-size: 15px;
    }

    .client-cell:last-child {
      border-right: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 22px;
      font-size: 14px;
    }

    th {
      background: ${u};
      color: white;
      padding: 5px 6px;
      font-size: 14px;
      border: 2px solid white;
      font-weight: 800;
    }

    .td {
      padding: 4px 6px;
      border-left: 2px solid white;
      border-right: 2px solid white;
      font-size: 13px;
    }

    .designation {
      width: 45%;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .bold {
      font-weight: 700;
    }

    tr.alt .td {
      background: #D9E2F3;
    }

    .total-row td {
      background: ${u};
      color: white;
      font-weight: 800;
      padding: 5px 6px;
      border: 2px solid white;
      font-size: 14px;
    }

    .words {
      margin-top: 26px;
      font-size: 14px;
      line-height: 1.35;
    }

    .words strong {
      font-weight: 800;
    }

    .garantie {
      margin-top: 26px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
    }

    .garantie span {
      color: red;
      text-decoration: underline;
      font-weight: 900;
    }

    .signature {
      margin-top: 26px;
      display: flex;
      justify-content: flex-end;
      min-height: 120px;
      padding-right: 20px;
    }

    .signature-box {
      width: 180px;
      text-align: left;
      font-weight: 700;
      font-size: 14px;
    }

    .signature-img {
      max-width: 150px;
      max-height: 70px;
      object-fit: contain;
      margin-top: 8px;
    }

    .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: 1.25fr 0.9fr 0.9fr;
      background: ${u};
      color: white;
      font-weight: 800;
      font-style: italic;
      font-size: 16px;
    }

    .footer div {
      padding: 5px 10px;
      text-align: center;
      border-right: 2px solid white;
    }

    .footer div:last-child {
      border-right: 0;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div>
        ${e?.logo_url?`<img class="logo" src="${e.logo_url}" alt="Logo" />`:""}
      </div>

      <div>
        <div class="activity">
          ${e?.activity||"VENTE ET INSTALLATION D’\xc9QUIPEMENTS SOLAIRES"}
        </div>
        <div class="company">
          <div>Situ\xe9 \xe0 DAR ES SALAM derri\xe8re ESCAE</div>
          <div>NIF : ${e?.nif||"—"} ${e?.rccm?`– RCCM : ${e.rccm}`:""}</div>
          ${e?.bank_account?`<div>COMPTE CORIS BANK : ${e.bank_account}</div>`:""}
          <div>${(e?.city||"NIAMEY").toUpperCase()} - NIGER</div>
        </div>
      </div>
    </div>

    <div class="title-row">
      <div></div>
      <div class="doc-title">${h} N\xb0${t}</div>
      <div class="date">${c}, le ${d}</div>
    </div>

    <div class="client-strip">
      <div class="client-cell">CLIENT : ${a.client_name||"—"}</div>
      <div class="client-cell">ADRESSE : ${a.client_address||"—"}</div>
      <div class="client-cell">T\xe9l : ${a.client_phone||"—"}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">D\xe9signation</th>
          <th>Quantit\xe9</th>
          <th>Unit\xe9</th>
          ${g?'<th style="text-align:right">Prix Unitaire</th><th style="text-align:right">Prix Total</th>':""}
        </tr>
      </thead>
      <tbody>
        ${b||`<tr><td class="td" colspan="${g?5:3}">Aucun article</td></tr>`}
      </tbody>
      ${g?`
            <tfoot>
              <tr class="total-row">
                <td colspan="${g?4:2}" class="right">MONTANT TOTAL</td>
                <td class="right">${(0,s.zz)(l).replace(" FCFA","")}</td>
              </tr>
            </tfoot>
          `:""}
    </table>

    ${g?`<div class="words">Arr\xeat\xe9 la pr\xe9sente ${p?"proforma":"facture"} \xe0 la somme de <strong>${(0,s.RQ)(l).replace(/^Arrêté.*?somme de /i,"").replace(" FCFA"," francs CFA")}</strong></div>`:""}

    ${x||m?"":`
          <div class="garantie">
            <span>GARANTIE</span> : Cinq (05) ans sur la batterie et un (01) an sur l’onduleur si l’installation a \xe9t\xe9 faite dans les normes et ne prend en charge qu’une consommation correspondante \xe0 la capacit\xe9 des \xe9quipements concern\xe9s. En cas de probl\xe8me la garantie consistera \xe0 r\xe9parer les d’abord et les remplacer s’ils sont irr\xe9parables.
          </div>
        `}

    <div class="signature">
      <div class="signature-box">
        SIGNATURE
        ${e?.signature_url?`<br/><img class="signature-img" src="${e.signature_url}" />`:""}
        ${e?.cachet_url?`<br/><img class="signature-img" src="${e.cachet_url}" />`:""}
      </div>
    </div>

    <div class="footer">
      <div>T\xe9l : ${e?.phone||"(+227) 90 27 54 53 / 94 29 29 19"}</div>
      <div>WhatsApp : ${e?.whatsapp||"+227 94 29 29 19"}</div>
      <div>Email : ${e?.email||"elso.niger@gmail.com"}</div>
    </div>
  </div>
</body>
</html>
`}function l({shop:e,type:t,saleGroup:a,invoiceNumber:i}){let r={date:a.date,city:e?.city||"",client_name:a.client_name||"",client_address:"",client_phone:"",validity:"30 jours"},s=a.items.map(e=>({id:e.id,designation:e.product_name,quantity:e.quantity,unit:e.unit||"Pi\xe8ces",unit_price:e.unit_sale_price||0,total_price:e.total_sale||0})),l=s.reduce((e,t)=>e+t.total_price,0),o=n({shop:e,invoiceNumber:i||`VTE-${a.date}`,formValues:r,items:s,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}function o({shop:e,type:t,purchase:a,invoiceNumber:i}){let r={date:a.date,city:e?.city||"",client_name:a.supplier||"",client_address:"",client_phone:""},s=[{id:a.id,designation:a.product_name,quantity:a.quantity,unit:"Pi\xe8ces",unit_price:a.unit_price||0,total_price:a.total_amount||0}],l=a.total_amount||0,o=n({shop:e,invoiceNumber:i||`ACH-${a.date}`,formValues:r,items:s,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}},60595:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},10088:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},3919:(e,t,a)=>{"use strict";a.d(t,{Z:()=>i});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a(8341).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},47466:(e,t,a)=>{"use strict";a.d(t,{Z:()=>d});var i=a(6113),r=a.n(i);let s={randomUUID:r().randomUUID},n=new Uint8Array(256),l=n.length,o=[];for(let e=0;e<256;++e)o.push((e+256).toString(16).slice(1));let d=function(e,t,a){if(s.randomUUID&&!t&&!e)return s.randomUUID();let i=(e=e||{}).random||(e.rng||function(){return l>n.length-16&&(r().randomFillSync(n),l=0),n.slice(l,l+=16)})();if(i[6]=15&i[6]|64,i[8]=63&i[8]|128,t){a=a||0;for(let e=0;e<16;++e)t[a+e]=i[e];return t}return function(e,t=0){return o[e[t+0]]+o[e[t+1]]+o[e[t+2]]+o[e[t+3]]+"-"+o[e[t+4]]+o[e[t+5]]+"-"+o[e[t+6]]+o[e[t+7]]+"-"+o[e[t+8]]+o[e[t+9]]+"-"+o[e[t+10]]+o[e[t+11]]+o[e[t+12]]+o[e[t+13]]+o[e[t+14]]+o[e[t+15]]}(i)}},28295:(e,t,a)=>{"use strict";a.r(t),a.d(t,{$$typeof:()=>n,__esModule:()=>s,default:()=>l});var i=a(90506);let r=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\achats\page.jsx`),{__esModule:s,$$typeof:n}=r;r.default;let l=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\achats\page.jsx#default`)}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),i=t.X(0,[228,437,321,617,487,127,122,932,110,363,664],()=>a(67699));module.exports=i})();