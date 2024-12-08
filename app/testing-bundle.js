(()=>{"use strict";var e={312:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.NodeElementDefaults=t.GenericLimitedNavigationRules=t.GenericFullNavigationPairs=t.GenericFullNavigationDimensions=t.GenericFullNavigationRules=t.defaultKeyBindings=void 0,t.defaultKeyBindings={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down",Period:"forward",Comma:"backward",Escape:"parent",Enter:"child"},t.GenericFullNavigationRules={down:{keyCode:"ArrowDown",direction:"target"},left:{keyCode:"ArrowLeft",direction:"source"},right:{keyCode:"ArrowRight",direction:"target"},up:{keyCode:"ArrowUp",direction:"source"},backward:{keyCode:"Comma",direction:"source"},child:{keyCode:"Enter",direction:"target"},parent:{keyCode:"Backspace",direction:"source"},forward:{keyCode:"Period",direction:"target"},exit:{keyCode:"Escape",direction:"target"},undo:{keyCode:"KeyZ",direction:"target"}},t.GenericFullNavigationDimensions=[["left","right"],["up","down"],["backward","forward"],["previous","next"]],t.GenericFullNavigationPairs={left:["left","right"],right:["left","right"],up:["up","down"],down:["up","down"],backward:["backward","forward"],forward:["backward","forward"],previous:["previous","next"],next:["previous","next"],parent:["parent","child"],child:["parent","child"],exit:["exit","undo"],undo:["undo","undo"]},t.GenericLimitedNavigationRules={right:{key:"ArrowRight",direction:"target"},left:{key:"ArrowLeft",direction:"source"},down:{key:"ArrowDown",direction:"target"},up:{key:"ArrowUp",direction:"source"},child:{key:"Enter",direction:"target"},parent:{key:"Backspace",direction:"source"},exit:{key:"Escape",direction:"target"},undo:{key:"Period",direction:"target"},legend:{key:"KeyL",direction:"target"}},t.NodeElementDefaults={cssClass:"",spatialProperties:{x:0,y:0,width:0,height:0,path:""},semantics:{label:"",elementType:"div",role:"image",attributes:void 0},parentSemantics:{label:"",elementType:"figure",role:"figure",attributes:void 0},existingElement:{useForSpatialProperties:!1,spatialProperties:void 0}}},607:(e,t,i)=>{var n=i(4),o=i(489),r=i(992);t.Z={structure:n.default,input:o.default,rendering:r.default}},489:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:!0});var n=i(312);t.default=function(e){var t={},i=n.defaultKeyBindings,o=n.GenericFullNavigationRules;return t.moveTo=function(t){var i=e.structure.nodes[t];if(i)return i},t.move=function(i,n){if(i){var r=e.structure.nodes[i];if(r.edges){var a=null,s=0,d=o[n];if(!d)return;var u=function(){var t=e.structure.edges[r.edges[s]];if(t.navigationRules.forEach((function(e){a||(a=function(e,t){if(e!==n)return null;var o={target:"string"==typeof t.target?t.target:t.target(r,i),source:"string"==typeof t.source?t.source:t.source(r,i)};return o[d.direction]!==i?o[d.direction]:null}(e,t))})),a)return"break"};for(s=0;s<r.edges.length&&"break"!==u();s++);return a?t.moveTo(a):void 0}}},t.enter=function(){return e.entryPoint?t.moveTo(e.entryPoint):void console.error("No entry point was specified in InputOptions, returning undefined")},t.exit=function(){return e.exitPoint?e.exitPoint:void console.error("No exit point was specified in InputOptions, returning undefined")},t.keydownValidator=function(e){var t=i[e.code];if(t)return t},t.focus=function(e){var t=document.getElementById(e);t&&t.focus()},t.setNavigationKeyBindings=function(e){e?(i={},o=e,Object.keys(e).forEach((function(t){var n=e[t];i[n.key]=t}))):(i=n.defaultKeyBindings,o=n.GenericFullNavigationRules)},t.setNavigationKeyBindings(e.navigationRules),t}},992:function(e,t,i){var n=this&&this.__assign||function(){return n=Object.assign||function(e){for(var t,i=1,n=arguments.length;i<n;i++)for(var o in t=arguments[i])Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o]);return e},n.apply(this,arguments)},o=this&&this.__spreadArray||function(e,t,i){if(i||2===arguments.length)for(var n,o=0,r=t.length;o<r;o++)!n&&o in t||(n||(n=Array.prototype.slice.call(t,0,o)),n[o]=t[o]);return e.concat(n||Array.prototype.slice.call(t))};Object.defineProperty(t,"__esModule",{value:!0});var r=i(312);t.default=function(e){var t=function(e){a.wrapper.setAttribute("aria-activedescendant",e.srcElement.id)},i=function(){a.wrapper.setAttribute("aria-activedescendant","")},a={},s=!1,d={cssClass:r.NodeElementDefaults.cssClass,spatialProperties:n({},r.NodeElementDefaults.spatialProperties),semantics:n({},r.NodeElementDefaults.semantics),parentSemantics:n({},r.NodeElementDefaults.parentSemantics),existingElement:n({},r.NodeElementDefaults.existingElement)};return e.defaults&&(d.cssClass=e.defaults.cssClass||d.cssClass,d.spatialProperties=e.defaults.spatialProperties?n(n({},d.spatialProperties),e.defaults.spatialProperties):d.spatialProperties,d.semantics=e.defaults.semantics?n(n({},d.semantics),e.defaults.semantics):d.semantics,d.parentSemantics=e.defaults.parentSemantics?n(n({},d.parentSemantics),e.defaults.parentSemantics):d.parentSemantics,d.existingElement=e.defaults.existingElement?n(n({},d.existingElement),e.defaults.existingElement):d.existingElement),a.initialize=function(){var t;if(s)console.error("The renderer wrapper has already been initialized successfully, RenderingOptions.suffixId is: ".concat(e.suffixId,". No further action was taken."));else if(e.root&&document.getElementById(e.root.id)){if(a.root=document.getElementById(e.root.id),a.root.style.position="relative",a.root.classList.add("dn-root"),e.suffixId)return a.wrapper=document.createElement("div"),a.wrapper.id="dn-wrapper-"+e.suffixId,a.wrapper.setAttribute("role","application"),a.wrapper.setAttribute("aria-label",e.root.description||"Data navigation structure"),a.wrapper.setAttribute("aria-activedescendant",""),a.wrapper.classList.add("dn-wrapper"),a.wrapper.style.width=e.root&&e.root.width?e.root.width:"100%",e.root&&e.root.height&&(a.wrapper.style.height=e.root.height),e.entryButton&&e.entryButton.include&&(a.entryButton=document.createElement("button"),a.entryButton.id="dn-entry-button-"+e.suffixId,a.entryButton.classList.add("dn-entry-button"),a.entryButton.innerText="Enter navigation area",e.entryButton.callbacks&&e.entryButton.callbacks.click&&a.entryButton.addEventListener("click",e.entryButton.callbacks.click),e.entryButton.callbacks&&e.entryButton.callbacks.focus&&a.entryButton.addEventListener("focus",e.entryButton.callbacks.focus),a.wrapper.appendChild(a.entryButton)),a.root.appendChild(a.wrapper),(null===(t=e.exitElement)||void 0===t?void 0:t.include)&&(a.exitElement=document.createElement("div"),a.exitElement.id="dn-exit-"+e.suffixId,a.exitElement.classList.add("dn-exit-position"),a.exitElement.innerText="End of data structure.",a.exitElement.setAttribute("aria-label","End of data structure."),a.exitElement.setAttribute("role","note"),a.exitElement.setAttribute("tabindex","-1"),a.exitElement.style.display="none",a.exitElement.addEventListener("focus",(function(t){var i,n;a.exitElement.style.display="block",a.clearStructure(),(null===(n=null===(i=e.exitElement)||void 0===i?void 0:i.callbacks)||void 0===n?void 0:n.focus)&&e.exitElement.callbacks.focus(t)})),a.exitElement.addEventListener("blur",(function(t){var i,n;a.exitElement.style.display="none",(null===(n=null===(i=e.exitElement)||void 0===i?void 0:i.callbacks)||void 0===n?void 0:n.blur)&&e.exitElement.callbacks.blur(t)})),a.root.appendChild(a.exitElement)),s=!0,a.root;console.error("No suffix id found: options.suffixId must be specified.")}else console.error("No root element found, cannot build: RenderingOptions.root.id must reference an existing DOM element in order to render children.")},a.render=function(n){var o=n.renderId+"",r=e.elementData[o];if(r){if(s){var u=!1,l={},c=function(e,t,i){var o=r[e]||d[e],a=i&&u?l[t]:o[t],s=d[e][t];return"function"==typeof o?o(r,n.datum):"function"==typeof a?a(r,n.datum):a||s||(t?void 0:o)};u=c("existingElement","useForSpatialProperties"),l=c("existingElement","spatialProperties");var v=parseFloat(c("spatialProperties","width",!0)||0),p=parseFloat(c("spatialProperties","height",!0)||0),g=parseFloat(c("spatialProperties","x",!0)||0),f=parseFloat(c("spatialProperties","y",!0)||0),y=document.createElement(c("parentSemantics","elementType")),m=c("parentSemantics","attributes");"object"==typeof m&&Object.keys(m).forEach((function(e){y.setAttribute(e,m[e])})),y.setAttribute("role",c("parentSemantics","role")),y.id=o,y.classList.add("dn-node"),y.classList.add(c("cssClass")),y.style.width=v+"px",y.style.height=p+"px",y.style.left=g+"px",y.style.top=f+"px",y.setAttribute("tabindex","0"),y.addEventListener("focus",t),y.addEventListener("blur",i);var h=document.createElement(c("semantics","elementType")),b=c("semantics","attributes");"object"==typeof b&&Object.keys(b).forEach((function(e){y.setAttribute(e,b[e])})),h.setAttribute("role",c("semantics","role")),h.classList.add("dn-node-text"),r.showText&&(h.innerText=r.semantics.label);var x=c("semantics","label");x||console.error("Accessibility error: a label must be supplied to every rendered element using semantics.label."),h.setAttribute("aria-label",x),y.appendChild(h);var E=c("spatialProperties","path");if(E){var k=v+g+10,w=p+f+10,O=document.createElementNS("http://www.w3.org/2000/svg","svg");O.setAttribute("width",k+""),O.setAttribute("height",w+""),O.setAttribute("viewBox","0 0 ".concat(k," ").concat(w)),O.style.left=-g+"px",O.style.top=-f+"px",O.classList.add("dn-node-svg"),O.setAttribute("role","presentation"),O.setAttribute("focusable","false");var I=document.createElementNS("http://www.w3.org/2000/svg","path");I.setAttribute("d",E),I.classList.add("dn-node-path"),O.appendChild(I),y.appendChild(O)}return a.wrapper.appendChild(y),y}console.error("render() was called before initialize(), renderer must be initialized first.")}else console.warn("Render data not found with renderId: ".concat(o,". Failed to render."))},a.remove=function(e){var n=document.getElementById(e);a.wrapper.getAttribute("aria-activedescendant")===e&&a.wrapper.setAttribute("aria-activedescendant",""),n&&(n.removeEventListener("focus",t),n.removeEventListener("blur",i),n.remove())},a.clearStructure=function(){o([],a.wrapper.children,!0).forEach((function(e){a.entryButton&&a.entryButton===e||a.remove(e.id)}))},a}},4:function(e,t,i){var n=this&&this.__assign||function(){return n=Object.assign||function(e){for(var t,i=1,n=arguments.length;i<n;i++)for(var o in t=arguments[i])Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o]);return e},n.apply(this,arguments)},o=this&&this.__spreadArray||function(e,t,i){if(i||2===arguments.length)for(var n,o=0,r=t.length;o<r;o++)!n&&o in t||(n||(n=Array.prototype.slice.call(t,0,o)),n[o]=t[o]);return e.concat(n||Array.prototype.slice.call(t))};Object.defineProperty(t,"__esModule",{value:!0}),t.buildStructure=t.buildRules=t.buildEdges=t.scaffoldDimensions=t.bulidNodes=t.addSimpleDataIDs=t.createValidId=t.buildNodeStructureFromVegaLite=void 0;var r=i(312),a=i(5);t.default=function(e){return"vega-lite"===e.dataType||"vl"===e.dataType||"Vega-Lite"===e.dataType?(0,t.buildNodeStructureFromVegaLite)(e):(0,t.buildStructure)(e)},t.buildNodeStructureFromVegaLite=function(e){var t=r.GenericLimitedNavigationRules,i={},n={},o={},s=0,d=e.groupInclusionCriteria?e.groupInclusionCriteria:function(){return!0},u=e.itemInclusionCriteria?e.itemInclusionCriteria:function(){return!0},l=e.datumInclusionCriteria?e.datumInclusionCriteria:function(){return!0},c=e.vegaLiteView._renderer._origin,v=e.vegaLiteView._scenegraph.root.items[0].mark.items[0],p=function(e,t){if(e["data-navigator-id"])return e["data-navigator-id"];var i="dn-node-".concat(t,"-").concat(s);return s++,e["data-navigator-id"]=i,i},g=function(t,n,r,s,d){var u=p(t,n),c="render-"+u,v=r||[0,0];i[u]={},i[u].d={},i[u].id=u,i[u].renderId=c,i[u].index=s,i[u].level=n,i[u].parent=d,o[c]={},o[c].renderId=c,o[c].spatialProperties={},o[c].spatialProperties.x=t.bounds.x1+v[0],o[c].spatialProperties.y=t.bounds.y1+v[1],o[c].spatialProperties.width=t.bounds.x2-t.bounds.x1,o[c].spatialProperties.height=t.bounds.y2-t.bounds.y1,o[c].cssClass="dn-vega-lite-node",t.datum&&Object.keys(t.datum).forEach((function(o){var r=t.datum[o];l(o,r,t.datum,n,e.vegaLiteSpec)&&(i[u].d[e.keyRenamingHash&&e.keyRenamingHash[o]?e.keyRenamingHash[o]:o]=r)})),o[c].semantics={},o[c].semantics.label=e.nodeDescriber?e.nodeDescriber(i[u].d,t,n):(0,a.describeNode)(i[u].d)},f=0;return v.items.forEach((function(t){if(d(t,f,e.vegaLiteSpec)){g(t,"group",c,f,v);var i=0,n=t.items[0].mark.items[0].items?t.items[0].mark.items[0]:t;n.items.forEach((function(o){u(o,i,t,e.vegaLiteSpec)&&g(o,"item",c,i,n),i++}))}f++})),Object.keys(i).forEach((function(t){i[t].edges=function(t){var o=i[t],r=o.index,a=o.level,s=o.parent,d=[],u=s.items[r-1];if(u){var l=p(u,a);if(i[l]){var c="".concat(l,"-").concat(o.id);d.push(c),n[c]||(n[c]={source:l,target:o.id,navigationRules:["left","right"]})}}var v=s.items[r+1];if(v){var g=p(v,a);if(i[g]){var f="".concat(o.id,"-").concat(g);d.push(f),n[f]||(n[f]={source:o.id,target:g,navigationRules:["left","right"]})}}if("group"===a&&s.items[r].items){var y=(s.items[r].items[0].mark.items[0].items||s.items[r].items)[0],m=p(y,"item");if(i[m]){var h="".concat(o.id,"-").concat(m);d.push(h),n[h]||(n[h]={source:o.id,target:m,navigationRules:["parent","child"]})}}else if("item"===a){var b=p(s,"group");if(i[b]){var x="".concat(b,"-").concat(o.id);d.push(x),n[x]||(n[x]={source:b,target:o.id,navigationRules:["parent","child"]})}}return e.exitFunction&&(d.push("any-exit"),n["any-exit"]||(n["any-exit"]={source:e.getCurrent,target:e.exitFunction,navigationRules:["exit"]})),d.push("any-undo"),n["any-undo"]||(n["any-undo"]={source:e.getCurrent,target:e.getPrevious,navigationRules:["undo"]}),d}(t)})),{nodes:i,edges:n,elementData:o,navigationRules:t}},t.createValidId=function(e){return"_"+e.replace(/[^a-zA-Z0-9_-]+/g,"_")},t.addSimpleDataIDs=function(e){var t=0,i={};e.data.forEach((function(n){var o="function"==typeof e.idKey?e.idKey(n):e.idKey;n[o]="_"+t,e.keysForIdGeneration&&e.keysForIdGeneration.forEach((function(e){e in n&&("string"==typeof n[e]?(i[e]||(i[e]=0),i[n[e]]||(i[n[e]]=0),n[o]+="_"+e+i[e]+"_"+n[e]+i[n[e]],i[e]++,i[n[e]]++):(i[e]||(i[e]=0),n[o]+="_"+e+i[e],i[e]++))})),t++}))},t.bulidNodes=function(e){var t={};return e.data.forEach((function(i){e.idKey||console.error("Building nodes. A key string must be supplied in options.idKey to specify the id keys of every node.");var n="function"==typeof e.idKey?e.idKey(i):e.idKey,o=i[n];if(o)if(t[o])console.error("Building nodes. Each id for data in options.data must be unique. This id is not unique: ".concat(o,"."));else{var r="function"==typeof e.renderIdKey?e.renderIdKey(i):e.renderIdKey;t[o]={id:o,edges:[],renderId:r?i[r]||"":i.renderIdKey||"",data:i}}else console.error("Building nodes. Each datum in options.data must contain an id. When matching the id key string ".concat(n,", this datum has no id: ").concat(JSON.stringify(i),"."))})),t},t.scaffoldDimensions=function(e,i){var a={},s=o([],r.GenericFullNavigationDimensions,!0);return e.data.forEach((function(r){var d=e.dimensions.values||[],u=0;d.forEach((function(d){var l,c,v,p,g,f,y;if(d.dimensionKey){if(d.dimensionKey in r){var m=r[d.dimensionKey],h="function"!=typeof(null===(l=d.operations)||void 0===l?void 0:l.filterFunction)||d.operations.filterFunction(r,d);if(void 0!==m&&h){if(d.type||(d.type="bigint"==typeof m||"number"==typeof m?"numerical":"categorical"),!a[d.dimensionKey]){var b="function"==typeof d.nodeId?d.nodeId(d,e.data):d.nodeId||(0,t.createValidId)(d.dimensionKey),x="function"==typeof d.renderId?d.renderId(d,e.data):d.renderId||b;a[d.dimensionKey]={dimensionKey:d.dimensionKey,nodeId:b,divisions:{},numericalExtents:[1/0,-1/0],type:d.type,sortFunction:(null===(c=d.operations)||void 0===c?void 0:c.sortFunction)||void 0,behavior:d.behavior||{extents:"circular"},navigationRules:d.navigationRules||{sibling_sibling:s.length?o([],s.shift(),!0):["previous_"+d.dimensionKey,"next_"+d.dimensionKey],parent_child:["parent_"+d.dimensionKey,"child"]}},i[b]={id:b,renderId:x,derivedNode:d.dimensionKey,edges:[],data:a[d.dimensionKey],renderingStrategy:d.renderingStrategy||"singleSquare"}}var E=a[d.dimensionKey],k=null;if("categorical"===d.type){var w="function"==typeof(null===(v=d.divisionOptions)||void 0===v?void 0:v.divisionNodeIds)?d.divisionOptions.divisionNodeIds(d.dimensionKey,m,u):E.nodeId+"_"+m;if(!(k=E.divisions[w])){k=E.divisions[w]={id:w,sortFunction:(null===(p=d.divisionOptions)||void 0===p?void 0:p.sortFunction)||void 0,values:{}};var O="function"==typeof(null===(g=d.divisionOptions)||void 0===g?void 0:g.divisionRenderIds)?d.divisionOptions.divisionRenderIds(d.dimensionKey,m,u):w;i[w]={id:w,renderId:O,derivedNode:d.dimensionKey,edges:[],data:n({},k),renderingStrategy:(null===(f=d.divisionOptions)||void 0===f?void 0:f.renderingStrategy)||"singleSquare"},i[w].data[d.dimensionKey]=m}}else{(k=E.divisions[E.nodeId])||(k=E.divisions[E.nodeId]={id:E.nodeId,sortFunction:(null===(y=d.divisionOptions)||void 0===y?void 0:y.sortFunction)||void 0,values:{}}),d.operations||(d.operations={});var I=d.operations.createNumericalSubdivisions;E.subdivisions="number"==typeof I&&I<1?1:I||1,1!==I&&(E.divisionOptions||(E.divisionOptions=d.divisionOptions),function(e,t){var i=t.numericalExtents[0],n=t.numericalExtents[1];t.numericalExtents[0]=i<e?i:e,t.numericalExtents[1]=n>e?n:e}(m,E))}var K="function"==typeof e.idKey?e.idKey(r):e.idKey;k.values[r[K]]=r}}u++}else console.error("Building nodes, parsing dimensions. Each dimension in options.dimensions must contain a dimensionKey. This dimension has no key: ".concat(JSON.stringify(d),"."))}))})),Object.keys(a).forEach((function(e){var t,n,o,r,s=a[e],d=s.divisions;if("numerical"===s.type){d[s.nodeId].values=Object.fromEntries(Object.entries(d[s.nodeId].values).sort((function(t,i){return"function"==typeof s.sortFunction?s.sortFunction(t[1],i[1],s):t[1][e]-i[1][e]})));var u=d[s.nodeId].values;if(s.numericalExtents[0]!==1/0&&1!==s.subdivisions){var l=Object.keys(u),c="function"==typeof s.subdivisions?s.subdivisions(e,u):s.subdivisions,v=(s.numericalExtents[1]-s.numericalExtents[0])/c,p=s.numericalExtents[0]+v,g=0;for(p=s.numericalExtents[0]+v;p<=s.numericalExtents[1];p+=v){var f="function"==typeof(null===(t=s.divisionOptions)||void 0===t?void 0:t.divisionNodeIds)?s.divisionOptions.divisionNodeIds(e,p,p):s.nodeId+"_"+p;s.divisions[f]={id:f,sortFunction:(null===(n=s.divisionOptions)||void 0===n?void 0:n.sortFunction)||void 0,values:{}};var y="function"==typeof(null===(o=s.divisionOptions)||void 0===o?void 0:o.divisionRenderIds)?s.divisionOptions.divisionRenderIds(e,p,p):f;i[f]={id:f,renderId:y,derivedNode:e,edges:[],data:s.divisions[f],renderingStrategy:(null===(r=s.divisionOptions)||void 0===r?void 0:r.renderingStrategy)||"singleSquare"};for(var m=!1;!m&&g<l.length;){var h=u[l[g]];h[e]<=p?s.divisions[f].values[h.id]=h:(p+=v,m=!0),g++}}delete d[e]}}else"function"==typeof s.sortFunction&&(s.divisions=Object.fromEntries(Object.entries(d).sort((function(e,t){return s.sortFunction(e[1],t[1],s)}))));Object.keys(s.divisions).forEach((function(e){var t=s.divisions[e];"function"==typeof t.sortFunction&&(t.values=Object.fromEntries(Object.entries(t.values).sort((function(e,i){return s.sortFunction(e[1],i[1],t)}))))}))})),e.dimensions.adjustDimensions&&(a=e.dimensions.adjustDimensions(a)),a},t.buildEdges=function(e,t,i){var n,r,a,s,d,u,l,c,v,p,g={},f=function(e,i,n){var r,a="".concat(e,"-").concat(i);g[a]&&n?(r=g[a].navigationRules).push.apply(r,n):g[a]={source:e,target:i,navigationRules:n?o([],n,!0):[]},-1===t[e].edges.indexOf(a)&&t[e].edges.push(a),-1===t[i].edges.indexOf(a)&&t[i].edges.push(a)};if(i&&Object.keys(i).length){var y=Object.keys(i),m=null===(a=null===(r=null===(n=e.dimensions)||void 0===n?void 0:n.parentOptions)||void 0===r?void 0:r.level1Options)||void 0===a?void 0:a.order,h=m||y,b=0,x=(null===(s=e.dimensions)||void 0===s?void 0:s.parentOptions)||{},E=(null===(u=null===(d=x.level1Options)||void 0===d?void 0:d.behavior)||void 0===u?void 0:u.extents)||"terminal",k=x.addLevel0,w=k?(null===(c=null===(l=x.level1Options)||void 0===l?void 0:l.navigationRules)||void 0===c?void 0:c.parent_child)||["parent_level0","child_level1"]:[],O=(null===(p=null===(v=x.level1Options)||void 0===v?void 0:v.navigationRules)||void 0===p?void 0:p.sibling_sibling)||["previous_level1","next_level1"],I="string"==typeof h[0]?m?t[h[0]]:t[i[h[0]].nodeId]:h[0];k&&f(k.id,I.id,w),h.forEach((function(e){var n="string"==typeof e?m?t[e]:t[i[e].nodeId]:e;if(n!==e||t[n.id]||(t[n.id]=n),k&&f(n.id,k.id,w),b===h.length-1&&"circular"===E)f(n.id,I.id,O);else if(b===h.length-1&&"bridgedCustom"===E)f(n.id,x.level1Options.behavior.customBridgePost,O);else if(b<h.length-1){var o="string"==typeof h[b+1]?m?t[h[b+1]]:t[i[h[b+1]].nodeId]:h[b+1];f(n.id,o.id,O)}b||"bridgedCustom"!==E||f(x.level1Options.behavior.customBridgePost,n.id,O),b++})),y.forEach((function(t){var n,o=i[t],r=(null===(n=o.behavior)||void 0===n?void 0:n.extents)||"circular";o.divisions||console.error("Parsing dimensions. The dimension using the key ".concat(t," is missing the divisions property. dimension.divisions should be supplied. ").concat(JSON.stringify(o),"."));var a=Object.keys(o.divisions),s=0;a.forEach((function(t){var i=o.divisions[t];s!==a.length-1||"circular"!==r&&"bridgedCousins"!==r&&"bridgedCustom"!==r?s<a.length-1&&f(i.id,o.divisions[a[s+1]].id,o.navigationRules.sibling_sibling):f(i.id,o.divisions[a[0]].id,o.navigationRules.sibling_sibling);var n=Object.keys(i.values);f(i.id,o.nodeId,o.navigationRules.parent_child);var d="function"==typeof e.idKey?e.idKey(i.values[n[0]]):e.idKey;f(i.id,i.values[n[0]][d],o.navigationRules.parent_child);var u=0;n.length>1&&n.forEach((function(t){var d=i.values[t],l="function"==typeof e.idKey?e.idKey(d):e.idKey;if(f(d[l],i.id,o.navigationRules.parent_child),u===n.length-1&&"circular"===r){var c="function"==typeof e.idKey?e.idKey(i.values[n[0]]):e.idKey;f(d[l],i.values[n[0]][c],o.navigationRules.sibling_sibling)}else u===n.length-1&&"bridgedCousins"===r?s!==a.length-1?(c="function"==typeof e.idKey?e.idKey(o.divisions[a[s+1]].values[n[0]]):e.idKey,f(d[l],o.divisions[a[s+1]].values[n[0]][c],o.navigationRules.sibling_sibling)):(c="function"==typeof e.idKey?e.idKey(o.divisions[a[0]].values[n[0]]):e.idKey,f(d[l],o.divisions[a[0]].values[n[0]][c],o.navigationRules.sibling_sibling)):u===n.length-1&&"bridgedCustom"===r?f(d[l],o.behavior.customBridgePost,o.navigationRules.sibling_sibling):u<n.length-1&&(c="function"==typeof e.idKey?e.idKey(i.values[n[u+1]]):e.idKey,f(d[l],i.values[n[u+1]][c],o.navigationRules.sibling_sibling));u||"bridgedCousins"!==r?u||"bridgedCustom"!==r||f(o.behavior.customBridgePrevious,d[l],o.navigationRules.sibling_sibling):0!==s?(c="function"==typeof e.idKey?e.idKey(o.divisions[a[s-1]].values[n[n.length-1]]):e.idKey,f(o.divisions[a[s-1]].values[n[n.length-1]][c],d[l],o.navigationRules.sibling_sibling)):(c="function"==typeof e.idKey?e.idKey(o.divisions[a[a.length-1]].values[n[n.length-1]]):e.idKey,f(o.divisions[a[a.length-1]].values[n[n.length-1]][c],d[l],o.navigationRules.sibling_sibling)),u++})),s++}))}))}return Object.keys(t).forEach((function(i){var n,o=t[i];(null===(n=e.genericEdges)||void 0===n?void 0:n.length)&&e.genericEdges.forEach((function(e){g[e.edgeId]||(g[e.edgeId]=e.edge),(!e.conditional||e.conditional&&e.conditional(o,e))&&o.edges.push(e.edgeId)}))})),g},t.buildRules=function(e){return console.log("buildRules() still needs to be sorted out! we are making rules when we buildEdges"),e.navigationRules||r.GenericFullNavigationRules},t.buildStructure=function(e){e.addIds&&(0,t.addSimpleDataIDs)(e);var i=(0,t.bulidNodes)(e),n=(0,t.scaffoldDimensions)(e,i);return{nodes:i,edges:(0,t.buildEdges)(e,i,n),dimensions:n,navigationRules:(0,t.buildRules)(e)}}},5:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.describeNode=void 0,t.describeNode=function(e,t){var i=Object.keys(e),n="";return i.forEach((function(i){n+="".concat(t&&t.omitKeyNames?"":i+": ").concat(e[i],". ")})),n+=t&&t.semanticLabel||"Data point."}}},t={};function i(n){var o=t[n];if(void 0!==o)return o.exports;var r=t[n]={exports:{}};return e[n].call(r.exports,r,r.exports,i),r.exports}(()=>{var e=i(607);const t=e=>{let t=[];return Object.keys(e).forEach((i=>{t.push(e[i])})),t},n=(e,i,n,o)=>{let r=function({nodes:e,links:t},{nodeId:i=(e=>e.id),nodeGroup:n,nodeGroups:o,nodeTitle:r,nodeFill:a="currentColor",nodeStroke:s="#fff",nodeStrokeWidth:d=1.5,nodeStrokeOpacity:u=1,nodeRadius:l=5,nodeStrength:c,linkSource:v=(({source:e})=>e),linkTarget:p=(({target:e})=>e),linkStroke:g="#999",linkStrokeOpacity:f=.6,linkStrokeWidth:y=1.5,linkStrokeLinecap:m="round",linkStrength:h,colors:b=d3.schemeTableau10,width:x=640,height:E=400,invalidation:k}={}){const w=d3.map(e,i).map(L),O="function"!=typeof l?null:d3.map(e,l),I=d3.map(t,v).map(L),K=d3.map(t,p).map(L);void 0===r&&(r=(e,t)=>w[t]);const _=null==r?null:d3.map(e,r),A=null==n?null:d3.map(e,n).map(L),C="function"!=typeof y?null:d3.map(t,y),B="function"!=typeof g?null:d3.map(t,g);e=d3.map(e,((e,t)=>({id:w[t]}))),t=d3.map(t,((e,t)=>({source:I[t],target:K[t]}))),A&&void 0===o&&(o=d3.sort(A));const R=null==n?null:d3.scaleOrdinal(o,b),S=d3.forceManyBody(),G=d3.forceLink(t).id((({index:e})=>w[e]));void 0!==c&&S.strength(c),void 0!==h&&G.strength(h);const N=d3.forceSimulation(e).force("link",G).force("charge",S).force("center",d3.forceCenter()).on("tick",(function(){P.attr("x1",(e=>e.source.x)).attr("y1",(e=>e.source.y)).attr("x2",(e=>e.target.x)).attr("y2",(e=>e.target.y)),F.attr("cx",(e=>e.x)).attr("cy",(e=>e.y))})),j=d3.create("svg").attr("width",x).attr("height",E).attr("viewBox",[-x/2,-E/2,x,E]).attr("style","max-width: 100%; height: auto; height: intrinsic;"),P=j.append("g").attr("stroke","function"!=typeof g?g:null).attr("stroke-opacity",f).attr("stroke-width","function"!=typeof y?y:null).attr("stroke-linecap",m).selectAll("line").data(t).join("line"),F=j.append("g").attr("fill",a).attr("stroke",s).attr("stroke-opacity",u).attr("stroke-width",d).selectAll("circle").data(e).join("circle").attr("r",l).call(function(e){return d3.drag().on("start",(function(t){t.active||e.alphaTarget(.3).restart(),t.subject.fx=t.subject.x,t.subject.fy=t.subject.y})).on("drag",(function(e){e.subject.fx=e.x,e.subject.fy=e.y})).on("end",(function(t){t.active||e.alphaTarget(0),t.subject.fx=null,t.subject.fy=null}))}(N));function L(e){return null!==e&&"object"==typeof e?e.valueOf():e}return C&&P.attr("stroke-width",(({index:e})=>C[e])),B&&P.attr("stroke",(({index:e})=>B[e])),A&&F.attr("fill",(({index:e})=>R(A[e]))),O&&F.attr("r",(({index:e})=>O[e])),_&&F.append("title").text((({index:e})=>_[e])),null!=k&&k.then((()=>N.stop())),Object.assign(j.node(),{scales:{color:R}})}({nodes:t(e.nodes),links:t(e.edges)},{nodeId:e=>e.id,nodeGroup:e=>e.data?.[o],width:n,height:n});document.getElementById(i).appendChild(r),document.getElementById(i).querySelectorAll("circle").forEach((t=>{t.id=t.__data__?.id,t.addEventListener("mousemove",(t=>{if(t.target?.__data__?.id){let r=t.target.__data__;((e,t,i,n)=>{const o=document.getElementById(t);o.classList.remove("hidden"),o.innerText=e.semantics?.label||`${e.id}${e.data?.[n]?", "+e.data[n]:""}`;const r=o.getBoundingClientRect(),a=r.width/2,s=r.height;o.style.textAlign="left",o.style.transform=`translate(${i/2-a}px,${i-s}px)`})(e.nodes[r.id],`${i}-tooltip`,n,o)}})),t.addEventListener("mouseleave",(()=>{var e;e=`${i}-tooltip`,document.getElementById(e).classList.add("hidden")}))}))},o=[{id:"a",cat:"meow",num:3},{id:"b",cat:"meow",num:1},{id:"c",cat:"meow",num:2},{id:"d",cat:"bork",num:4}];console.log("simpleDataTest",o);let r=e.Z.structure({data:o,idKey:"id",dimensions:{values:[{dimensionKey:"cat",type:"categorical",behavior:{extents:"circular"}},{dimensionKey:"num",type:"numerical",behavior:{extents:"terminal"}}]}});console.log("simpleStructure",r),n(r,"simple",300,"cat");let a=[...o];a.push({id:"e",cat:"bork",num:12}),console.log("addDataTest",a);let s=e.Z.structure({data:a,addIds:!0,idKey:"addedId",dimensions:{values:[{dimensionKey:"cat",type:"categorical",behavior:{extents:"circular"}},{dimensionKey:"num",type:"numerical",behavior:{extents:"terminal"}}]}});console.log("addedDataStructure",s),n(s,"added",300,"cat");let d=e.Z.structure({data:[{date:"2016-01-01",category:"Group A",value:120,count:420},{date:"2016-02-01",category:"Group A",value:121,count:439},{date:"2016-03-01",category:"Group A",value:119,count:402},{date:"2016-04-01",category:"Group A",value:114,count:434},{date:"2016-05-01",category:"Group A",value:102,count:395},{date:"2016-06-01",category:"Group A",value:112,count:393},{date:"2016-07-01",category:"Group A",value:130,count:445},{date:"2016-08-01",category:"Group A",value:124,count:456},{date:"2016-09-01",category:"Group A",value:119,count:355},{date:"2016-10-01",category:"Group A",value:106,count:464},{date:"2016-11-01",category:"Group A",value:123,count:486},{date:"2016-12-01",category:"Group A",value:133,count:491},{date:"2016-01-01",category:"Group B",value:89,count:342},{date:"2016-02-01",category:"Group B",value:93,count:434},{date:"2016-03-01",category:"Group B",value:82,count:378},{date:"2016-04-01",category:"Group B",value:92,count:323},{date:"2016-05-01",category:"Group B",value:90,count:434},{date:"2016-06-01",category:"Group B",value:85,count:376},{date:"2016-07-01",category:"Group B",value:88,count:404},{date:"2016-08-01",category:"Group B",value:84,count:355},{date:"2016-09-01",category:"Group B",value:90,count:432},{date:"2016-10-01",category:"Group B",value:80,count:455},{date:"2016-11-01",category:"Group B",value:92,count:445},{date:"2016-12-01",category:"Group B",value:97,count:321},{date:"2016-01-01",category:"Group C",value:73,count:456},{date:"2016-02-01",category:"Group C",value:74,count:372},{date:"2016-03-01",category:"Group C",value:68,count:323},{date:"2016-04-01",category:"Group C",value:66,count:383},{date:"2016-05-01",category:"Group C",value:72,count:382},{date:"2016-06-01",category:"Group C",value:70,count:365},{date:"2016-07-01",category:"Group C",value:74,count:296},{date:"2016-08-01",category:"Group C",value:68,count:312},{date:"2016-09-01",category:"Group C",value:75,count:334},{date:"2016-10-01",category:"Group C",value:66,count:386},{date:"2016-11-01",category:"Group C",value:85,count:487},{date:"2016-12-01",category:"Group C",value:89,count:512},{date:"2016-01-01",category:"Other",value:83,count:432},{date:"2016-02-01",category:"Other",value:87,count:364},{date:"2016-03-01",category:"Other",value:76,count:334},{date:"2016-04-01",category:"Other",value:86,count:395},{date:"2016-05-01",category:"Other",value:87,count:354},{date:"2016-06-01",category:"Other",value:77,count:386},{date:"2016-07-01",category:"Other",value:79,count:353},{date:"2016-08-01",category:"Other",value:85,count:288},{date:"2016-09-01",category:"Other",value:87,count:353},{date:"2016-10-01",category:"Other",value:76,count:322},{date:"2016-11-01",category:"Other",value:96,count:412},{date:"2016-12-01",category:"Other",value:104,count:495}],idKey:"id",addIds:!0,dimensions:{values:[{dimensionKey:"date",type:"categorical",behavior:{extents:"circular"},operations:{sortFunction:(e,t,i)=>{if(e.values)return new Date(e.values[Object.keys(e.values)[0]].date)-new Date(t.values[Object.keys(t.values)[0]].date)}}},{dimensionKey:"category",type:"categorical",behavior:{extents:"circular"}},{dimensionKey:"value",type:"numerical",behavior:{extents:"terminal"}},{dimensionKey:"count",type:"numerical",behavior:{extents:"terminal"}}]}});console.log("largerStructure",d),n(d,"larger",300,"category")})()})();