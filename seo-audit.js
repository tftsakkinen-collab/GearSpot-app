// Lokaali 18-osainen SEO/GEO -auditointiajo
// Projekti: Tiedottajanne (https://www.tiedottajanne.fi)
// Single Source of Truth: G:\My Drive\AI - automaatiot\04_DECISION_CHANGELOG.md

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CLI_TARGET = process.argv[2];
const TARGET_URL = CLI_TARGET || process.env.SEO_AUDIT_URL || 'http://localhost:3002';
const REPORT_PATH = path.join(__dirname, 'seo-audit-report.md');
const REQUEST_TIMEOUT_MS = 8000;
const MAX_LINKS_TO_CHECK = 40;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ---------------------------------------------------------------------------
// 1. TIEDONKERUU (Playwright)
// ---------------------------------------------------------------------------

async function collectPageData(page, url) {
  console.log(`[1/4] Avataan sivu Playwrightilla: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const title = await page.title();

  const metaTags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('meta'))
      .map((el) => ({
        name: el.getAttribute('name'),
        property: el.getAttribute('property'),
        content: el.getAttribute('content'),
      }))
      .filter((m) => (m.name || m.property) && m.content);
  });

  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((el) => ({
      level: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
    }));
  });

  const missingAlts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.hasAttribute('alt') || (img.getAttribute('alt') || '').trim() === '')
      .map((img) => img.getAttribute('src') || img.getAttribute('data-src') || '(ei src-attribuuttia)');
  });

  const jsonLd = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    return scripts.map((s) => {
      try {
        return JSON.parse(s.textContent || '{}');
      } catch (err) {
        return { _parseError: err.message, _raw: (s.textContent || '').slice(0, 200) };
      }
    });
  });

  const domOutline = await page.evaluate(() => {
    const STRUCTURAL = new Set([
      'HEADER', 'NAV', 'MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'FOOTER',
      'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BUTTON'
    ]);
    const lines = [];
    const MAX = 180;

    function walk(node, depth) {
      if (!node || lines.length >= MAX) return;
      for (const child of node.children || []) {
        if (lines.length >= MAX) return;
        const tag = child.tagName;
        if (STRUCTURAL.has(tag)) {
          const id = child.id ? `#${child.id}` : '';
          const cls = (child.className && typeof child.className === 'string')
            ? '.' + child.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
          const text = (tag.startsWith('H') || tag === 'BUTTON')
            ? ` "${(child.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)}"`
            : '';
          lines.push(`${'  '.repeat(depth)}${tag}${id}${cls}${text}`);
        }
        walk(child, STRUCTURAL.has(tag) ? depth + 1 : depth);
      }
    }
    walk(document.body, 0);
    return lines.join('\n');
  });

  const rawLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter(Boolean)
  );

  return { title, metaTags, headings, missingAlts, jsonLd, domOutline, rawLinks };
}


// ---------------------------------------------------------------------------
// 2. RIKKINÄISTEN LINKKIEN TARKISTUS
// ---------------------------------------------------------------------------

async function checkLink(targetUrl, baseUrl) {
  let resolved;
  try {
    resolved = new URL(targetUrl, baseUrl).href;
  } catch {
    return { url: targetUrl, status: 'invalid-url', ok: false };
  }

  if (resolved.startsWith('mailto:') || resolved.startsWith('tel:') || resolved.startsWith('javascript:')) {
    return { url: resolved, status: 'skipped-protocol', ok: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let res = await fetch(resolved, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Tiedottajanne-SEO-Audit-Bot/1.0' },
    });
    // Jotkut palvelimet palauttavat 405 HEAD-pyynnölle
    if (res.status === 405) {
      res = await fetch(resolved, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Tiedottajanne-SEO-Audit-Bot/1.0' },
      });
    }
    clearTimeout(timer);
    return { url: resolved, status: res.status, ok: res.ok };
  } catch (err) {
    clearTimeout(timer);
    return { url: resolved, status: err.name === 'AbortError' ? 'timeout' : err.message, ok: false };
  }
}

async function checkLinks(rawLinks, baseUrl) {
  const unique = Array.from(new Set(rawLinks)).slice(0, MAX_LINKS_TO_CHECK);
  console.log(`[2/4] Tarkistetaan ${unique.length} linkkiä...`);

  const results = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const chunk = unique.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((l) => checkLink(l, baseUrl)));
    results.push(...chunkResults);
  }

  const broken = results.filter((r) => !r.ok && r.status !== 'skipped-protocol');
  return { totalChecked: unique.length, broken, all: results };
}



