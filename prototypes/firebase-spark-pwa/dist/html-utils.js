const n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function r(t){return String(t??"").replace(/[&<>"']/g,e=>n[e])}export{r as escapeHtml};
