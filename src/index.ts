import * as fs from 'fs';
import { rm } from "fs/promises";
import path from 'path';
import sax from 'sax';
import archiver from 'archiver';

const filePath = './testreportcpj.xml';
const XmlOutput = './test';
const ZipOutput = './output.zip'

const fileLimit = 1000000
let bufferIntimacoes = '';
let bufferAttachments = '';

function main()
{
  outputPath()
  StreamParser()
}

function outputPath()
{
    if (!fs.existsSync(XmlOutput)) {
    fs.mkdirSync(XmlOutput);
}
}

function StreamParser()
{

const parser = sax.parser(true, { trim: true });

let currentIntimacao: string[] = [];
let insideIntimacoes = false;
let IntimacaoblockCount = 0;

let currentAttachment: string[] = [];
let insideAttachment = false;
let AttachmentblockCount = 0;


parser.onopentag = (node:any) => {
if (node.name === 'intimacao') {
  insideIntimacoes = true;
  currentIntimacao = [];
}

if (node.name === 'attachment') {
  insideAttachment = true;
  currentAttachment = [];
}

if (insideIntimacoes) {
  currentIntimacao.push(`<${node.name}${formatAttributes(node.attributes)}>`);
}

if (insideAttachment)
{
  currentAttachment.push(`<${node.name}${formatAttributes(node.attributes)}>`);
}

};

parser.ontext = (text) => {
if (insideIntimacoes) {
  currentIntimacao.push(text);
}

if(insideAttachment)
{
  currentAttachment.push(text)
}

};

parser.onclosetag = (tagName) => {
  if (insideIntimacoes) {
    currentIntimacao.push(`</${tagName}>`);
  }

  if (insideAttachment)
  {
    currentAttachment.push(`</${tagName}>`);
  }



  if (tagName === 'intimacao') {
    IntimacaoblockCount++;
    
const bloco = bufferIntimacoes + currentIntimacao.join('');

if (fileSizeChecker(bloco, fileLimit)) {
  IntimacaoblockCount++;
  splitter(bloco, IntimacaoblockCount, tagName);
  bufferIntimacoes = '';
} else {
  bufferIntimacoes = bloco;
}

    insideIntimacoes = false;
  }

    if (tagName === 'attachment') {
    AttachmentblockCount++;



    // splitter(currentAttachment.join(''), AttachmentblockCount, tagName);

      const blocoAttachment = bufferAttachments + currentAttachment.join('');

      if (fileSizeChecker(blocoAttachment, fileLimit)) {
        AttachmentblockCount++;
        // splitter(blocoAttachment, AttachmentblockCount, tagName);
        splitter(currentAttachment.join(''), AttachmentblockCount, tagName);
        bufferAttachments = '';
      } else {
        // bufferAttachments = blocoAttachment;
      }


    insideAttachment = false;
  }

};

parser.onerror = (err) => {
  console.error('Erro ao ler XML:', err);
};

const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
stream.on('data', (chunk:any) => parser.write(chunk));

stream.on('end', () => {
  parser.close();
  envelopfile(`${XmlOutput}`, `${ZipOutput}`)
  console.log(`\nProcessamento concluído! \nTotal de blocos: ${IntimacaoblockCount}`);
});
}

function splitter(xmlBlock: string, index: number, type:string) {

const wrappedBlock = `<root>\n${xmlBlock}\n</root>`;


  if (type === "intimacao"){
    const fileName = path.join(XmlOutput, `intimacoes_${index}.xml`);
    fs.writeFileSync(fileName, wrappedBlock, 'utf8');
    console.log(`Bloco ${index} salvo, tamanho: ${Buffer.byteLength(xmlBlock, 'utf8')} bytes`);
  }

    if (type === "attachment"){
    const fileName = path.join(XmlOutput, `Arquivo_${index}.xml`);
    fs.writeFileSync(fileName, wrappedBlock, 'utf8');
    console.log(`Bloco ${index} salvo, tamanho: ${Buffer.byteLength(xmlBlock, 'utf8')} bytes`);
  }


}

function formatAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
}

async function envelopfile(origem:any, pathFile:any) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(pathFile);
    const archive = archiver('zip', {
      zlib: { level: 9 } 
    });

    output.on('close', () => {
      console.log(`ZIP criado com sucesso, ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', err => reject(err));

    archive.pipe(output);

    archive.directory(origem, false);

    archive.finalize();
  }).then(() => {
  fileErase(`${XmlOutput}`)
  }).catch((err) => {console.error("Erro ao apagar a pasta:", err);})
}

async function fileErase(caminho: string) {
  try {
    await rm(caminho, { recursive: true, force: true });
    console.log(`Pasta temporaria ${caminho} apagada com sucesso!`);
  } catch (err) {
    console.error("Erro ao apagar a pasta:", err);
  }
}

function fileSizeChecker(content: string, limiteBytes: number): boolean {
  return Buffer.byteLength(content, 'utf8') > limiteBytes;
}

main()