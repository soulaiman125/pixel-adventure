import { randomFrom, shape } from '../swamp/scenery.js';

export function paintRealmLandmarks(ctx,{id,colors}) {
  const [dark,mid,bright,light]=colors;
  const random=randomFrom(1784);
  const fade=(top,bottom,a,b)=>{
    const paint=ctx.createLinearGradient(0,top,0,bottom);
    paint.addColorStop(0,a);
    paint.addColorStop(1,b);
    return paint;
  };
  function glints(tone,count,top,bottom){
    ctx.fillStyle=tone;
    for(let i=0;i<count;i++){
      ctx.globalAlpha=.10+random()*.42;
      ctx.fillRect(random()*512,top+random()*(bottom-top),.5+random()*1.7,.6+random()*1.5);
    }
    ctx.globalAlpha=1;
  }

  if(id==='bamboo'){
    for (let i=-1;i<22;i++) {
      const x=i*26+random()*12, size=1.8+random()*3.4, lean=(random()-.5)*26;
      const y=12+random()*83, tip=x+lean;
      ctx.globalAlpha=.38+random()*.35;
      shape(ctx,fade(y,220,bright,dark),[[x-3,220],[tip-2,y],[tip+size,y-3],[x+size,220]]);
      for(let yy=y+12;yy<212;yy+=15+random()*13){
        const join=tip+(x-tip)*(yy-y)/(220-y);
        shape(ctx,mid,[[join-1,yy],[join+size+1,yy-1],[join+size,yy+2],[join-1,yy+3]]);
        const side=i%2?-1:1,wing=7+random()*17;
        shape(ctx,bright,[[join,yy],[join+side*wing,yy-9],[join+side*(wing-4),yy-3],[join+1,yy+2]]);
      }
    }
  } else if(id==='sunken'){
    for(let i=-1;i<6;i++){
      const x=i*99+random()*13,y=87+random()*26;
      ctx.globalAlpha=.68;
      ctx.fillStyle=fade(y,220,bright,dark);
      ctx.fillRect(x,y+3,14,120);
      ctx.fillRect(x+70,y+3,14,120);
      ctx.beginPath();
      ctx.ellipse(x+42,y+7,44,30,0,Math.PI,2*Math.PI);
      ctx.ellipse(x+42,y+7,30,20,0,2*Math.PI,Math.PI,true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle=mid;
      for(let j=y+20;j<215;j+=10){ctx.fillRect(x,j,13,1);ctx.fillRect(x+71,j,12,1);}
    }
  } else if(id==='sky'){
    for(let i=-1;i<7;i++){
      const x=16+i*86+random()*18,y=77+random()*71,width=39+random()*35;
      ctx.globalAlpha=.57;
      shape(ctx,fade(y,y+68,bright,dark),[[x-8,y+7],[x+5,y],[x+width-8,y+2],[x+width,y+7],
        [x+width*.79,y+20],[x+width*.57,y+33],[x+width*.42,y+55],[x+width*.3,y+34],[x+width*.12,y+23]]);
      shape(ctx,mid,[[x+width*.46,y+9],[x+width*.36,y+31],[x+width*.42,y+54],[x+width*.57,y+32],[x+width*.75,y+22]]);
      shape(ctx,light,[[x-8,y+7],[x+5,y],[x+width-8,y+2],[x+width,y+7],[x+width*.64,y+5],[x+width*.27,y+7]]);
    }
  } else if(id==='neon'){
    for(let i=-1;i<11;i++){
      const x=i*49+random()*12,y=54+random()*87,w=18+random()*24;
      ctx.globalAlpha=.68;
      shape(ctx,fade(y,213,mid,dark),[[x,220],[x,y+9],[x+6,y+2],[x+w-6,y],[x+w,y+7],[x+w,220]]);
      ctx.fillStyle=bright;
      ctx.fillRect(x+2,y+12,.8,111);
      ctx.fillStyle=mid;
      ctx.fillRect(x+w-4,y+13,3,160);
      for(let row=y+17;row<210;row+=6+random()*6)for(let col=x+5;col<x+w-5;col+=4+random()*7){
        ctx.fillStyle=random()<.22?light:bright;
        ctx.globalAlpha=.18+random()*.41;
        ctx.fillRect(col,row,2+random()*4,.7+random());
      }
    }
  } else {
    const glow=ctx.createRadialGradient(257,63,16,257,63,46);
    glow.addColorStop(0,light+'66');
    glow.addColorStop(.37,bright+'99');
    glow.addColorStop(.58,bright+'30');
    glow.addColorStop(1,bright+'00');
    ctx.fillStyle=glow;
    ctx.fillRect(205,10,104,105);
    ctx.beginPath();
    ctx.arc(257,63,21,0,Math.PI*2);
    ctx.fillStyle=fade(42,84,light,bright);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(258,63,19.5,0,Math.PI*2);
    ctx.fillStyle=fade(43,82,dark,mid);
    ctx.fill();
    ctx.globalAlpha=.48;
    const skyline=[];
    for(let x=-12;x<532;x+=8+random()*11) skyline.push([x,157+random()*12+10*Math.sin(x/36)]);
    shape(ctx,fade(150,218,mid,dark),[[-12,220],...skyline,[530,220]]);
  }
  ctx.globalAlpha=1;
  const haze=fade(138,220,mid+'00',mid+'a4');
  ctx.fillStyle=haze;
  ctx.fillRect(0,138,512,82);
  glints(light,26,34,192);
}