// ---------------------------------------------------------------------------
// 3. ANALYYSI (GEO & SEO LLM-rajapinta)
// ---------------------------------------------------------------------------

async function callLLMAnalysis(auditData) {
  console.log('[3/4] Lähetetään tiedot tekoälylle GEO- ja SEO-analyysia varten...');

  const systemPrompt = `Olet kokenut ja intohimoinen huipputason SEO/GEO (Generative Engine Optimization) asiantuntija.
Tehtäväsi on ottaa vastaan kootut tekniset auditointitiedot verkkosivulta ja kirjoittaa suomenkielinen, erittäin pureva ja konkreettinen analyysiraportti.

Painota erityisesti GEO-näkökulmaa (miten suuret kielimallit kuten ChatGPT, Claude ja Perplexity löytävät, tulkitsevat, tiivistävät ja siteeraavat tämän sivun sisältöä).
Vastaa ammattimaisesti, mutta suoraviivaisesti (kuten Janne Säkkinen itse haluaa — ei turhaa jargon-jauhantaa, vaan iskeviä havaintoja ja 3-5 tärkeintä korjauskohdetta).`;

  const userPrompt = `Analysoi tämä verkkosivu annettujen tietojen pohjalta:

### SIVUSTON TIEDOT
- **Kohde-URL**: ${auditData.url}
- **Otsikko (Title)**: ${auditData.title}
- **Meta-tagit**: ${JSON.stringify(auditData.metaTags, null, 2)}
- **Alt-tekstipuutteet (kuvista puuttuu alt-määrite)**: ${JSON.stringify(auditData.missingAlts, null, 2)}
- **Rikkinäiset linkit (broken)**: ${JSON.stringify(auditData.brokenLinks, null, 2)}
- **JSON-LD Schema.org Data**: ${JSON.stringify(auditData.jsonLd, null, 2)}

### SIVUN OTSIKKOHIERARKIA (H1-H6)
${auditData.headings.map(h => `${h.level.toUpperCase()}: ${h.text}`).join('\n')}

### SIVUN SEMANTTINEN DOM-RAKENNE
\`\`\`
${auditData.domOutline}
\`\`\`

---
### RAPORTIN ODOTETTU RAKENNE (Markdown)
Kirjoita vastaus suoraan Markdownina ilman erillisiä alkupuheita:
1. ## Yleisarviointi & Tekninen kunto (SEO/AEO)
   - Lyhyt arvio sivuston otsikosta, meta-kuvauksista ja teknisestä rakenteesta.
2. ## Sisältörakenne & Otsikkohierarkia (H1-H6)
   - Onko hierarkia kunnossa (yksi H1, loogiset alitasot)? Mitä pitää korjata?
3. ## Puuttuvat Alt-tekstit & Rikkinäiset linkit
   - Analyysi löytyneistä puutteista ja linkkien toimivuudesta.
4. ## Schema.org JSON-LD -laatu
   - Onko data kunnossa, onko riittävästi B2B/FAQ/Person-skeemaa jotta tekoälyt ymmärtävät sivun kontekstin?
5. ## GEO (Generative Engine Optimization) -analyysi & korjausehdotukset
   - Miten ChatGPT, Claude ja Perplexity lukevat tämän sivuston?
   - Mitä asioita pitää parantaa, jotta sivusto siteerataan AI-vastaustuloksissa paremmin?
6. ## Tärkeimmät toimenpidesuositukset (TOP 3-5)
   - Konkreettinen priorisoitu To-Do -lista Jannelle.`;

  if (ANTHROPIC_API_KEY) {
    console.log(`→ Käytetään Anthropic API (malli: ${ANTHROPIC_MODEL})`);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error (Status ${res.status}): ${errText}`);
    }
    const data = await res.json();
    return data.content[0].text;
  } else if (OPENAI_API_KEY) {
    console.log(`→ Käytetään OpenAI API (malli: ${OPENAI_MODEL})`);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API Error (Status ${res.status}): ${errText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } else {
    console.warn('⚠️ VAROITUS: .env-tiedostosta ei löytynyt ANTHROPIC_API_KEY:tä tai OPENAI_API_KEY:tä!');
    return null;
  }
}


// ---------------------------------------------------------------------------
// 4. RAPORTIN KOOSTAMINEN & TALLENNUS
// ---------------------------------------------------------------------------

function buildMarkdownReport(auditData, llmAnalysis) {
  const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

  const metaTagsList = auditData.metaTags.length
    ? auditData.metaTags.map((m) => `- \`${m.name || m.property}\`: ${m.content}`).join('\n')
    : '- (Meta-tageja ei löytynyt)';

  const headingsList = auditData.headings.length
    ? auditData.headings.map((h) => `- **${h.level.toUpperCase()}**: ${h.text}`).join('\n')
    : '- (Otsikoita ei löytynyt)';

  const missingAltsList = auditData.missingAlts.length
    ? auditData.missingAlts.map((src) => `- ${src}`).join('\n')
    : '- Kaikilla kuvilla on alt-teksti. ✅';

  const brokenLinksList = auditData.brokenLinks.length
    ? auditData.brokenLinks.map((l) => `- [${l.status}] ${l.url}`).join('\n')
    : '- Rikkinäisiä linkkejä ei löytynyt. ✅';

  const jsonLdBlock = auditData.jsonLd.length
    ? '```json\n' + JSON.stringify(auditData.jsonLd, null, 2) + '\n```'
    : '_(JSON-LD-dataa ei löytynyt sivulta)_';

  const llmSection = llmAnalysis
    ? llmAnalysis
    : '_(Tekoälyanalyysia ei suoritettu — ANTHROPIC_API_KEY tai OPENAI_API_KEY puuttuu .env-tiedostosta.)_';

  return `# SEO/GEO -auditointiraportti

**Kohde**: ${auditData.url}
**Ajettu**: ${timestamp}
**Linkkejä tarkistettu**: ${auditData.linksChecked} kpl / rikkinäisiä: ${auditData.brokenLinks.length} kpl

---

${llmSection}

---

## Liite: Raakadata

### Title
${auditData.title}

### Meta-tagit
${metaTagsList}

### Otsikkohierarkia (H1-H6)
${headingsList}

### Puuttuvat alt-tekstit
${missingAltsList}

### Rikkinäiset linkit
${brokenLinksList}

### JSON-LD Schema.org
${jsonLdBlock}

### Semanttinen DOM-rakenne
\`\`\`
${auditData.domOutline}
\`\`\`
`;
}

