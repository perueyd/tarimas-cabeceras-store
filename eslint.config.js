// Revisor de errores reales. NO de estilo.
//
// POR QUÉ EXISTE: dos veces seguidas, al mover código de un archivo a otro, se
// quedó una función llamándose desde donde ya no estaba (esVenta, AZUL).
// `npm run build` pasó en VERDE las dos veces —Vite no comprueba
// identificadores sueltos dentro de un componente— y el panel se quedaba en
// blanco al abrirlo. Solo lo cazó abrir el navegador a mano.
//
// Esto lo caza en un segundo, antes de publicar.
//
// NO lleva reglas de estilo (comillas, punto y coma, sangría) a propósito: en
// un proyecto de 17.000 líneas eso son cientos de avisos que no arreglan nada
// y que acaban enseñando a ignorar la salida entera. Solo se avisa de lo que
// de verdad rompe la página.
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.vercel/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // EL MOTIVO DE TODO ESTO: usar algo que no existe.
      'no-undef': 'error',

      // Lo que queda sin usar suele ser código muerto o un cambio a medias.
      // Los argumentos no cuentan: muchas veces hacen falta por su posición.
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],

      // Errores de verdad, de los que no avisa nada más.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Los ganchos de React: llamarlos dentro de un `if` o de un bucle rompe
      // la pantalla de formas difíciles de entender, y pasa al mover código.
      'react-hooks/rules-of-hooks': 'error',
    },
  },
];
