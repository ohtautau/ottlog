// Fixed sample values keep the demo readable across renders; never saved as activity.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const demo = require('../src/lib/summary-radar-demo.json');
const center = 500, radius = 330;
const point = (i, value) => {
  const angle = (i * 90 - 90) * Math.PI / 180;
  return [center + Math.cos(angle) * radius * value / demo.maximum, center + Math.sin(angle) * radius * value / demo.maximum];
};
const polygon = values => values.map((value, i) => point(i, value).join(',')).join(' ');
const grid = [2, 4, 6, 8, 10].map(value => `<polygon points="${polygon([value, value, value, value])}" fill="none" stroke="#344955" stroke-width="2"/>`).join('');
const axes = demo.axes.map((_, i) => `<path d="M500 500L${point(i, demo.maximum).join(' ')}" stroke="#344955" stroke-width="2"/>`).join('');
const shape = (key, color, dashed) => `<polygon points="${polygon(demo.axes.map(axis => axis[key]))}" fill="${color}" fill-opacity="${dashed ? '.10' : '.20'}" stroke="${color}" stroke-width="5" stroke-linejoin="round" ${dashed ? 'stroke-dasharray="13 11"' : ''}/>` + demo.axes.map((axis, i) => {
  const [x, y] = point(i, axis[key]);
  return `<circle cx="${x}" cy="${y}" r="8" fill="${dashed ? '#1b2b36' : color}" stroke="${color}" stroke-width="4"/>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">${grid}${axes}${shape('yesterday', '#bba9dc', true)}${shape('today', '#b9e1cb', false)}<circle cx="500" cy="500" r="4" fill="#718b99"/></svg>`;
const target = path.join(__dirname, '../src/assets/summary-radar/demo.png');
fs.mkdirSync(path.dirname(target), { recursive: true });
sharp(Buffer.from(svg)).png().toFile(target).then(() => console.log('Generated summary demo radar')).catch(error => { console.error(error); process.exitCode = 1; });
