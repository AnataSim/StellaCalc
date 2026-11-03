const fs = require('fs');
const path = require('path');

const ids = [90011, 90012, 90013, 90014, 90015, 90016, 90017, 90018, 90019, 90020, 90021, 90022, 90023];
const base = 'https://raw.githubusercontent.com/AutumnVN/ssassets/refs/heads/main/export/assets/assetbundles/icon';
const targetDir = path.join(__dirname, '..', 'web', 'public', 'notes');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function downloadAll() {
  for (const id of ids) {
    const resNorm = await fetch(base + '/note/note_' + id + '.webp');
    const bufNorm = Buffer.from(await resNorm.arrayBuffer());
    fs.writeFileSync(path.join(targetDir, 'note_' + id + '.webp'), bufNorm);

    const resS = await fetch(base + '/note/note_' + id + '_S.webp');
    const bufS = Buffer.from(await resS.arrayBuffer());
    fs.writeFileSync(path.join(targetDir, 'note_' + id + '_S.webp'), bufS);

    const resItem = await fetch(base + '/item/item_' + id + '.webp');
    const bufItem = Buffer.from(await resItem.arrayBuffer());
    fs.writeFileSync(path.join(targetDir, 'item_' + id + '.webp'), bufItem);

    console.log('Downloaded note_' + id + ' (norm: ' + bufNorm.length + ', S: ' + bufS.length + ', item: ' + bufItem.length + ')');
  }
  console.log('All 13 notes downloaded successfully to ' + targetDir);
}

downloadAll();

