(()=>{var e={};e.id=986,e.ids=[986],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},6113:e=>{"use strict";e.exports=require("crypto")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},43790:(e,t,i)=>{"use strict";i.r(t),i.d(t,{GlobalError:()=>s.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>c,routeModule:()=>m,tree:()=>d}),i(18632),i(7907),i(31819),i(43138);var a=i(57341),n=i(95085),r=i(81918),s=i.n(r),l=i(20192),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);i.d(t,o);let d=["",{children:["(app)",{children:["ventes",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(i.bind(i,18632)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\ventes\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(i.bind(i,7907)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\layout.jsx"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(i.bind(i,43138)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(i.t.bind(i,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(i.bind(i,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(app)\\ventes\\page.jsx"],u="/(app)/ventes/page",p={require:i,loadChunk:()=>Promise.resolve()},m=new a.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/(app)/ventes/page",pathname:"/ventes",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},79064:(e,t,i)=>{Promise.resolve().then(i.bind(i,52805))},52805:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>z});var a=i(72075),n=i(24334),r=i(47466),s=i(86235),l=i(52134),o=i(502),d=i(39257),c=i(60595),u=i(98399),p=i(10088),m=i(25244),x=i(86988),h=i(3919);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let g=(0,i(8341).Z)("CirclePlus",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]]);var b=i(99692),y=i(61468),v=i(73795),f=i(48020),_=i(44573),j=i(41258),N=i(61409),w=i(34319),k=i(13076);function C(e,t,i){let a=t.filter(t=>t.product_id===e.id).reduce((e,t)=>e+Number(t.quantity||0),0),n=i.filter(t=>t.product_id===e.id&&!t.cancelled_at).reduce((e,t)=>e+Number(t.quantity||0),0);return Number(e.stock_initial||0)+a-n}let $=()=>({_key:(0,r.Z)(),product_id:"",product_name:"",product_code:"",unit_cost:0,quantity:1,unit_sale_price:""}),A=[{key:"proforma",label:"Facture proforma",icon:l.Z,description:"Devis / offre de prix"},{key:"facture",label:"Facture d\xe9finitive",icon:o.Z,description:"Document officiel de vente"},{key:"bon_livraison",label:"Bon de livraison",icon:d.Z,description:"Document de remise des articles"},{key:"bon_commande",label:"Bon de commande",icon:l.Z,description:"Document de commande li\xe9 \xe0 la vente"}];function z(){let e=(0,v.q)(e=>e.shop);(0,k.useRouter)(),(0,k.useSearchParams)().get("action");let[t,i]=(0,n.useState)([]),[l,o]=(0,n.useState)([]),[d,z]=(0,n.useState)([]),[M,S]=(0,n.useState)([]),[D,q]=(0,n.useState)(""),[E,P]=(0,n.useState)(!1),[Z,U]=(0,n.useState)(null),[L,T]=(0,n.useState)(!0),[R,I]=(0,n.useState)(null),[F,O]=(0,n.useState)(""),[W,V]=(0,n.useState)(null),[G,B]=(0,n.useState)([$()]),[H,Q]=(0,n.useState)(null),[X,K]=(0,n.useState)((0,b.WU)(new Date,"yyyy-MM-dd")),[Y,J]=(0,n.useState)(""),[ee,et]=(0,n.useState)(""),[ei,ea]=(0,n.useState)(""),en=(0,n.useCallback)(async()=>{if(!e?.id)return;let[t,a,n,r]=await Promise.all([(0,f.go)("sales",e.id),(0,f.go)("products",e.id),(0,f.go)("purchases",e.id),(0,f.go)("clients",e.id)]);i(t.sort((e,t)=>new Date(t.date)-new Date(e.date))),o(a),z(n),S(r),T(!1)},[e?.id]);async function er(t){if(t.preventDefault(),!R)return;let i=Number(F||0),a=Number(R.remaining_amount||0);if(i<=0){s.A.error("Montant invalide.");return}if(i>a){s.A.error("Le paiement d\xe9passe le reste \xe0 payer.");return}let n=new Date().toISOString(),l=R.items||[];if(!l.length){s.A.error("Aucune ligne de vente trouv\xe9e.");return}let o=l[0],d=o.client_id||null;if(!d&&o.client_name){let t=M.find(e=>String(e.name||"").trim().toLowerCase()===String(o.client_name||"").trim().toLowerCase());if(t)d=t.id;else{let t={id:(0,r.Z)(),shop_id:e.id,name:o.client_name,phone:o.client_phone||"",address:"",created_at:n,updated_at:n,sync_status:"pending"};await (0,f.kL)("clients",t),d=t.id}}if(!d){s.A.error("Client introuvable pour cette vente \xe0 cr\xe9dit.");return}let c=i;for(let e of l){let t=Number(e.remaining_amount||0);if(t<=0)continue;let i=Math.min(c,t),a=Math.max(0,t-i);if(c-=i,await (0,f.kL)("sales",{...e,client_id:e.client_id||d,paid_amount:Number(e.paid_amount||0)+i,remaining_amount:a,payment_status:a<=0?"paid":"credit",updated_at:n,sync_status:"pending"}),c<=0)break}await (0,f.kL)("client_transactions",{id:(0,r.Z)(),shop_id:e.id,client_id:d,date:(0,b.WU)(new Date,"yyyy-MM-dd"),label:`Paiement vente — ${String(R.key).slice(0,8).toUpperCase()}`,amount:-i,created_at:n,updated_at:n,sync_status:"pending"}),s.A.success("Paiement enregistr\xe9"),I(null),O(""),await en()}function es(e,t,i){B(a=>a.map(a=>a._key===e?{...a,[t]:i}:a))}let el=(0,n.useMemo)(()=>G.reduce((e,t)=>{let i=Number(t.quantity||0),a=Number(t.unit_sale_price||0),n=Number(t.unit_cost||0);return{revenue:e.revenue+i*a,cost:e.cost+i*n,profit:e.profit+(i*a-i*n)}},{revenue:0,cost:0,profit:0}),[G]),eo="credit"===ee?Math.max(0,Number(ei||0)):el.revenue,ed=Math.max(0,el.revenue-eo);async function ec(i){if(i.preventDefault(),!ee){s.A.error("Choisissez le mode de paiement.");return}for(let e of G){if(!e.product_id){s.A.error("S\xe9lectionnez un produit pour chaque ligne");return}if(!e.unit_sale_price||0>=Number(e.unit_sale_price)){s.A.error(`Prix manquant pour ${e.product_name}`);return}}let a=new Map;for(let e of G){let t=Number(e.quantity||0);if(t<=0){s.A.error(`Quantit\xe9 invalide pour ${e.product_name}`);return}a.set(e.product_id,(a.get(e.product_id)||0)+t)}for(let[e,i]of a.entries()){let a=l.find(t=>t.id===e);if(!a)continue;let n=C(a,d,t);if(i>n){s.A.error(`Stock insuffisant pour ${a.name}. Disponible : ${(0,_.uf)(n)}`);return}}let n=M.find(e=>e.id===Y)||null,o="credit"===ee?Math.max(0,Number(ei||0)):el.revenue,c=Math.max(0,el.revenue-o),u=c>0?"credit":"paid";if("credit"===u&&!n){s.A.error("Choisissez un client pour enregistrer une vente \xe0 cr\xe9dit.");return}if(o>el.revenue){s.A.error("Le montant pay\xe9 ne peut pas d\xe9passer le total de la vente.");return}let p=(0,r.Z)(),m=new Date().toISOString();try{let t=[];for(let i of G){let a=Number(i.quantity),s=Number(i.unit_sale_price),l=Number(i.unit_cost),d=a*s,c=el.revenue>0?Math.round(d/el.revenue*o):0,x=Math.max(0,d-c),h={id:(0,r.Z)(),shop_id:e.id,session_id:p,date:X,store:"",client_id:n?.id||null,client_name:n?.name||"",payment_status:u,paid_amount:c,remaining_amount:x,product_id:i.product_id,product_code:i.product_code||"",product_name:i.product_name,quantity:a,unit_sale_price:s,total_sale:d,unit_purchase_cost:l,total_purchase_cost:a*l,profit:a*s-a*l,created_at:m,updated_at:m,sync_status:"pending"};await (0,f.kL)("sales",h),t.push(h)}c>0&&n&&await (0,f.kL)("client_transactions",{id:(0,r.Z)(),shop_id:e.id,client_id:n.id,date:X,label:`Vente \xe0 cr\xe9dit — ${p.slice(0,8).toUpperCase()}`,amount:c,created_at:m,updated_at:m,sync_status:"pending"}),s.A.success(`Vente enregistr\xe9e (${G.length} produit${G.length>1?"s":""})`),P(!1);let i={key:p,date:X,store:"",client_name:n?.name||"",payment_status:u,paid_amount:o,remaining_amount:c,items:t};V(i),en()}catch(e){s.A.error(e.message||"Erreur lors de l'enregistrement")}}function eu(){B([$()]),K((0,b.WU)(new Date,"yyyy-MM-dd")),J(""),et(""),ea(""),P(!0)}let ep=(0,n.useMemo)(()=>{let e={};return t.filter(e=>e.product_name?.toLowerCase().includes(D.toLowerCase())||e.store?.toLowerCase().includes(D.toLowerCase())||e.client_name?.toLowerCase().includes(D.toLowerCase())).forEach(t=>{let i=t.session_id||t.id;e[i]||(e[i]={key:i,date:t.date,created_at:t.created_at,store:t.store,client_name:t.client_name,payment_status:t.payment_status||"paid",paid_amount:0,remaining_amount:0,items:[],cancelled:!!t.cancelled_at}),e[i].items.push(t),e[i].paid_amount+=Number(t.paid_amount||0),e[i].remaining_amount+=Number(t.remaining_amount||0),Number(t.remaining_amount||0)>0&&(e[i].payment_status="credit"),t.cancelled_at&&(e[i].cancelled=!0)}),Object.values(e).sort((e,t)=>new Date(t.date)-new Date(e.date))},[t,D]),em=(0,n.useMemo)(()=>t.filter(e=>!e.cancelled_at),[t]),ex=(0,n.useMemo)(()=>em.reduce((e,t)=>e+(t.total_sale||0),0),[em]),eh=(0,n.useMemo)(()=>em.reduce((e,t)=>e+(t.profit||0),0),[em]);async function eg(i){for(let a of t.filter(e=>(e.session_id||e.id)===i))await (0,f.UP)(a.id,e.id);s.A.success("Vente annul\xe9e — stock restaur\xe9"),en()}async function eb(e){for(let i of t.filter(t=>(t.session_id||t.id)===e))await (0,f.hD)("sales",i.id);s.A.success("Vente supprim\xe9e"),en()}return(0,a.jsxs)("div",{className:"p-6",children:[a.jsx(j.mr,{title:"Ventes",subtitle:`${em.length} transaction${1!==em.length?"s":""}`,action:a.jsx(j.un,{icon:c.Z,onClick:eu,children:"Nouvelle vente"})}),(0,a.jsxs)("div",{className:"grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6",children:[a.jsx(j.Rm,{label:"Chiffre d'affaires total",value:(0,_.zz)(ex),color:"blue",icon:u.Z}),a.jsx(j.Rm,{label:"B\xe9n\xe9fice total",value:(0,_.zz)(eh),color:"green",icon:u.Z}),a.jsx(j.Rm,{label:"Nombre de ventes",value:em.length,color:"purple"})]}),(0,a.jsxs)("div",{className:"card overflow-hidden",children:[a.jsx("div",{className:"flex items-center gap-3 px-5 py-4 border-b border-gray-100",children:a.jsx("div",{className:"flex-1 max-w-xs",children:a.jsx(j.E1,{value:D,onChange:q,placeholder:"Rechercher…"})})}),L?a.jsx("div",{className:"p-10 text-center text-gray-400 text-sm",children:"Chargement…"}):0===ep.length?a.jsx(j.ub,{icon:u.Z,title:"Aucune vente",description:"Enregistrez vos premi\xe8res ventes.",action:a.jsx(j.un,{icon:c.Z,onClick:eu,children:"Nouvelle vente"})}):a.jsx("div",{className:"divide-y divide-gray-50",children:ep.map(e=>{let t=e.items.reduce((e,t)=>e+(t.total_sale||0),0),i=e.items.reduce((e,t)=>e+(t.profit||0),0);return a.jsx("div",{className:`px-5 py-4 ${e.cancelled?"bg-red-50/40 opacity-70":"hover:bg-gray-50 cursor-pointer"} transition-colors`,onClick:()=>!e.cancelled&&V(e),children:(0,a.jsxs)("div",{className:"flex items-start justify-between gap-4",children:[(0,a.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 mb-1 flex-wrap",children:[(0,a.jsxs)("span",{className:"text-xs text-gray-400",children:[(0,b.WU)(new Date(e.date),"dd MMM yyyy",{locale:y.fr}),e.created_at&&(0,a.jsxs)("span",{children:[" \xb7 ",(0,b.WU)(new Date(e.created_at),"HH:mm",{locale:y.fr})]})]}),e.store&&(0,a.jsxs)("span",{className:"text-xs text-gray-400",children:["\xb7 ",e.store]}),e.client_name&&(0,a.jsxs)("span",{className:"text-xs font-medium text-blue-600",children:["\xb7 ",e.client_name]}),e.cancelled&&a.jsx(j.Ct,{color:"red",children:"Annul\xe9e"}),"credit"===e.payment_status&&(0,a.jsxs)(j.Ct,{color:"amber",children:["Cr\xe9dit : ",(0,_.zz)(e.remaining_amount)]}),e.items.length>1&&(0,a.jsxs)(j.Ct,{color:"blue",children:[e.items.length," produits"]}),!e.cancelled&&a.jsx("span",{className:"text-xs text-gray-300 ml-1",children:"\xb7 Cliquer pour imprimer un document"})]}),a.jsx("div",{className:"space-y-0.5",children:e.items.map(e=>(0,a.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[a.jsx("span",{className:"font-medium text-gray-800 max-w-[200px] truncate",children:e.product_name}),(0,a.jsxs)("span",{className:"text-gray-400",children:["\xd7",e.quantity]}),a.jsx("span",{className:"text-gray-500",children:(0,_.zz)(e.total_sale)})]},e.id))})]}),(0,a.jsxs)("div",{className:"text-right flex-none",children:[a.jsx("p",{className:"font-bold text-gray-900",children:(0,_.zz)(t)}),!e.cancelled&&(0,a.jsxs)("p",{className:"text-xs text-emerald-600",children:["+",(0,_.zz)(i)]})]}),!e.cancelled&&(0,a.jsxs)("div",{className:"flex gap-1 flex-none",onClick:e=>e.stopPropagation(),children:[a.jsx("button",{onClick:()=>V(e),className:"p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors",title:"Imprimer un document",children:a.jsx(p.Z,{className:"w-3.5 h-3.5"})}),a.jsx("button",{onClick:t=>{t.stopPropagation(),function(e){if(!e||0>=Number(e.remaining_amount||0)){s.A.error("Cette vente est d\xe9j\xe0 enti\xe8rement pay\xe9e.");return}I(e),O("")}(e)},disabled:0>=Number(e.remaining_amount||0)||e.cancelled,className:"p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",title:"Payer le cr\xe9dit",children:a.jsx(m.Z,{className:"w-3.5 h-3.5"})}),a.jsx("button",{onClick:()=>U({type:"cancel",id:e.key}),className:"p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors",title:"Annuler la vente",children:a.jsx(x.Z,{className:"w-3.5 h-3.5"})}),a.jsx("button",{onClick:()=>U({type:"delete",id:e.key}),className:"p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors",title:"Supprimer",children:a.jsx(h.Z,{className:"w-3.5 h-3.5"})})]})]})},e.key)})})]}),a.jsx(j.u_,{open:!!W,onClose:()=>V(null),title:"Imprimer un document",maxW:"max-w-sm",children:(0,a.jsxs)("div",{className:"space-y-3",children:[a.jsx("p",{className:"text-sm text-gray-500 mb-4",children:"Choisissez le type de document \xe0 g\xe9n\xe9rer pour cette vente."}),W&&A.map(t=>{let i=t.icon;return(0,a.jsxs)("button",{onClick:()=>{var i;return i=t.key,void((0,N.EV)({shop:e,type:i,saleGroup:W,invoiceNumber:`VTE-${W.date}-${W.key.slice(0,4).toUpperCase()}`}),V(null))},className:"w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group",children:[a.jsx("div",{className:"w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-none transition-colors",children:a.jsx(i,{className:"w-5 h-5 text-blue-600"})}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"font-semibold text-gray-900",children:t.label}),a.jsx("p",{className:"text-xs text-gray-400",children:t.description})]}),a.jsx(p.Z,{className:"w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors"})]},t.key)}),a.jsx("div",{className:"pt-2",children:a.jsx(j.un,{variant:"secondary",onClick:()=>V(null),className:"w-full",children:"Fermer"})})]})}),a.jsx(j.u_,{open:E,onClose:()=>P(!1),title:"Nouvelle vente",maxW:"max-w-2xl",children:(0,a.jsxs)("form",{onSubmit:ec,className:"space-y-4",children:[(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[a.jsx(j.Wi,{label:"Date",required:!0,children:a.jsx("input",{type:"date",value:X,onChange:e=>K(e.target.value),className:j.Gn,required:!0})}),a.jsx(j.Wi,{label:"Client",children:(0,a.jsxs)("select",{value:Y,onChange:e=>J(e.target.value),className:j.ZO,children:[a.jsx("option",{value:"",children:"— Choisir —"}),M.map(e=>a.jsx("option",{value:e.id,children:e.name},e.id))]})})]}),(0,a.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[a.jsx(j.Wi,{label:"Paiement",required:!0,children:(0,a.jsxs)("select",{value:ee,onChange:e=>et(e.target.value),className:j.ZO,required:!0,children:[a.jsx("option",{value:"",children:"— Choisir le mode de paiement —"}),a.jsx("option",{value:"paid",children:"Pay\xe9 comptant"}),a.jsx("option",{value:"credit",children:"Vente \xe0 cr\xe9dit"})]})}),"credit"===ee&&a.jsx(j.Wi,{label:"Montant pay\xe9",children:a.jsx(w.Z,{value:ei,onChange:ea,placeholder:"0",className:j.Gn})})]}),(0,a.jsxs)("div",{className:"border border-gray-100 rounded-xl overflow-hidden",children:[a.jsx("div",{className:"px-4 py-2 bg-gray-50 border-b border-gray-100",children:a.jsx("span",{className:"text-xs font-semibold text-gray-500 uppercase tracking-wide",children:"Articles"})}),(0,a.jsxs)("div",{className:"divide-y divide-gray-50",children:[G.map((e,i)=>{let n=Number(e.quantity||0),r=Number(e.unit_sale_price||0),o=n*r,c=n*r-n*e.unit_cost,u=l.find(t=>t.id===e.product_id),p=u?C(u,d,t):null;return(0,a.jsxs)("div",{className:`p-3 space-y-2 rounded-xl transition-all duration-500 ${e._key===H?"bg-blue-50 ring-2 ring-blue-200 shadow-sm animate-pulse":"bg-white"}`,children:[(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsxs)("span",{className:"text-xs font-semibold text-gray-400",children:["Ligne ",i+1,e._key===H&&a.jsx("span",{className:"ml-2 text-blue-600 font-bold",children:"Nouvelle ligne"})]}),a.jsx("button",{type:"button",onClick:()=>{var t;return t=e._key,void(1!==G.length&&B(e=>e.filter(e=>e._key!==t)))},className:"text-gray-300 hover:text-red-500 transition-colors",children:a.jsx(h.Z,{className:"w-3.5 h-3.5"})})]}),(0,a.jsxs)("select",{value:e.product_id,onChange:t=>(function(e,t){if(!t){B(t=>t.map(t=>t._key===e?{...t,product_id:"",product_name:"",product_code:"",unit_cost:0,unit_sale_price:""}:t));return}if(G.some(i=>i._key!==e&&i.product_id===t)){s.A.error("Ce produit est d\xe9j\xe0 dans la vente. Augmentez simplement sa quantit\xe9.");return}let i=l.find(e=>e.id===t);i&&B(t=>t.map(t=>t._key===e?{...t,product_id:i.id,product_name:i.name,product_code:i.code||"",unit_cost:i.purchase_price||0,unit_sale_price:i.sale_price||""}:t))})(e._key,t.target.value),className:j.ZO,children:[a.jsx("option",{value:"",children:"— S\xe9lectionner un produit —"}),l.map(i=>{let n=C(i,d,t),r=G.some(t=>t._key!==e._key&&t.product_id===i.id);return(0,a.jsxs)("option",{value:i.id,disabled:r,children:[i.name," ",i.code?`(${i.code})`:""," — Stock: ",(0,_.uf)(n),r?" — d\xe9j\xe0 ajout\xe9":""]},i.id)})]}),e.product_id&&(0,a.jsxs)("div",{className:"rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 grid sm:grid-cols-3 gap-3",children:[(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-gray-400",children:"Produit"}),a.jsx("p",{className:"text-sm font-medium text-gray-800",children:e.product_name})]}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-gray-400",children:"ID / Code"}),(0,a.jsxs)("p",{className:"font-mono text-xs text-gray-700 break-all",children:["ID: ",e.product_id]}),(0,a.jsxs)("p",{className:"font-mono text-xs text-gray-400",children:["Code: ",e.product_code||"—"]})]}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-wide text-gray-400",children:"Stock restant actuel"}),a.jsx("p",{className:`text-lg font-bold ${p<=0?"text-red-600":"text-emerald-600"}`,children:(0,_.uf)(p)})]})]}),(0,a.jsxs)("div",{className:"grid grid-cols-[0.75fr_1fr_1.8fr] gap-2",children:[(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Quantit\xe9"}),a.jsx(w.Z,{value:e.quantity,onChange:t=>es(e._key,"quantity",t),className:j.Gn})]}),(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Prix unitaire (FCFA)"}),a.jsx(w.Z,{value:e.unit_sale_price,onChange:t=>es(e._key,"unit_sale_price",t),className:j.Gn})]}),(0,a.jsxs)("div",{children:[a.jsx("label",{className:"text-xs text-gray-400",children:"Montant"}),(0,a.jsxs)("div",{className:`${j.Gn} mt-0.5 bg-gray-50 flex items-center justify-between gap-3`,children:[a.jsx("span",{className:"text-gray-700 font-semibold",children:(0,_.zz)(o)}),o>0&&(0,a.jsxs)("span",{className:`text-xs font-semibold ml-1 ${c>=0?"text-emerald-600":"text-red-500"}`,children:["B\xe9n\xe9fice : ",c>=0?"+":"",(0,_.zz)(c)]})]})]})]})]},e._key)}),a.jsx("div",{className:"p-3 bg-gray-50",children:(0,a.jsxs)("button",{type:"button",onClick:function(){let e=$();B(t=>[...t,e]),Q(e._key)},className:"w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition",children:[a.jsx(g,{className:"w-4 h-4"}),"Ajouter une ligne"]})})]})]}),el.revenue>0&&(0,a.jsxs)("div",{className:"rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center",children:[(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-xs text-blue-500",children:"Total vente"}),a.jsx("p",{className:"font-bold text-blue-900",children:(0,_.zz)(el.revenue)})]}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-xs text-blue-500",children:"Co\xfbt total"}),a.jsx("p",{className:"font-bold text-blue-700",children:(0,_.zz)(el.cost)})]}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-xs text-blue-500",children:"B\xe9n\xe9fice"}),(0,a.jsxs)("p",{className:`font-bold ${el.profit>=0?"text-emerald-600":"text-red-500"}`,children:[el.profit>=0?"+":"",(0,_.zz)(el.profit)]})]}),(0,a.jsxs)("div",{children:[a.jsx("p",{className:"text-xs text-blue-500",children:"Reste \xe0 payer"}),a.jsx("p",{className:`font-bold ${ed>0?"text-amber-700":"text-emerald-700"}`,children:(0,_.zz)(ed)})]})]}),(0,a.jsxs)("div",{className:"flex gap-3 justify-end pt-2",children:[a.jsx(j.un,{variant:"secondary",onClick:()=>P(!1),children:"Annuler"}),a.jsx(j.un,{type:"submit",children:"Enregistrer la vente"})]})]})}),a.jsx(j.u_,{open:!!R,onClose:()=>I(null),title:"Paiement du cr\xe9dit",maxW:"max-w-md",children:R&&(0,a.jsxs)("form",{onSubmit:er,className:"space-y-4",children:[(0,a.jsxs)("div",{className:"rounded-xl bg-amber-50 border border-amber-100 p-4",children:[a.jsx("p",{className:"text-xs text-amber-600",children:"Total vente"}),a.jsx("p",{className:"font-bold text-gray-900",children:(0,_.zz)(R.items.reduce((e,t)=>e+Number(t.total_sale||0),0))}),a.jsx("p",{className:"text-xs text-amber-600 mt-2",children:"D\xe9j\xe0 pay\xe9"}),a.jsx("p",{className:"font-bold text-gray-900",children:(0,_.zz)(R.paid_amount)}),a.jsx("p",{className:"text-xs text-amber-600 mt-2",children:"Reste \xe0 payer"}),a.jsx("p",{className:"font-bold text-amber-700",children:(0,_.zz)(R.remaining_amount)})]}),a.jsx(j.Wi,{label:"Montant pay\xe9 maintenant",required:!0,children:a.jsx(w.Z,{value:F,onChange:O,placeholder:"0",required:!0,className:j.Gn})}),(0,a.jsxs)("div",{className:"flex gap-3 justify-end",children:[a.jsx(j.un,{variant:"secondary",onClick:()=>I(null),children:"Annuler"}),a.jsx(j.un,{type:"submit",children:"Enregistrer paiement"})]})]})}),a.jsx(j.QH,{open:!!Z&&"cancel"===Z.type,onClose:()=>U(null),onConfirm:()=>eg(Z.id),title:"Annuler la vente",message:"La vente sera marqu\xe9e comme annul\xe9e. Les produits seront remis en stock et les montants retir\xe9s des totaux. La vente restera visible dans l'historique.",confirmLabel:"Annuler la vente",danger:!0}),a.jsx(j.QH,{open:!!Z&&"delete"===Z.type,onClose:()=>U(null),onConfirm:()=>eb(Z.id),title:"Supprimer la vente",message:"La vente sera supprim\xe9e. Les donn\xe9es resteront dans l'analyse de rentabilit\xe9.",confirmLabel:"Supprimer",danger:!0})]})}},34319:(e,t,i)=>{"use strict";i.d(t,{Z:()=>s});var a=i(72075),n=i(24334),r=i.n(n);function s({value:e,onChange:t,onBlur:i,placeholder:n,required:s,className:l,disabled:o}){let d=e=>{if(""===e||null==e)return"";let[t,i]=String(e).split("."),a=t.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");return void 0!==i?`${a},${i}`:a},[c,u]=r().useState(()=>d(e)),p=r().useRef(e);return a.jsx("input",{type:"text",inputMode:"decimal",value:c,onChange:e=>{let i,a;let n=e.target.value.replace(/[\s\u00a0]/g,""),r=n.indexOf(",");r>=0?(i=n.slice(0,r).replace(/\D/g,""),a=n.slice(r+1).replace(/\D/g,"")):(i=n.replace(/\D/g,""),a=null);let s=i.replace(/\B(?=(\d{3})+(?!\d))/g,"\xa0");u(null!==a?`${s},${a}`:s);let l=null!==a?`${i}.${a}`:i;p.current=l,t(l)},onBlur:i,placeholder:n,required:s,disabled:o,className:l})}},61409:(e,t,i)=>{"use strict";i.d(t,{EV:()=>l,Vv:()=>s,iZ:()=>o});var a=i(99692),n=i(61468),r=i(44573);function s({shop:e,invoiceNumber:t,formValues:i,items:s,grandTotal:l,type:o="facture"}){let d=i.date?(0,a.WU)(new Date(i.date),"dd MMMM yyyy",{locale:n.fr}):"—",c=i.city||e?.city||"Niamey",u="#1F4E79",p="proforma"===o,m="bon_livraison"===o,x="bon_commande"===o,h="FACTURE DE VENTE";p&&(h="FACTURE PROFORMA"),m&&(h="BON DE LIVRAISON"),x&&(h="BON DE COMMANDE");let g=!m&&!x,b=s.map((e,t)=>`
    <tr class="${t%2==1?"alt":""}">
      <td class="td designation">${e.designation||e.product_name||"—"}</td>
      <td class="td center">${e.quantity||0}</td>
      <td class="td center">${e.unit||"Pi\xe8ces"}</td>
      ${g?`
            <td class="td right">${(0,r.zz)(e.unit_price||e.unit_sale_price||0).replace(" FCFA","")}</td>
            <td class="td right bold">${(0,r.zz)(e.total_price||e.total_sale||0).replace(" FCFA","")}</td>
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
      <div class="client-cell">CLIENT : ${i.client_name||"—"}</div>
      <div class="client-cell">ADRESSE : ${i.client_address||"—"}</div>
      <div class="client-cell">T\xe9l : ${i.client_phone||"—"}</div>
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
                <td class="right">${(0,r.zz)(l).replace(" FCFA","")}</td>
              </tr>
            </tfoot>
          `:""}
    </table>

    ${g?`<div class="words">Arr\xeat\xe9 la pr\xe9sente ${p?"proforma":"facture"} \xe0 la somme de <strong>${(0,r.RQ)(l).replace(/^Arrêté.*?somme de /i,"").replace(" FCFA"," francs CFA")}</strong></div>`:""}

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
`}function l({shop:e,type:t,saleGroup:i,invoiceNumber:a}){let n={date:i.date,city:e?.city||"",client_name:i.client_name||"",client_address:"",client_phone:"",validity:"30 jours"},r=i.items.map(e=>({id:e.id,designation:e.product_name,quantity:e.quantity,unit:e.unit||"Pi\xe8ces",unit_price:e.unit_sale_price||0,total_price:e.total_sale||0})),l=r.reduce((e,t)=>e+t.total_price,0),o=s({shop:e,invoiceNumber:a||`VTE-${i.date}`,formValues:n,items:r,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}function o({shop:e,type:t,purchase:i,invoiceNumber:a}){let n={date:i.date,city:e?.city||"",client_name:i.supplier||"",client_address:"",client_phone:""},r=[{id:i.id,designation:i.product_name,quantity:i.quantity,unit:"Pi\xe8ces",unit_price:i.unit_price||0,total_price:i.total_amount||0}],l=i.total_amount||0,o=s({shop:e,invoiceNumber:a||`ACH-${i.date}`,formValues:n,items:r,grandTotal:l,type:t}),d=document.createElement("iframe");d.style.cssText="position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;",document.body.appendChild(d),d.contentDocument.open(),d.contentDocument.write(o),d.contentDocument.close(),d.onload=()=>{setTimeout(()=>{d.contentWindow.focus(),d.contentWindow.print(),setTimeout(()=>document.body.removeChild(d),1500)},300)}}},86988:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]])},60595:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},10088:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},502:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]])},24459:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},3919:(e,t,i)=>{"use strict";i.d(t,{Z:()=>a});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,i(8341).Z)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},47466:(e,t,i)=>{"use strict";i.d(t,{Z:()=>d});var a=i(6113),n=i.n(a);let r={randomUUID:n().randomUUID},s=new Uint8Array(256),l=s.length,o=[];for(let e=0;e<256;++e)o.push((e+256).toString(16).slice(1));let d=function(e,t,i){if(r.randomUUID&&!t&&!e)return r.randomUUID();let a=(e=e||{}).random||(e.rng||function(){return l>s.length-16&&(n().randomFillSync(s),l=0),s.slice(l,l+=16)})();if(a[6]=15&a[6]|64,a[8]=63&a[8]|128,t){i=i||0;for(let e=0;e<16;++e)t[i+e]=a[e];return t}return function(e,t=0){return o[e[t+0]]+o[e[t+1]]+o[e[t+2]]+o[e[t+3]]+"-"+o[e[t+4]]+o[e[t+5]]+"-"+o[e[t+6]]+o[e[t+7]]+"-"+o[e[t+8]]+o[e[t+9]]+"-"+o[e[t+10]]+o[e[t+11]]+o[e[t+12]]+o[e[t+13]]+o[e[t+14]]+o[e[t+15]]}(a)}},18632:(e,t,i)=>{"use strict";i.r(t),i.d(t,{$$typeof:()=>s,__esModule:()=>r,default:()=>l});var a=i(90506);let n=(0,a.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\ventes\page.jsx`),{__esModule:r,$$typeof:s}=n;n.default;let l=(0,a.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(app)\ventes\page.jsx#default`)}};var t=require("../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),a=t.X(0,[228,916,294,617,487,798,163,719,363],()=>i(43790));module.exports=a})();