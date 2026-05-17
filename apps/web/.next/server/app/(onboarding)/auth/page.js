(()=>{var e={};e.id=901,e.ids=[901],e.modules={47849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},55403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},94749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},71017:e=>{"use strict";e.exports=require("path")},57310:e=>{"use strict";e.exports=require("url")},21193:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>n.a,__next_app__:()=>u,originalPathname:()=>p,pages:()=>c,routeModule:()=>m,tree:()=>d}),a(84444),a(31819),a(88045);var s=a(57341),r=a(95085),i=a(81918),n=a.n(i),o=a(20192),l={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);a.d(t,l);let d=["",{children:["(onboarding)",{children:["auth",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,84444)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(onboarding)\\auth\\page.jsx"]}]},{}]},{"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,88045)),"C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,31819,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,59014))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["C:\\Users\\Nabil\\Documents\\boutik\\apps\\web\\src\\app\\(onboarding)\\auth\\page.jsx"],p="/(onboarding)/auth/page",u={require:a,loadChunk:()=>Promise.resolve()},m=new s.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/(onboarding)/auth/page",pathname:"/auth",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},34060:(e,t,a)=>{Promise.resolve().then(a.bind(a,40794))},7662:(e,t,a)=>{Promise.resolve().then(a.bind(a,83287)),Promise.resolve().then(a.bind(a,86235))},39985:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,37201,23)),Promise.resolve().then(a.t.bind(a,90987,23)),Promise.resolve().then(a.t.bind(a,13887,23)),Promise.resolve().then(a.t.bind(a,30095,23)),Promise.resolve().then(a.t.bind(a,68653,23)),Promise.resolve().then(a.t.bind(a,72391,23))},40794:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>h});var s=a(72075),r=a(24334),i=a(13076),n=a(932),o=a(81526),l=a(48020),d=a(86235),c=a(91900),p=a(4893),u=a(76188),m=a(15967);function h(){let e=(0,i.useRouter)(),[t,a]=(0,r.useState)("login"),[h,g]=(0,r.useState)(!1),[b,x]=(0,r.useState)(!1),{register:f,handleSubmit:w,formState:{errors:y},reset:v}=(0,n.cI)();async function _(a){g(!0);let s=(0,o.N)();try{if("signup"===t){let t=await (0,l.$8)("pending_code");if(!t){d.A.error("Code d'acc\xe8s manquant. Retournez \xe0 l'\xe9tape pr\xe9c\xe9dente."),e.push("/access-code");return}let{data:r,error:i}=await s.rpc("claim_access_code",{p_code:t});if(i)throw i;if(!r){await (0,l.Lt)("pending_code",null),d.A.error("Ce code a d\xe9j\xe0 \xe9t\xe9 utilis\xe9."),e.push("/access-code");return}let{data:n,error:o}=await s.auth.signUp({email:a.email.trim().toLowerCase(),password:a.password,options:{data:{full_name:a.full_name?.trim()||""}}});if(o)throw o;await (0,l.Lt)("pending_code",null),await (0,l.Lt)("user_id",n.user.id),await (0,l.Lt)("offline_ready",!0),d.A.success("Compte cr\xe9\xe9 ! Configurez votre boutique."),e.push("/setup")}else{let{data:t,error:r}=await s.auth.signInWithPassword({email:a.email.trim().toLowerCase(),password:a.password});if(r)throw r;await (0,l.Lt)("user_id",t.user.id),await (0,l.Lt)("offline_ready",!0);let{data:i}=await s.from("profiles").select("shop_id").eq("id",t.user.id).single();i?.shop_id?(await (0,l.Lt)("shop_id",i.shop_id),await (0,l.Lt)("offline_ready",!0),d.A.success("Connexion r\xe9ussie !"),e.push("/dashboard")):e.push("/setup")}}catch(t){let e=t.message?.includes("Invalid login")?"Email ou mot de passe incorrect.":t.message?.includes("already registered")?"Cet email est d\xe9j\xe0 utilis\xe9.":t.message||"Une erreur est survenue.";d.A.error(e)}finally{g(!1)}}return(0,s.jsxs)(s.Fragment,{children:[s.jsx("style",{children:`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        .auth-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #fafaf9;
        }

        @media (max-width: 900px) {
          .auth-root { grid-template-columns: 1fr; }
          .auth-brand { display: none; }
        }

        /* ── Left brand panel ── */
        .auth-brand {
          background: #1a1a2e;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
        }

        .brand-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .brand-orb-1 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .brand-orb-2 {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
          bottom: 100px;
          left: -50px;
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 3rem;
        }

        .brand-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo-icon svg {
          width: 20px;
          height: 20px;
          fill: white;
        }

        .brand-logo-name {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: white;
          letter-spacing: -0.02em;
        }

        .brand-headline {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(2rem, 3vw, 2.75rem);
          line-height: 1.15;
          color: white;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
        }

        .brand-headline em {
          font-style: italic;
          color: #a5b4fc;
        }

        .brand-desc {
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
          line-height: 1.7;
          max-width: 340px;
          font-weight: 300;
        }

        .brand-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        .brand-stat {
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(10px);
        }

        .brand-stat-value {
          font-size: 1.75rem;
          font-weight: 600;
          color: white;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 4px;
        }

        .brand-stat-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── Right form panel ── */
        .auth-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #fafaf9;
        }

        .auth-form-box {
          width: 100%;
          max-width: 420px;
        }

        .auth-form-header {
          margin-bottom: 2.5rem;
        }

        .auth-form-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }

        .auth-form-eyebrow::before {
          content: '';
          display: block;
          width: 16px;
          height: 2px;
          background: #6366f1;
          border-radius: 2px;
        }

        .auth-form-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: #111827;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }

        .auth-form-subtitle {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 300;
        }

        /* Tab switcher */
        .auth-tabs {
          display: flex;
          gap: 0;
          background: #f3f4f6;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 2rem;
        }

        .auth-tab {
          flex: 1;
          padding: 0.625rem 1rem;
          border-radius: 9px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: #6b7280;
        }

        .auth-tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }

        /* Form fields */
        .auth-field {
          margin-bottom: 1.25rem;
        }

        .auth-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.4rem;
          letter-spacing: 0.01em;
        }

        .auth-input-wrap {
          position: relative;
        }

        .auth-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9375rem;
          color: #111827;
          background: white;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .auth-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .auth-input::placeholder {
          color: #d1d5db;
        }

        .auth-input.has-toggle {
          padding-right: 48px;
        }

        .auth-toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .auth-toggle-btn:hover {
          color: #6b7280;
        }

        .auth-error-msg {
          font-size: 0.75rem;
          color: #ef4444;
          margin-top: 4px;
        }

        /* Submit button */
        .auth-submit {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: 0.5rem;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          letter-spacing: 0.01em;
        }

        .auth-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }

        .auth-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .auth-footer-note {
          text-align: center;
          font-size: 0.78rem;
          color: #9ca3af;
          margin-top: 1.5rem;
          font-weight: 300;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.5rem 0;
        }

        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .auth-divider-text {
          font-size: 0.75rem;
          color: #9ca3af;
          white-space: nowrap;
        }
      `}),(0,s.jsxs)("div",{className:"auth-root",children:[(0,s.jsxs)("div",{className:"auth-brand",children:[s.jsx("div",{className:"brand-grid"}),s.jsx("div",{className:"brand-orb-1"}),s.jsx("div",{className:"brand-orb-2"}),(0,s.jsxs)("div",{className:"brand-content",children:[(0,s.jsxs)("div",{className:"brand-logo",children:[s.jsx("div",{className:"brand-logo-icon",children:s.jsx("svg",{viewBox:"0 0 24 24",children:s.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"})})}),s.jsx("span",{className:"brand-logo-name",children:"Boutik"})]}),(0,s.jsxs)("h1",{className:"brand-headline",children:["G\xe9rez votre boutique",s.jsx("br",{}),s.jsx("em",{children:"intelligemment."})]}),s.jsx("p",{className:"brand-desc",children:"Ventes, achats, stocks, cr\xe9ances — tout au m\xeame endroit. Fonctionne m\xeame sans internet."})]}),s.jsx("div",{className:"brand-stats",children:[{value:"100%",label:"Hors-ligne"},{value:"FCFA",label:"Monnaie locale"},{value:"0 perte",label:"Donn\xe9es s\xe9curis\xe9es"},{value:"∞",label:"Transactions"}].map(e=>(0,s.jsxs)("div",{className:"brand-stat",children:[s.jsx("div",{className:"brand-stat-value",children:e.value}),s.jsx("div",{className:"brand-stat-label",children:e.label})]},e.label))})]}),s.jsx("div",{className:"auth-form-panel",children:(0,s.jsxs)("div",{className:"auth-form-box",children:[(0,s.jsxs)("div",{className:"auth-form-header",children:[s.jsx("div",{className:"auth-form-eyebrow",children:"Boutik Suite"}),s.jsx("h2",{className:"auth-form-title",children:"login"===t?"Bon retour \uD83D\uDC4B":"Cr\xe9er un compte"}),s.jsx("p",{className:"auth-form-subtitle",children:"login"===t?"Connectez-vous pour acc\xe9der \xe0 votre espace.":"Rejoignez Boutik et g\xe9rez votre boutique."})]}),(0,s.jsxs)("div",{className:"auth-tabs",children:[s.jsx("button",{className:`auth-tab ${"login"===t?"active":""}`,onClick:()=>{a("login"),v()},children:"Se connecter"}),s.jsx("button",{className:`auth-tab ${"signup"===t?"active":""}`,onClick:()=>{a("signup"),v()},children:"Cr\xe9er un compte"})]}),(0,s.jsxs)("form",{onSubmit:w(_),children:["signup"===t&&(0,s.jsxs)("div",{className:"auth-field",children:[s.jsx("label",{className:"auth-label",children:"Nom complet"}),s.jsx("div",{className:"auth-input-wrap",children:s.jsx("input",{...f("full_name"),type:"text",placeholder:"Ex: Ibrahim Moussa",className:"auth-input"})})]}),(0,s.jsxs)("div",{className:"auth-field",children:[s.jsx("label",{className:"auth-label",children:"Adresse email"}),s.jsx("div",{className:"auth-input-wrap",children:s.jsx("input",{...f("email",{required:"Email requis",pattern:{value:/^\S+@\S+\.\S+$/,message:"Email invalide"}}),type:"email",placeholder:"vous@exemple.com",className:"auth-input",autoComplete:"email"})}),y.email&&s.jsx("p",{className:"auth-error-msg",children:y.email.message})]}),(0,s.jsxs)("div",{className:"auth-field",children:[s.jsx("label",{className:"auth-label",children:"Mot de passe"}),(0,s.jsxs)("div",{className:"auth-input-wrap",children:[s.jsx("input",{...f("password",{required:"Mot de passe requis",minLength:"signup"===t?{value:8,message:"Minimum 8 caract\xe8res"}:void 0}),type:b?"text":"password",placeholder:"••••••••",className:"auth-input has-toggle",autoComplete:"signup"===t?"new-password":"current-password"}),s.jsx("button",{type:"button",className:"auth-toggle-btn",onClick:()=>x(e=>!e),tabIndex:-1,children:b?s.jsx(c.Z,{size:16}):s.jsx(p.Z,{size:16})})]}),y.password&&s.jsx("p",{className:"auth-error-msg",children:y.password.message})]}),s.jsx("button",{type:"submit",disabled:h,className:"auth-submit",children:h?s.jsx(u.Z,{size:18,style:{animation:"spin 1s linear infinite"}}):(0,s.jsxs)(s.Fragment,{children:["login"===t?"Se connecter":"Cr\xe9er mon compte",s.jsx(m.Z,{size:17})]})})]}),s.jsx("p",{className:"auth-footer-note",children:"login"===t?"Connexion internet requise lors de la premi\xe8re connexion sur un appareil.":"En cr\xe9ant un compte, vous acceptez nos conditions d'utilisation."})]})})]}),s.jsx("style",{children:`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `})]})}},83287:(e,t,a)=>{"use strict";a.d(t,{default:()=>o});var s=a(72075),r=a(24334),i=a(61120),n=a(34480);function o(){let[e,t]=(0,r.useState)(null);if(!e?.download_url&&!e?.exe_url&&!e?.msi_url)return null;let a=e.exe_url||e.download_url||e.msi_url;return s.jsx("div",{className:"sticky top-0 z-[9998] bg-slate-950 text-white border-b border-white/10",children:(0,s.jsxs)("div",{className:"max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm",children:[s.jsx(i.Z,{className:"w-4 h-4 text-blue-300"}),(0,s.jsxs)("span",{className:"text-slate-200",children:["Application desktop Boutik disponible",e.version?` — version ${e.version}`:""]}),(0,s.jsxs)("a",{href:a,target:"_blank",rel:"noreferrer",className:"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition",children:[s.jsx(n.Z,{className:"w-3.5 h-3.5"}),"T\xe9l\xe9charger"]})]})})}a(81526)},48020:(e,t,a)=>{"use strict";a.d(t,{$8:()=>r,Lt:()=>i,UP:()=>p,Yp:()=>s,go:()=>d,hD:()=>l,kL:()=>o,qQ:()=>c});let s=new(a(14617)).ZP("BmSuiteDB");async function r(e){let t=await s.app_settings.get(e);return t?t.value:null}async function i(e,t){await s.app_settings.put({key:e,value:t})}async function n(e,t,a,r){await s.sync_queue.add({table_name:e,operation:t,record_id:a,payload:r,created_at:new Date().toISOString()})}async function o(e,t,a="upsert"){return await s[e].put(t),await n(e,a,t.id,t),t.shop_id,t}async function l(e,t){let a=await s[e].where("id").equals(t).first(),r=new Date().toISOString();await s[e].where("id").equals(t).modify({deleted_at:r,sync_status:"pending"}),await n(e,"delete",t,{id:t,deleted_at:r}),a?.shop_id}async function d(e,t){return s[e].where("shop_id").equals(t).filter(e=>!e.deleted_at).toArray()}async function c(e,t){return s[e].where("shop_id").equals(t).toArray()}async function p(e,t){let a=new Date().toISOString();await s.sales.where("id").equals(e).modify({cancelled_at:a,sync_status:"pending"}),await n("sales","upsert",e,{id:e,cancelled_at:a})}s.version(5).stores({products:"id, shop_id, code, name, supplier, sync_status, deleted_at",purchases:"id, shop_id, supplier_id, date, supplier, product_id, payment_status, sync_status, sync_error, deleted_at",sales:"id, session_id, sale_batch_id, shop_id, client_id, date, product_id, payment_status, sync_status, sync_error, deleted_at, cancelled_at",expenses:"id, shop_id, date, sync_status, deleted_at",clients:"id, shop_id, name",client_transactions:"id, shop_id, client_id, date, deleted_at",suppliers:"id, shop_id, name",supplier_transactions:"id, shop_id, supplier_id, date, deleted_at",invoices:"id, shop_id, type, status, date, invoice_number",invoice_items:"id, invoice_id, shop_id, deleted_at",sync_queue:"++_localId, table_name, record_id, operation, created_at",app_settings:"key"})},81526:(e,t,a)=>{"use strict";let s;a.d(t,{N:()=>i});var r=a(89951);function i(){return s||(s=(0,r.AY)("https://kgbmwfmciwwdoctxjzrw.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYm13Zm1jaXd3ZG9jdHhqenJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDQ3MjAsImV4cCI6MjA5MjcyMDcyMH0.urV6lvr_IrnrLOmpC5tnKWsGZhORkp9uS762MyNJOlc")),s}},15967:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(8341).Z)("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]])},91900:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(8341).Z)("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]])},4893:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(8341).Z)("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},76188:(e,t,a)=>{"use strict";a.d(t,{Z:()=>s});/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,a(8341).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},84444:(e,t,a)=>{"use strict";a.r(t),a.d(t,{$$typeof:()=>n,__esModule:()=>i,default:()=>o});var s=a(90506);let r=(0,s.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(onboarding)\auth\page.jsx`),{__esModule:i,$$typeof:n}=r;r.default;let o=(0,s.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\app\(onboarding)\auth\page.jsx#default`)},88045:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>p,metadata:()=>c});var s=a(98771),r=a(11344);a(71362);var i=a(90506);let n=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\components\DesktopDownloadBanner.jsx`),{__esModule:o,$$typeof:l}=n;n.default;let d=(0,i.createProxy)(String.raw`C:\Users\Nabil\Documents\boutik\apps\web\src\components\DesktopDownloadBanner.jsx#default`),c={title:"BM Suite",description:"Gestion comptable & commerciale",icons:{icon:"/favicon.ico",shortcut:"/favicon.ico"}};function p({children:e}){return(0,s.jsxs)("html",{lang:"fr",children:[(0,s.jsxs)("head",{children:[s.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),s.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),s.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap",rel:"stylesheet"})]}),(0,s.jsxs)("body",{className:"antialiased bg-gray-50 text-gray-900",children:[s.jsx(d,{}),e,s.jsx(r.x7,{richColors:!0,position:"top-right"})]})]})}},59014:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>r});var s=a(2544);let r=e=>[{type:"image/x-icon",sizes:"32x32",url:(0,s.fillMetadataSegment)(".",e.params,"favicon.ico")+""}]},71362:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[228,437,321,617,932],()=>a(21193));module.exports=s})();