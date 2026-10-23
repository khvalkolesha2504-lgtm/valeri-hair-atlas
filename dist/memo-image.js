// VALERI client memo: editorial PNG rendering, accessible file actions and pagination.
export function renderMemoCards({title,sections},makeCanvas=()=>document.createElement('canvas')){
  const width=1080,left=98,bodyX=156,right=982,maxHeight=1840,footerHeight=196;
  const bottom=maxHeight-footerHeight-65;
  // Render at 1.5x physical resolution so small type stays legible in saved PNGs.
  const scale=1.5;
  const measure=makeCanvas();measure.width=width;measure.height=maxHeight;
  const ctx=measure.getContext('2d');
  if(!ctx)throw new Error('Canvas unavailable');

  function wrap(value,font,limit=right-bodyX){
    ctx.font=font;
    const lines=[];
    const content=String(value??'').trim().replace(/\r\n?/g,'\n').replace(/\n{3,}/g,'\n\n');
    for(const paragraph of content.split('\n')){
      if(!paragraph.trim()){lines.push('');continue}
      let line='';
      for(const word of paragraph.trim().split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(ctx.measureText(candidate).width<=limit){line=candidate;continue}
        if(line){lines.push(line);line=''}
        for(const char of word){
          if(ctx.measureText(line+char).width>limit&&line){lines.push(line);line=''}
          line+=char;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  const titleLines=wrap(title||'Персональные рекомендации','48px Georgia',right-left);
  const start=370+titleLines.length*61+56;
  const pages=[[]];let page=pages[0],y=start;

  function newPage(){page=[];pages.push(page);y=start}
  function heading(label,index,continued=false){
    if(page.length)page.push({kind:'rule',y:y-26});
    page.push({kind:'number',text:String(index+1),y}); // Always 1, 2, 3, 4; no leading zero.
    const text=label.toUpperCase()+(continued?' / ПРОДОЛЖЕНИЕ':'');
    for(const line of wrap(text,'21px Arial')){
      page.push({kind:'text',text:line,y,font:'21px Arial',color:'#6b786a',height:28});
      y+=29;
    }
    y+=20;
  }

  for(const [index,section] of sections.entries()){
    const label=String(section.label||'Рекомендации');
    const value=section.value||'По рекомендации мастера';
    const lines=wrap(value,'30px Arial');
    const headingHeight=wrap(label.toUpperCase(),'21px Arial').length*29+20;
    const blockHeight=headingHeight+lines.length*47+49;
    if(page.length&&y+blockHeight>bottom&&blockHeight<(bottom-start)*.7)newPage();
    if(y+headingHeight+47>bottom)newPage();
    heading(label,index);
    for(const line of lines){
      const lineHeight=line?47:30;
      if(y+lineHeight>bottom){newPage();heading(label,index,true)}
      page.push({kind:'text',text:line,y,font:'30px Arial',color:'#283e32',height:lineHeight});
      y+=lineHeight;
    }
    y+=49;
  }

  return pages.map((rows,index)=>{
    const last=rows.at(-1);
    const contentEnd=last?last.y+(last.height||0):start;
    const height=Math.min(maxHeight,Math.max(1160,Math.ceil(contentEnd+78+footerHeight)));
    const footerY=height-footerHeight;
    const canvas=makeCanvas();
    canvas.width=Math.round(width*scale);
    canvas.height=Math.round(height*scale);
    const c=canvas.getContext('2d');
    if(!c)throw new Error('Canvas unavailable');
    if(typeof c.setTransform==='function')c.setTransform(scale,0,0,scale,0,0);
    else if(typeof c.scale==='function')c.scale(scale,scale);
    c.imageSmoothingEnabled=true;
    c.imageSmoothingQuality='high';
    c.textBaseline='top';

    // Warm paper, forest-green masthead and restrained brass accents.
    c.fillStyle='#faf8f3';c.fillRect(0,0,width,height);
    c.strokeStyle='#e5dfd2';c.lineWidth=1;c.strokeRect(32.5,32.5,width-65,height-65);
    c.fillStyle='#263e31';c.fillRect(0,0,width,258);
    c.fillStyle='#b49a70';c.fillRect(0,254,width,4);
    c.strokeStyle='#b89d75';c.lineWidth=1;c.strokeRect(30.5,30.5,width-61,195);
    c.fillStyle='#f7f3e9';c.font='76px Georgia';c.textAlign='left';
    c.fillText('VALERI',left,64);
    c.fillStyle='#d8c2a2';c.font='19px Arial';c.fillText('СТУДИЯ КРАСОТЫ ВОЛОС',left,170);
    c.textAlign='right';c.fillStyle='#d2be9f';c.font='17px Arial';
    c.fillText('ПЕРСОНАЛЬНАЯ',right,101);c.fillText('ПАМЯТКА',right,127);c.textAlign='left';

    c.fillStyle='#9f865e';c.font='bold 19px Arial';
    c.fillText('ИНДИВИДУАЛЬНЫЕ РЕКОМЕНДАЦИИ',left,306);
    c.fillStyle='#283e32';c.font='48px Georgia';
    titleLines.forEach((line,n)=>c.fillText(line,left,369+n*61));
    c.strokeStyle='#d4c8b6';c.beginPath();c.moveTo(left,start-33);c.lineTo(right,start-33);c.stroke();

    for(const row of rows){
      if(row.kind==='rule'){
        c.strokeStyle='#e1dbcf';c.beginPath();c.moveTo(bodyX,row.y);c.lineTo(right,row.y);c.stroke();
      }else if(row.kind==='number'){
        c.font='italic 26px Georgia';c.fillStyle='#a58e69';c.fillText(row.text,left,row.y-1);
      }else{
        c.font=row.font;c.fillStyle=row.color;c.fillText(row.text,bodyX,row.y);
      }
    }

    c.strokeStyle='#b7a27b';c.lineWidth=1;c.beginPath();c.moveTo(left,footerY);c.lineTo(right,footerY);c.stroke();
    c.fillStyle='#294033';c.font='italic 27px Georgia';c.fillText('С заботой о ваших волосах,',left,footerY+29);
    c.font='bold 19px Arial';c.fillText('СТУДИЯ VALERI',left,footerY+78);
    c.textAlign='right';c.font='20px Arial';c.fillText('+375 (33) 394-50-22',right,footerY+40);
    c.fillText('valerihairstudio.ru',right,footerY+76);
    c.fillStyle='#849083';c.font='16px Arial';
    c.fillText(String(index+1)+' / '+String(pages.length),right,footerY+143);
    c.textAlign='left';c.fillText('РЕКОМЕНДАЦИИ ВАШЕГО МАСТЕРА',left,footerY+143);
    return canvas;
  });
}

export async function createMemoFiles(data){
  const cards=renderMemoCards(data);
  return Promise.all(cards.map((canvas,i)=>new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(new File([blob],'VALERI-pamyatka-'+(i+1)+'.png',{type:'image/png'})):reject(new Error('PNG encoding failed')),'image/png');
  })));
}

export function canShareFiles(files){
  try{return !!navigator.share&&!!navigator.canShare?.({files})}catch{return false}
}

export function initMemoImage({getData}){
  const $=selector=>document.querySelector(selector);
  const dialog=$('#memo-image-dialog'),status=$('#memo-image-status');
  const pagesEl=$('#memo-image-pages'),sendAll=$('#memo-image-send');
  const download=$('#memo-image-download'),copy=$('#memo-image-copy');
  const open=$('#memo-image-open'),multiNote=$('#memo-image-multi-note');
  let files=[],urls=[],revision=0;

  function cleanup(){
    revision++;
    urls.forEach(url=>URL.revokeObjectURL(url));
    urls=[];files=[];
    pagesEl.replaceChildren();
    sendAll.disabled=true;
    download.hidden=true;download.removeAttribute('href');
    copy.disabled=true;copy.hidden=false;
    open.hidden=false;open.setAttribute('aria-disabled','true');open.removeAttribute('href');
    multiNote.hidden=true;
  }

  async function copyImage(file,button){
    if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')return;
    button.disabled=true;
    try{
      await navigator.clipboard.write([new ClipboardItem({'image/png':file})]);
      status.textContent='Изображение скопировано. Вставьте его в переписку с клиентом.';
    }catch{
      status.textContent='Копирование недоступно в этом браузере. Скачайте PNG и прикрепите файл к сообщению.';
    }finally{
      if(dialog.open)button.disabled=false;
    }
  }

  async function shareFiles(selected,button){
    if(!selected.length||!canShareFiles(selected))return;
    const current=revision;
    button.disabled=true;
    try{
      await navigator.share({files:selected});
      if(current===revision)status.textContent='Файл передан в меню отправки. Выберите получателя в приложении.';
    }catch(error){
      if(current===revision)status.textContent=error.name==='AbortError'
        ?'Отправка отменена. При необходимости повторите действие.'
        :'Не удалось открыть отправку. Скачайте PNG и прикрепите его вручную.';
    }finally{
      if(dialog.open&&current===revision)button.disabled=!canShareFiles(selected);
    }
  }

  function addPage(file,url,index,total){
    const figure=document.createElement('figure');
    const img=document.createElement('img');
    img.src=url;img.alt='Памятка VALERI — страница '+(index+1);
    img.width=1080;img.loading=index?'lazy':'eager';
    if(total>1){
      const caption=document.createElement('figcaption');
      caption.textContent='СТРАНИЦА '+String(index+1)+' / '+String(total);
      figure.append(caption);
    }
    figure.append(img);
    if(total>1){
      const actions=document.createElement('div');actions.className='memo-file-actions';
      const link=document.createElement('a');
      link.className='memo-page-download';link.href=url;link.download=file.name;
      link.textContent='Скачать страницу '+(index+1);
      actions.append(link);
      const copyPage=document.createElement('button');
      copyPage.type='button';copyPage.className='memo-copy-image';
      copyPage.textContent='Копировать';
      copyPage.disabled=!navigator.clipboard?.write||typeof ClipboardItem==='undefined';
      copyPage.onclick=()=>copyImage(file,copyPage);
      actions.append(copyPage);
      if(canShareFiles([file])){
        const sendPage=document.createElement('button');
        sendPage.type='button';sendPage.className='memo-page-send';
        sendPage.textContent='Поделиться';
        sendPage.onclick=()=>shareFiles([file],sendPage);
        actions.append(sendPage);
      }
      figure.append(actions);
    }
    pagesEl.append(figure);
  }

  async function prepare(){
    cleanup();
    const current=revision;
    status.textContent='Готовим памятку в высоком разрешении…';
    dialog.showModal();
    try{
      const result=await createMemoFiles(getData());
      if(current!==revision||!dialog.open)return;
      files=result;
      files.forEach((file,i)=>urls.push(URL.createObjectURL(file)));
      files.forEach((file,i)=>addPage(file,urls[i],i,files.length));
      const many=files.length>1;
      multiNote.hidden=!many;
      download.hidden=many;
      if(!many){download.href=urls[0];download.download=files[0].name}
      copy.hidden=many;copy.disabled=many||!navigator.clipboard?.write||typeof ClipboardItem==='undefined';
      open.hidden=many;
      if(!many){open.href=urls[0];open.setAttribute('aria-disabled','false')}
      sendAll.disabled=!canShareFiles(files);
      status.textContent=many
        ?'Памятка готова: '+files.length+' страницы. Все рекомендации сохранены.'
        :'Памятка готова к скачиванию и отправке.';
    }catch{
      if(current===revision)status.textContent='Не удалось создать PNG. Закройте окно и повторите попытку или воспользуйтесь печатью / PDF.';
    }
  }

  $('#memo-share').onclick=prepare;
  $('#memo-image-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',cleanup);
  sendAll.onclick=()=>shareFiles(files,sendAll);
  copy.onclick=()=>{if(files[0])copyImage(files[0],copy)};
}
