(()=>{"use strict";const e={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down",Period:"forward",Comma:"backward",Escape:"parent",Enter:"child"},t={down:{keyCode:"ArrowDown",direction:1},left:{keyCode:"ArrowLeft",direction:-1},right:{keyCode:"ArrowRight",direction:1},up:{keyCode:"ArrowUp",direction:-1},backward:{keyCode:"Comma",direction:-1},child:{keyCode:"Enter",direction:1},parent:{keyCode:"Backspace",direction:-1},forward:{keyCode:"Period",direction:1},exit:{keyCode:"Escape",direction:1}},s=(e,t)=>{const s=Object.keys(e);let a="";return s.forEach((s=>{a+=`${t.omitKeyNames?"":s+": "}${e[s]}. `})),a+=t.semanticLabel||"Data point.",a},a=(s=>{let a={},l=null,n=null,r=null,o=null,i=e,c=t,d=null,p=null;const h=e=>{const t=i[e.code];t&&(e.preventDefault(),a.move(t))},y=e=>{},g=e=>{},u=e=>{const t=document.getElementById(e);t&&(t.removeEventListener("keydown",h),t.removeEventListener("focus",y),t.removeEventListener("blur",g),t.remove())},b=(e,t)=>{(e=>{const t=document.createElement("figure");t.setAttribute("role","figure"),t.id=e,t.classList.add("dn-node");const a=s.data.nodes[e];a.cssClass&&t.classList.add(a.cssClass),t.style.width=parseFloat(a.width||"0")+"px",t.style.height=parseFloat(a.height||"0")+"px",t.style.left=parseFloat(a.x||"0")+"px",t.style.top=parseFloat(a.y||"0")+"px",t.setAttribute("tabindex","-1"),t.addEventListener("keydown",h),t.addEventListener("focus",y),t.addEventListener("blur",g);const l=document.createElement("div");if(l.setAttribute("role","img"),l.classList.add("dn-node-text"),s.showText&&(l.innerText=a.description),l.setAttribute("aria-label",a.description),t.appendChild(l),a.path){const e=parseFloat(a.width||"0")+parseFloat(a.x||"0")+10,s=parseFloat(a.height||"0")+parseFloat(a.y||"0")+10,l=document.createElementNS("http://www.w3.org/2000/svg","svg");l.setAttribute("width",e),l.setAttribute("height",s),l.setAttribute("viewBox",`0 0 ${e} ${s}`),l.style.left=-parseFloat(a.x||0),l.style.top=-parseFloat(a.y||0),l.classList.add("dn-node-svg"),l.setAttribute("role","presentation"),l.setAttribute("focusable","false");const n=document.createElementNS("http://www.w3.org/2000/svg","path");n.setAttribute("d",a.path),n.classList.add("dn-node-path"),l.appendChild(n),t.appendChild(l)}p.appendChild(t)})(e),(e=>{const t=document.getElementById(e);t&&(n=l,l=e,t.focus())})(e),u(t)};return a.getCurrentFocus=()=>l,a.getPreviousFocus=()=>n,a.setNavigationKeyBindings=s=>{s?(i={},c=s,Object.keys(s).forEach((e=>{const t=s[e];i[t.key]=e}))):(i=e,c=t)},a.build=()=>{if(console.log("building",s),s.data)if(r=s.entryPoint?s.entryPoint:Object.keys(s.data.nodes)[0],s.root&&document.getElementById(s.root.id)){if(d=document.getElementById(s.root.id),d.style.position="relative",d.classList.add("dn-root"),s.id){p=document.createElement("div"),p.id="dn-wrapper-"+s.id,p.classList.add("dn-wrapper"),p.style.width=s.root&&s.root.width?s.root.width:"100%",s.root&&s.root.height&&(p.style.height=s.root.height);const e=document.createElement("button");return e.id="dn-entry-button-"+s.id,e.classList.add("dn-entry-button"),e.innerText="Enter navigation area",e.addEventListener("click",a.enter),p.appendChild(e),o=document.createElement("div"),o.id="dn-exit-"+s.id,o.classList.add("dn-exit-position"),o.innerText="End of data structure.",o.setAttribute("aria-label","End of data structure."),o.setAttribute("role","note"),o.setAttribute("tabindex","-1"),o.style.display="none",o.addEventListener("focus",(()=>{o.style.display="block",u(l),n=l,l=null})),o.addEventListener("blur",(()=>{o.style.display="none"})),a.setNavigationKeyBindings(s.navigation),d.appendChild(p),d.appendChild(o),d}console.error("No id found: options.id must be specified for dataNavigator.build")}else console.error("No root element found, cannot build: options.root.id must reference an existing DOM element.");else console.error("No data found, cannot enter: options.data must contain a valid hash object of data for dn.build")},a.move=e=>{if(l){const t=s.data.nodes[l];if(t.edges){let a=null,r=0;const o=c[e],i=o.types||e,d=(e,s)=>{if(e!==s.type)return null;const a="string"==typeof s.target?s.target:s.target(t,l,n),r="string"==typeof s.source?s.source:s.source(t,l,n),i=r===l?1:a===l?-1:0,c=1===i?a:-1===i?r:null;return c&&i===o.direction?c:null};for(r=0;r<t.edges.length;r++){const e=s.data.edges[t.edges[r]];if(Array.isArray(i)?i.forEach((t=>{a||(a=d(t,e))})):a=d(i,e),a)break}a&&(console.log("target",s.data.nodes[a],s.data.nodes[a].description),b(a,l))}}},a.moveTo=e=>{const t=document.getElementById(e);t?(n=l,l=e,t.focus()):b(e,l)},a.enter=()=>{a.moveTo(r)},a.exit=()=>{o.style.display="block",o.focus()},a.hooks={},a.hooks.navigation=()=>{},a.hooks.focus=()=>{},a.hooks.selection=()=>{},a.hooks.keydown=()=>{},a.hooks.pointerClick=()=>{},a})({data:{nodes:{title:{d:{title:"Major Trophies for some English teams"},x:12,y:9,width:686,height:56,id:"title",cssClass:"dn-test-class",edges:["any-return","any-exit","title-legend"],description:"Major Trophies for some English teams"},legend:{d:{legend:"Contests Included: BPL, FA Cup, CL"},x:160,y:162,width:398,height:49,id:"legend",cssClass:"dn-test-class",edges:["any-return","any-exit","title-legend","legend-y_axis","legend-bpl"],description:"Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests."},y_axis:{d:{"Y Axis":"Label: Count trophies. Values range from 0 to 30 on a numerical scale."},x:21,y:311,width:39,height:194,id:"y_axis",cssClass:"dn-test-class",edges:["any-return","any-exit","legend-y_axis","y_axis-x_axis"],description:"Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale."},x_axis:{d:{"X Axis":"Teams included: Arsenal, Chelsea, Liverpool, Manchester United."},x:191,y:736,width:969,height:44,id:"x_axis",cssClass:"dn-test-class",edges:["any-return","any-exit","y_axis-x_axis","x_axis-arsenal"],description:"Teams included: Arsenal, Chelsea, Liverpool, Manchester United."},arsenal:{d:{team:"Arsenal","total trophies":17},x:194,y:370,width:122,height:357,id:"arsenal",cssClass:"dn-test-class",edges:["any-return","any-exit","x_axis-arsenal","any-x_axis","arsenal-bpl1","arsenal-chelsea","manchester-arsenal","any-legend"],description:s({team:"Arsenal","total trophies":17,contains:"3 contests"},{})},chelsea:{d:{team:"Chelsea","total trophies":15},x:458,y:414,width:122,height:312,id:"chelsea",cssClass:"dn-test-class",edges:["any-return","any-exit","any-x_axis","arsenal-chelsea","chelsea-bpl2","chelsea-liverpool","any-legend"],description:s({team:"Chelsea","total trophies":15,contains:"3 contests"},{})},liverpool:{d:{team:"Liverpool","total trophies":15},x:722,y:414,width:122,height:312,id:"liverpool",cssClass:"dn-test-class",edges:["any-return","any-exit","any-x_axis","chelsea-liverpool","liverpool-bpl3","liverpool-manchester","any-legend"],description:s({team:"Liverpool","total trophies":15,contains:"3 contests"},{})},manchester:{d:{team:"Manchester United","total trophies":28},x:986,y:138,width:122,height:589,id:"manchester",cssClass:"dn-test-class",edges:["any-return","any-exit","any-x_axis","liverpool-manchester","manchester-bpl4","manchester-arsenal","any-legend"],description:s({team:"Manchester","total trophies":28,contains:"3 contests"},{})},bpl:{d:{contest:"BPL","total trophies":22},x:194,y:138,width:918,height:378,path:"M987 136H985.762L985.21 137.108L848.762 411H720H584H457.309L321.603 368.093L321.309 368H321H196H194V370V430V432H196H320.431L458.948 517.701L459.431 518H460H584H584.579L585.069 517.69L720.579 432H850H850.152L850.303 431.977L987.152 411H1112H1114V409V138V136H1112H987Z",id:"bpl",cssClass:"dn-test-path",edges:["any-return","any-exit","legend-bpl","any-legend","bpl-bpl1","bpl-fa","cl-bpl"],description:s({contest:"BPL","total trophies":22,contains:"4 teams"},{})},fa:{d:{contest:"FA Cup","total trophies":42},x:194,y:414,width:918,height:311,path:"M987.407 412H987.263L987.119 412.021L849.712 432H722.274H721.698L721.211 432.306L586.141 517H459.707L324.059 432.304L323.573 432H323H196H194V434V725V727H196H323H323.288L323.564 726.919L459.421 687H586.717H587.298L587.788 686.689L722.855 601H849.414L986.563 664.813L986.965 665H987.407H1112H1114V663V414V412H1112H987.407Z",id:"fa",cssClass:"dn-test-path",edges:["any-return","any-exit","any-legend","bpl-fa","fa-fa1","fa-cl"],description:s({contest:"FA Cup","total trophies":42,contains:"4 teams"},{})},cl:{d:{contest:"CL","total trophies":11},x:194,y:609,width:918,height:116,path:"M321.731 723H191V727H322H457H585H721H849H987H1112H1114V725V666V664H1112H987.441L849.841 600.186L849.441 600H849H721H720.421L719.931 600.31L584.421 686H457H456.731L456.471 686.071L321.731 723Z",id:"cl",cssClass:"dn-test-path",edges:["any-return","any-exit","any-legend","fa-cl","cl-cl1","cl-bpl"],description:s({contest:"CL","total trophies":11,contains:"4 teams"},{})},bpl1:{d:{contest:"BPL",team:"Arsenal",trophies:3},x:194,y:370,width:122,height:62,id:"bpl1",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","arsenal-bpl1","bpl-bpl1","bpl1-fa1","cl1-bpl1","bpl1-bpl2","bpl4-bpl1"],description:s({contest:"BPL",team:"Arsenal",trophies:3},{})},fa1:{d:{contest:"FA Cup",team:"Arsenal",trophies:14},x:194,y:436,width:122,height:291,id:"fa1",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","arsenal-fa1","fa-fa1","bpl1-fa1","fa1-cl1","fa1-fa2","fa4-fa1"],description:s({contest:"FA Cup",team:"Arsenal",trophies:14},{})},cl1:{d:{contest:"CL",team:"Arsenal",trophies:0},x:194,y:727,width:122,height:0,id:"cl1",cssClass:"dn-test-class",edges:["any-return","any-exit","arsenal-cl1","any-legend","cl-cl1","fa1-cl1","cl1-bpl1","cl1-cl2","cl4-cl1"],description:s({contest:"CL",team:"Arsenal",trophies:0},{})},bpl2:{d:{contest:"BPL",team:"Chelsea",trophies:5},x:458,y:414,width:122,height:103,id:"bpl2",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","chelsea-bpl2","bpl2-fa2","cl2-bpl2","bpl1-bpl2","bpl2-bpl3"],description:s({contest:"BPL",team:"Chelsea",trophies:5},{})},fa2:{d:{contest:"FA Cup",team:"Chelsea",trophies:8},x:458,y:521,width:122,height:165,id:"fa2",cssClass:"dn-test-class",edges:["any-return","chelsea-fa2","any-exit","any-legend","bpl2-fa2","fa2-cl2","fa1-fa2","fa2-fa3"],description:s({contest:"FA Cup",team:"Chelsea",trophies:8},{})},cl2:{d:{contest:"CL",team:"Chelsea",trophies:2},x:458,y:691,width:122,height:35,id:"cl2",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","chelsea-cl2","fa2-cl2","cl2-bpl2","cl1-cl2","cl2-cl3"],description:s({contest:"CL",team:"Chelsea",trophies:2},{})},bpl3:{d:{contest:"BPL",team:"Liverpool",trophies:1},x:722,y:414,width:122,height:18,id:"bpl3",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","liverpool-bpl3","bpl3-fa3","cl3-bpl3","bpl2-bpl3","bpl3-bpl4"],description:s({contest:"BPL",team:"Liverpool",trophies:1},{})},fa3:{d:{contest:"FA Cup",team:"Liverpool",trophies:8},x:722,y:437,width:122,height:165,id:"fa3",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","liverpool-fa3","bpl3-fa3","fa3-cl3","fa2-fa3","fa3-fa4"],description:s({contest:"FA Cup",team:"Liverpool",trophies:8},{})},cl3:{d:{contest:"CL",team:"Liverpool",trophies:6},x:722,y:607,width:122,height:119,id:"cl3",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","liverpool-cl3","fa3-cl3","cl3-bpl3","cl2-cl3","cl3-cl4"],description:s({contest:"CL",team:"Liverpool",trophies:6},{})},bpl4:{d:{contest:"BPL",team:"Manchester United",trophies:13},x:986,y:138,width:122,height:273,id:"bpl4",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","manchester-bpl4","bpl4-fa4","cl4-bpl4","bpl3-bpl4","bpl4-bpl1"],description:s({contest:"BPL",team:"Manchester United",trophies:13},{})},fa4:{d:{contest:"FA Cup",team:"Manchester United",trophies:12},x:986,y:414,width:122,height:250,id:"fa4",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","manchester-fa4","bpl4-fa4","fa4-cl4","fa3-fa4","fa4-fa1"],description:s({contest:"FA Cup",team:"Manchester United",trophies:12},{})},cl4:{d:{contest:"CL",team:"Manchester United",trophies:3},x:986,y:667,width:122,height:58,id:"cl4",cssClass:"dn-test-class",edges:["any-return","any-exit","any-legend","manchester-cl4","fa4-cl4","cl4-bpl4","cl3-cl4","cl4-cl1"],description:s({contest:"CL",team:"Manchester United",trophies:3},{})}},edges:{"any-legend":{source:(e,t,s)=>t,target:(e,t,s)=>{const a=!!+t.substring(t.length-1);return console.log('hasParent ? current.substring(0,current.length-1) : "legend"',a?t.substring(0,t.length-1):"legend"),a?t.substring(0,t.length-1):"legend"},type:"legend"},"any-x_axis":{source:(e,t,s)=>t,target:"x_axis",type:"parent"},"any-return":{source:(e,t,s)=>t,target:(e,t,s)=>s,type:"returnTo"},"any-exit":{source:(e,t,s)=>t,target:()=>(a.exit(),""),type:"exit"},"x_axis-exit":{source:"x_axis",target:()=>(a.exit(),""),type:"exit"},"x_axis-arsenal":{source:"x_axis",target:"arsenal",type:"child"},"arsenal-bpl1":{source:"arsenal",target:"bpl1",type:"child"},"arsenal-fa1":{source:"arsenal",target:"fa1",type:"child"},"arsenal-cl1":{source:"arsenal",target:"cl1",type:"child"},"chelsea-fa2":{source:"chelsea",target:"fa2",type:"child"},"chelsea-cl2":{source:"chelsea",target:"cl2",type:"child"},"liverpool-fa3":{source:"liverpool",target:"fa3",type:"child"},"liverpool-cl3":{source:"liverpool",target:"cl3",type:"child"},"manchester-fa4":{source:"manchester",target:"fa4",type:"child"},"manchester-cl4":{source:"manchester",target:"cl4",type:"child"},"arsenal-chelsea":{source:"arsenal",target:"chelsea",type:"team"},"manchester-arsenal":{source:"manchester",target:"arsenal",type:"team"},"title-legend":{source:"title",target:"legend",type:"chart"},"legend-y_axis":{source:"legend",target:"y_axis",type:"chart"},"legend-bpl":{source:"legend",target:"bpl",type:"child"},"y_axis-x_axis":{source:"y_axis",target:"x_axis",type:"chart"},"chelsea-bpl2":{source:"chelsea",target:"bpl2",type:"child"},"chelsea-liverpool":{source:"chelsea",target:"liverpool",type:"team"},"liverpool-bpl3":{source:"liverpool",target:"bpl3",type:"child"},"liverpool-manchester":{source:"liverpool",target:"manchester",type:"team"},"manchester-bpl4":{source:"manchester",target:"bpl4",type:"child"},"bpl-bpl1":{source:"bpl",target:"bpl1",type:"child"},"bpl-fa":{source:"bpl",target:"fa",type:"contest"},"cl-bpl":{source:"cl",target:"bpl",type:"contest"},"fa-fa1":{source:"fa",target:"fa1",type:"child"},"fa-cl":{source:"fa",target:"cl",type:"contest"},"cl-cl1":{source:"cl",target:"cl1",type:"child"},"bpl1-fa1":{source:"bpl1",target:"fa1",type:"contest"},"cl1-bpl1":{source:"cl1",target:"bpl1",type:"contest"},"bpl1-bpl2":{source:"bpl1",target:"bpl2",type:"team"},"bpl4-bpl1":{source:"bpl4",target:"bpl1",type:"team"},"fa1-cl1":{source:"fa1",target:"cl1",type:"contest"},"fa1-fa2":{source:"fa1",target:"fa2",type:"team"},"fa4-fa1":{source:"fa4",target:"fa1",type:"team"},"cl1-cl2":{source:"cl1",target:"cl2",type:"team"},"cl4-cl1":{source:"cl4",target:"cl1",type:"team"},"bpl2-fa2":{source:"bpl2",target:"fa2",type:"contest"},"cl2-bpl2":{source:"cl2",target:"bpl2",type:"contest"},"bpl2-bpl3":{source:"bpl2",target:"bpl3",type:"team"},"fa2-cl2":{source:"fa2",target:"cl2",type:"contest"},"fa2-fa3":{source:"fa2",target:"fa3",type:"team"},"cl2-cl3":{source:"cl2",target:"cl3",type:"team"},"bpl3-fa3":{source:"bpl3",target:"fa3",type:"contest"},"cl3-bpl3":{source:"cl3",target:"bpl3",type:"contest"},"bpl3-bpl4":{source:"bpl3",target:"bpl4",type:"team"},"fa3-cl3":{source:"fa3",target:"cl3",type:"contest"},"fa3-fa4":{source:"fa3",target:"fa4",type:"team"},"cl3-cl4":{source:"cl3",target:"cl4",type:"team"},"bpl4-fa4":{source:"bpl4",target:"fa4",type:"contest"},"cl4-bpl4":{source:"cl4",target:"bpl4",type:"contest"},"fa4-cl4":{source:"fa4",target:"cl4",type:"contest"}}},id:"data-navigator-schema",entryPoint:"title",rendering:"on-demand",manualEventHandling:!1,root:{id:"root",cssClass:"",width:"100%",height:0},navigation:{right:{types:["team"],key:"ArrowRight",direction:1},left:{types:["team"],key:"ArrowLeft",direction:-1},down:{types:["contest","chart","x_axis-exit"],key:"ArrowDown",direction:1},up:{types:["contest","chart"],key:"ArrowUp",direction:-1},child:{types:["child"],key:"Enter",direction:1},parent:{types:["child"],key:"Backspace",direction:-1},exit:{types:["exit"],key:"Escape",direction:1},"previous position":{types:["returnTo"],key:"Period",direction:1},legend:{types:["legend"],key:"KeyL",direction:1}},hooks:{navigation:e=>{console.log("navigating",e)},focus:e=>{console.log("focus",e)},selection:e=>{console.log("selection",e)},keydown:e=>{console.log("keydown",e)},pointerClick:e=>{console.log("clicked",e)}}});a.build(),window.dn=a;const l=new Hammer(document.body,{});l.get("pinch").set({enable:!1}),l.get("rotate").set({enable:!1}),l.get("pan").set({enable:!1}),l.get("swipe").set({direction:Hammer.DIRECTION_ALL,velocity:.2}),l.on("press",(e=>{})),l.on("pressup",(e=>{a.enter()})),l.on("swipe",(e=>{const t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?"X":"Y",s=(Math.abs(e["delta"+t])+1e-9)/(Math.abs(e["delta"+("X"===t?"Y":"X")])+1e-9),l=e.deltaX<0,n=e.deltaX>0,r=e.deltaY<0,o=e.deltaY>0,i=s>.99&&s<=2?n&&r?"forward":n&&o?"child":l&&o?"backward":l&&r?"parent":null:n&&"X"===t?"right":o&&"Y"===t?"down":l&&"X"===t?"left":r&&"Y"===t?"up":null;a.getCurrentFocus()&&i&&a.move(i)}))})();