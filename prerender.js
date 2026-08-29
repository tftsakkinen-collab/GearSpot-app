import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import ReactDOMServer from 'react-dom/server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function prerender() {
  const templatePath = path.resolve(__dirname, 'dist/index.html')
  const appPath = path.resolve(__dirname, 'dist/server/App.js')

  if (!fs.existsSync(templatePath) || !fs.existsSync(appPath)) {
    throw new Error('dist/index.html or dist/server/App.js missing. Run vite builds first.')
  }

  const template = fs.readFileSync(templatePath, 'utf-8')
  const AppModule = await import(`file://${appPath}`)
  const App = AppModule.default || AppModule

  // Render App component to static HTML string
  const appHtml = ReactDOMServer.renderToString(React.createElement(App))

  // Ingest rendered appHtml into #root container
  const html = template.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`
  )

  fs.writeFileSync(templatePath, html, 'utf-8')
  console.log(`✓ Pre-rendered static HTML to dist/index.html (${html.length} bytes)`)
}

prerender().catch(err => {
  console.error('Pre-rendering error:', err)
  process.exit(1)
})