function saveReport(markdown) {
  fs.writeFileSync(REPORT_PATH, markdown, 'utf-8');
  console.log(`[4/4] Raportti tallennettu: ${REPORT_PATH}`);
}


// ---------------------------------------------------------------------------
// 5. ORKESTROINTI (main)
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('  Tiedottajanne — SEO/GEO -auditointi');
  console.log(`  Kohde: ${TARGET_URL}`);
  console.log('='.repeat(70));

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; Tiedottajanne-SEO-Audit-Bot/1.0; +https://www.tiedottajanne.fi)',
    });
    const page = await context.newPage();

    const pageData = await collectPageData(page, TARGET_URL);
    const linkResults = await checkLinks(pageData.rawLinks, TARGET_URL);

    const auditData = {
      url: TARGET_URL,
      title: pageData.title,
      metaTags: pageData.metaTags,
      headings: pageData.headings,
      missingAlts: pageData.missingAlts,
      jsonLd: pageData.jsonLd,
      domOutline: pageData.domOutline,
      brokenLinks: linkResults.broken,
      linksChecked: linkResults.totalChecked,
    };

    let llmAnalysis = null;
    try {
      llmAnalysis = await callLLMAnalysis(auditData);
    } catch (err) {
      console.error(`⚠️ Tekoälyanalyysi epäonnistui: ${err.message}`);
      llmAnalysis = `_(Tekoälyanalyysi epäonnistui: ${err.message})_`;
    }

    const markdown = buildMarkdownReport(auditData, llmAnalysis);
    saveReport(markdown);

    console.log('\n✅ Auditointi valmis!');
    console.log(`   Rikkinäisiä linkkejä: ${auditData.brokenLinks.length}`);
    console.log(`   Puuttuvia alt-tekstejä: ${auditData.missingAlts.length}`);
  } catch (err) {
    console.error(`\n❌ Auditointi epäonnistui: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();


