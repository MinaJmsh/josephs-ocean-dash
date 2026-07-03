/**
 * GameWebView
 * Runs the entire game inside a react-native WebView for iOS/Android.
 * Images are fetched and converted to base64 data URIs before being
 * injected into the HTML — fully self-contained, no dev-server needed
 * inside Expo Go.
 *
 * Install dependency:
 *   npx expo install react-native-webview
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Image, Platform, StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import {
  BAD_SIZE,
  BADS,
  CUTE_MSGS,
  GAME_H,
  GAME_W,
  GOODS,
  ITEM_SIZE,
  JOSEPH_H,
  JOSEPH_W,
  JOSEPH_Y,
  LANE_POSITIONS,
  SCROLL_ACCEL,
  SCROLL_BASE,
  SPAWN_INTERVAL_BASE,
  SPAWN_MIN,
  STORAGE_KEY_BEST,
} from "../constants/game";

// ─────────────────────────────────────────────
//  All assets required directly
// ─────────────────────────────────────────────
const RAW_ASSETS: Record<string, any> = {
  "background with 3 lanes.png": require("../../assets/images/background with 3 lanes.png"),
  "bad_1.png": require("../../assets/images/bad_1.png"),
  "bad_2.png": require("../../assets/images/bad_2.png"),
  "bad_3.png": require("../../assets/images/bad_3.png"),
  "bad_4.png": require("../../assets/images/bad_4.png"),
  "bad_5.png": require("../../assets/images/bad_5.png"),
  "bad_6.png": require("../../assets/images/bad_6.png"),
  "bad_7.png": require("../../assets/images/bad_7.png"),
  "bad_8.png": require("../../assets/images/bad_8.png"),
  "bad_9.png": require("../../assets/images/bad_9.png"),
  "good_1.png": require("../../assets/images/good_1.png"),
  "good_2.png": require("../../assets/images/good_2.png"),
  "good_3.png": require("../../assets/images/good_3.png"),
  "good_4.png": require("../../assets/images/good_4.png"),
  "good_5.png": require("../../assets/images/good_5.png"),
  "good_6.png": require("../../assets/images/good_6.png"),
  "good_7.png": require("../../assets/images/good_7.png"),
  "good_8.png": require("../../assets/images/good_8.png"),
  "good_9.png": require("../../assets/images/good_9.png"),
  "good_10.png": require("../../assets/images/good_10.png"),
  "good_11.png": require("../../assets/images/good_11.png"),
  "good_12.png": require("../../assets/images/good_12.png"),
  "d1.png": require("../../assets/images/d1.png"),
  "d2.png": require("../../assets/images/d2.png"),
  "d3.png": require("../../assets/images/d3.png"),
  "how to play.png": require("../../assets/images/how to play.png"),
  "joseph.png": require("../../assets/images/joseph.png"),
  "menu.png": require("../../assets/images/menu.png"),
  "pause.png": require("../../assets/images/pause.png"),
  "play.png": require("../../assets/images/play.png"),
  "reset.png": require("../../assets/images/reset.png"),
  "plainbutton.png": require("../../assets/images/plainbutton.png"),
  "full-heart.png": require("../../assets/images/full-heart.png"),
  "empty-heart.png": require("../../assets/images/empty-heart.png"),
};

// ─────────────────────────────────────────────
//  Resolve a require() module ID to a URI string
// ─────────────────────────────────────────────
function resolveURI(asset: any): string {
  if (!asset) return "";
  if (typeof asset === "string") return asset;
  if (typeof asset === "object" && typeof asset.uri === "string")
    return asset.uri;
  if (typeof asset === "number") {
    try {
      const source = Image.resolveAssetSource(asset);
      return source?.uri ?? "";
    } catch {
      return "";
    }
  }
  return "";
}

// ─────────────────────────────────────────────
//  Fetch a URI and return a base64 data URI.
//  This makes the image fully self-contained —
//  no network access needed inside the WebView.
// ─────────────────────────────────────────────
async function toBase64DataURI(uri: string): Promise<string> {
  if (!uri) return "";
  // Already a data URI — pass through
  if (uri.startsWith("data:")) return uri;
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("[GameWebView] Failed to convert to base64:", uri, e);
    return "";
  }
}

// ─────────────────────────────────────────────
//  Pre-load all assets as base64 data URIs
// ─────────────────────────────────────────────
async function loadAllBase64(): Promise<Record<string, string>> {
  const entries = Object.entries(RAW_ASSETS);
  const results = await Promise.all(
    entries.map(async ([key, asset]) => {
      const uri = resolveURI(asset);
      const data64 = await toBase64DataURI(uri);
      return [key, data64] as [string, string];
    }),
  );
  return Object.fromEntries(results);
}

// ─────────────────────────────────────────────
//  Build the inline HTML string for the game
// ─────────────────────────────────────────────
function buildGameHTML(base64Assets: Record<string, string>): string {
  // Serialise all assets into a JS object the WebView can use
  const assetEntries = Object.entries(base64Assets)
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(",\n");

  // Serialise game data the engine needs
  const goodsJSON = JSON.stringify(GOODS);
  const badsJSON = JSON.stringify(BADS);
  const cuteMsgsJSON = JSON.stringify(CUTE_MSGS);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box;touch-action:none;user-select:none;}
  html,body{width:100%;height:100%;background:#000;overflow:hidden;}
  canvas{display:block;width:100vw;height:100vh;image-rendering:pixelated;}
</style>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
@font-face {
  font-family: 'PressStart2P';
  src: url('https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
// ── Asset registry ──────────────────────────────────────────────────────────
const IMAGES_RAW = {${assetEntries}};
const IMG = {};

// ── Game data ───────────────────────────────────────────────────────────────
const GOODS      = ${goodsJSON};
const BADS       = ${badsJSON};
const CUTE_MSGS  = ${cuteMsgsJSON};

const GAME_W          = ${GAME_W};
const GAME_H          = ${GAME_H};
const LANES           = ${JSON.stringify(LANE_POSITIONS)};
const JOSEPH_Y        = ${JOSEPH_Y};
const JOSEPH_W        = ${JOSEPH_W};
const JOSEPH_H        = ${JOSEPH_H};
const ITEM_SIZE       = ${ITEM_SIZE};
const BAD_SIZE        = ${BAD_SIZE};
const SCROLL_BASE     = ${SCROLL_BASE};
const SCROLL_ACCEL    = ${SCROLL_ACCEL};
const SPAWN_BASE      = ${SPAWN_INTERVAL_BASE};
const SPAWN_MIN       = ${SPAWN_MIN};
const STORAGE_KEY     = '${STORAGE_KEY_BEST}';
const PIXEL_FONT      = 'PressStart2P';

const STATE = { MENU:0, HOW:1, PLAYING:2, PAUSED:3, DEAD:4 };

// ── localStorage best score ─────────────────────────────────────────────────
function getBest() { try { return parseInt(localStorage.getItem(STORAGE_KEY)||'0'); } catch(e){ return 0; } }
function saveBest(s) { try { localStorage.setItem(STORAGE_KEY, String(s)); } catch(e){} }

// ── Image loader ────────────────────────────────────────────────────────────
function sanitize(s) {
  if (!s) return null;
  s = s.replace(/\\s+/g,' ').trim();
  s = s.replace(/^data\\s*:\\s*/i,'data:');
  s = s.replace(/;\\s*base64\\s*,\\s*/i,';base64,');
  const ci = s.indexOf(',');
  if (ci===-1) return null;
  return s.slice(0,ci+1) + s.slice(ci+1).replace(/\\s+/g,'');
}
function makePlaceholder(color) {
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const x=c.getContext('2d'); x.fillStyle=color||'#336699'; x.fillRect(0,0,64,64);
  return c.toDataURL();
}
const PH = {'joseph.png':'#8B6914','background with 3 lanes.png':'#1a6b8a','d1.png':'#7ecfdf','d2.png':'#7ecfdf','d3.png':'#7ecfdf','plainbutton.png':'#8fa8c2'};
function loadImages(cb) {
  const keys = Object.keys(IMAGES_RAW);
  let done = 0;
  keys.forEach(k => {
    const img = new Image();
    img.onload = () => { done++; if(done===keys.length) cb(); };
    img.onerror = () => {
      const ph = new Image(); ph.src = makePlaceholder(PH[k]);
      IMG[k] = ph; done++; if(done===keys.length) cb();
    };
    const raw = IMAGES_RAW[k];
    const clean = raw && raw.length > 10 ? sanitize(raw) : null;
    img.src = clean || makePlaceholder(PH[k]);
    IMG[k] = img;
  });
  if (!keys.length) cb();
}

// ── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width  = GAME_W;
canvas.height = GAME_H;

// ── Game state ───────────────────────────────────────────────────────────────
let gameState = STATE.MENU;
let score=0, dist=0, hearts=3, best=getBest();
let scrollSpeed=SCROLL_BASE, spawnTimer=0, spawnInterval=SPAWN_BASE;
let elapsed=0, invincible=0, lastTs=null, totalTime=0;
let bgY=0;
let items=[], particles=[], floatTexts=[], bubbles=[], cuteMsg=null;
let hitZones=[];

const j = {
  lane:1, x:LANES[1], targetX:LANES[1], y:JOSEPH_Y,
  animT:0, wobble:0, hitFlash:0
};

// ── Init bubbles ─────────────────────────────────────────────────────────────
function initBubbles() {
  bubbles = Array.from({length:20},()=>({
    x:Math.random()*GAME_W, y:Math.random()*GAME_H,
    r:3+Math.random()*10, speed:15+Math.random()*35,
    wobble:Math.random()*Math.PI*2, ws:0.5+Math.random(),
    alpha:0.1+Math.random()*0.25
  }));
}

// ── Start game ───────────────────────────────────────────────────────────────
function startGame() {
  gameState=STATE.PLAYING; score=0; dist=0; hearts=3;
  scrollSpeed=SCROLL_BASE; spawnTimer=0; spawnInterval=SPAWN_BASE;
  elapsed=0; invincible=0; lastTs=null;
  items=[]; particles=[]; floatTexts=[]; cuteMsg=null; bgY=0;
  j.lane=1; j.x=LANES[1]; j.targetX=LANES[1]; j.animT=0; j.wobble=0; j.hitFlash=0;
  initBubbles();
}
function pauseGame()  { if(gameState===STATE.PLAYING) gameState=STATE.PAUSED; }
function resumeGame() { if(gameState===STATE.PAUSED) { gameState=STATE.PLAYING; lastTs=null; } }
function goMenu()     { gameState=STATE.MENU; initBubbles(); }
function showHow()    { gameState=STATE.HOW; }
function moveJ(dir) {
  const nl = Math.max(0,Math.min(2,j.lane+dir));
  if (nl!==j.lane) {
    j.lane=nl; j.targetX=LANES[nl]; j.wobble=0.3;
    spawnSplash(j.x,j.y);
  }
}
function quitApp() { try { window.ReactNativeWebView.postMessage('quit'); } catch(e){} }

