# iAcademia AR flyer demo

Demo de realidad aumentada por navegador (WebAR): imprime el flyer, escanea su QR con el movil,
apunta la camara al flyer y veras el isotipo de iAcademia en 3D girando sobre el papel. Sin app.

## Probarlo

**Con flyer impreso (recomendado):**
1. Imprime `flyer/flyer.png` (A5 o A6, en color, en papel mate si puedes para evitar reflejos).
2. Escanea el QR con la camara del movil. Abre la web en el navegador.
3. Pulsa "Comenzar" y acepta el permiso de camara.
4. Apunta la camara al flyer. Aparece el logo 3D girando.

**Sin imprimir (prueba rapida):**
1. Abre `flyer/flyer.png` a pantalla completa en el ordenador.
2. En el movil, entra en la URL del demo, pulsa "Comenzar" y apunta a la pantalla.

URL del demo: https://mps136.github.io/ar-flyer-demo/

## Requisitos
- HTTPS o localhost (la camara solo funciona en contexto seguro). GitHub Pages ya da HTTPS.
- Navegador movil moderno (Chrome Android, Safari iOS).

## Regenerar los artefactos
```
npm install && npx playwright install chromium
npm run isotipo                       # assets/iacademia-isotipo.svg
npm run qr -- "<PAGES_URL>"           # flyer/assets/qr.png
npm run flyer                         # flyer/flyer.png (marcador)
npm run compile                       # assets/targets.mind
npm run verify                        # comprueba la escena en headless
npm run serve                         # sirve en http://localhost:8080
```

## Como funciona
- `index.html`: MindAR (seguimiento de imagen) + Three.js. Reconstruye el isotipo como SVG, lo
  extruye a 3D, lo ancla al marcador y lo hace girar.
- `assets/targets.mind`: marcador compilado a partir de `flyer/flyer.png`.
- Alojado en GitHub Pages (estatico).
