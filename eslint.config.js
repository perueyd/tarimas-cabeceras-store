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
import react from 'eslint-plugin-react';

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
    plugins: { 'react-hooks': reactHooks, react },
    rules: {
      // EL MOTIVO DE TODO ESTO: usar algo que no existe.
      'no-undef': 'error',

      // Lo que queda sin usar suele ser código muerto o un cambio a medias.
      // Los argumentos no cuentan: muchas veces hacen falta por su posición.
      //
      // ignoreRestSiblings: apartar campos con { a, b, ...resto } para NO
      // guardarlos es una forma normal de escribirlo, y este proyecto la usa a
      // propósito (TextosTab deja fuera los pagos para no pisar la pestaña
      // Pagos). Sin esta opción, cada campo apartado salía como código muerto.
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],

      // Sin esta regla, el revisor NO ve que un componente se usa dentro del
      // JSX. Daba 184 avisos falsos —'Header is defined but never used' con el
      // <Header /> tres líneas más abajo— y entre tanto ruido un trozo de
      // código muerto de verdad no se distinguía. Doscientos avisos que no hay
      // que atender enseñan a no mirar la salida, que es peor que no tenerla.
      'react/jsx-uses-vars': 'error',

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
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
