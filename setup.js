#!/usr/bin/env node

/**
 * 🚀 Setup Script - Configura TODO en 2 minutos
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const ENV_LOCAL_PATH = path.join(__dirname, '.env.local');

async function main() {
  console.log('\n🚀 E|D Espacios y Diseño - Setup\n');
  console.log('========================================');
  console.log('Configuración de IA (CHAT-ED + JARVIS)');
  console.log('========================================\n');

  // Paso 1: GROQ_API_KEY
  console.log('PASO 1: GROQ_API_KEY (Chatbot + JARVIS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Necesitas una clave GRATUITA de Groq.');
  console.log('Ir a: https://console.groq.com/keys\n');

  const groqKey = await question('📝 Pega tu GROQ_API_KEY (empieza con gsk_): ');

  if (!groqKey.startsWith('gsk_')) {
    console.log('⚠️  Aviso: La clave debe empezar con "gsk_"');
  }

  // Paso 2: ORDERS_ADMIN_KEY
  console.log('\n\nPASO 2: ORDERS_ADMIN_KEY (Panel Admin)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Clave para acceder a /pedidos (donde está JARVIS)\n');

  const adminKey = await question('📝 Crea una clave (ej: TuClaveSegura123): ');

  if (adminKey.length < 8) {
    console.log('⚠️  Aviso: La clave debe tener al menos 8 caracteres');
  }

  // Crear .env.local
  console.log('\n\n✅ Creando .env.local...\n');

  const envContent = `# 🤖 GROQ API (CHAT-ED + JARVIS)
# Generado por setup.js el ${new Date().toLocaleString()}
GROQ_API_KEY=${groqKey}

# 🔐 Panel Admin Key
# Usa esta clave para entrar a /pedidos
ORDERS_ADMIN_KEY=${adminKey}
`;

  fs.writeFileSync(ENV_LOCAL_PATH, envContent);
  console.log(`✅ .env.local creado correctamente`);
  console.log(`   📍 ${ENV_LOCAL_PATH}\n`);

  // Resumen
  console.log('\n========================================');
  console.log('✅ SETUP COMPLETADO');
  console.log('========================================\n');

  console.log('📋 Resumen de tu configuración:');
  console.log(`   GROQ_API_KEY: ${groqKey.substring(0, 10)}...`);
  console.log(`   ORDERS_ADMIN_KEY: ${adminKey.substring(0, 8)}...`);

  console.log('\n🚀 Próximos pasos:');
  console.log('   1. Recarga la página del navegador (Ctrl+R)');
  console.log('   2. Click en 💬 (CHAT-ED) en la página');
  console.log('   3. Escribe "hola" → Debe responder');
  console.log('   4. Ve a /pedidos (clave: ' + adminKey + ')');
  console.log('   5. Click en 🎙️ (JARVIS) → Prueba hablar\n');

  console.log('📚 Documentación:');
  console.log('   QUICK-START.md - Guía rápida 5 min');
  console.log('   GROQ-AI-SETUP.md - Setup completo');
  console.log('   JARVIS-VOICE.md - Cómo usar JARVIS\n');

  console.log('🎯 ¡Listo! Tu tienda ahora tiene IA.\n');

  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