// ── Spawn helpers ────────────────────────────────────────────────────────────
function spawnSplash(x,y) {
  for(let i=0;i<6;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*60;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:2+Math.random()*4,life:0.5+Math.random()*0.3,maxLife:0.8,color:'#80deea',type:'bubble'});}
}
function spawnCollect(x,y,color) {
  for(let i=0;i<10;i++){const a=(Math.PI*2*i/10)+Math.random()*0.5,s=40+Math.random()*80;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,size:3+Math.random()*5,life:0.7+Math.random()*0.4,maxLife:1.1,color,type:'star'});}
}
function spawnHit(x,y) {
  for(let i=0;i<14;i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*100;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:3+Math.random()*6,life:0.6+Math.random()*0.4,maxLife:1,color:'#ff6060',type:'bubble'});}
}
function spawnDeath() {
  for(let i=0;i<30;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*160;
    particles.push({x:j.x,y:j.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:4+Math.random()*8,life:1+Math.random()*0.5,maxLife:1.5,color:'#80deea',type:'bubble'});}
}
function spawnItem() {
  const isGood=Math.random()<0.55;
  const lane=Math.floor(Math.random()*3);
  if(items.some(i=>i.lane===lane&&i.y<100)) return;
  const pool=isGood?GOODS:BADS;
  const def=pool[Math.floor(Math.random()*pool.length)];
  items.push({x:LANES[lane],y:-ITEM_SIZE,lane,def,type:isGood?'good':'bad',alive:true,bobT:Math.random()*Math.PI*2});
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Joseph smooth move
  const dx=j.targetX-j.x; j.x+=dx*Math.min(1,10*dt);
  if(Math.abs(dx)<1){j.x=j.targetX;}
  j.animT+=dt*2; j.wobble=Math.max(0,j.wobble-dt*2); j.hitFlash=Math.max(0,j.hitFlash-dt*3);

  // Bubbles
  bubbles.forEach(b=>{b.y-=b.speed*dt;b.wobble+=b.ws*dt;if(b.y+b.r<0){b.y=GAME_H+b.r;b.x=Math.random()*GAME_W;}});

  if(gameState!==STATE.PLAYING) return;

  elapsed+=dt; invincible=Math.max(0,invincible-dt);
  scrollSpeed=SCROLL_BASE+elapsed*SCROLL_ACCEL;
  spawnInterval=Math.max(SPAWN_MIN,SPAWN_BASE-elapsed*0.02);
  dist+=scrollSpeed*dt/100;
  bgY+=scrollSpeed*dt; if(bgY>=GAME_H) bgY-=GAME_H;

  spawnTimer+=dt;
  if(spawnTimer>=spawnInterval){spawnTimer=0;spawnItem();
    if(Math.random()<0.3&&elapsed>5)setTimeout(()=>{if(gameState===STATE.PLAYING)spawnItem();},300);}

  items.forEach(item=>{
    if(!item.alive)return;
    item.y+=scrollSpeed*dt; item.bobT+=dt*2;
    const d=Math.hypot(item.x-j.x,item.y-j.y);
    const thr=item.type==='good'?ITEM_SIZE*0.6:BAD_SIZE*0.5;
    if(d<thr){
      item.alive=false;
      if(item.type==='good'){
        const pts=item.def.score||10; score+=pts;
        spawnCollect(item.x,item.y,item.def.color);
        floatTexts.push({x:item.x,y:item.y-20,text:'+'+pts+' '+item.def.name+'!',color:item.def.color,life:1.2,vy:-60});
        if(Math.random()<0.25) cuteMsg={text:CUTE_MSGS[Math.floor(Math.random()*CUTE_MSGS.length)],t:2.5};
      } else {
        if(invincible<=0){
          hearts--; invincible=2; j.hitFlash=1;
          spawnHit(item.x,item.y);
          floatTexts.push({x:item.x,y:item.y-20,text:'Ouch!',color:'#ff5252',life:1.2,vy:-60});
          if(hearts<=0){gameOver();return;}
        }
      }
    }
    if(item.y>GAME_H+80) item.alive=false;
  });
  items=items.filter(i=>i.alive);
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=40*dt;p.life-=dt;});
  particles=particles.filter(p=>p.life>0);
  floatTexts.forEach(f=>{f.y+=f.vy*dt;f.vy*=0.95;f.life-=dt;});
  floatTexts=floatTexts.filter(f=>f.life>0);
  if(cuteMsg){cuteMsg.t-=dt;if(cuteMsg.t<=0)cuteMsg=null;}
}

