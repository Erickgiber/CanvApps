import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '../..');
const EXTENSION_DIR = path.resolve(__dirname);
const VSIX_OUTPUT = path.resolve(ROOT_DIR, 'canvapps-vscode-0.1.0.vsix');

console.log('📦 Building CanvApps VS Code Extension...');

// 1. Bundle extension.ts with esbuild
execSync('npx esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node', {
  cwd: EXTENSION_DIR,
  stdio: 'inherit',
});

// 2. Create staging directory for VSIX structure
const STAGING_DIR = path.resolve(EXTENSION_DIR, '.vsix_staging');
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".png" ContentType="image/png"/>
  <Default Extension=".svg" ContentType="image/svg+xml"/>
  <Default Extension=".ts" ContentType="video/mp2t"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>`;

const vsixManifest = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="canvapps-vscode" Version="0.1.0" Publisher="canvapps" />
    <DisplayName>CanvApps - Canvas UI Support</DisplayName>
    <Description xml:space="preserve">Language support, syntax highlighting, go-to-definition, and autocompletion for CanvApps .cvs Single-File Components</Description>
    <Tags>canvapps,canvas,cvs,ui-framework,syntax-highlighting,snippet,CanvApps,__ext_cvs</Tags>
    <Categories>Programming Languages,Snippets</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.75.0" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.EnabledApiProposals" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="https://github.com/Erickgiber/CanvApps.git" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="https://github.com/Erickgiber/CanvApps.git" />
      <Property Id="Microsoft.VisualStudio.Services.Links.GitHub" Value="https://github.com/Erickgiber/CanvApps.git" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="https://github.com/Erickgiber/CanvApps/issues" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Learn" Value="https://github.com/Erickgiber/CanvApps#readme" />
      <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
      <Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="Free"/>
    </Properties>
    <Icon>extension/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/readme.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>`;

fs.writeFileSync(path.join(STAGING_DIR, '[Content_Types].xml'), contentTypesXml);
fs.writeFileSync(path.join(STAGING_DIR, 'extension.vsixmanifest'), vsixManifest);

const EXT_PAYLOAD_DIR = path.join(STAGING_DIR, 'extension');
fs.mkdirSync(EXT_PAYLOAD_DIR, { recursive: true });

function copyRecursive(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (child === '.vsix_staging' || child === 'node_modules' || child === 'package-vsix.ts') continue;
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(EXTENSION_DIR, EXT_PAYLOAD_DIR);

// 3. Zip into .vsix file
if (fs.existsSync(VSIX_OUTPUT)) {
  fs.unlinkSync(VSIX_OUTPUT);
}

execSync(`zip -r -q "${VSIX_OUTPUT}" * "[Content_Types].xml"`, {
  cwd: STAGING_DIR,
  stdio: 'inherit',
});

// Cleanup staging dir
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

console.log(`✨ Successfully generated fresh VSIX package at: ${VSIX_OUTPUT}`);
