# Demo WebAR: flyer + isotipo iAcademia en 3D

> Diseño acordado el 2026-06-24 en sesión de brainstorming. Pendiente de implementar (lo dejamos para mañana).
> Estado: **DISEÑO APROBADO**. Siguiente paso = plan de implementación (skill `writing-plans`) y construir.

## Objetivo
Campo de pruebas (no producción). Enseñar la tecnología de realidad aumentada por navegador:
imprimes un flyer, escaneas su QR con el móvil, apuntas al papel y aparece el **isotipo de
iAcademia en 3D (con volumen real) girando** sobre el flyer. Sin app, sin pago, sin marca de agua.

## Decisiones tomadas (recorrido del brainstorming)
- **Uso:** D) probar la tecnología antes de decidir nada.
- **Efecto:** B) objeto 3D anclado al flyer (seguimiento de imagen), no vídeo ni colocación libre.
- **Objeto:** A) logo de iAcademia en 3D girando. En concreto el **isotipo** (el hexágono), no el wordmark.
- **Enfoque técnico:** A) MindAR + Three.js, logo extruido a 3D real. Descartadas: "moneda" con textura (B)
  y plataformas no-code de pago tipo 8thWall/Zappar (C, con marca de agua).

## Assets de marca encontrados
- Solo hay PNG, **ningún SVG/vectorial** del logo.
- Isotipo transparente (símbolo solo, ideal para extruir):
  `/Users/malenaps/GitHub_IAcademia/app-interna-iacademia/client/public/logo-isotipo.png`
- Logo completo transparente (símbolo + wordmark):
  `/Users/malenaps/GitHub_IAcademia/iacademia-hub/identidad/Logos IAcademia/Logo IAcademia fondo trasparante.png`
- Forma del isotipo: anillo hexagonal azul degradado con una muesca a la derecha (forma de "C") + acento
  trapezoidal amarillo/dorado. Geometría limpia, buena para extrusión.

## Cómo lo experimenta el usuario
1. Imprime el flyer (lleva el QR impreso).
2. Escanea el QR con la cámara del móvil -> abre la web.
3. El navegador pide permiso de cámara (una vez).
4. Apunta al flyer -> la cámara lo reconoce -> el hexágono 3D aparece anclado y girando.
5. Mueve el móvil alrededor -> lo ve desde distintos ángulos.

## Piezas técnicas
- **MindAR** (image tracking) + **Three.js** (render 3D), ambos desde CDN. Gratis, sin watermark.
- **Logo 3D:** vectorizar el isotipo (PNG -> SVG; si el trazado sale tosco, limpiar o reconstruir el
  hexágono como geometría real) y extruirlo con `ExtrudeGeometry`. Dos materiales: azul de marca para el
  hexágono, dorado para el acento. `MeshStandardMaterial` + luces para que brille al girar (da el toque
  premium sin necesitar replicar el degradado).
- **Flyer/marcador:** diseñar un flyer de prueba con la marca, con suficiente detalle visual para que se
  rastree bien (un logo solo sobre blanco se rastrea mal). Compilarlo al formato MindAR (`.mind`).
- **QR** apuntando a la URL, impreso en el propio flyer.
- **Alojamiento:** GitHub Pages (HTTPS gratis e instantáneo; la cámara del móvil exige HTTPS). Repo
  público dedicado, sin secretos, solo el demo.

## Archivos del proyecto
- `index.html` - escena AR: target, logo extruido, luces, animación de giro, cartelito "apunta al flyer".
- `assets/targets.mind` - marcador compilado del flyer.
- `assets/iacademia-isotipo.svg` - logo vectorizado para extruir.
- `flyer/flyer.png` + `flyer/qr.png` - flyer imprimible con el QR.
- `README.md` - cómo imprimir, escanear y probar.

## Cómo se prueba
- Prueba real: imprimir el flyer y escanear con el móvil.
- Prueba sin imprimir: abrir el flyer en la pantalla del ordenador y apuntar el móvil a la pantalla.
- Verificación previa (yo): la página carga sin errores de consola y el 3D se renderiza. Recordar que la
  cámara WebAR exige HTTPS o localhost (móvil -> URL de Pages; en local -> localhost o túnel).

## Fuera de alcance (YAGNI para el demo)
Analítica, varios flyers, vídeo, dominio propio. Si gusta, segunda vuelta: logo completo, contenido real,
flyer de un curso concreto, etc.
