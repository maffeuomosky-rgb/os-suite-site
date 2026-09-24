/* OS SUITE — Privacy-minimal analytics event layer
   No cookies, localStorage or network collection by default.
   Network delivery remains disabled until a collection backend is explicitly configured.
*/
(()=>{
  'use strict';

  const config=Object.assign({
    enabled:false,
    endpoint:null,
    debug:false
  },window.OS_SUITE_ANALYTICS_CONFIG||{});

  const allowedEvents=new Set([
    'page_view',
    'hero_product_change',
    'collection_filter',
    'product_outbound_click',
    'primary_cta_click',
    'ecosystem_cta_click',
    'footer_cta_click'
  ]);

  const viewport=()=>innerWidth<768?'mobile':innerWidth<1200?'tablet':'desktop';
  const clean=value=>typeof value==='string'?value.slice(0,120):value;
  const normalizeProps=props=>Object.fromEntries(Object.entries(props||{}).map(([k,v])=>[k,clean(v)]));

  function track(name,props={}){
    if(!allowedEvents.has(name))return;
    const payload={
      event:name,
      ...normalizeProps(props),
      page_path:location.pathname||'/',
      viewport:viewport(),
      language:document.documentElement.lang||navigator.language||'it',
      ts:new Date().toISOString()
    };

    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent('os-suite:analytics',{detail:payload}));

    if(config.debug)console.info('[OS SUITE analytics]',payload);

    if(config.enabled&&config.endpoint){
      const body=JSON.stringify(payload);
      try{
        if(navigator.sendBeacon){
          navigator.sendBeacon(config.endpoint,new Blob([body],{type:'application/json'}));
        }else{
          fetch(config.endpoint,{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true,credentials:'same-origin'}).catch(()=>{});
        }
      }catch(_){}
    }
  }

  window.OS_SUITE_ANALYTICS={track,config};

  let interactionSource='programmatic';
  let lastProductIndex=null;

  const setSource=source=>{interactionSource=source};
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.rail-arrow'))setSource('arrow');
    else if(event.target.closest?.('.index-item'))setSource('dot');
    else if(event.target.closest?.('.rail-card'))setSource('package');
    else if(event.target.closest?.('#rail'))setSource('drag');
  },true);
  document.getElementById('rail')?.addEventListener('wheel',()=>setSource('trackpad'),{passive:true});
  document.getElementById('rail')?.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))setSource('keyboard');
  },true);

  function productMeta(index){
    const p=Array.isArray(window.OS_SUITE_PRODUCTS)?window.OS_SUITE_PRODUCTS[index]:null;
    return p?{product_id:p.id||p.name,product_name:p.name,product_status:p.status,product_category:p.category}:{};
  }

  function readActiveProduct(){
    const card=document.querySelector('.rail-card[aria-current="true"]');
    return card?Number(card.dataset.index):null;
  }

  const stage=document.getElementById('productRailStage');
  if(stage){
    const initialise=()=>{lastProductIndex=readActiveProduct()};
    requestAnimationFrame(initialise);
    new MutationObserver(()=>{
      const index=readActiveProduct();
      if(index===null||index===lastProductIndex)return;
      const previous=lastProductIndex;
      lastProductIndex=index;
      track('hero_product_change',{
        ...productMeta(index),
        previous_product_index:previous,
        product_index:index,
        navigation_source:interactionSource
      });
      interactionSource='programmatic';
    }).observe(stage,{subtree:true,attributes:true,attributeFilter:['aria-current']});
  }

  document.addEventListener('click',event=>{
    const filter=event.target.closest?.('.filter-button');
    if(filter){
      track('collection_filter',{filter:filter.dataset.filter||filter.textContent.trim()});
      return;
    }

    const collectionProduct=event.target.closest?.('.collection-link');
    if(collectionProduct){
      const card=collectionProduct.closest('.collection-card');
      track('product_outbound_click',{
        source:'collection',
        product_name:card?.querySelector('h3')?.textContent.trim()||collectionProduct.getAttribute('aria-label')||'product'
      });
      return;
    }

    const footerProduct=event.target.closest?.('#footerProducts a');
    if(footerProduct){
      track('product_outbound_click',{source:'footer_products',product_name:footerProduct.textContent.trim()});
      return;
    }

    const ecosystem=event.target.closest?.('.evolution-video-cta');
    if(ecosystem){
      track('ecosystem_cta_click',{source:'evolution'});
      return;
    }

    const footerCta=event.target.closest?.('.footer-ecosystem-button');
    if(footerCta){
      track('footer_cta_click',{source:'footer'});
      return;
    }

    const primary=event.target.closest?.('.header-cta,.mobile-navigation .button');
    if(primary){
      track('primary_cta_click',{source:primary.classList.contains('header-cta')?'header':'mobile_menu'});
    }
  },true);

  track('page_view',{title:document.title});
})();