function gameOver(){
  gameState=STATE.DEAD;
  if(score>best){best=score;saveBest(best);}
  spawnDeath();
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function dImg(key,x,y,w,h,alpha=1){const img=IMG[key];if(!img||!img.complete)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,x,y,w,h);ctx.restore();}
function dImgC(key,cx,cy,w,h,alpha=1,rot=0){const img=IMG[key];if(!img||!img.complete)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);ctx.rotate(rot);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
function dText(text,x,y,{size=16,color='#fff',align='left',shadow=true,outline=false,font=null}={}){
  ctx.save();
  ctx.font=font?size+'px '+font:'bold '+size+'px Courier New, monospace';
  ctx.textAlign=align;ctx.textBaseline='middle';
  if(shadow){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillText(text,x+2,y+2);}
  if(outline){ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(text,x,y);}
  ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function dHeart(cx,cy,size,color,filled){
  ctx.save();ctx.translate(cx,cy);const s=size/2;
  ctx.beginPath();ctx.moveTo(0,s*0.35);ctx.bezierCurveTo(-s*1.2,-s*0.5,-s*1.2,-s*1.3,0,-s*0.5);ctx.bezierCurveTo(s*1.2,-s*1.3,s*1.2,-s*0.5,0,s*0.35);ctx.closePath();
  if(filled){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
function dPixelBtn(x,y,w,h,label,fontSize){
  dImg('plainbutton.png',x,y,w,h);
  ctx.save();
  ctx.font=fontSize+'px '+PIXEL_FONT;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillText(label,x+w/2+1,y+h/2+2);
  ctx.fillStyle='#0d2a3a';ctx.fillText(label,x+w/2,y+h/2);
  ctx.restore();
  return {x,y,w,h};
}
function drawScrollBg(bgYOff){
  const img=IMG['background with 3 lanes.png'];if(!img||!img.complete)return;
  const by0=(bgYOff%GAME_H)-GAME_H;
  ctx.drawImage(img,0,by0,GAME_W,GAME_H);
  ctx.drawImage(img,0,by0+GAME_H,GAME_W,GAME_H);
  ctx.drawImage(img,0,by0+GAME_H*2,GAME_W,GAME_H);
}
function drawBubbles(){
  bubbles.forEach(b=>{ctx.save();ctx.globalAlpha=b.alpha;ctx.strokeStyle='rgba(150,220,255,0.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x+Math.sin(b.wobble)*4,b.y,b.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=b.alpha*0.3;ctx.fillStyle='rgba(150,220,255,0.5)';ctx.fill();ctx.restore();});
}
function drawParticles(){
  particles.forEach(p=>{
    const pct=p.life/p.maxLife;ctx.save();ctx.globalAlpha=pct;
    if(p.type==='star'){
      ctx.translate(p.x,p.y);ctx.rotate(p.life*5);ctx.fillStyle=p.color;ctx.beginPath();const s=p.size*pct;
      ctx.moveTo(0,-s);ctx.lineTo(s*0.3,-s*0.3);ctx.lineTo(s,0);ctx.lineTo(s*0.3,s*0.3);ctx.lineTo(0,s);ctx.lineTo(-s*0.3,s*0.3);ctx.lineTo(-s,0);ctx.lineTo(-s*0.3,-s*0.3);ctx.closePath();ctx.fill();
    } else {ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.size*pct,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  });
}
function drawFloatTexts(){
  floatTexts.forEach(f=>{ctx.save();ctx.globalAlpha=Math.min(1,f.life*2);dText(f.text,f.x,f.y,{size:15,color:f.color,align:'center',outline:true});ctx.restore();});
}
function drawItems(){
  items.forEach(item=>{
    if(!item.alive)return;const bob=Math.sin(item.bobT)*4;const s=item.type==='good'?ITEM_SIZE:BAD_SIZE;
    dImgC(item.def.key,item.x,item.y+bob,s,s);
    if(item.type==='good'){ctx.save();ctx.globalAlpha=0.15+Math.sin(item.bobT)*0.07;ctx.fillStyle=item.def.color;ctx.beginPath();ctx.arc(item.x,item.y+bob,s*0.55,0,Math.PI*2);ctx.fill();ctx.restore();}
  });
}
function drawJoseph(){
  const bob=Math.sin(j.animT*1.5)*3,wr=Math.sin(j.wobble*10)*0.08*j.wobble;
  if(invincible>0&&Math.floor(invincible*8)%2===0)return;
  if(j.hitFlash>0){ctx.save();ctx.globalAlpha=j.hitFlash*0.6;ctx.fillStyle='#ff4444';ctx.beginPath();ctx.arc(j.x,j.y+bob,JOSEPH_W*0.55,0,Math.PI*2);ctx.fill();ctx.restore();}
  ctx.save();ctx.globalAlpha=0.18;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(j.x,j.y+JOSEPH_H*0.4,JOSEPH_W*0.4,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
  dImgC('joseph.png',j.x,j.y+bob,JOSEPH_W,JOSEPH_H,1,wr);
}
function drawHUD(){
  const TOP=48,PAUSE_S=36,PAUSE_X=GAME_W-PAUSE_S-12,PAUSE_Y=TOP+4;
  const row1=TOP+22,row2=TOP+42;
  const g2=ctx.createLinearGradient(0,0,0,TOP+70);
  g2.addColorStop(0,'rgba(0,15,40,0.92)');g2.addColorStop(1,'rgba(0,15,40,0)');
  ctx.fillStyle=g2;ctx.fillRect(0,0,GAME_W,TOP+70);
  const heartSize=30,heartGap=5;
  const blinkOn=j.hitFlash>0&&Math.floor(j.hitFlash*8)%2===0;
  for(let i=0;i<3;i++){
    const hx=12+i*(heartSize+heartGap),hy=row1-heartSize/2;
    const full=i<hearts;
    ctx.save();if(blinkOn)ctx.globalAlpha=0.2;
    dImg(full?'full-heart.png':'empty-heart.png',hx,hy,heartSize,heartSize);
    ctx.restore();
    if(full&&blinkOn){ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#ff2222';ctx.fillRect(hx,hy,heartSize,heartSize);ctx.restore();}
  }
  dText(''+score,GAME_W/2,row1,{size:24,color:'#fff176',align:'center',outline:true});
  dText('SCORE',GAME_W/2,row2,{size:11,color:'rgba(255,255,200,0.85)',align:'center',shadow:false});
  const distX=PAUSE_X-10;
  dText(Math.floor(dist)+'m',distX,row1,{size:18,color:'#80deea',align:'right',outline:true});
  dText('DIST',distX,row2,{size:11,color:'rgba(128,220,234,0.85)',align:'right',shadow:false});
  dImg('pause.png',PAUSE_X,PAUSE_Y,PAUSE_S,PAUSE_S);
}
function drawLaneGuides(){
  LANES.forEach(lx=>{ctx.save();ctx.globalAlpha=0.06+Math.sin(totalTime*0.8)*0.02;ctx.strokeStyle='#80deea';ctx.lineWidth=1;ctx.setLineDash([8,16]);ctx.lineDashOffset=-(totalTime*40)%24;ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,GAME_H);ctx.stroke();ctx.restore();});
}
function drawCuteMsg(){
  if(!cuteMsg||cuteMsg.t<=0)return;
  const a=Math.min(1,cuteMsg.t)*Math.min(1,cuteMsg.t>2?1:cuteMsg.t);
  ctx.save();ctx.globalAlpha=a;
  const tx=GAME_W/2, ty=GAME_H*0.18;
  ctx.font='bold 22px Courier New, monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillText(cuteMsg.text,tx+2,ty+3);
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText(cuteMsg.text,tx-1,ty+1);
  ctx.fillStyle='#ffffff';ctx.fillText(cuteMsg.text,tx,ty);
  ctx.restore();
}

// ── Shared menu dialog size ──────────────────────────────────────────────────
const MENU_DH = GAME_H*0.66;
const MENU_DW = MENU_DH*0.66;
const MENU_BTN_W = MENU_DW*0.42;
const MENU_BTN_H = MENU_BTN_W*0.285;

// ── DRAW: MENU ────────────────────────────────────────────────────────────────
function drawMenu(){
  const t=totalTime;
  drawScrollBg((t*60)%GAME_H);
  ctx.fillStyle='rgba(0,12,35,0.40)';ctx.fillRect(0,0,GAME_W,GAME_H);
  drawBubbles();

  const dh=MENU_DH,dw=MENU_DW,dx=GAME_W/2-dw/2,dy=GAME_H*0.16;
  dImg('d3.png',dx,dy,dw,dh);

  const contentTop=dy+dh*0.16, contentBottom=dy+dh*0.92;
  const contentCY=contentTop+(contentBottom-contentTop)/2;
  const blockH=dh*0.4;
  let cy=contentCY-blockH/2;

  dText("joseph's",GAME_W/2,cy,{size:dw*0.05,color:'#1a4a6a',align:'center',shadow:false,font:PIXEL_FONT});
  cy+=dh*0.045;
  dText('ocean dash',GAME_W/2,cy,{size:dw*0.058,color:'#0d3352',align:'center',shadow:false,font:PIXEL_FONT});
  cy+=dh*0.06;
  const bestText=best>0?'best: '+best:'best: ---';
  dText(bestText,GAME_W/2,cy,{size:dw*0.04,color:'#2a5c8a',align:'center',shadow:false,font:PIXEL_FONT});

  const bw=MENU_BTN_W,bh=MENU_BTN_H,bx=GAME_W/2-bw/2;
  cy+=dh*0.075;
  const playBtn=dPixelBtn(bx,cy,bw,bh,'play',bh*0.32);
  cy+=bh+dh*0.03;
  const quitBtn=dPixelBtn(bx,cy,bw,bh,'quit',bh*0.32);

  hitZones=[
    {...playBtn,id:'play'},
    {...quitBtn,id:'quit'},
  ];

  for(let i=0;i<6;i++){
    const sx=20+Math.sin(t*0.7+i*1.1)*30+i*58,sy=GAME_H*0.06+Math.cos(t*0.9+i*0.8)*16;
    ctx.save();ctx.globalAlpha=0.3+Math.sin(t*1.3+i)*0.25;ctx.fillStyle=i%2===0?'#fff176':'#80deea';ctx.beginPath();ctx.arc(sx,sy,2+Math.sin(t+i)*1.2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}

// ── DRAW: PAUSE ──────────────────────────────────────────────────────────────
function drawPause(){
  ctx.fillStyle='rgba(0,10,30,0.62)';ctx.fillRect(0,0,GAME_W,GAME_H);
  const dw=350,dh=350,dx=GAME_W/2-dw/2,dy=GAME_H/2-dh/2;
  dImg('d2.png',dx,dy,dw,dh);

  const bw=MENU_BTN_W,bh=MENU_BTN_H;
  const gap1=35,gap2=22,gap3=38,gap4=dh*0.04;
  const blockH=gap1+gap2+gap3+bh*2+gap4;
  let cy=dy+dh/2-blockH/2;

  dText('paused',GAME_W/2,cy,{size:19,color:'#0d3352',align:'center',shadow:false,font:PIXEL_FONT});
  cy+=gap1; dText('Score: '+score,GAME_W/2,cy,{size:15,color:'#0d3352',align:'center',shadow:false});
  cy+=gap2; dText('Distance: '+Math.floor(dist)+'m',GAME_W/2,cy,{size:12,color:'#2a5c8a',align:'center',shadow:false});
  cy+=gap3;
  const bx=GAME_W/2-bw/2;
  const r=dPixelBtn(bx,cy,bw,bh,'resume',bh*0.32);
  cy+=bh+gap4;
  const m=dPixelBtn(bx,cy,bw,bh,'menu',bh*0.32);

  hitZones=[
    {x:GAME_W-52,y:44,w:44,h:44,id:'pause'},
    {...r,id:'resume'},
    {...m,id:'menu'},
  ];
}

// ── DRAW: GAME OVER ──────────────────────────────────────────────────────────
function drawGameOver(){
  const t=totalTime;
  // Semi-transparent overlay over the game world (not solid black)
  ctx.fillStyle='rgba(0,8,25,0.72)';ctx.fillRect(0,0,GAME_W,GAME_H);
  drawParticles();drawBubbles();

  // Joseph same size as in-game
  // Same dialog size as pause
  const dw=350,dh=350,dx=GAME_W/2-dw/2,dy=GAME_H/2-dh/2;
  dImg('d2.png',dx,dy,dw,dh);

  const btnW=MENU_BTN_W,btnH=MENU_BTN_H;
  const gap1=28,gap2=24,gap3=20,gap4=16,gap5=30,gap6=dh*0.04;
  const newBest=score>=best&&score>0;
  const blockH=(newBest?gap1+gap2:gap1)+gap3+gap4+gap5+btnH*2+gap6;
  const frameContentCY=dy+dh/2;
  let cy=frameContentCY-blockH/2;

  dText('game over',GAME_W/2,cy,{size:19,color:'#6b1515',align:'center',shadow:false,font:PIXEL_FONT});
  cy+=gap1;
  if(newBest){
    ctx.save();ctx.globalAlpha=0.75+Math.sin(t*3)*0.25;
    dText('** NEW BEST! **',GAME_W/2,cy,{size:13,color:'#9a6800',align:'center',shadow:false});
    ctx.restore();cy+=gap2;
  }
  dText('Score: '+score,GAME_W/2,cy,{size:15,color:'#0d3352',align:'center',shadow:false});
  cy+=gap3;dText('Distance: '+Math.floor(dist)+'m',GAME_W/2,cy,{size:12,color:'#2a5c8a',align:'center',shadow:false});
  cy+=gap4;dText('Best: '+best,GAME_W/2,cy,{size:12,color:'#7a5800',align:'center',shadow:false});
  cy+=gap5;
  const bx=GAME_W/2-btnW/2;
  const p=dPixelBtn(bx,cy,btnW,btnH,'play again',btnH*0.28);
  cy+=btnH+gap6;
  const m=dPixelBtn(bx,cy,btnW,btnH,'menu',btnH*0.32);
  hitZones=[{...p,id:'play'},{...m,id:'menu'}];
}

// ── DRAW: PLAYING ────────────────────────────────────────────────────────────
function drawPlaying(){
  drawScrollBg(bgY);
  ctx.fillStyle='rgba(0,15,40,0.18)';ctx.fillRect(0,0,GAME_W,GAME_H);
  drawLaneGuides();drawBubbles();drawItems();drawJoseph();drawParticles();drawFloatTexts();drawCuteMsg();drawHUD();
  hitZones=[{x:GAME_W-36-12,y:48+4,w:36,h:36,id:'pause'}];
}

// ── Main render loop ─────────────────────────────────────────────────────────
function frame(ts){
  if(lastTs===null)lastTs=ts;
  const dt=Math.min((ts-lastTs)/1000,0.05);lastTs=ts;totalTime+=dt;
  update(dt);
  ctx.clearRect(0,0,GAME_W,GAME_H);
  if(gameState===STATE.MENU)        drawMenu();
  else if(gameState===STATE.PLAYING) drawPlaying();
  else if(gameState===STATE.PAUSED)  {drawPlaying();drawPause();}
  else if(gameState===STATE.DEAD)    {drawPlaying();drawGameOver();}
  requestAnimationFrame(frame);
}

// ── Input ────────────────────────────────────────────────────────────────────
const SWIPE_TH=40;
let tx0=null,ty0=null;
function tapZone(gx,gy){
  for(const z of hitZones){
    if(gx>=z.x&&gx<=z.x+z.w&&gy>=z.y&&gy<=z.y+z.h){
      if(z.id==='play')  startGame();
      if(z.id==='quit')  quitApp();
      if(z.id==='how')   showHow();
      if(z.id==='back')  goMenu();
      if(z.id==='pause') pauseGame();
      if(z.id==='resume')resumeGame();
      if(z.id==='menu')  goMenu();
      return;
    }
  }
}
function toGame(clientX,clientY){
  const r=canvas.getBoundingClientRect();
  return {x:(clientX-r.left)*(GAME_W/r.width),y:(clientY-r.top)*(GAME_H/r.height)};
}
canvas.addEventListener('touchstart',e=>{e.preventDefault();const t=e.touches[0],p=toGame(t.clientX,t.clientY);tx0=p.x;ty0=p.y;},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();if(tx0===null)return;const t=e.changedTouches[0],p=toGame(t.clientX,t.clientY),dx=p.x-tx0,dy=p.y-ty0;
  if(Math.abs(dx)>SWIPE_TH&&Math.abs(dx)>Math.abs(dy)){if(gameState===STATE.PLAYING)moveJ(dx>0?1:-1);}else{tapZone(p.x,p.y);}tx0=null;ty0=null;},{passive:false});
canvas.addEventListener('mousedown',e=>{const p=toGame(e.clientX,e.clientY);tx0=p.x;ty0=p.y;});
canvas.addEventListener('mouseup',e=>{if(tx0===null)return;const p=toGame(e.clientX,e.clientY),dx=p.x-tx0;
  if(Math.abs(dx)>4&&gameState===STATE.PLAYING)moveJ(dx>0?1:-1);else tapZone(p.x,p.y);tx0=null;ty0=null;});

// ── Boot ──────────────────────────────────────────────────────────────────────
initBubbles();
document.fonts.ready.then(()=>{
  loadImages(()=>{ requestAnimationFrame(frame); });
});
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export default function GameWebView() {
  const webviewRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);

  // Convert all assets to base64 on mount so WebView has no network deps
  useEffect(() => {
    loadAllBase64().then((base64Assets) => {
      setHtml(buildGameHTML(base64Assets));
    });
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = event.nativeEvent.data;
    if (msg === "quit" && Platform.OS === "android") {
      BackHandler.exitApp();
    }
  }, []);

  if (!html) {
    // Still loading assets — show a plain dark screen
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});
