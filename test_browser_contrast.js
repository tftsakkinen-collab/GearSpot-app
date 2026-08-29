import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const USER_CONTRAST_SCRIPT = `
(() => {
  const cv=document.createElement('canvas');cv.width=cv.height=2;
  const x=cv.getContext('2d',{willReadFrequently:true});
  const rgba=c=>{x.clearRect(0,0,2,2);x.fillStyle='rgba(0,0,0,0)';try{x.fillStyle=c}catch(e){return{r:0,g:0,b:0,a:0}}
    x.fillRect(0,0,2,2);const d=x.getImageData(0,0,1,1).data;return{r:d[0],g:d[1],b:d[2],a:d[3]/255}};
  const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
    return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const cr=(a,b)=>{const l1=L(a),l2=L(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
  const mix=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const bg=el=>{let n=el,a=null;while(n&&n.nodeType===1){const s=getComputedStyle(n);
    if(s.backgroundImage!=='none'&&!a)return null;const c=rgba(s.backgroundColor);
    if(c.a>0){a=a?mix(c,a):c;if(c.a>=.999)return a}n=n.parentElement}
    const bd=rgba(getComputedStyle(document.body).backgroundColor);return a?mix(bd.a>0?bd:{r:255,g:255,b:255,a:1},a):(bd.a>0?bd:{r:255,g:255,b:255,a:1})};
  const bad=[];
  document.querySelectorAll('body *').forEach(el=>{
    let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.textContent;t=t.trim();if(t.length<2)return;
    const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return;
    const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return;
    const b=bg(el);if(!b)return;let f=rgba(s.color);if(f.a===0)return;if(f.a<1)f=mix(f,b);
    const px=parseFloat(s.fontSize),bold=(parseInt(s.fontWeight)||400)>=700;
    const need=(px>=24||(px>=18.66&&bold))?3:4.5;const ratio=cr(f,b);
    if(ratio < need)bad.push({
      t:t.slice(0,40),
      ratio:+ratio.toFixed(2),
      need,
      px:s.fontSize,
      color:s.color,
      bgColor: \`rgb(\${Math.round(b.r)},\${Math.round(b.g)},\${Math.round(b.b)})\`,
      tag:el.tagName,
      className:el.className
    });
  });
  return bad;
})();
`

async function runTest() {
  const filePath = `file://${path.resolve(__dirname, 'dist/index.html')}`
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()

  const views = [
    { theme: 'light', width: 375, height: 812, name: 'Mobiili 375px (Vaalea)' },
    { theme: 'light', width: 1280, height: 800, name: 'Desktop 1280px (Vaalea)' },
    { theme: 'dark', width: 375, height: 812, name: 'Mobiili 375px (Tumma)' },
    { theme: 'dark', width: 1280, height: 800, name: 'Desktop 1280px (Tumma)' }
  ]

  let totalViolations = 0

  for (const v of views) {
    await page.setViewport({ width: v.width, height: v.height })
    await page.goto(filePath, { waitUntil: 'networkidle0' })
    await page.evaluate((theme) => {
      document.documentElement.setAttribute('data-theme', theme)
    }, v.theme)

    // Allow CSS transition / DOM rendering
    await new Promise(r => setTimeout(r, 200))

    const bad = await page.evaluate(USER_CONTRAST_SCRIPT)

    console.log(`\n========================================`)
    console.log(`📌 Näkymä: ${v.name}`)
    console.log(`========================================`)
    if (bad.length === 0) {
      console.log('✅ Kontrastivirheitä: 0')
    } else {
      console.table(bad)
      console.log(`❌ Kontrastivirheitä: ${bad.length}`)
      totalViolations += bad.length
    }
  }

  await browser.close()

  if (totalViolations > 0) {
    console.log(`\n❌ Yhteensä ${totalViolations} kontrastivirhettä löydetty! Korjataan...`)
    process.exit(1)
  } else {
    console.log(`\n🎉 TÄYDELLINEN TULOS! Kontrastivirheitä yhteensä: 0`)
    process.exit(0)
  }
}

runTest().catch(err => {
  console.error(err)
  process.exit(1)
})
