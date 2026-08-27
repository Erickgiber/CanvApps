import * as fs from 'fs';
import * as path from 'path';
import { formatCVS } from '../CanvApps/formatter/CVSFormatter';

/**
 * CLI script to recursively format all .cvs files in the repository.
 */
function getAllCvsFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === 'dist' || file === 'dist-app') continue;
    if (fs.statSync(fullPath).isDirectory()) {
      getAllCvsFiles(fullPath, fileList);
    } else if (file.endsWith('.cvs')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ['src'];

  console.log('✨ [CanvApps Code Formatter] Scanning .cvs files...\n');

  let filesToFormat: string[] = [];
  for (const target of targets) {
    if (fs.existsSync(target)) {
      if (fs.statSync(target).isDirectory()) {
        filesToFormat.push(...getAllCvsFiles(target));
      } else if (target.endsWith('.cvs')) {
        filesToFormat.push(target);
      }
    }
  }

  // Deduplicate
  filesToFormat = [...new Set(filesToFormat)];

  if (filesToFormat.length === 0) {
    console.log('No .cvs files found to format.');
    return;
  }

  let formattedCount = 0;

  for (const file of filesToFormat) {
    try {
      const original = fs.readFileSync(file, 'utf-8');
      const formatted = formatCVS(original);

      if (original !== formatted) {
        fs.writeFileSync(file, formatted, 'utf-8');
        console.log(`  ✓ Formatted: ${file}`);
        formattedCount++;
      } else {
        console.log(`  - Up to date: ${file}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Error formatting ${file}:`, err.message || err);
    }
  }

  console.log(`\n🎉 Formatting complete! ${formattedCount} file(s) formatted successfully.\n`);
}

main().catch((err) => {
  console.error('❌ Formatting failed:', err);
  process.exit(1);
});
