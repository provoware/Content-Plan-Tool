#!/usr/bin/env node
/**
 * Startroutine für den Jahrescontent-Kalender.
 * Prüft die Umgebung, erstellt bei Bedarf eine virtuelle Umgebung
 * (node_modules) und führt anschließend Tests aus.
 * Alle Schritte liefern Nutzerfeedback (Konsolenausgaben) und
 * versuchen bei Fehlern eine Selbstreparatur.
 */
const {spawn} = require('child_process');
const fs = require('fs');

function run(cmd, args){
  return new Promise((resolve, reject)=>{
    const proc = spawn(cmd, args, {stdio:'inherit', shell: process.platform === 'win32'});
    proc.on('close', code=>{
      if(code === 0) resolve();
      else reject(new Error(`${cmd} beendete sich mit Code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function ensureNode(){
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if(major < 18) throw new Error('Node >=18 erforderlich');
  console.log('Node-Version erkannt:', process.versions.node);
}

async function ensureDependencies(){
  if(!fs.existsSync('node_modules')){
    console.log('Keine virtuelle Umgebung gefunden – installiere Abhängigkeiten…');
    try{
      await run('npm', ['ci']);
    } catch(e){
      console.log('npm ci fehlgeschlagen, versuche npm install');
      await run('npm', ['install']);
    }
  } else {
    try{
      await run('npm', ['ls', '--silent']);
    } catch(e){
      console.log('Abhängigkeiten unvollständig – repariere…');
      await run('npm', ['install']);
    }
  }
}

async function runTests(){
  console.log('Starte Tests…');
  await run('npm', ['test']);
}

(async()=>{
  console.log('Startroutine: Vorprüfung der Umgebung…');
  try{
    await ensureNode();
    await ensureDependencies();
    console.log('Vorprüfung abgeschlossen.');
    await runTests();
    console.log('Nachprüfung erfolgreich. Umgebung bereit.');
  } catch(err){
    console.error('Startroutine fehlgeschlagen:', err.message);
    try{
      console.log('Versuche Selbstreparatur…');
      await ensureDependencies();
      await runTests();
      console.log('Selbstreparatur erfolgreich.');
    } catch(e){
      console.error('Selbstreparatur gescheitert:', e.message);
      process.exitCode = 1;
    }
  }
})();
