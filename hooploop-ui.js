
(() => {
  const KEY='hooploop_display_mode';
  const root=document.documentElement;
  function preferred(){
    const saved=localStorage.getItem(KEY);
    if(saved==='light'||saved==='dark') return saved;
    return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  function apply(mode){
    root.dataset.hlMode=mode;
    localStorage.setItem(KEY,mode);
    document.querySelectorAll('[data-hl-theme-toggle]').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(mode==='dark'));
      btn.setAttribute('aria-label',mode==='dark'?'Switch to light mode':'Switch to dark mode');
      btn.textContent=mode==='dark'?'☀':'◐';
    });
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',mode==='dark'?'#111315':'#f5f5f2');
  }
  apply(preferred());
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-hl-theme-toggle]');
    if(!btn) return;
    apply(root.dataset.hlMode==='dark'?'light':'dark');
  });
})();
