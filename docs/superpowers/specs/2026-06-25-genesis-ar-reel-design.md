# GENESIS: reel AR de 3 actos (montaje editado) - Diseño

> Diseño APROBADO por Malena el 2026-06-25. Evolución del demo `ar-flyer-demo` (reutiliza stack, marca y el repo de GitHub Pages). Siguiente paso: plan de implementación.

## Objetivo
Producir un reel vertical (9:16, ~12-15s) para redes sociales (puro impacto visual de marca, SIN venta ni CTA) en el que la marca de iAcademia "nace de la nada" y acaba en la mano del usuario. Estética oscura y cinematográfica para que el glow destaque.

## Narrativa (3 actos)
1. **Ruptura**: de una tarjeta de marca brota una explosión anamórfica hacia cámara.
2. **Génesis**: los fragmentos se vuelven nube de datos que gira y se ensambla en el hexágono 3D, que enciende su glow y respira.
3. **En tus manos**: el hexágono flota sobre la palma, orbitado por datos, reaccionando a la mano.

## Estrategia de producción (decisión clave)
NO se hace en una sola toma en vivo. Se construyen **dos módulos AR web independientes**; se graba cada uno con el móvil y se **unen en edición** con una transición en el momento "las partículas vuelan hacia la mano". Esto evita la parte difícil (relevo en vivo entre dos sistemas de seguimiento) y da el mismo resultado en pantalla.

## Base técnica compartida
- Stack del demo: páginas web estáticas + Three.js (0.160.0) + postprocesado (EffectComposer + UnrealBloomPass para glow, viñeta sutil), por CDN/importmap. Sin servicios de pago.
- Marca: isotipo hexagonal (SVG ya generado y extruible en `assets/iacademia-isotipo.svg`), colores `#235a97` (azul), `#1b3f6b` (azul oscuro), `#efa320` (dorado).
- **Kit "premium" compartido** (módulo JS reutilizable por ambos): configuración de bloom, materiales emisivos con degradado, sistema de partículas (THREE.Points) y la utilidad de "ensamblado" (lerp de partículas desde nube hacia posiciones muestreadas en la superficie del logo con `MeshSurfaceSampler` de three/addons).
- Cada módulo: página a pantalla completa, pensada para screen recording en móvil, con un toque/tecla para REINICIAR el efecto y repetir tomas. Fondo transparente sobre cámara, con oscurecimiento sutil opcional del feed para que el glow resalte (gotcha del demo: poner html/body transparente al arrancar la cámara, MindAR pone el video en z-index -2).

## Módulo 1: "Ruptura + Génesis" (seguimiento de marcador, MindAR)
Anclado a una tarjeta de marca impresa (reutiliza el pipeline de marcador: diseño de tarjeta sobria oscura, bonita en cámara y con detalle suficiente para el tracking; se compila a `.mind` con la herramienta existente).

Línea de tiempo (~7s, dirigida por reloj para tomas idénticas):
1. Reposo: brillo sutil en los bordes de la tarjeta.
2. Ruptura anamórfica (0-1.5s): fragmentos/energía salen hacia cámara en falso-3D (anclados al marcador), con onda expansiva (anillo aditivo en expansión) y estelas de luz.
3. Nube de datos (1.5-3s): los fragmentos se disuelven en miles de partículas (puntos azules + destellos dorados) en vórtice sobre la tarjeta.
4. Génesis/ensamblado (3-5.5s): las partículas migran (lerp con easing + retardo por partícula) a posiciones de la superficie del hexágono y encajan; el logo 3D sólido emisivo aparece; se enciende el bloom; respira (pulso de escala) y gira lento.
5. Cierre (5.5-7s): el wordmark "iAcademia" se dibuja como tecleado por la IA (revelado por trazo o por aparición de letras); partículas sobrantes orbitan; el logo empieza a despegar de la tarjeta (gancho para el corte).

Riesgo: medio (logo + tracking ya existen; partículas y bloom son estándar de Three).

## Módulo 2: "En tus manos" (seguimiento de mano, MediaPipe Tasks Vision HandLandmarker)
Página aparte con seguimiento de manos en el navegador (gratis).

Beats (~6s):
1. La cámara ve la palma abierta; partículas se reúnen sobre ella.
2. El hexágono se materializa flotando sobre la palma, orbitado por datos, escalado a la mano.
3. Interacción: abrir mano -> expande; cerrar puño -> se comprime en chispa; abrir -> estalla; inclinar -> el logo sigue la orientación.
4. Cierre: acercar la mano a cámara -> el logo crece hasta llenar el cuadro.

Mapeo a 3D: centro de la palma y orientación a partir de landmarks (muñeca + nudillos MCP); escala por la envergadura de la mano. Apertura/cierre por curvatura de dedos / distancia yema-palma. Profundidad aproximada (suficiente para un vídeo grabado; se repiten tomas).

Riesgo: medio-alto (afinar la palma lleva iteración). Por eso se construye el Módulo 1 primero (es un reel completo por sí solo) y luego el 2.

## Montaje (manual, lo hace el equipo / Fede)
- Grabar Módulo 1 (tarjeta) y Módulo 2 (palma) por separado en el móvil.
- Cortar del 1 al 2 en el momento "partículas vuelan", tapando el salto con destello/whip-pan/estallido.
- Música + diseño de sonido (whoosh en ruptura, shimmer en génesis) + cierre de marca.
- Entregable: reel 9:16 de ~12-15s.

## Reparto construir vs manual
- **Construye iAcademia (este proyecto):** las dos páginas AR (Módulo 1 y 2), el kit de código "premium" compartido, la tarjeta-marcador imprimible, y una guía de rodaje + montaje (lista de planos, transición, música). Desplegado en el GitHub Pages existente: rutas `/genesis/` (Módulo 1) y `/manos/` (Módulo 2).
- **Manual (equipo):** grabar y editar. Opcional: capturar tomas de muestra con cámara simulada para previsualizar.

## Fuera de alcance (YAGNI)
- Relevo en vivo entre los dos seguimientos (lo resuelve la edición).
- CTA / venta.
- Audio dentro del AR (va en edición).
- Perfección iOS vs Android: el seguimiento de manos + bloom es pesado; se recomienda móvil reciente, Android Chrome como más fiable; iOS Safari a probar. Partículas en número razonable para fluidez.

## Hosting
- Mismo repo `ar-flyer-demo` en GitHub Pages (HTTPS, lo exige la cámara). Subcarpetas `/genesis/` y `/manos/`. El demo actual (`index.html`) se mantiene.

## Orden de construcción recomendado
1. Kit "premium" compartido (bloom + partículas + ensamblado + materiales).
2. Módulo 1 (ruptura + génesis) sobre marcador, con tarjeta nueva + marcador compilado.
3. Módulo 2 (en tus manos) con HandLandmarker.
4. Guía de rodaje + montaje.
5. Despliegue y verificación (carga + escena, sin cámara) + tomas de muestra.
